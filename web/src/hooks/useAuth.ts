import { createContext, useContext } from "react";

export type AuthUser = { id: string; email: string };

export type AuthContextValue = {
    user: AuthUser | null;
    signIn: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => void;
    signOut: () => Promise<void>;
    isReady: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};
