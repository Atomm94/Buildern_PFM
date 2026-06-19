import { gql } from "@apollo/client";

export const GET_EXPENSES = gql`
    query GetExpenses($projectId: ID!) {
        expenses(projectId: $projectId) {
            id
            name
            amount
            createdAt
        }
    }
`;

export const CREATE_EXPENSE = gql`
    mutation CreateExpense($projectId: ID!, $name: String!, $amount: Decimal!) {
        createExpense(projectId: $projectId, name: $name, amount: $amount) {
            id
        }
    }
`;

export const GET_INCOMES = gql`
    query GetIncomes($projectId: ID!) {
        incomes(projectId: $projectId) {
            id
            name
            amount
            createdAt
        }
    }
`;

export const CREATE_INCOME = gql`
    mutation CreateIncome($projectId: ID!, $name: String!, $amount: Decimal!) {
        createIncome(projectId: $projectId, name: $name, amount: $amount) {
            id
        }
    }
`;

export const UPDATE_EXPENSE = gql`
    mutation UpdateExpense($expenseId: ID!, $input: UpdateExpenseInput!) {
        updateExpense(expenseId: $expenseId, input: $input) {
            id
            name
            amount
        }
    }
`;

export const UPDATE_INCOME = gql`
    mutation UpdateIncome($incomeId: ID!, $input: UpdateIncomeInput!) {
        updateIncome(incomeId: $incomeId, input: $input) {
            id
            name
            amount
        }
    }
`;

export const DELETE_EXPENSE = gql`
    mutation DeleteExpense($expenseId: ID!) {
        deleteExpense(expenseId: $expenseId)
    }
`;

export const DELETE_INCOME = gql`
    mutation DeleteIncome($incomeId: ID!) {
        deleteIncome(incomeId: $incomeId)
    }
`;
