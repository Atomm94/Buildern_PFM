// Translates Apollo / GraphQL errors into messages the UI can show directly.
// We trust the server's text for codes whose message is already user-facing
// (BAD_USER_INPUT, CONFLICT, NOT_FOUND, and UNAUTHENTICATED — e.g. "Invalid
// credentials" on login), and substitute friendlier text only for FORBIDDEN,
// which is usually context-free.

const FRIENDLY: Record<string, string> = {
    FORBIDDEN: "You don't have permission to do this.",
};

type GqlLike = {
    graphQLErrors?: Array<{
        message: string;
        extensions?: { code?: string };
    }>;
    networkError?: { message?: string } | null;
    message?: string;
};

export const apolloErrorMessage = (e: unknown): string => {
    const err = e as GqlLike | null | undefined;

    const gql = err?.graphQLErrors?.[0];
    if (gql) {
        const code = gql.extensions?.code;
        if (code && FRIENDLY[code]) return FRIENDLY[code];
        return gql.message || "Something went wrong.";
    }

    if (err?.networkError?.message) {
        return "Cannot reach the server. Please try again.";
    }

    if (e instanceof Error) return e.message;
    return "Something went wrong.";
};
