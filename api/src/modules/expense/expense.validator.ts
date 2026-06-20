import Joi from "joi";
import { Prisma } from "@prisma/client";

import { badInput } from "../../errors/AppError";

const parser = <T>(schema: Joi.ObjectSchema<T>) => ({
    parse: (value: unknown): T => {
        const { value: clean, error } = schema.validate(value, {
            abortEarly: true,
            stripUnknown: true,
        });
        if (error) throw badInput(error.details[0]?.message ?? "Invalid input");
        return clean as T;
    },
});

// Decimal scalar gives us a Prisma.Decimal.
const positiveAmount = Joi.any().custom((v) => {
    let d: Prisma.Decimal;
    try {
        d = v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
    } catch {
        throw new Error("amount must be a decimal");
    }
    if (d.lessThanOrEqualTo(0)) throw new Error("amount must be > 0");
    if (d.greaterThan("9999999999.99")) throw new Error("amount too large");
    return d;
});

export const createExpenseSchema = parser(
    Joi.object<{
        projectId: string;
        name: string;
        amount: Prisma.Decimal;
    }>({
        projectId: Joi.string().uuid().required(),
        name: Joi.string().trim().min(1).max(120).required(),
        amount: positiveAmount.required(),
    }),
);

export const updateExpenseSchema = parser(
    Joi.object<{
        expenseId: string;
        input: { name?: string; amount?: Prisma.Decimal };
    }>({
        expenseId: Joi.string().uuid().required(),
        input: Joi.object({
            name: Joi.string().trim().min(1).max(120),
            amount: positiveAmount,
        })
            .min(1)
            .required(),
    }),
);
