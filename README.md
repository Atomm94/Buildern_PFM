# Buildern PFM

Project and Finance Management application built with a GraphQL API and React web client.

## Tech Stack

### Backend

* Node.js 22
* Express
* Apollo Server
* Prisma
* MySQL 8

### Frontend

* React 18
* Vite
* Apollo Client
* MUI v7
* React Hook Form + Yup
* Joi

### Authentication

* JWT Access Tokens
* JWT Refresh Tokens
* Refresh token rotation and revocation support
* Passwords and refresh tokens hashed in the database

### Email

* Nodemailer (SMTP)
* Console logging fallback for development

### Testing

* Jest
* Supertest

---

# Quick Start (Docker)

## Prerequisites

Install:

* Docker Engine 24+
* Docker Compose v2+

Verify installation:

```bash
docker --version
docker compose version
```

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd buildern-pfm
```

---

## 2. Configure Environment Variables

Create a root `.env` file:

```bash
cp .env.example .env
```

Update at minimum:

```env
JWT_ACCESS_SECRET=replace-with-random-32-byte-secret
JWT_REFRESH_SECRET=replace-with-random-32-byte-secret
```

Generate secure secrets:

```bash
openssl rand -hex 32
```

---

## 3. Start the Application

Build and start all services:

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up -d --build
```

Docker starts:

| Service | Port |
| ------- | ---- |
| MySQL   | 3307 |
| API     | 4000 |
| Web     | 5173 |

---

## 4. Verify Containers

```bash
docker compose ps
```

Expected output:

```text
NAME       STATUS
mysql-1    Up (healthy)
api-1      Up
web-1      Up
```

---

## 5. Open the Application

Frontend:

```text
http://localhost:5173
```

GraphQL API:

```text
http://localhost:4000/graphql
```

---

# Database

## Migrations

Database migrations are automatically applied during API startup:

```bash
npx prisma migrate deploy
```

No manual migration step is required when using Docker.

---

## View Database Logs

```bash
docker compose logs mysql
```

---

## Reset Database

Remove containers only:

```bash
docker compose down
```

Remove containers and database data:

```bash
docker compose down -v
```

---

# Running Locally

## Start MySQL Only

```bash
docker run -d \
  --name pfm_mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=pfm_db \
  -e MYSQL_USER=pfm \
  -e MYSQL_PASSWORD=pfm \
  -p 3307:3306 \
  mysql:8.0
```

---

## Start API

```bash
cd api

cp .env.example .env

npm install

npx prisma migrate deploy

npm run dev
```

API:

```text
http://localhost:4000/graphql
```

---

## Start Web Client

```bash
cd web

cp .env.example .env

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Invitation Emails

When a user is invited, an acceptance link is generated.

If SMTP is configured, the invitation is emailed.

If SMTP is not configured, the link is logged to the API console:

```text
[invite] user@example.com -> http://localhost:5173/invitations/accept?token=...
```

Check spam folders if emails are not received.

---

# Running Tests

```bash
cd api
npm test
```

Tests cover:

* Authentication
* Projects
* Invitations
* Finance permissions
* Budget reports

---

# Environment Variables

## API

| Variable              | Description                 |
| --------------------- | --------------------------- |
| DATABASE_URL          | MySQL connection string     |
| JWT_ACCESS_SECRET     | JWT access secret           |
| JWT_REFRESH_SECRET    | JWT refresh secret          |
| ACCESS_TOKEN_EXPIRES  | Access token lifetime       |
| REFRESH_TOKEN_EXPIRES | Refresh token lifetime      |
| WEB_ORIGIN            | CORS origin                 |
| WEB_BASE_URL          | Frontend URL used in emails |
| SMTP_HOST             | SMTP host                   |
| SMTP_PORT             | SMTP port                   |
| SMTP_USER             | SMTP username               |
| SMTP_PASS             | SMTP password               |
| MAIL_FROM             | Sender email address        |

## Web

| Variable     | Description          |
| ------------ | -------------------- |
| VITE_API_URL | GraphQL endpoint URL |

---

# Design Decisions

## Entity Relationships

- A User can own multiple Projects.
- A Project can contain multiple Members.
- A Project can contain multiple Expenses and Incomes.
- A User can create Expenses and Incomes.
- Invitations are used to grant project membership through an acceptance workflow.

## Constraints

- One membership per user/project pair.
- No duplicate pending invitations for the same project and email.
- Only project owners can send invitations.
- Only expense creators or project owners can update or delete expenses.

## Indexing Strategy

Indexes were added for:

- Project.creatorId
- Expense.projectId
- Expense(projectId, name)
- Income.projectId
- Income(projectId, name)
- Invitation.email
- Invitation.projectId

These indexes optimize permission checks, project lookups, invitation workflows, and budget report generation.

## Performance Considerations

The budget report is generated dynamically using aggregated database queries rather than loading all records into memory. This avoids N+1 query issues and scales efficiently with larger datasets.

# Project Structure

```text
buildern-pfm/
├── api/
│   ├── prisma/
│   ├── src/
│   └── Dockerfile
│
├── web/
│   ├── src/
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```
