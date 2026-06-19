import type { Expense, Prisma } from "@prisma/client";

import type { Context } from "../../context/context";
import { requireAuth } from "../../context/context";
import { ExpenseService } from "../../modules/expense/expense.service";
import {
    createExpenseSchema,
    updateExpenseSchema,
} from "../../modules/expense/expense.validator";

type CreateArgs = { projectId: string; name: string; amount: Prisma.Decimal };
type UpdateArgs = {
    expenseId: string;
    input: { name?: string; amount?: Prisma.Decimal };
};

export default {
    Query: {
        // list expenses
        expenses: (_: unknown, args: { projectId: string }, ctx: Context) => {
            const user = requireAuth(ctx);
            return ExpenseService.list(user.id, args.projectId);
        },
    },
    Mutation: {
        // add expense
        createExpense: (_: unknown, args: CreateArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { projectId, name, amount } = createExpenseSchema.parse(args);
            return ExpenseService.create(user.id, projectId, name, amount);
        },
        // edit expense
        updateExpense: (_: unknown, args: UpdateArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { expenseId, input } = updateExpenseSchema.parse(args);
            return ExpenseService.update(user.id, expenseId, input);
        },
        // remove expense
        deleteExpense: (
            _: unknown,
            args: { expenseId: string },
            ctx: Context,
        ) => {
            const user = requireAuth(ctx);
            return ExpenseService.delete(user.id, args.expenseId);
        },
    },
    Expense: {
        createdAt: (e: Expense) => e.createdAt.toISOString(),
    },
};
