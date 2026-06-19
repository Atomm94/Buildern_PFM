import type { Express } from "express";

import { prisma } from "../../config/prisma";
import { createTestApp, gqlRequest } from "../helpers/testServer";
import { resetDb } from "../helpers/db";

let app: Express;

const setup = async () => {
    const reg = await gqlRequest(app, {
        query: `
            mutation R($e: String!, $p: String!) {
                register(email: $e, password: $p) {
                    accessToken user { id }
                }
            }
        `,
        variables: { e: "report@test.dev", p: "Passw0rd!" },
    });
    const token: string = reg.body.data.register.accessToken;

    const proj = await gqlRequest(
        app,
        {
            query: `
                mutation C($n: String!, $l: String!) {
                    createProject(name: $n, location: $l) { id }
                }
            `,
            variables: { n: "Build", l: "On site" },
        },
        token,
    );
    const projectId: string = proj.body.data.createProject.id;

    const addExpense = (name: string, amount: number) =>
        gqlRequest(
            app,
            {
                query: `
                    mutation E($p: ID!, $n: String!, $a: Decimal!) {
                        createExpense(projectId: $p, name: $n, amount: $a) { id }
                    }
                `,
                variables: { p: projectId, n: name, a: amount },
            },
            token,
        );

    const addIncome = (name: string, amount: number) =>
        gqlRequest(
            app,
            {
                query: `
                    mutation I($p: ID!, $n: String!, $a: Decimal!) {
                        createIncome(projectId: $p, name: $n, amount: $a) { id }
                    }
                `,
                variables: { p: projectId, n: name, a: amount },
            },
            token,
        );

    await addExpense("Rent", 100);
    await addExpense("rent", 50);
    await addExpense("Materials", 200);
    await addIncome("Rent", 30);
    await addIncome("Sales", 500);

    return { token, projectId };
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

type ReportItem = {
    name: string;
    incomeTotal: string;
    expenseTotal: string;
    difference: string;
};

const fetchReport = async (token: string, projectId: string) => {
    const res = await gqlRequest(
        app,
        {
            query: `
                query B($p: ID!) {
                    budgetReport(projectId: $p) {
                        name incomeTotal expenseTotal difference
                    }
                }
            `,
            variables: { p: projectId },
        },
        token,
    );
    return res.body.data.budgetReport as ReportItem[];
};

describe("Budget report", () => {
    it("aggregates records with the same name (after lowercase + trim)", async () => {
        const { token, projectId } = await setup();

        // setup() adds: expense Rent=100, expense rent=50, income Rent=30.
        // All three share the normalised key "rent" and should collapse
        // into a single row.
        const items = await fetchReport(token, projectId);

        const rent = items.find((i) => i.name === "rent");
        expect(rent).toBeDefined();
        expect(Number(rent!.expenseTotal)).toBe(150);
        expect(Number(rent!.incomeTotal)).toBe(30);
        expect(Number(rent!.difference)).toBe(-120);
    });

    it("includes names that exist only in expenses or only in incomes", async () => {
        const { token, projectId } = await setup();

        // setup() adds: expense Materials=200 (no matching income)
        //           and: income  Sales=500     (no matching expense)
        const items = await fetchReport(token, projectId);

        const materials = items.find((i) => i.name === "materials");
        expect(materials).toBeDefined();
        expect(Number(materials!.expenseTotal)).toBe(200);
        expect(Number(materials!.incomeTotal)).toBe(0);
        expect(Number(materials!.difference)).toBe(-200);

        const sales = items.find((i) => i.name === "sales");
        expect(sales).toBeDefined();
        expect(Number(sales!.incomeTotal)).toBe(500);
        expect(Number(sales!.expenseTotal)).toBe(0);
        expect(Number(sales!.difference)).toBe(500);
    });

    it("preserves decimal precision through aggregation", async () => {
        const { token, projectId } = await setup();

        // Sum the values to a number that JS floats round badly.
        await gqlRequest(
            app,
            {
                query: `
                    mutation E($p: ID!, $n: String!, $a: Decimal!) {
                        createExpense(projectId: $p, name: $n, amount: $a) { id }
                    }
                `,
                variables: { p: projectId, n: "precise", a: "0.10" },
            },
            token,
        );
        await gqlRequest(
            app,
            {
                query: `
                    mutation E($p: ID!, $n: String!, $a: Decimal!) {
                        createExpense(projectId: $p, name: $n, amount: $a) { id }
                    }
                `,
                variables: { p: projectId, n: "precise", a: "0.20" },
            },
            token,
        );

        const res = await gqlRequest(
            app,
            {
                query: `
                    query B($p: ID!) {
                        budgetReport(projectId: $p) { name expenseTotal }
                    }
                `,
                variables: { p: projectId },
            },
            token,
        );
        const precise = res.body.data.budgetReport.find(
            (r: { name: string }) => r.name === "precise",
        );
        // String comparison so 0.30 isn't lost to 0.30000000000000004.
        expect(precise.expenseTotal).toBe("0.3");
    });

    it("forbids report for non-members", async () => {
        const { projectId } = await setup();

        const outsider = await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) { accessToken }
                }
            `,
            variables: { e: "outsider-report@test.dev", p: "Passw0rd!" },
        });
        const outsiderToken: string = outsider.body.data.register.accessToken;

        const res = await gqlRequest(
            app,
            {
                query: `
                    query B($p: ID!) {
                        budgetReport(projectId: $p) { name }
                    }
                `,
                variables: { p: projectId },
            },
            outsiderToken,
        );
        expect(res.body.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");
    });
});
