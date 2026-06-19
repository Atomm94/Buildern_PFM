import type { Express } from "express";

import { prisma } from "../../config/prisma";
import { createTestApp, gqlRequest } from "../helpers/testServer";
import { resetDb } from "../helpers/db";

let app: Express;

const register = async (email: string) => {
    const r = await gqlRequest(app, {
        query: `
            mutation R($e: String!, $p: String!) {
                register(email: $e, password: $p) {
                    accessToken user { id email }
                }
            }
        `,
        variables: { e: email, p: "Passw0rd!" },
    });
    return {
        token: r.body.data.register.accessToken as string,
        userId: r.body.data.register.user.id as string,
    };
};

const createProject = async (token: string, name = "P", location = "L") => {
    const r = await gqlRequest(
        app,
        {
            query: `
                mutation C($n: String!, $l: String!) {
                    createProject(name: $n, location: $l) {
                        id name location creator { id email }
                    }
                }
            `,
            variables: { n: name, l: location },
        },
        token,
    );
    return r.body.data.createProject as {
        id: string;
        name: string;
        location: string;
        creator: { id: string; email: string };
    };
};

beforeAll(async () => {
    app = await createTestApp();
});
afterAll(async () => {
    await prisma.$disconnect();
});
beforeEach(async () => {
    await resetDb();
});

describe("Projects", () => {
    it("creates a project owned by the caller", async () => {
        const owner = await register("o@test.dev");
        const proj = await createProject(owner.token, "Site A", "Yerevan");
        expect(proj.name).toBe("Site A");
        expect(proj.location).toBe("Yerevan");
        expect(proj.creator.id).toBe(owner.userId);
    });

    it("lists only projects the caller owns or is a member of", async () => {
        const a = await register("a@test.dev");
        const b = await register("b@test.dev");
        await createProject(a.token, "A-owned", "x");
        await createProject(b.token, "B-owned", "x");

        const list = await gqlRequest(
            app,
            { query: `query { projects { name } }` },
            a.token,
        );
        const names = list.body.data.projects.map((p: { name: string }) => p.name);
        expect(names).toEqual(["A-owned"]);
    });

    it("returns project details for the owner", async () => {
        const owner = await register("o2@test.dev");
        const p = await createProject(owner.token, "Detailed", "HQ");

        const res = await gqlRequest(
            app,
            {
                query: `
                    query Q($id: ID!) {
                        project(projectId: $id) {
                            id name location
                            creator { email }
                            members { user { email } }
                        }
                    }
                `,
                variables: { id: p.id },
            },
            owner.token,
        );
        expect(res.body.data.project.name).toBe("Detailed");
        expect(res.body.data.project.creator.email).toBe("o2@test.dev");
        expect(res.body.data.project.members[0].user.email).toBe("o2@test.dev");
    });

    it("forbids reading a project from a non-member", async () => {
        const owner = await register("o3@test.dev");
        const outsider = await register("out@test.dev");
        const p = await createProject(owner.token);

        const res = await gqlRequest(
            app,
            {
                query: `query Q($id: ID!) { project(projectId: $id) { id } }`,
                variables: { id: p.id },
            },
            outsider.token,
        );
        expect(res.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("lets the owner update and delete; forbids others", async () => {
        const owner = await register("o4@test.dev");
        const stranger = await register("s4@test.dev");
        const p = await createProject(owner.token, "Old name", "Old loc");

        const ownerUpdate = await gqlRequest(
            app,
            {
                query: `
                    mutation U($id: ID!, $input: UpdateProjectInput!) {
                        updateProject(projectId: $id, input: $input) {
                            name location
                        }
                    }
                `,
                variables: {
                    id: p.id,
                    input: { name: "New name", location: "New loc" },
                },
            },
            owner.token,
        );
        expect(ownerUpdate.body.data.updateProject.name).toBe("New name");

        const strangerUpdate = await gqlRequest(
            app,
            {
                query: `
                    mutation U($id: ID!, $input: UpdateProjectInput!) {
                        updateProject(projectId: $id, input: $input) { id }
                    }
                `,
                variables: { id: p.id, input: { name: "Hijack" } },
            },
            stranger.token,
        );
        expect(strangerUpdate.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

        const strangerDelete = await gqlRequest(
            app,
            {
                query: `mutation D($id: ID!) { deleteProject(projectId: $id) }`,
                variables: { id: p.id },
            },
            stranger.token,
        );
        expect(strangerDelete.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

        const ownerDelete = await gqlRequest(
            app,
            {
                query: `mutation D($id: ID!) { deleteProject(projectId: $id) }`,
                variables: { id: p.id },
            },
            owner.token,
        );
        expect(ownerDelete.body.data.deleteProject).toBe(true);
        expect(
            await prisma.project.findUnique({ where: { id: p.id } }),
        ).toBeNull();
    });

    it("rejects unauthenticated project ops", async () => {
        const res = await gqlRequest(app, {
            query: `query { projects { id } }`,
        });
        expect(res.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });
});
