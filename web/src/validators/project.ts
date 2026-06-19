import * as yup from "yup";

export const createProjectSchema = yup
    .object({
        name: yup
            .string()
            .trim()
            .min(1, "Name is required")
            .max(120, "Too long")
            .required("Name is required"),
        location: yup
            .string()
            .trim()
            .min(1, "Location is required")
            .max(120, "Too long")
            .required("Location is required"),
    })
    .required();

export type CreateProjectValues = yup.InferType<typeof createProjectSchema>;
