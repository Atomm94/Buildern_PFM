import { useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import {
    Box,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";

import { GET_PROJECTS } from "../graphql/project";
import { BUDGET_REPORT } from "../graphql/report";

type Project = { id: string; name: string };
type ReportItem = {
    name: string;
    incomeTotal: string;
    expenseTotal: string;
    difference: string;
};

// budget report: income vs expense per category
export default function BudgetReport() {
    const projects = useQuery<{ projects: Project[] }>(GET_PROJECTS);
    const [projectId, setProjectId] = useState("");

    // Default to the first project once the list loads.
    useEffect(() => {
        const list = projects.data?.projects;
        if (list?.length && !projectId) setProjectId(list[0].id);
    }, [projects.data, projectId]);

    // removing expenses or incomes always re-fetches the totals instead of showing a stale cache.
    const report = useQuery<{ budgetReport: ReportItem[] }>(BUDGET_REPORT, {
        variables: { projectId },
        skip: !projectId,
        fetchPolicy: "cache-and-network",
    });

    const rows = report.data?.budgetReport ?? [];

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Budget report
            </Typography>

            {projects.data?.projects.length ? (
                <TextField
                    select
                    label="Project"
                    size="small"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    sx={{ mb: 3, minWidth: 280 }}
                >
                    {projects.data.projects.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                            {p.name}
                        </MenuItem>
                    ))}
                </TextField>
            ) : (
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    You have no projects yet.
                </Typography>
            )}

            <Paper sx={{ p: 2 }}>
                {report.loading && <Typography>Loading...</Typography>}
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Income</TableCell>
                            <TableCell align="right">Expense</TableCell>
                            <TableCell align="right">Difference</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((r) => (
                            <TableRow key={r.name}>
                                <TableCell>{r.name}</TableCell>
                                <TableCell align="right">${r.incomeTotal}</TableCell>
                                <TableCell align="right">${r.expenseTotal}</TableCell>
                                <TableCell align="right">${r.difference}</TableCell>
                            </TableRow>
                        ))}
                        {!report.loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4}>
                                    <Typography color="text.secondary">
                                        No data for this project yet.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
