import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { forbidden } from "../../errors/AppError";
import { ProjectPermission } from "../../permissions/project.permission";

type AggRow = { name: string; total: Prisma.Decimal };

export class ReportService {
    static async budgetReport(userId: string, projectId: string) {
        const can = await ProjectPermission.canAccessProject(userId, projectId);
        if (!can) throw forbidden();

        // Two indexed aggregate queries (projectId is indexed on both tables).
        // The SQL groups by LOWER(TRIM(name)) so "Rent" and "rent" collapse.
        const expenses = await prisma.$queryRaw<AggRow[]>`
            SELECT LOWER(TRIM(name)) AS name, SUM(amount) AS total
            FROM Expense
            WHERE projectId = ${projectId}
            GROUP BY LOWER(TRIM(name))
        `;
        const incomes = await prisma.$queryRaw<AggRow[]>`
            SELECT LOWER(TRIM(name)) AS name, SUM(amount) AS total
            FROM Income
            WHERE projectId = ${projectId}
            GROUP BY LOWER(TRIM(name))
        `;

        // Merge into a single bucket per name. Decimal kept end-to-end so we
        // don't drop precision before the Decimal scalar serialises.
        const zero = new Prisma.Decimal(0);
        const totals = new Map<
            string,
            { incomeTotal: Prisma.Decimal; expenseTotal: Prisma.Decimal }
        >();
        const bucket = (name: string) => {
            let cur = totals.get(name);
            if (!cur) {
                cur = { incomeTotal: zero, expenseTotal: zero };
                totals.set(name, cur);
            }
            return cur;
        };

        for (const row of expenses) {
            const cur = bucket(row.name);
            cur.expenseTotal = cur.expenseTotal.plus(row.total);
        }
        for (const row of incomes) {
            const cur = bucket(row.name);
            cur.incomeTotal = cur.incomeTotal.plus(row.total);
        }

        return [...totals.entries()].map(([name, v]) => ({
            name,
            incomeTotal: v.incomeTotal,
            expenseTotal: v.expenseTotal,
            difference: v.incomeTotal.minus(v.expenseTotal),
        }));
    }
}
