import type { Express } from "express";

import { prisma } from "../../config/prisma";
import { createTestApp, gqlRequest } from "../helpers/testServer";
import { resetDb } from "../helpers/db";
import { lastMailTo, sentMessages } from "../../services/mailer";

let app: Express;

const registerAndProject = async (email: string) => {
    const reg = await gqlRequest(app, {
        query: `
            mutation R($e: String!, $p: String!) {
                register(email: $e, password: $p) {
                    accessToken user { id email }
                }
            }
        `,
        variables: { e: email, p: "Passw0rd!" },
    });
    const token: string = reg.body.data.register.accessToken;
    const userId: string = reg.body.data.register.user.id;

    const proj = await gqlRequest(
        app,
        {
            query: `
                mutation C($n: String!, $l: String!) {
                    createProject(name: $n, location: $l) { id }
                }
            `,
            variables: { n: "Test project", l: "HQ" },
        },
        token,
    );
    const projectId: string = proj.body.data.createProject.id;

    return { token, userId, projectId };
};

const sendInvite = (ownerToken: string, projectId: string, email: string) =>
    gqlRequest(
        app,
        {
            query: `
                mutation I($p: ID!, $e: String!) {
                    inviteUser(projectId: $p, email: $e) { id status }
                }
            `,
            variables: { p: projectId, e: email },
        },
        ownerToken,
    );

const extractTokenFromMail = (email: string): string => {
    const mail = lastMailTo(email);
    if (!mail) throw new Error(`No mail sent to ${email}`);
    const match = mail.text.match(/token=([0-9a-f]{64})/);
    if (!match) throw new Error("No token in mail body");
    return match[1];
};

beforeAll(async () => {
    app = await createTestApp();
});

afterAll(async () => {
    await prisma.$disconnect();
});

beforeEach(async () => {
    await resetDb();
    sentMessages.length = 0;
});

describe("Invitations", () => {
    it("sends an email with an accept link when an invite is created", async () => {
        const owner = await registerAndProject("owner@test.dev");
        await sendInvite(owner.token, owner.projectId, "invitee@test.dev");

        const mail = lastMailTo("invitee@test.dev");
        expect(mail).toBeDefined();
        expect(mail!.subject).toContain("invited");
        expect(mail!.text).toMatch(/\/invitations\/accept\?token=[0-9a-f]{64}/);
    });

    it("accepts an invitation via the token from the email", async () => {
        const owner = await registerAndProject("owner-a@test.dev");
        const invitee = await registerAndProject("invitee-a@test.dev");

        await sendInvite(owner.token, owner.projectId, "invitee-a@test.dev");
        const token = extractTokenFromMail("invitee-a@test.dev");

        const accept = await gqlRequest(
            app,
            {
                query: `mutation A($t: String!) { acceptInvitation(token: $t) }`,
                variables: { t: token },
            },
            invitee.token,
        );
        expect(accept.body.data.acceptInvitation).toBe(true);

        const member = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: invitee.userId,
                    projectId: owner.projectId,
                },
            },
        });
        expect(member).not.toBeNull();
    });

    it("rejects an invitation via the token and grants no access", async () => {
        const owner = await registerAndProject("owner-r@test.dev");
        const invitee = await registerAndProject("invitee-r@test.dev");

        await sendInvite(owner.token, owner.projectId, "invitee-r@test.dev");
        const token = extractTokenFromMail("invitee-r@test.dev");

        const reject = await gqlRequest(
            app,
            {
                query: `mutation R($t: String!) { rejectInvitation(token: $t) }`,
                variables: { t: token },
            },
            invitee.token,
        );
        expect(reject.body.data.rejectInvitation).toBe(true);

        const member = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: invitee.userId,
                    projectId: owner.projectId,
                },
            },
        });
        expect(member).toBeNull();
    });

    it("prevents duplicate pending invitations", async () => {
        const owner = await registerAndProject("owner-d@test.dev");
        await sendInvite(owner.token, owner.projectId, "x@test.dev");
        const dup = await sendInvite(owner.token, owner.projectId, "x@test.dev");
        expect(dup.body.errors?.[0]?.extensions?.code).toBe("CONFLICT");
    });

    it("accepts via the token for the signed-in user even if their email differs", async () => {
        const owner = await registerAndProject("owner-w@test.dev");
        // The person clicking the link registered under a different email than
        // the one the invite was addressed to — the link is the credential.
        const other = await registerAndProject("other-w@test.dev");

        await sendInvite(owner.token, owner.projectId, "somebody@test.dev");
        const token = extractTokenFromMail("somebody@test.dev");

        const res = await gqlRequest(
            app,
            {
                query: `mutation A($t: String!) { acceptInvitation(token: $t) }`,
                variables: { t: token },
            },
            other.token,
        );
        expect(res.body.data.acceptInvitation).toBe(true);

        const member = await prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: other.userId,
                    projectId: owner.projectId,
                },
            },
        });
        expect(member).not.toBeNull();
    });

    it("previews an invitation by token without authentication", async () => {
        const owner = await registerAndProject("owner-pv@test.dev");
        await sendInvite(owner.token, owner.projectId, "invitee-pv@test.dev");
        const token = extractTokenFromMail("invitee-pv@test.dev");

        const res = await gqlRequest(app, {
            query: `query P($t: String!) {
                invitationPreview(token: $t) { email status projectName }
            }`,
            variables: { t: token },
        });
        expect(res.body.data.invitationPreview).toEqual({
            email: "invitee-pv@test.dev",
            status: "PENDING",
            projectName: "Test project",
        });
    });

    it("lets the owner list invitations and forbids non-owners", async () => {
        const owner = await registerAndProject("owner-li@test.dev");
        const stranger = await registerAndProject("stranger-li@test.dev");
        await sendInvite(owner.token, owner.projectId, "invitee-li@test.dev");

        const ok = await gqlRequest(
            app,
            {
                query: `query Q($p: ID!) { projectInvitations(projectId: $p) { email status } }`,
                variables: { p: owner.projectId },
            },
            owner.token,
        );
        expect(ok.body.data.projectInvitations).toHaveLength(1);
        expect(ok.body.data.projectInvitations[0].email).toBe(
            "invitee-li@test.dev",
        );

        const denied = await gqlRequest(
            app,
            {
                query: `query Q($p: ID!) { projectInvitations(projectId: $p) { email } }`,
                variables: { p: owner.projectId },
            },
            stranger.token,
        );
        expect(denied.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("rejects invitation send from a non-owner", async () => {
        const owner = await registerAndProject("owner-n@test.dev");
        const stranger = await registerAndProject("stranger-n@test.dev");

        const res = await sendInvite(
            stranger.token,
            owner.projectId,
            "victim@test.dev",
        );
        expect(res.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("handles concurrent inviteUser calls without duplicates", async () => {
        const owner = await registerAndProject("owner-cc@test.dev");

        const [a, b] = await Promise.all([
            sendInvite(owner.token, owner.projectId, "race@test.dev"),
            sendInvite(owner.token, owner.projectId, "race@test.dev"),
        ]);
        const codes = [a, b].map(
            (r) => r.body.errors?.[0]?.extensions?.code,
        );
        expect(codes.filter((c) => c === "CONFLICT")).toHaveLength(1);

        const pending = await prisma.invitation.count({
            where: {
                projectId: owner.projectId,
                email: "race@test.dev",
                status: "PENDING",
            },
        });
        expect(pending).toBe(1);
    });

    it("handles concurrent acceptInvitation calls atomically", async () => {
        const owner = await registerAndProject("owner-acc@test.dev");
        const invitee = await registerAndProject("invitee-acc@test.dev");

        await sendInvite(owner.token, owner.projectId, "invitee-acc@test.dev");
        const token = extractTokenFromMail("invitee-acc@test.dev");

        const [r1, r2] = await Promise.all([
            gqlRequest(
                app,
                {
                    query: `mutation A($t: String!) { acceptInvitation(token: $t) }`,
                    variables: { t: token },
                },
                invitee.token,
            ),
            gqlRequest(
                app,
                {
                    query: `mutation A($t: String!) { acceptInvitation(token: $t) }`,
                    variables: { t: token },
                },
                invitee.token,
            ),
        ]);
        const okCount = [r1, r2].filter(
            (r) => r.body.data?.acceptInvitation === true,
        ).length;
        expect(okCount).toBe(1);

        const members = await prisma.projectMember.count({
            where: { userId: invitee.userId, projectId: owner.projectId },
        });
        expect(members).toBe(1);
    });
});
