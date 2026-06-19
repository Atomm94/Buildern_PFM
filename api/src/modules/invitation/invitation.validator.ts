import Joi from "joi";
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

export const inviteSchema = parser(
    Joi.object<{ projectId: string; email: string }>({
        projectId: Joi.string().uuid().required(),
        email: Joi.string().email().max(254).required(),
    }),
);

export const tokenActionSchema = parser(
    Joi.object<{ token: string }>({
        token: Joi.string().hex().length(64).required(),
    }),
);
