import { useCallback, useEffect, useMemo, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";

import {
    AuthContext,
    type AuthContextValue,
    type AuthUser,
} from "../hooks/useAuth";
import { ME, SIGN_OUT } from "../graphql/auth";
import { tokenStore } from "../utils/token";

type Props = { children: React.ReactNode };

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/graphql";

const exchangeRefreshToken = async (refreshToken: string) => {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `
                    mutation Rf($t: String!) {
                        refreshToken(refreshToken: $t) {
                            accessToken refreshToken user { id email }
                        }
                    }
                `,
                variables: { t: refreshToken },
            }),
        });
        const json = (await res.json()) as {
            data?: {
                refreshToken?: {
                    accessToken: string;
                    refreshToken: string;
                    user: AuthUser;
                };
            };
        };
        return json.data?.refreshToken ?? null;
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }: Props) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isReady, setIsReady] = useState(false);
    const client = useApolloClient();
    const [signOutMutation] = useMutation(SIGN_OUT);

    // On mount: rotate the refresh token (if any) to obtain a fresh access
    // token, then call `me` to confirm. If there's no refresh token, we're
    // simply not logged in.
    useEffect(() => {
        let cancelled = false;

        const boot = async () => {
            const refreshToken = tokenStore.getRefresh();
            if (refreshToken) {
                const rotated = await exchangeRefreshToken(refreshToken);
                if (rotated) {
                    tokenStore.setAccess(rotated.accessToken);
                    tokenStore.setRefresh(rotated.refreshToken);
                    if (!cancelled) setUser(rotated.user);
                } else {
                    tokenStore.clear();
                    if (!cancelled) setUser(null);
                }
            } else {
                // Already-logged-in via signIn() will have populated the access
                // token; double-check with `me`.
                if (tokenStore.getAccess()) {
                    try {
                        const res = await client.query<{ me: AuthUser | null }>({
                            query: ME,
                            fetchPolicy: "network-only",
                        });
                        if (!cancelled) setUser(res.data.me ?? null);
                    } catch {
                        if (!cancelled) setUser(null);
                    }
                } else if (!cancelled) {
                    setUser(null);
                }
            }
            if (!cancelled) setIsReady(true);
        };

        void boot();
        return () => {
            cancelled = true;
        };
    }, [client]);

    // sign in: store tokens + user
    const signIn: AuthContextValue["signIn"] = useCallback(
        (u, tokens) => {
            tokenStore.setAccess(tokens.accessToken);
            tokenStore.setRefresh(tokens.refreshToken);
            setUser(u);
            void client.resetStore();
        },
        [client],
    );

    // sign out: revoke refresh + clear local session
    const signOut: AuthContextValue["signOut"] = useCallback(async () => {
        const rt = tokenStore.getRefresh();
        if (rt) {
            try {
                await signOutMutation({ variables: { refreshToken: rt } });
            } catch {
                // best-effort: still drop the local session
            }
        }
        tokenStore.clear();
        setUser(null);
        await client.resetStore();
    }, [client, signOutMutation]);

    const value = useMemo<AuthContextValue>(
        () => ({ user, isReady, signIn, signOut }),
        [user, isReady, signIn, signOut],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
