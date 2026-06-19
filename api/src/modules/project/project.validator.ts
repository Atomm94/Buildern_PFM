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

export const createProjectSchema = parser(
    Joi.object<{ name: string; location: string }>({
        name: Joi.string().trim().min(1).max(120).required(),
        location: Joi.string().trim().min(1).max(120).required(),
    }),
);

export const updateProjectSchema = parser(
    Joi.object<{
        projectId: string;
        input: { name?: string; location?: string };
    }>({
        projectId: Joi.string().uuid().required(),
        input: Joi.object({
            name: Joi.string().trim().min(1).max(120),
            location: Joi.string().trim().min(1).max(120),
        })
            .min(1)
            .required(),
    }),
);
