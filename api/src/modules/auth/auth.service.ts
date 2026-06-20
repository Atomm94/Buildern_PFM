import crypto from "node:crypto";
import type { User } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { hashPassword, comparePassword } from "../../utils/password";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
} from "../../utils/token";
import {
    badInput,
    conflict,
    unauthenticated,
} from "../../errors/AppError";

export type AuthPayload = {
    user: User;
    accessToken: string;
    refreshToken: string;
};

const REFRESH_TTL_DAYS = 7;

const hashToken = (token: string) =>
    crypto.createHash("sha256").update(token).digest("hex");

const refreshExpiry = () => {
    const d = new Date();
    d.setDate(d.getDate() + REFRESH_TTL_DAYS);
    return d;
};

// issue access + refresh pair (store hashed refresh)
const issueTokens = async (
    userId: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);

    await prisma.refreshToken.create({
        data: {
            userId,
            tokenHash: hashToken(refreshToken),
            expiresAt: refreshExpiry(),
        },
    });

    return { accessToken, refreshToken };
};

export class AuthService {
    // register new user
    static async register(
        email: string,
        password: string,
    ): Promise<AuthPayload> {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw conflict("Registration failed");

        const user = await prisma.user.create({
            data: { email, passwordHash: await hashPassword(password) },
        });

        const tokens = await issueTokens(user.id);
        return { user, ...tokens };
    }

    // login
    static async login(
        email: string,
        password: string,
    ): Promise<AuthPayload> {
        const user = await prisma.user.findUnique({ where: { email } });
        // Same error message for unknown email and wrong password.
        if (!user) throw unauthenticated("Invalid credentials");

        const ok = await comparePassword(password, user.passwordHash);
        if (!ok) throw unauthenticated("Invalid credentials");

        const tokens = await issueTokens(user.id);
        return { user, ...tokens };
    }

    // Rotates the refresh token.
    static async refresh(refreshToken: string): Promise<AuthPayload> {
        let payload: { sub: string };
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch {
            throw unauthenticated("Invalid refresh token");
        }

        const tokenHash = hashToken(refreshToken);
        const stored = await prisma.refreshToken.findUnique({
            where: { tokenHash },
        });

        if (!stored || stored.userId !== payload.sub) {
            throw unauthenticated("Invalid refresh token");
        }

        // Presented token was already revoked. Burn all sessions.
        if (stored.revokedAt) {
            await prisma.refreshToken.updateMany({
                where: { userId: stored.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            throw unauthenticated("Refresh token reuse detected");
        }

        if (stored.expiresAt.getTime() <= Date.now()) {
            throw unauthenticated("Refresh token expired");
        }

        const user = await prisma.user.findUnique({
            where: { id: stored.userId },
        });
        if (!user) throw unauthenticated("Invalid refresh token");

        // Issue the new pair, then revoke the old row.
        const tokens = await issueTokens(user.id);
        await prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        });

        return { user, ...tokens };
    }

    // sign out (revoke refresh token)
    static async signOut(refreshToken: string): Promise<boolean> {
        if (!refreshToken) throw badInput("Missing refresh token");

        const tokenHash = hashToken(refreshToken);
        await prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return true;
    }
}
