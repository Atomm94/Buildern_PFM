import type { Express } from "express";

import { prisma } from "../../config/prisma";
import { createTestApp, gqlRequest } from "../helpers/testServer";
import { resetDb } from "../helpers/db";
import { lastMailTo, sentMessages } from "../../services/mailer";

let app: Express;

const register = async (email: string) => {
    const r = await gqlRequest(app, {
        query: `
            mutation R($e: String!, $p: String!) {
                register(email: $e, password: $p) {
                    accessToken user { id }
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

const createProject = async (token: string) => {
    const r = await gqlRequest(
        app,
        {
            query: `
                mutation C($n: String!, $l: String!) {
                    createProject(name: $n, location: $l) { id }
                }
            `,
            variables: { n: "P", l: "L" },
        },
        token,
    );
    return r.body.data.createProject.id as string;
};

// Add a user as project member via the email-token invitation flow.
const addMember = async (ownerToken: string, projectId: string, member: {
    token: string; email: string;
}) => {
    await gqlRequest(
        app,
        {
            query: `
                mutation I($p: ID!, $e: String!) {
                    inviteUser(projectId: $p, email: $e) { id }
                }
            `,
            variables: { p: projectId, e: member.email },
        },
        ownerToken,
    );
    const mail = lastMailTo(member.email);
    const token = mail!.text.match(/token=([0-9a-f]{64})/)![1];
    await gqlRequest(
        app,
        {
            query: `mutation A($t: String!) { acceptInvitation(token: $t) }`,
            variables: { t: token },
        },
        member.token,
    );
};

const createExpense = (token: string, projectId: string, name = "x", amount = "10") =>
    gqlRequest(
        app,
        {
            query: `
                mutation C($p: ID!, $n: String!, $a: Decimal!) {
                    createExpense(projectId: $p, name: $n, amount: $a) {
                        id name amount
                    }
                }
            `,
            variables: { p: projectId, n: name, a: amount },
        },
        token,
    );

const createIncome = (token: string, projectId: string, name = "y", amount = "20") =>
    gqlRequest(
        app,
        {
            query: `
                mutation C($p: ID!, $n: String!, $a: Decimal!) {
                    createIncome(projectId: $p, name: $n, amount: $a) {
                        id name amount
                    }
                }
            `,
            variables: { p: projectId, n: name, a: amount },
        },
        token,
    );

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

describe("Expenses & incomes", () => {
    it("owner and members can create; outsiders cannot", async () => {
        const owner = await register("o@f.dev");
        const member = await register("m@f.dev");
        const outsider = await register("x@f.dev");
        const projectId = await createProject(owner.token);
        await addMember(owner.token, projectId, {
            token: member.token,
            email: "m@f.dev",
        });

        const o = await createExpense(owner.token, projectId, "rent", "100");
        const m = await createExpense(member.token, projectId, "tools", "50");
        const i = await createIncome(member.token, projectId, "sale", "200");
        expect(o.body.data.createExpense.name).toBe("rent");
        expect(m.body.data.createExpense.name).toBe("tools");
        expect(i.body.data.createIncome.amount).toBe("200");

        const blocked = await createExpense(outsider.token, projectId, "x", "1");
        expect(blocked.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("any project member can update/delete any expense; outsiders cannot", async () => {
        const owner = await register("o2@f.dev");
        const a = await register("a@f.dev");
        const b = await register("b@f.dev");
        const outsider = await register("xo2@f.dev");
        const projectId = await createProject(owner.token);
        await addMember(owner.token, projectId, { token: a.token, email: "a@f.dev" });
        await addMember(owner.token, projectId, { token: b.token, email: "b@f.dev" });

        const aExpense = await createExpense(a.token, projectId, "n", "10");
        const id: string = aExpense.body.data.createExpense.id;

        // member B (not the creator) can now update A's expense
        const bUpdate = await gqlRequest(
            app,
            {
                query: `
                    mutation U($id: ID!, $input: UpdateExpenseInput!) {
                        updateExpense(expenseId: $id, input: $input) {
                            name amount
                        }
                    }
                `,
                variables: { id, input: { name: "shared", amount: "15" } },
            },
            b.token,
        );
        expect(bUpdate.body.data.updateExpense.name).toBe("shared");
        expect(bUpdate.body.data.updateExpense.amount).toBe("15");

        // an outsider still cannot
        const outsiderUpdate = await gqlRequest(
            app,
            {
                query: `
                    mutation U($id: ID!, $input: UpdateExpenseInput!) {
                        updateExpense(expenseId: $id, input: $input) { id }
                    }
                `,
                variables: { id, input: { name: "hijack" } },
            },
            outsider.token,
        );
        expect(outsiderUpdate.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

        // member B can delete it too
        const bDelete = await gqlRequest(
            app,
            {
                query: `mutation D($id: ID!) { deleteExpense(expenseId: $id) }`,
                variables: { id },
            },
            b.token,
        );
        expect(bDelete.body.data.deleteExpense).toBe(true);
        expect(await prisma.expense.findUnique({ where: { id } })).toBeNull();
    });

    it("any project member can update/delete any income; outsiders cannot", async () => {
        const owner = await register("o3@f.dev");
        const a = await register("ai@f.dev");
        const b = await register("bi@f.dev");
        const outsider = await register("xo3@f.dev");
        const projectId = await createProject(owner.token);
        await addMember(owner.token, projectId, { token: a.token, email: "ai@f.dev" });
        await addMember(owner.token, projectId, { token: b.token, email: "bi@f.dev" });

        const aIncome = await createIncome(a.token, projectId, "sale", "300");
        const id: string = aIncome.body.data.createIncome.id;

        const outsiderDelete = await gqlRequest(
            app,
            {
                query: `mutation D($id: ID!) { deleteIncome(incomeId: $id) }`,
                variables: { id },
            },
            outsider.token,
        );
        expect(outsiderDelete.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

        // member B (not the creator) can delete A's income
        const bDelete = await gqlRequest(
            app,
            {
                query: `mutation D($id: ID!) { deleteIncome(incomeId: $id) }`,
                variables: { id },
            },
            b.token,
        );
        expect(bDelete.body.data.deleteIncome).toBe(true);
    });

    it("get expenses returns project entries for a member", async () => {
        const owner = await register("o4@f.dev");
        const projectId = await createProject(owner.token);
        await createExpense(owner.token, projectId, "rent", "100");
        await createExpense(owner.token, projectId, "fuel", "30");

        const list = await gqlRequest(
            app,
            {
                query: `query Q($p: ID!) { expenses(projectId: $p) { name amount } }`,
                variables: { p: projectId },
            },
            owner.token,
        );
        const names = list.body.data.expenses
            .map((e: { name: string }) => e.name)
            .sort();
        expect(names).toEqual(["fuel", "rent"]);
    });

    it("rejects non-positive amounts at the API boundary", async () => {
        const owner = await register("o5@f.dev");
        const projectId = await createProject(owner.token);
        const res = await createExpense(owner.token, projectId, "bad", "0");
        expect(res.body.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    });
});
