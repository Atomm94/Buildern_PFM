import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = { sub: string; jti: string };

const accessOpts: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_EXPIRES as SignOptions["expiresIn"],
};
const refreshOpts: SignOptions = {
    expiresIn: env.REFRESH_TOKEN_EXPIRES as SignOptions["expiresIn"],
};

// `jti` keeps each issued token unique even when two are issued in the same
// second to the same user (e.g. register → immediate refresh).
// sign short-lived access token
export const signAccessToken = (userId: string) =>
    jwt.sign(
        { sub: userId, jti: crypto.randomUUID() },
        env.JWT_ACCESS_SECRET,
        accessOpts,
    );

// sign long-lived refresh token
export const signRefreshToken = (userId: string) =>
    jwt.sign(
        { sub: userId, jti: crypto.randomUUID() },
        env.JWT_REFRESH_SECRET,
        refreshOpts,
    );

// verify access token
export const verifyAccessToken = (token: string) =>
    jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

// verify refresh token
export const verifyRefreshToken = (token: string) =>
    jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
