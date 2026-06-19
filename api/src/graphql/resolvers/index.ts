import { mergeResolvers } from "@graphql-tools/merge";

import { DecimalScalar } from "../scalars/decimal";
import auth from "./auth.resolver";
import project from "./project.resolver";
import invitation from "./invitation.resolver";
import income from "./income.resolver";
import expense from "./expense.resolver";
import report from "./report.resolver";

export const resolvers = mergeResolvers([
    { Decimal: DecimalScalar },
    auth,
    project,
    invitation,
    income,
    expense,
    report,
]);
