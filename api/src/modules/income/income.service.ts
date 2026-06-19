import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { forbidden } from "../../errors/AppError";
import { ProjectPermission } from "../../permissions/project.permission";

export class IncomeService {
    // add income
    static async create(
        userId: string,
        projectId: string,
        name: string,
        amount: Prisma.Decimal,
    ) {
        const can = await ProjectPermission.canAccessProject(userId, projectId);
        if (!can) throw forbidden();
        return prisma.income.create({
            data: { projectId, creatorId: userId, name, amount },
        });
    }

    // edit income
    static async update(
        userId: string,
        incomeId: string,
        data: { name?: string; amount?: Prisma.Decimal },
    ) {
        const can = await ProjectPermission.canManageIncome(userId, incomeId);
        if (!can) throw forbidden();
        return prisma.income.update({ where: { id: incomeId }, data });
    }

    // remove income
    static async delete(userId: string, incomeId: string) {
        const can = await ProjectPermission.canManageIncome(userId, incomeId);
        if (!can) throw forbidden();
        await prisma.income.delete({ where: { id: incomeId } });
        return true;
    }

    // list project incomes
    static async list(userId: string, projectId: string) {
        const can = await ProjectPermission.canAccessProject(userId, projectId);
        if (!can) throw forbidden();
        return prisma.income.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    }
}
