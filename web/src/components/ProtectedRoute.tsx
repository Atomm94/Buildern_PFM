import { Navigate, Outlet, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";

import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
    const { user, isReady } = useAuth();
    const location = useLocation();

    if (!isReady) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }
    if (!user) {
        // Preserve the destination so Login can redirect back after sign-in.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <Outlet />;
}
