# Buildern PFM

Project and finance management. GraphQL API + React web client.

## Tech stack

- **API**: Node 22, Express, Apollo Server, Prisma, MySQL 8
- **Web**: React 18, Vite, Apollo Client, MUI v7, React Hook Form + Yup, Joi
- **Auth**: JWT access + refresh, hashed in DB
- **Mail**: nodemailer (SMTP, or console-log in dev)
- **Tests**: Jest + Supertest

## Running the project

There are two ways to run it. **Option 1** runs everything in Docker. **Option 2** runs the API and web app locally with
`npm`, while still pulling the infrastructure dependency (MySQL) via Docker.

---

### Option 1 — Run everything via Docker

**Step 1 — Pull the base images:**

```bash
docker pull mysql:8.0
docker pull node:22-alpine
```

**Step 2 — Configure and start:**

```bash
cp .env.example .env
# Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to random ≥32-byte values
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:4000/graphql

DB migrations apply automatically on API startup (the image runs
`npx prisma migrate deploy` before launching the server). Stop with
`docker compose down` (MySQL data persists in the `mysql_data` volume); wipe
with `docker compose down -v`.

---

### Option 2 — Run locally (dependencies via Docker)

To run the app locally, only the infrastructure
(MySQL) comes from Docker; the API and web app run with `npm`.

**Step 1 — Start the dependency in Docker:**

```bash
# MySQL
docker run -d --name pfm_mysql \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=pfm_db \
  -e MYSQL_USER=pfm -e MYSQL_PASSWORD=pfm \
  -p 3306:3306 mysql:8.0
```

**Step 2 — Build, migrate and run the API locally:**

```bash
cd api
cp .env.example .env
# DATABASE_URL already points at localhost:3306.
# emails to the console, or set real SMTP credentials to send mail.
npm install
npx prisma migrate deploy   # apply DB migrations
npm run dev
```

Runs at http://localhost:4000/graphql.

**Step 3 — Run the web app locally:**

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Runs at http://localhost:5173.

## Invitation emails

When you invite a user, the accept link is sent by email. If it doesn't
arrive in the inbox, **check the spam folder**, or grab the link straight from
the API logs — every invite is printed there:

```
[invite] someone@example.com -> http://localhost:5173/invitations/accept?token=...
```

With `SMTP_HOST` blank (the default), no real email is sent and the link only
appears in the logs.

## Tests

```bash
cd api
npm test
```

29 tests covering auth, projects, invitations (email + token flow),
finance access rules, and the budget report.

## Environment variables

API (`api/.env`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_ACCESS_SECRET` | Random ≥32-byte string |
| `JWT_REFRESH_SECRET` | Random ≥32-byte string |
| `ACCESS_TOKEN_EXPIRES` | e.g. `15m` |
| `REFRESH_TOKEN_EXPIRES` | e.g. `7d` |
| `WEB_ORIGIN` | CORS allowlist for the API |
| `WEB_BASE_URL` | Base URL used in invitation emails |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP server (leave `SMTP_HOST` blank to log emails to the console) |
| `MAIL_FROM` | From-address used by the mailer |

Web (`web/.env`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the GraphQL endpoint |

## Layout

```
api/    GraphQL API (Express + Apollo + Prisma)
web/    React app (Vite + Apollo Client + MUI)
docker-compose.yml
```
