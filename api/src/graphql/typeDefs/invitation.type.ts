import { gql } from "graphql-tag";

export default gql`
  type Invitation {
    id: ID!
    status: String!
    email: String!
    project: Project!
    createdAt: String!
  }

  type InvitationPreview {
    email: String!
    status: String!
    projectName: String!
  }

  extend type Query {
    projectInvitations(projectId: ID!): [Invitation!]!
    invitationPreview(token: String!): InvitationPreview
  }

  extend type Mutation {
    inviteUser(projectId: ID!, email: String!): Invitation!
    acceptInvitation(token: String!): Boolean!
    rejectInvitation(token: String!): Boolean!
  }
`;
