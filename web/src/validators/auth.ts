import * as yup from "yup";

export const loginSchema = yup
    .object({
        email: yup.string().email("Invalid email").required("Email is required"),
        password: yup.string().required("Password is required"),
    })
    .required();

export const registerSchema = yup
    .object({
        email: yup.string().email("Invalid email").required("Email is required"),
        password: yup
            .string()
            .min(8, "At least 8 characters")
            .matches(/[A-Za-z]/, "Must contain a letter")
            .matches(/\d/, "Must contain a digit")
            .required("Password is required"),
    })
    .required();

export type LoginValues = yup.InferType<typeof loginSchema>;
export type RegisterValues = yup.InferType<typeof registerSchema>;
