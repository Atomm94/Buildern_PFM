import { GraphQLError } from "graphql";

// Thin wrappers around GraphQLError so resolvers don't repeat the boilerplate.

export const unauthenticated = (message = "Not authenticated") =>
    new GraphQLError(message, { extensions: { code: "UNAUTHENTICATED" } });

export const forbidden = (message = "Forbidden") =>
    new GraphQLError(message, { extensions: { code: "FORBIDDEN" } });

export const notFound = (message = "Not found") =>
    new GraphQLError(message, { extensions: { code: "NOT_FOUND" } });

export const badInput = (message: string) =>
    new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });

export const conflict = (message: string) =>
    new GraphQLError(message, { extensions: { code: "CONFLICT" } });
