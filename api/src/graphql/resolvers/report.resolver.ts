import type { Context } from "../../context/context";
import { requireAuth } from "../../context/context";
import { ReportService } from "../../modules/report/report.service";

export default {
    Query: {
        // income vs expense per category
        budgetReport: (
            _: unknown,
            args: { projectId: string },
            ctx: Context,
        ) => {
            const user = requireAuth(ctx);
            return ReportService.budgetReport(user.id, args.projectId);
        },
    },
};
