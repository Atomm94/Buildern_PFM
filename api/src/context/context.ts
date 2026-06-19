import type { Request } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { verifyAccessToken } from "../utils/token";
import { unauthenticated } from "../errors/AppError";
import { createLoaders, type Loaders } from "../graphql/loaders";

export type Context = {
    user: User | null;
    prisma: typeof prisma;
    loaders: Loaders;
};

export const createContext = async ({
    req,
}: {
    req: Request;
}): Promise<Context> => {
    const ctx: Context = {
        user: null,
        prisma,
        loaders: createLoaders(),
    };

    const header = req.headers.authorization;
    if (!header) return ctx;

    const token = header.startsWith("Bearer ")
        ? header.slice("Bearer ".length)
        : header;

    try {
        const payload = verifyAccessToken(token);
        ctx.user = await prisma.user.findUnique({
            where: { id: payload.sub },
        });
    } catch {
        // invalid/expired token => stay unauthenticated
    }

    return ctx;
};

export const requireAuth = (ctx: Context): User => {
    if (!ctx.user) throw unauthenticated();
    return ctx.user;
};
