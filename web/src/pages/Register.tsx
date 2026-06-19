import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";

import { REGISTER } from "../graphql/auth";
import { useAuth } from "../hooks/useAuth";
import { registerSchema, type RegisterValues } from "../validators/auth";
import { apolloErrorMessage } from "../utils/errors";

// register page
export default function Register() {
    const [registerMutation, { loading }] = useMutation(REGISTER);
    const navigate = useNavigate();
    const location = useLocation();
    const nav = location.state as
        | { from?: { pathname: string; search: string }; email?: string }
        | null;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterValues>({
        resolver: yupResolver(registerSchema),
        defaultValues: { email: nav?.email ?? "" },
    });
    const { signIn } = useAuth();
    const [err, setErr] = useState<string | null>(null);

    const onSubmit = async (form: RegisterValues) => {
        setErr(null);
        try {
            const res = await registerMutation({ variables: form });
            const data = res.data?.register;
            if (!data) throw new Error("Registration failed");
            signIn(data.user, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            const from = nav?.from;
            navigate(from ? `${from.pathname}${from.search}` : "/projects", {
                replace: true,
            });
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Paper sx={{ p: 4, width: 360 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Create account
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit(onSubmit)}
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                    {err && <Alert severity="error">{err}</Alert>}
                    <TextField
                        label="Email"
                        type="email"
                        autoComplete="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        {...register("email")}
                    />
                    <TextField
                        label="Password"
                        type="password"
                        autoComplete="new-password"
                        error={!!errors.password}
                        helperText={
                            errors.password?.message ??
                            "At least 8 chars with a letter and a digit"
                        }
                        {...register("password")}
                    />
                    <Button type="submit" variant="contained" disabled={loading}>
                        Register
                    </Button>
                    <Button
                        variant="text"
                        onClick={() => navigate("/login", { state: nav })}
                    >
                        Already have an account? Sign in
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
