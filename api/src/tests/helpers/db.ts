import { prisma } from "../../config/prisma";

// Truncate every table between tests so suites are isolated.
// Order matters because of FKs.
export const resetDb = async () => {
    await prisma.$transaction([
        prisma.refreshToken.deleteMany(),
        prisma.expense.deleteMany(),
        prisma.income.deleteMany(),
        prisma.invitation.deleteMany(),
        prisma.projectMember.deleteMany(),
        prisma.project.deleteMany(),
        prisma.user.deleteMany(),
    ]);
};
