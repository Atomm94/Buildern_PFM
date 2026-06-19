import { mergeTypeDefs } from "@graphql-tools/merge";

import base from "./base.type";
import auth from "./auth.type";
import project from "./project.type";
import income from "./income.type";
import expense from "./expense.type";
import invitation from "./invitation.type";
import report from "./report.type";

export const typeDefs = mergeTypeDefs([
    base,
    auth,
    project,
    income,
    expense,
    invitation,
    report
]);