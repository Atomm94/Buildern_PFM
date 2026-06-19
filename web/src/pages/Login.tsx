import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";

import { LOGIN } from "../graphql/auth";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, type LoginValues } from "../validators/auth";
import { apolloErrorMessage } from "../utils/errors";

// login page
export default function Login() {
    const [login, { loading }] = useMutation(LOGIN);
    const navigate = useNavigate();
    const location = useLocation();
    const nav = location.state as
        | { from?: { pathname: string; search: string }; email?: string }
        | null;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        resolver: yupResolver(loginSchema),
        defaultValues: { email: nav?.email ?? "" },
    });
    const { signIn } = useAuth();
    const [err, setErr] = useState<string | null>(null);

    const onSubmit = async (form: LoginValues) => {
        setErr(null);
        try {
            const res = await login({ variables: form });
            const data = res.data?.login;
            if (!data) throw new Error("Login failed");
            signIn(data.user, {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            });
            // Bounce back to the page that sent us here if there is one.
            const from = nav?.from;
            const dest = from ? `${from.pathname}${from.search}` : "/projects";
            navigate(dest, { replace: true });
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Paper sx={{ p: 4, width: 360 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Sign in
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
                        autoComplete="current-password"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        {...register("password")}
                    />
                    <Button type="submit" variant="contained" disabled={loading}>
                        Login
                    </Button>
                    <Button
                        variant="text"
                        onClick={() => navigate("/register", { state: nav })}
                    >
                        Need an account? Register
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
