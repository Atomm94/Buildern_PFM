import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
    useLocation,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from "@mui/material";

import {
    ACCEPT_INVITATION,
    INVITATION_PREVIEW,
    REJECT_INVITATION,
} from "../graphql/invitation";
import { GET_PROJECTS } from "../graphql/project";
import { useAuth } from "../hooks/useAuth";
import { apolloErrorMessage } from "../utils/errors";

type Preview = { email: string; status: string; projectName: string };

// invitation accept / reject page (public, token-gated)
export default function InvitationAccept() {
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isReady } = useAuth();

    const preview = useQuery<{ invitationPreview: Preview | null }>(
        INVITATION_PREVIEW,
        { variables: { token }, skip: !token },
    );

    // Refetch the projects list so the newly joined project shows up if the
    // user was already browsing before accepting.
    const [accept, acceptState] = useMutation(ACCEPT_INVITATION, {
        refetchQueries: [GET_PROJECTS],
    });
    const [reject, rejectState] = useMutation(REJECT_INVITATION);
    const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const busy = acceptState.loading || rejectState.loading;

    const handle = (
        run: typeof accept,
        kind: "accepted" | "rejected",
    ) => async () => {
        setErr(null);
        try {
            await run({ variables: { token } });
            setDone(kind);
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    // Carry the visitor back to this exact link after they authenticate, and
    // prefill the invited email so they sign in / register as the right account.
    const goToAuth = (path: "/login" | "/register", email: string) =>
        navigate(path, {
            state: {
                from: { pathname: location.pathname, search: location.search },
                email,
            },
        });

    const card = (children: React.ReactNode) => (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
            <Paper sx={{ p: 4, width: 440 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                    Project invitation
                </Typography>
                {children}
            </Paper>
        </Box>
    );

    if (!token) {
        return card(
            <Alert severity="error">Missing invitation token in URL.</Alert>,
        );
    }

    if (!isReady || preview.loading) {
        return card(
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress />
            </Box>,
        );
    }

    const inv = preview.data?.invitationPreview ?? null;
    if (!inv) {
        return card(
            <Alert severity="error">
                This invitation link is invalid or has expired.
            </Alert>,
        );
    }

    if (done) {
        return card(
            <Stack spacing={2}>
                <Alert severity={done === "accepted" ? "success" : "info"}>
                    {done === "accepted"
                        ? `Invitation accepted — you now have access to "${inv.projectName}".`
                        : "Invitation rejected."}
                </Alert>
                <Button variant="contained" onClick={() => navigate("/projects")}>
                    Go to projects
                </Button>
            </Stack>,
        );
    }

    if (inv.status !== "PENDING") {
        return card(
            <Alert severity="info">
                This invitation has already been {inv.status.toLowerCase()}.
            </Alert>,
        );
    }

    // Not signed in: the invited person must authenticate as themselves.
    if (!user) {
        return card(
            <Stack spacing={2}>
                <Typography>
                    You were invited to join{" "}
                    <strong>{inv.projectName}</strong> (sent to {inv.email}).
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Sign in or create an account to accept — the project will be
                    added to that account.
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="contained"
                        onClick={() => goToAuth("/login", inv.email)}
                    >
                        Sign in
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => goToAuth("/register", inv.email)}
                    >
                        Create account
                    </Button>
                </Stack>
            </Stack>,
        );
    }

    // Signed in: the project is added to this account on accept.
    return card(
        <Stack spacing={2}>
            <Typography>
                Join <strong>{inv.projectName}</strong> as{" "}
                <strong>{user.email}</strong>?
            </Typography>
            {err && <Alert severity="error">{err}</Alert>}
            <Stack direction="row" spacing={2}>
                <Button
                    variant="contained"
                    disabled={busy}
                    onClick={handle(accept, "accepted")}
                >
                    Accept
                </Button>
                <Button
                    variant="outlined"
                    disabled={busy}
                    onClick={handle(reject, "rejected")}
                >
                    Reject
                </Button>
            </Stack>
        </Stack>,
    );
}
