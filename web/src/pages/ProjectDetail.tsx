import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useNavigate, useParams } from "react-router-dom";
import {
    Alert,
    Box,
    Button,
    Divider,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import {
    DELETE_PROJECT,
    GET_PROJECT,
    GET_PROJECTS,
    UPDATE_PROJECT,
} from "../graphql/project";
import { useAuth } from "../hooks/useAuth";
import {
    CREATE_EXPENSE,
    CREATE_INCOME,
    DELETE_EXPENSE,
    DELETE_INCOME,
    GET_EXPENSES,
    GET_INCOMES,
    UPDATE_EXPENSE,
    UPDATE_INCOME,
} from "../graphql/finance";
import { INVITE_USER, PROJECT_INVITATIONS } from "../graphql/invitation";
import { apolloErrorMessage } from "../utils/errors";

type Project = {
    id: string;
    name: string;
    location: string;
    creator: { id: string; email: string };
    members: { id: string; user: { id: string; email: string } }[];
};

type Entry = { id: string; name: string; amount: string };

type Invitation = {
    id: string;
    status: string;
    email: string;
    createdAt: string;
};

// project detail: edit, expenses, incomes, members, invites
export default function ProjectDetail() {
    const { projectId = "" } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Poll so the members list reflects an invitee accepting from another
    // session without the owner needing to reload the page.
    const project = useQuery<{ project: Project | null }>(GET_PROJECT, {
        variables: { projectId },
        skip: !projectId,
        pollInterval: 5000,
    });
    const [updateProject] = useMutation(UPDATE_PROJECT);
    const [deleteProject] = useMutation(DELETE_PROJECT, {
        refetchQueries: [GET_PROJECTS],
    });

    const expenses = useQuery<{ expenses: Entry[] }>(GET_EXPENSES, {
        variables: { projectId },
        skip: !projectId,
    });
    const incomes = useQuery<{ incomes: Entry[] }>(GET_INCOMES, {
        variables: { projectId },
        skip: !projectId,
    });

    const [createExpense] = useMutation(CREATE_EXPENSE, {
        refetchQueries: [GET_EXPENSES],
    });
    const [createIncome] = useMutation(CREATE_INCOME, {
        refetchQueries: [GET_INCOMES],
    });
    const [deleteExpense] = useMutation(DELETE_EXPENSE, {
        refetchQueries: [GET_EXPENSES],
    });
    const [deleteIncome] = useMutation(DELETE_INCOME, {
        refetchQueries: [GET_INCOMES],
    });
    const [updateExpense] = useMutation(UPDATE_EXPENSE, {
        refetchQueries: [GET_EXPENSES],
    });
    const [updateIncome] = useMutation(UPDATE_INCOME, {
        refetchQueries: [GET_INCOMES],
    });
    const [inviteUser] = useMutation(INVITE_USER);

    // Owner-only: list of invitations sent for this project. Skipped entirely
    // for non-owners so plain members never query the invitations table.
    const invitations = useQuery<{ projectInvitations: Invitation[] }>(
        PROJECT_INVITATIONS,
        {
            variables: { projectId },
            skip:
                !projectId ||
                project.data?.project?.creator.id !== user?.id,
            // Live-update the PENDING → ACCEPTED/REJECTED status.
            pollInterval: 5000,
        },
    );

    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [expenseName, setExpenseName] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [incomeName, setIncomeName] = useState("");
    const [incomeAmount, setIncomeAmount] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteMsg, setInviteMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    // Inline edit state for a single expense / income row at a time.
    const [editEntry, setEditEntry] = useState<
        { kind: "expense" | "income"; id: string; name: string; amount: string } | null
    >(null);

    if (!project.data?.project) {
        return project.loading ? <Typography>Loading...</Typography> : null;
    }
    const p = project.data.project;
    const isOwner = user?.id === p.creator.id;

    const startEdit = () => {
        setEditName(p.name);
        setEditLocation(p.location);
        setEditing(true);
    };

    // save project name/location
    const saveEdit = async () => {
        setErr(null);
        try {
            await updateProject({
                variables: {
                    projectId,
                    input: { name: editName, location: editLocation },
                },
            });
            setEditing(false);
            await project.refetch();
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    // delete project
    const onDelete = async () => {
        if (!confirm("Delete this project?")) return;
        setErr(null);
        try {
            await deleteProject({ variables: { projectId } });
            navigate("/projects");
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    const submit =
        <T,>(run: () => Promise<T>, reset: () => void) =>
        async () => {
            setErr(null);
            try {
                await run();
                reset();
            } catch (e) {
                setErr(apolloErrorMessage(e));
            }
        };

    // save edited expense/income row
    const saveEntry = async () => {
        if (!editEntry) return;
        setErr(null);
        const input = { name: editEntry.name, amount: editEntry.amount };
        try {
            if (editEntry.kind === "expense") {
                await updateExpense({
                    variables: { expenseId: editEntry.id, input },
                });
            } else {
                await updateIncome({
                    variables: { incomeId: editEntry.id, input },
                });
            }
            setEditEntry(null);
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    // Renders a single expense/income row: inline edit form when selected,
    // otherwise the value plus Edit and Delete actions.
    const renderEntry = (
        kind: "expense" | "income",
        entry: Entry,
        onDeleteEntry: () => void,
    ) => {
        if (editEntry?.kind === kind && editEntry.id === entry.id) {
            return (
                <ListItem key={entry.id} disableGutters>
                    <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                        <TextField
                            label="Name"
                            size="small"
                            value={editEntry.name}
                            onChange={(e) =>
                                setEditEntry({ ...editEntry, name: e.target.value })
                            }
                        />
                        <TextField
                            label="Amount"
                            size="small"
                            value={editEntry.amount}
                            onChange={(e) =>
                                setEditEntry({ ...editEntry, amount: e.target.value })
                            }
                        />
                        <Button size="small" variant="contained" onClick={saveEntry}>
                            Save
                        </Button>
                        <Button size="small" onClick={() => setEditEntry(null)}>
                            Cancel
                        </Button>
                    </Stack>
                </ListItem>
            );
        }
        return (
            <ListItem
                key={entry.id}
                secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                        <IconButton
                            edge="end"
                            size="small"
                            aria-label="edit"
                            onClick={() =>
                                setEditEntry({
                                    kind,
                                    id: entry.id,
                                    name: entry.name,
                                    amount: entry.amount,
                                })
                            }
                        >
                            ✎
                        </IconButton>
                        <IconButton
                            edge="end"
                            size="small"
                            aria-label="delete"
                            onClick={onDeleteEntry}
                        >
                            ✕
                        </IconButton>
                    </Stack>
                }
            >
                <ListItemText primary={entry.name} secondary={`$${entry.amount}`} />
            </ListItem>
        );
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>
                {p.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {p.location} · owner {p.creator.email}
            </Typography>

            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

            {isOwner && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    {editing ? (
                        <Stack direction="row" spacing={1}>
                            <TextField
                                label="Name"
                                size="small"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                            <TextField
                                label="Location"
                                size="small"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                            />
                            <Button variant="contained" onClick={saveEdit}>
                                Save
                            </Button>
                            <Button onClick={() => setEditing(false)}>Cancel</Button>
                        </Stack>
                    ) : (
                        <Stack direction="row" spacing={1}>
                            <Button variant="outlined" onClick={startEdit}>
                                Edit
                            </Button>
                            <Button color="error" variant="outlined" onClick={onDelete}>
                                Delete
                            </Button>
                        </Stack>
                    )}
                </Paper>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">Expenses</Typography>
                        <Stack direction="row" spacing={1} sx={{ my: 2 }}>
                            <TextField
                                label="Name"
                                size="small"
                                value={expenseName}
                                onChange={(e) => setExpenseName(e.target.value)}
                            />
                            <TextField
                                label="Amount"
                                size="small"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={submit(
                                    () =>
                                        createExpense({
                                            variables: {
                                                projectId,
                                                name: expenseName,
                                                amount: expenseAmount,
                                            },
                                        }),
                                    () => {
                                        setExpenseName("");
                                        setExpenseAmount("");
                                    },
                                )}
                            >
                                Add
                            </Button>
                        </Stack>
                        <List dense>
                            {expenses.data?.expenses.map((e) =>
                                renderEntry("expense", e, () =>
                                    void deleteExpense({
                                        variables: { expenseId: e.id },
                                    }),
                                ),
                            )}
                        </List>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">Incomes</Typography>
                        <Stack direction="row" spacing={1} sx={{ my: 2 }}>
                            <TextField
                                label="Name"
                                size="small"
                                value={incomeName}
                                onChange={(e) => setIncomeName(e.target.value)}
                            />
                            <TextField
                                label="Amount"
                                size="small"
                                value={incomeAmount}
                                onChange={(e) => setIncomeAmount(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                onClick={submit(
                                    () =>
                                        createIncome({
                                            variables: {
                                                projectId,
                                                name: incomeName,
                                                amount: incomeAmount,
                                            },
                                        }),
                                    () => {
                                        setIncomeName("");
                                        setIncomeAmount("");
                                    },
                                )}
                            >
                                Add
                            </Button>
                        </Stack>
                        <List dense>
                            {incomes.data?.incomes.map((i) =>
                                renderEntry("income", i, () =>
                                    void deleteIncome({
                                        variables: { incomeId: i.id },
                                    }),
                                ),
                            )}
                        </List>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">Members</Typography>
                        <List dense>
                            {p.members.map((m) => (
                                <ListItem key={m.id}>
                                    <ListItemText primary={m.user.email} />
                                </ListItem>
                            ))}
                        </List>
                        {isOwner && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle1">
                                    Invite user
                                </Typography>
                                {inviteMsg && (
                                    <Alert sx={{ mt: 1 }} severity="success">
                                        {inviteMsg}
                                    </Alert>
                                )}
                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                    <TextField
                                        label="Email"
                                        size="small"
                                        value={inviteEmail}
                                        onChange={(e) =>
                                            setInviteEmail(e.target.value)
                                        }
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={submit(
                                            async () => {
                                                await inviteUser({
                                                    variables: {
                                                        projectId,
                                                        email: inviteEmail,
                                                    },
                                                });
                                                setInviteMsg(
                                                    `Invited ${inviteEmail}`,
                                                );
                                                await invitations.refetch();
                                            },
                                            () => setInviteEmail(""),
                                        )}
                                    >
                                        Invite
                                    </Button>
                                </Stack>

                                <Typography
                                    variant="subtitle1"
                                    sx={{ mt: 3 }}
                                >
                                    Invitations
                                </Typography>
                                <List dense>
                                    {invitations.data?.projectInvitations.map(
                                        (inv) => (
                                            <ListItem key={inv.id}>
                                                <ListItemText
                                                    primary={inv.email}
                                                    secondary={inv.status}
                                                />
                                            </ListItem>
                                        ),
                                    )}
                                    {!invitations.loading &&
                                        invitations.data?.projectInvitations
                                            .length === 0 && (
                                            <Typography
                                                color="text.secondary"
                                                variant="body2"
                                            >
                                                No invitations sent yet
                                            </Typography>
                                        )}
                                </List>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
