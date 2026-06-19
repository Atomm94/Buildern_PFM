import { gql } from "graphql-tag";

export default gql`
  type Project {
    id: ID!
    name: String!
    location: String!
    creator: User!
    members: [ProjectMember!]!
    createdAt: String!
  }

  type ProjectMember {
    id: ID!
    user: User!
    joinedAt: String!
  }

  input UpdateProjectInput {
    name: String
    location: String
  }

  extend type Query {
    project(projectId: ID!): Project
    projects: [Project!]!
  }

  extend type Mutation {
    createProject(name: String!, location: String!): Project!
    updateProject(projectId: ID!, input: UpdateProjectInput!): Project!
    deleteProject(projectId: ID!): Boolean!
  }
`;
