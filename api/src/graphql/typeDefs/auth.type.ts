import { gql } from "graphql-tag";

export default gql`
  type User {
    id: ID!
    email: String!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    register(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    signOut(refreshToken: String!): Boolean!
  }
`;
