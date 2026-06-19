import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
    query GetProjects {
        projects {
            id
            name
            location
            createdAt
        }
    }
`;

export const GET_PROJECT = gql`
    query GetProject($projectId: ID!) {
        project(projectId: $projectId) {
            id
            name
            location
            creator {
                id
                email
            }
            members {
                id
                user {
                    id
                    email
                }
            }
        }
    }
`;

export const CREATE_PROJECT = gql`
    mutation CreateProject($name: String!, $location: String!) {
        createProject(name: $name, location: $location) {
            id
            name
            location
        }
    }
`;

export const UPDATE_PROJECT = gql`
    mutation UpdateProject($projectId: ID!, $input: UpdateProjectInput!) {
        updateProject(projectId: $projectId, input: $input) {
            id
            name
            location
        }
    }
`;

export const DELETE_PROJECT = gql`
    mutation DeleteProject($projectId: ID!) {
        deleteProject(projectId: $projectId)
    }
`;
