import { gql } from "graphql-tag";

export default gql`
  type Expense {
    id: ID!
    name: String!
    amount: Decimal!
    projectId: ID!
    createdAt: String!
  }

  input UpdateExpenseInput {
    name: String
    amount: Decimal
  }

  extend type Query {
    expenses(projectId: ID!): [Expense!]!
  }

  extend type Mutation {
    createExpense(projectId: ID!, name: String!, amount: Decimal!): Expense!
    updateExpense(expenseId: ID!, input: UpdateExpenseInput!): Expense!
    deleteExpense(expenseId: ID!): Boolean!
  }
`;
