import type { Express } from "express";

import { prisma } from "../../config/prisma";
import { createTestApp, gqlRequest } from "../helpers/testServer";
import { resetDb } from "../helpers/db";

let app: Express;

beforeAll(async () => {
    app = await createTestApp();
});

afterAll(async () => {
    await prisma.$disconnect();
});

beforeEach(async () => {
    await resetDb();
});

describe("Auth", () => {
    const email = "auth@test.dev";
    const password = "Passw0rd!";

    it("registers a user and returns access + refresh tokens", async () => {
        const res = await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) {
                        accessToken
                        refreshToken
                        user { id email }
                    }
                }
            `,
            variables: { e: email, p: password },
        });

        expect(res.body.errors).toBeUndefined();
        const data = res.body.data.register;
        expect(data.user.email).toBe(email);
        expect(data.accessToken).toEqual(expect.any(String));
        expect(data.refreshToken).toEqual(expect.any(String));
    });

    it("rejects registration when email already exists", async () => {
        await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) { accessToken }
                }
            `,
            variables: { e: email, p: password },
        });

        const res = await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) { accessToken }
                }
            `,
            variables: { e: email, p: password },
        });

        expect(res.body.errors?.[0]?.extensions?.code).toBe("CONFLICT");
    });

    it("logs in with correct credentials", async () => {
        await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) { accessToken }
                }
            `,
            variables: { e: email, p: password },
        });

        const res = await gqlRequest(app, {
            query: `
                mutation L($e: String!, $p: String!) {
                    login(email: $e, password: $p) { accessToken refreshToken }
                }
            `,
            variables: { e: email, p: password },
        });

        expect(res.body.data.login.accessToken).toEqual(expect.any(String));
    });

    it("rejects login with wrong password", async () => {
        await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) { accessToken }
                }
            `,
            variables: { e: email, p: password },
        });

        const res = await gqlRequest(app, {
            query: `
                mutation L($e: String!, $p: String!) {
                    login(email: $e, password: $p) { accessToken }
                }
            `,
            variables: { e: email, p: "WrongPass1" },
        });

        expect(res.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("blocks protected queries without a token", async () => {
        const res = await gqlRequest(app, {
            query: `query { projects { id } }`,
        });
        expect(res.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("rotates refresh tokens and detects reuse", async () => {
        const reg = await gqlRequest(app, {
            query: `
                mutation R($e: String!, $p: String!) {
                    register(email: $e, password: $p) {
                        accessToken refreshToken
                    }
                }
            `,
            variables: { e: email, p: password },
        });
        const firstRefresh: string = reg.body.data.register.refreshToken;

        const r1 = await gqlRequest(app, {
            query: `
                mutation Rf($t: String!) {
                    refreshToken(refreshToken: $t) {
                        accessToken refreshToken
                    }
                }
            `,
            variables: { t: firstRefresh },
        });
        expect(r1.body.data.refreshToken.refreshToken).not.toBe(firstRefresh);

        // Reusing the original (now revoked) refresh token must fail and
        // burn all sessions for the user.
        const reuse = await gqlRequest(app, {
            query: `
                mutation Rf($t: String!) {
                    refreshToken(refreshToken: $t) { accessToken }
                }
            `,
            variables: { t: firstRefresh },
        });
        expect(reuse.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");

        const newRefresh: string = r1.body.data.refreshToken.refreshToken;
        const afterBurn = await gqlRequest(app, {
            query: `
                mutation Rf($t: String!) {
                    refreshToken(refreshToken: $t) { accessToken }
                }
            `,
            variables: { t: newRefresh },
        });
        expect(afterBurn.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });
});
