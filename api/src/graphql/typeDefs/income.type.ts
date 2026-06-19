import { gql } from "graphql-tag";

export default gql`
  type Income {
    id: ID!
    name: String!
    amount: Decimal!
    projectId: ID!
    createdAt: String!
  }

  input UpdateIncomeInput {
    name: String
    amount: Decimal
  }

  extend type Query {
    incomes(projectId: ID!): [Income!]!
  }

  extend type Mutation {
    createIncome(projectId: ID!, name: String!, amount: Decimal!): Income!
    updateIncome(incomeId: ID!, input: UpdateIncomeInput!): Income!
    deleteIncome(incomeId: ID!): Boolean!
  }
`;
