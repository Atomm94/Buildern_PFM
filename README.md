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
| MySQL   | 3306 |
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

# Common Issues

## Port 3306 Already in Use

Error:

```text
failed to bind host port 0.0.0.0:3306: address already in use
```

Check what is using port 3306:

```bash
sudo lsof -i :3306
```

Stop local MySQL:

```bash
sudo systemctl stop mysql
```

Or change the MySQL port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3307:3306"
```

---

## API Cannot Reach MySQL

Error:

```text
Prisma P1001: Can't reach database server at mysql:3306
```

Check MySQL status:

```bash
docker compose ps
```

Verify MySQL is healthy:

```bash
docker compose logs mysql
```

Look for:

```text
ready for connections
```

Restart the stack:

```bash
docker compose down
docker compose up --build
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
  -p 3306:3306 \
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
* Email flows
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
