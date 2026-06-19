import { prisma } from "../../config/prisma";
import { forbidden, notFound } from "../../errors/AppError";
import { ProjectPermission } from "../../permissions/project.permission";

export class ProjectService {
    // create project
    static async createProject(userId: string, name: string, location: string) {
        // creator is implicitly a member of their own project
        return prisma.project.create({
            data: {
                name,
                location,
                creatorId: userId,
                members: { create: { userId } },
            },
        });
    }

    // get one project (member only)
    static async getProject(userId: string, projectId: string) {
        const can = await ProjectPermission.canAccessProject(userId, projectId);
        if (!can) throw forbidden();

        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw notFound("Project not found");
        return project;
    }

    // list my projects (owned or member)
    static async listProjects(userId: string) {
        return prisma.project.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { members: { some: { userId } } },
                ],
            },
            orderBy: { createdAt: "desc" },
        });
    }

    // update project (owner only)
    static async updateProject(
        userId: string,
        projectId: string,
        data: { name?: string; location?: string },
    ) {
        const owner = await ProjectPermission.isProjectOwner(userId, projectId);
        if (!owner) throw forbidden();
        return prisma.project.update({ where: { id: projectId }, data });
    }

    // delete project (owner only)
    static async deleteProject(userId: string, projectId: string) {
        const owner = await ProjectPermission.isProjectOwner(userId, projectId);
        if (!owner) throw forbidden();
        await prisma.project.delete({ where: { id: projectId } });
        return true;
    }
}
