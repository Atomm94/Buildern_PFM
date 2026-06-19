import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import request from "supertest";

import { schema } from "../../graphql/schema";
import { createContext, type Context } from "../../context/context";

export const createTestApp = async () => {
    const app = express();

    const apollo = new ApolloServer<Context>({ schema });
    await apollo.start();

    app.use(
        "/graphql",
        express.json(),
        expressMiddleware(apollo, { context: createContext }),
    );

    return app;
};

type Vars = Record<string, unknown>;

export const gqlRequest = (
    app: express.Express,
    body: { query: string; variables?: Vars },
    token?: string,
) => {
    const req = request(app).post("/graphql");
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req.send(body);
};
