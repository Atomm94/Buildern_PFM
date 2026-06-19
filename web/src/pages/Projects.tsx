import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
    Alert,
    Box,
    Button,
    Grid,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import { CREATE_PROJECT, GET_PROJECTS } from "../graphql/project";
import ProjectCard from "../components/ProjectCard";
import {
    createProjectSchema,
    type CreateProjectValues,
} from "../validators/project";
import { apolloErrorMessage } from "../utils/errors";

type Project = { id: string; name: string; location: string };
type Data = { projects: Project[] };

// projects list + create form
export default function Projects() {
    const { data, loading, refetch } = useQuery<Data>(GET_PROJECTS);
    const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateProjectValues>({
        resolver: yupResolver(createProjectSchema),
    });
    const [err, setErr] = useState<string | null>(null);

    // create project
    const onCreate = async (form: CreateProjectValues) => {
        setErr(null);
        try {
            await createProject({ variables: form });
            reset();
            await refetch();
        } catch (e) {
            setErr(apolloErrorMessage(e));
        }
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 3 }}>
                Projects
            </Typography>

            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Create project
                </Typography>
                {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
                <Box component="form" onSubmit={handleSubmit(onCreate)}>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Name"
                            error={!!errors.name}
                            helperText={errors.name?.message}
                            {...register("name")}
                        />
                        <TextField
                            label="Location"
                            error={!!errors.location}
                            helperText={errors.location?.message}
                            {...register("location")}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={creating}
                        >
                            Create
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            {loading && <Typography>Loading...</Typography>}

            <Grid container spacing={2}>
                {data?.projects.map((p) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                        <ProjectCard {...p} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
