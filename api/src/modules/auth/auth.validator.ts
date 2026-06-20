import Joi from "joi";
import { badInput } from "../../errors/AppError";

// Wraps a Joi schema with a typed parse()
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

const password = Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Za-z]/, "letter")
    .pattern(/\d/, "digit")
    .required();

const email = Joi.string().email().max(254).lowercase().trim().required();

export const registerSchema = parser(
    Joi.object<{ email: string; password: string }>({
        email,
        password,
    }),
);

export const loginSchema = parser(
    Joi.object<{ email: string; password: string }>({
        email,
        password: Joi.string().required(),
    }),
);

export const refreshSchema = parser(
    Joi.object<{ refreshToken: string }>({
        refreshToken: Joi.string().required(),
    }),
);

export const signOutSchema = refreshSchema;
