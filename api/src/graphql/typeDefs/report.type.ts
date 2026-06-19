import { gql } from "graphql-tag";

export default gql`
  type BudgetReportItem {
    name: String!
    incomeTotal: Decimal!
    expenseTotal: Decimal!
    difference: Decimal!
  }

  extend type Query {
    budgetReport(projectId: ID!): [BudgetReportItem!]!
  }
`;
