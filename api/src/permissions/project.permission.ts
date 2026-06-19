import { prisma } from "../config/prisma";

// Centralised access rules so resolvers stay declarative.

export const ProjectPermission = {
    async canAccessProject(userId: string, projectId: string) {
        const hit = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [
                    { creatorId: userId },
                    { members: { some: { userId } } },
                ],
            },
            select: { id: true },
        });
        return Boolean(hit);
    },

    async isProjectOwner(userId: string, projectId: string) {
        const hit = await prisma.project.findFirst({
            where: { id: projectId, creatorId: userId },
            select: { id: true },
        });
        return Boolean(hit);
    },

    // Any member of the project (owner included) can manage its expenses,
    // not only the entry's creator — members share full CRUD on the project.
    async canManageExpense(userId: string, expenseId: string) {
        const row = await prisma.expense.findUnique({
            where: { id: expenseId },
            select: { projectId: true },
        });
        if (!row) return false;
        return this.canAccessProject(userId, row.projectId);
    },

    async canManageIncome(userId: string, incomeId: string) {
        const row = await prisma.income.findUnique({
            where: { id: incomeId },
            select: { projectId: true },
        });
        if (!row) return false;
        return this.canAccessProject(userId, row.projectId);
    },
};
