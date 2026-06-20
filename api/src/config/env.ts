import dotenv from "dotenv";

dotenv.config();

const required = (name: string): string => {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
};

export const env = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: Number(process.env.PORT ?? 4000),

    DATABASE_URL: required("DATABASE_URL"),

    JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
    JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),

    ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES ?? "15m",
    REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES ?? "7d",

    WEB_ORIGIN: (process.env.WEB_ORIGIN ?? "http://localhost:5173")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),

    WEB_BASE_URL: process.env.WEB_BASE_URL ?? "http://localhost:5173",

    SMTP_HOST: process.env.SMTP_HOST ?? "",
    SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    MAIL_FROM: process.env.MAIL_FROM ?? "acct61692@gmail.com",
} as const;

export const isProd = env.NODE_ENV === "production";
