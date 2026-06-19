import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

// app shell: top nav + page outlet
export default function Layout() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    // sign out + go to login
    const handleSignOut = async () => {
        await signOut();
        navigate("/login");
    };

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
            <AppBar position="static" color="default" elevation={1}>
                <Toolbar>
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/projects"
                        sx={{ flexGrow: 1, color: "inherit", textDecoration: "none" }}
                    >
                        Buildern PFM
                    </Typography>
                    {user ? (
                        <>
                            <Button component={Link} to="/projects" color="inherit">
                                Projects
                            </Button>
                            <Button component={Link} to="/reports" color="inherit">
                                Budget report
                            </Button>
                            <Typography variant="body2" sx={{ mx: 2 }}>
                                {user.email}
                            </Typography>
                            <Button onClick={handleSignOut} color="inherit">
                                Sign out
                            </Button>
                        </>
                    ) : (
                        <Button component={Link} to="/login" color="inherit">
                            Login
                        </Button>
                    )}
                </Toolbar>
            </AppBar>
            <Container sx={{ py: 4 }}>
                <Outlet />
            </Container>
        </Box>
    );
}
