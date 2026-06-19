import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { forbidden } from "../../errors/AppError";
import { ProjectPermission } from "../../permissions/project.permission";

export class ExpenseService {
    // add expense
    static async create(
        userId: string,
        projectId: string,
        name: string,
        amount: Prisma.Decimal,
    ) {
        const can = await ProjectPermission.canAccessProject(userId, projectId);
        if (!can) throw forbidden();
        return prisma.expense.create({
            data: { projectId, creatorId: userId, name, amount },
        });
    }

    // edit expense
    static async update(
        userId: string,
        expenseId: string,
        data: { name?: string; amount?: Prisma.Decimal },
    ) {
        const can = await ProjectPermission.canManageExpense(userId, expenseId);
        if (!can) throw forbidden();
        return prisma.expense.update({ where: { id: expenseId }, data });
    }

    // remove expense
    static async delete(userId: string, expenseId: string) {
        const can = await ProjectPermission.canManageExpense(userId, expenseId);
        if (!can) throw forbidden();
        await prisma.expense.delete({ where: { id: expenseId } });
        return true;
    }

    // list project expenses
    static async list(userId: string, projectId: string) {
        const can = await ProjectPermission.canAccessProject(userId, projectId);
        if (!can) throw forbidden();
        return prisma.expense.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    }
}
