import http from "node:http";
import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import type { GraphQLFormattedError } from "graphql";

import { schema } from "./graphql/schema";
import { createContext, type Context } from "./context/context";
import { env, isProd } from "./config/env";
import { prisma } from "./config/prisma";

const formatError = (err: GraphQLFormattedError): GraphQLFormattedError => {
    // Hide internals in production; keep messages + extension codes.
    if (isProd) {
        const code = err.extensions?.code ?? "INTERNAL_SERVER_ERROR";
        const safe =
            code === "INTERNAL_SERVER_ERROR"
                ? "Internal server error"
                : err.message;
        return { message: safe, extensions: { code } };
    }
    return err;
};

async function bootstrap() {
    const app = express();

    app.use(
        cors({
            origin: (origin, cb) => {
                // allow same-origin / curl (no origin) and listed web origins
                if (!origin || env.WEB_ORIGIN.includes(origin)) {
                    return cb(null, true);
                }
                cb(new Error(`Origin not allowed: ${origin}`));
            },
            credentials: true,
        }),
    );

    app.get("/healthz", (_req, res) => {
        res.json({ ok: true });
    });

    const apollo = new ApolloServer<Context>({
        schema,
        introspection: !isProd,
        formatError,
    });

    await apollo.start();

    app.use(
        "/graphql",
        express.json({ limit: "1mb" }),
        expressMiddleware(apollo, { context: createContext }),
    );

    const server = http.createServer(app);
    server.listen(env.PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`API ready on http://localhost:${env.PORT}/graphql`);
    });

    const shutdown = async (signal: string) => {
        console.log(`${signal} received, shutting down...`);
        server.close();
        await apollo.stop();
        await prisma.$disconnect();
        process.exit(0);
    };
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
    console.error("Fatal bootstrap error:", err);
    process.exit(1);
});
