import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { authLink, errorLink } from "./links";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/graphql";

export const createClient = (onAuthFailure: () => void) => {
    const httpLink = new HttpLink({ uri: API_URL });
    return new ApolloClient({
        link: from([errorLink(API_URL, onAuthFailure), authLink, httpLink]),
        cache: new InMemoryCache(),
    });
};
