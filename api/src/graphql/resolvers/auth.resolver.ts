import type { Context } from "../../context/context";
import { AuthService } from "../../modules/auth/auth.service";
import {
    loginSchema,
    registerSchema,
    refreshSchema,
    signOutSchema,
} from "../../modules/auth/auth.validator";

type AuthArgs = { email: string; password: string };
type TokenArg = { refreshToken: string };

export default {
    Query: {
        // current user
        me: (_: unknown, __: unknown, ctx: Context) => ctx.user,
    },
    Mutation: {
        // register
        register: async (_: unknown, args: AuthArgs) => {
            const { email, password } = registerSchema.parse(args);
            return AuthService.register(email, password);
        },
        // login
        login: async (_: unknown, args: AuthArgs) => {
            const { email, password } = loginSchema.parse(args);
            return AuthService.login(email, password);
        },
        // rotate tokens
        refreshToken: async (_: unknown, args: TokenArg) => {
            const { refreshToken } = refreshSchema.parse(args);
            return AuthService.refresh(refreshToken);
        },
        // sign out
        signOut: async (_: unknown, args: TokenArg) => {
            const { refreshToken } = signOutSchema.parse(args);
            return AuthService.signOut(refreshToken);
        },
    },
};
