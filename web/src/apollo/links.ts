import { fromPromise, Observable } from "@apollo/client";
import type { FetchResult } from "@apollo/client/link/core";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";

import { tokenStore } from "../utils/token";

// attach access token to every request
export const authLink = setContext((_, { headers }) => {
    const token = tokenStore.getAccess();
    return {
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };
});

// Exchange the stored refresh token for a fresh pair. Direct fetch avoids
// re-entering Apollo and looping the error link.
const refreshAccessToken = async (apiUrl: string): Promise<string | null> => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return null;

    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `
                    mutation Rf($t: String!) {
                        refreshToken(refreshToken: $t) {
                            accessToken refreshToken
                        }
                    }
                `,
                variables: { t: refreshToken },
            }),
        });
        const json = (await res.json()) as {
            data?: {
                refreshToken?: { accessToken: string; refreshToken: string };
            };
        };
        const payload = json.data?.refreshToken;
        if (!payload) return null;
        tokenStore.setAccess(payload.accessToken);
        tokenStore.setRefresh(payload.refreshToken);
        return payload.accessToken;
    } catch {
        return null;
    }
};

// On UNAUTHENTICATED, refresh once and retry the failed operation. If refresh
// fails the UI redirects to /login via tokenStore.clear() + onAuthFailure.
// Auth operations carry their own UNAUTHENTICATED errors (e.g. "Invalid
// credentials" on login). Those must reach the component, not trigger a
// refresh/redirect, so the form can display the backend message.
const AUTH_OPERATIONS = new Set([
    "Login",
    "Register",
    "Rf",
    "SignOut",
]);

export const errorLink = (apiUrl: string, onAuthFailure: () => void) =>
    onError(({ graphQLErrors, operation, forward }) => {
        if (AUTH_OPERATIONS.has(operation.operationName)) return;

        const unauth = graphQLErrors?.some(
            (e) => e.extensions?.code === "UNAUTHENTICATED",
        );
        if (!unauth) return;

        return fromPromise(refreshAccessToken(apiUrl)).flatMap((token) => {
            if (!token) {
                tokenStore.clear();
                onAuthFailure();
                return new Observable<FetchResult>((sub) => sub.complete());
            }
            const ctx = operation.getContext();
            operation.setContext({
                ...ctx,
                headers: {
                    ...(ctx.headers as Record<string, string>),
                    Authorization: `Bearer ${token}`,
                },
            });
            return forward(operation);
        });
    });
