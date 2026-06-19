import { useCallback, useMemo, useRef } from "react";
import { ApolloProvider } from "@apollo/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
    useNavigate,
} from "react-router-dom";

import { createClient } from "./apollo/client";
import { AuthProvider } from "./providers/AuthProvider";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import InvitationAccept from "./pages/InvitationAccept";
import BudgetReport from "./pages/BudgetReport";
import Dashboard from "./pages/Dashboard";

const theme = createTheme();

// Inner shell so we can use react-router's navigate inside the error-link
// callback. The client is created once with a stable callback ref.
function AppShell() {
    const navigate = useNavigate();
    const navRef = useRef(navigate);
    navRef.current = navigate;

    const onAuthFailure = useCallback(() => {
        navRef.current("/login", { replace: true });
    }, []);

    const client = useMemo(() => createClient(onAuthFailure), [onAuthFailure]);

    return (
        <ApolloProvider client={client}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    {/* Public: the invited user reaches this before signing in.
                        It drives its own auth so it stays independent of any
                        owner session already open in the browser. */}
                    <Route
                        path="/invitations/accept"
                        element={<InvitationAccept />}
                    />
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route
                                path="/projects/:projectId"
                                element={<ProjectDetail />}
                            />
                            <Route path="/reports" element={<BudgetReport />} />
                        </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </ApolloProvider>
    );
}

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <AppShell />
            </BrowserRouter>
        </ThemeProvider>
    );
}
