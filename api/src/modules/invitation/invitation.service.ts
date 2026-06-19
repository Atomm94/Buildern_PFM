import crypto from "node:crypto";
import { InvitationStatus, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { sendMail } from "../../services/mailer";
import { badInput, conflict, forbidden, notFound } from "../../errors/AppError";
import { ProjectPermission } from "../../permissions/project.permission";

const hashToken = (token: string) =>
    crypto.createHash("sha256").update(token).digest("hex");

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const buildAcceptUrl = (token: string) =>
    `${env.WEB_BASE_URL}/invitations/accept?token=${encodeURIComponent(token)}`;

export class InvitationService {
    // Owner-only. One PENDING invite per (project, email); the DB unique
    // constraint settles races between concurrent calls.
    static async inviteUser(callerId: string, projectId: string, email: string) {
        const isOwner = await ProjectPermission.isProjectOwner(callerId, projectId);
        if (!isOwner) throw forbidden();

        const normalizedEmail = normalizeEmail(email);

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { name: true },
        });
        if (!project) throw notFound("Project not found");

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const acceptUrl = buildAcceptUrl(rawToken);

        let invitation;
        try {
            invitation = await prisma.invitation.create({
                data: {
                    projectId,
                    email: normalizedEmail,
                    tokenHash: hashToken(rawToken),
                    invitedUserId: existingUser?.id ?? null,
                },
            });
        } catch (e) {
            // Unique (projectId, email, status) => a pending invite already exists.
            if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === "P2002"
            ) {
                throw conflict("Invitation already exists for this email");
            }
            throw e;
        }

        // log invite link (handy when SMTP is off)
        console.log(`[invite] ${normalizedEmail} -> ${acceptUrl}`);

        try {
            await sendMail({
                to: normalizedEmail,
                subject: `You're invited to "${project.name}"`,
                text: `You were invited to join project: ${project.name}

Accept invitation:
${acceptUrl}

If this wasn't you, ignore this email.`,
            });
        } catch (e) {
            console.error("Email failed:", e);
        }

        return invitation;
    }

    // The email link is a capability: the signed-in user who opens it accepts
    // and the project is added to *their* account (the web app makes anonymous
    // visitors register/sign in first). Flipping the status happens in one
    // guarded update so concurrent calls grant access once.
    static async acceptInvitation(userId: string, token: string) {
        const invitation = await this.findByToken(token);

        if (invitation.status !== InvitationStatus.PENDING) {
            throw badInput("Invitation already processed");
        }

        return prisma.$transaction(async (tx) => {
            const flip = await tx.invitation.updateMany({
                where: { id: invitation.id, status: InvitationStatus.PENDING },
                data: { status: InvitationStatus.ACCEPTED },
            });
            if (flip.count === 0) throw badInput("Invitation already processed");

            await tx.projectMember.upsert({
                where: {
                    userId_projectId: { userId, projectId: invitation.projectId },
                },
                update: {},
                create: { userId, projectId: invitation.projectId },
            });
            return true;
        });
    }

    // Any signed-in holder of the link can decline it, same as accept.
    static async rejectInvitation(_userId: string, token: string) {
        const invitation = await this.findByToken(token);

        if (invitation.status !== InvitationStatus.PENDING) {
            throw badInput("Invitation already processed");
        }

        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: InvitationStatus.REJECTED },
        });
        return true;
    }

    // Owner-only: the invitations a project owner has sent for their project.
    // Plain users never list invitations — they act through the email link.
    static async projectInvitations(callerId: string, projectId: string) {
        const isOwner = await ProjectPermission.isProjectOwner(callerId, projectId);
        if (!isOwner) throw forbidden();

        return prisma.invitation.findMany({
            where: { projectId },
            orderBy: { createdAt: "desc" },
        });
    }

    // Public, token-gated preview so the accept page can tell the visitor which
    // account the invite is for *before* they sign in. Returns null when the
    // token is unknown rather than leaking which tokens exist.
    static async previewByToken(token: string) {
        const tokenHash = hashToken((token ?? "").trim());
        const invitation = await prisma.invitation.findFirst({
            where: { tokenHash },
            select: {
                email: true,
                status: true,
                project: { select: { name: true } },
            },
        });
        if (!invitation) return null;
        return {
            email: invitation.email,
            status: invitation.status,
            projectName: invitation.project.name,
        };
    }

    private static async findByToken(token: string) {
        const tokenHash = hashToken((token ?? "").trim());
        const invitation = await prisma.invitation.findFirst({
            where: { tokenHash },
        });
        if (!invitation) throw notFound("Invitation not found");
        return invitation;
    }
}
