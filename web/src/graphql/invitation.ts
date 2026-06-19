import { gql } from "@apollo/client";

export const PROJECT_INVITATIONS = gql`
    query ProjectInvitations($projectId: ID!) {
        projectInvitations(projectId: $projectId) {
            id
            status
            email
            createdAt
        }
    }
`;

export const INVITATION_PREVIEW = gql`
    query InvitationPreview($token: String!) {
        invitationPreview(token: $token) {
            email
            status
            projectName
        }
    }
`;

export const INVITE_USER = gql`
    mutation InviteUser($projectId: ID!, $email: String!) {
        inviteUser(projectId: $projectId, email: $email) {
            id
        }
    }
`;

export const ACCEPT_INVITATION = gql`
    mutation AcceptInvitation($token: String!) {
        acceptInvitation(token: $token)
    }
`;

export const REJECT_INVITATION = gql`
    mutation RejectInvitation($token: String!) {
        rejectInvitation(token: $token)
    }
`;
