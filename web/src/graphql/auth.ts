import { gql } from "@apollo/client";

export const LOGIN = gql`
    mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
            accessToken
            refreshToken
            user {
                id
                email
            }
        }
    }
`;

export const REGISTER = gql`
    mutation Register($email: String!, $password: String!) {
        register(email: $email, password: $password) {
            accessToken
            refreshToken
            user {
                id
                email
            }
        }
    }
`;

export const SIGN_OUT = gql`
    mutation SignOut($refreshToken: String!) {
        signOut(refreshToken: $refreshToken)
    }
`;

export const ME = gql`
    query Me {
        me {
            id
            email
        }
    }
`;
