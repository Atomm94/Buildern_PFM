import type { Income, Prisma } from "@prisma/client";

import type { Context } from "../../context/context";
import { requireAuth } from "../../context/context";
import { IncomeService } from "../../modules/income/income.service";
import {
    createIncomeSchema,
    updateIncomeSchema,
} from "../../modules/income/income.validator";

type CreateArgs = { projectId: string; name: string; amount: Prisma.Decimal };
type UpdateArgs = {
    incomeId: string;
    input: { name?: string; amount?: Prisma.Decimal };
};

export default {
    Query: {
        // list incomes
        incomes: (_: unknown, args: { projectId: string }, ctx: Context) => {
            const user = requireAuth(ctx);
            return IncomeService.list(user.id, args.projectId);
        },
    },
    Mutation: {
        // add income
        createIncome: (_: unknown, args: CreateArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { projectId, name, amount } = createIncomeSchema.parse(args);
            return IncomeService.create(user.id, projectId, name, amount);
        },
        // edit income
        updateIncome: (_: unknown, args: UpdateArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { incomeId, input } = updateIncomeSchema.parse(args);
            return IncomeService.update(user.id, incomeId, input);
        },
        // remove income
        deleteIncome: (
            _: unknown,
            args: { incomeId: string },
            ctx: Context,
        ) => {
            const user = requireAuth(ctx);
            return IncomeService.delete(user.id, args.incomeId);
        },
    },
    Income: {
        createdAt: (i: Income) => i.createdAt.toISOString(),
    },
};
