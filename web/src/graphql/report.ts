import { gql } from "@apollo/client";

export const BUDGET_REPORT = gql`
    query BudgetReport($projectId: ID!) {
        budgetReport(projectId: $projectId) {
            name
            incomeTotal
            expenseTotal
            difference
        }
    }
`;
