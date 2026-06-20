import type { Invitation } from "@prisma/client";

import type { Context } from "../../context/context";
import { requireAuth } from "../../context/context";
import { InvitationService } from "../../modules/invitation/invitation.service";
import {
    inviteSchema,
    tokenActionSchema,
} from "../../modules/invitation/invitation.validator";

type InviteArgs = { projectId: string; email: string };

export default {
    Query: {
        // list a project's invitations (owner)
        projectInvitations: (
            _: unknown,
            args: { projectId: string },
            ctx: Context,
        ) => {
            const user = requireAuth(ctx);
            return InvitationService.projectInvitations(user.id, args.projectId);
        },
        // show who the invite is for before the visitor signs in.
        invitationPreview: (_: unknown, args: { token: string }) =>
            InvitationService.previewByToken(args.token),
    },
    Mutation: {
        // invite user
        inviteUser: (_: unknown, args: InviteArgs, ctx: Context) => {
            const user = requireAuth(ctx);
            const { projectId, email } = inviteSchema.parse(args);
            return InvitationService.inviteUser(user.id, projectId, email);
        },
        // accept invite
        acceptInvitation: (
            _: unknown,
            args: { token: string },
            ctx: Context,
        ) => {
            const user = requireAuth(ctx);
            const { token } = tokenActionSchema.parse(args);
            return InvitationService.acceptInvitation(user.id, token);
        },
        // decline invite
        rejectInvitation: (
            _: unknown,
            args: { token: string },
            ctx: Context,
        ) => {
            const user = requireAuth(ctx);
            const { token } = tokenActionSchema.parse(args);
            return InvitationService.rejectInvitation(user.id, token);
        },
    },
    Invitation: {
        project: (inv: Invitation, _: unknown, ctx: Context) =>
            ctx.loaders.projectById.load(inv.projectId),
        createdAt: (inv: Invitation) => inv.createdAt.toISOString(),
    },
};
