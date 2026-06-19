import DataLoader from "dataloader";
import type { Project, ProjectMember, User } from "@prisma/client";

import { prisma } from "../config/prisma";

// Per-request loaders. Each request gets its own instance via createLoaders()
// so cached values don't leak between users.

const byIdMap = <T extends { id: string }>(rows: T[], ids: readonly string[]) => {
    const map = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id) ?? null);
};

export type Loaders = {
    userById: DataLoader<string, User | null>;
    projectById: DataLoader<string, Project | null>;
    membersByProject: DataLoader<string, ProjectMember[]>;
};

export const createLoaders = (): Loaders => ({
    userById: new DataLoader(async (ids) => {
        const rows = await prisma.user.findMany({
            where: { id: { in: [...ids] } },
        });
        return byIdMap(rows, ids);
    }),
    projectById: new DataLoader(async (ids) => {
        const rows = await prisma.project.findMany({
            where: { id: { in: [...ids] } },
        });
        return byIdMap(rows, ids);
    }),
    membersByProject: new DataLoader(async (projectIds) => {
        const rows = await prisma.projectMember.findMany({
            where: { projectId: { in: [...projectIds] } },
        });
        const grouped = new Map<string, ProjectMember[]>();
        for (const r of rows) {
            const list = grouped.get(r.projectId);
            if (list) list.push(r);
            else grouped.set(r.projectId, [r]);
        }
        return projectIds.map((id) => grouped.get(id) ?? []);
    }),
});
