import type { Project, ProjectMember } from "@prisma/client";

import type { Context } from "../../context/context";
import { requireAuth } from "../../context/context";
import { ProjectService } from "../../modules/project/project.service";
import {
    createProjectSchema,
    updateProjectSchema,
} from "../../modules/project/project.validator";

type ProjectIdArg = { projectId: string };
type CreateProjectArgs = { name: string; location: string };
type UpdateProjectArgs = {
    projectId: string;
    input: { name?: string; location?: string };
};

export default {
    Query: {
        // one project
        project: (_: unknown, args: ProjectIdArg, ctx: Context) => {
            const user = requireAuth(ctx);
            return ProjectService.getProject(user.id, args.projectId);
        },
        // my projects
        projects: (_: unknown, __: unknown, ctx: Context) => {
            const user = requireAuth(ctx);
            return ProjectService.listProjects(user.id);
        },
    },
    Mutation: {
        // create project
        createProject: (_: unknown, args: CreateProjectArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { name, location } = createProjectSchema.parse(args);
            return ProjectService.createProject(user.id, name, location);
        },
        // update project
        updateProject: (_: unknown, args: UpdateProjectArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { projectId, input } = updateProjectSchema.parse(args);
            return ProjectService.updateProject(user.id, projectId, input);
        },
        // delete project
        deleteProject: (_: unknown, args: ProjectIdArg, ctx: Context) => {
            const user = requireAuth(ctx);
            return ProjectService.deleteProject(user.id, args.projectId);
        },
    },
    Project: {
        creator: (project: Project, _: unknown, ctx: Context) =>
            ctx.loaders.userById.load(project.creatorId),
        members: (project: Project, _: unknown, ctx: Context) =>
            ctx.loaders.membersByProject.load(project.id),
        createdAt: (project: Project) => project.createdAt.toISOString(),
    },
    ProjectMember: {
        user: (member: ProjectMember, _: unknown, ctx: Context) =>
            ctx.loaders.userById.load(member.userId),
        joinedAt: (member: ProjectMember) => member.joinedAt.toISOString(),
    },
};
