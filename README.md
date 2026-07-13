# AI Helpdesk

Full-stack helpdesk scaffold using Bun, Express, React, TypeScript, PostgreSQL, and Prisma.

## Prerequisites

- Bun
- Docker

## Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:

```sh
docker compose up -d
```

3. Install dependencies:

```sh
bun install
```

4. Run migrations and seed the initial admin:

```sh
bun run db:migrate
bun run db:seed
```

5. Start development servers:

```sh
bun run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:3000`

Default admin credentials come from `.env`:

- Email: `SEED_ADMIN_EMAIL` (`admin@example.com` locally)
- Password: `SEED_ADMIN_PASSWORD` (`password123` locally)

## Railway deployment

This repo includes `railway.json` for Railway. Railway builds with Nixpacks, runs `bun run build`, applies Prisma migrations with `bun run db:deploy` before each deploy, starts the app with `bun run start`, and checks `/health`.

1. Create a Railway project and add a PostgreSQL service.
2. Add these variables to the web service:

```sh
DATABASE_URL="${{Postgres.DATABASE_URL}}"
CLIENT_ORIGIN="https://your-app.up.railway.app"
BETTER_AUTH_URL="https://your-app.up.railway.app"
BETTER_AUTH_TRUSTED_ORIGINS="https://your-app.up.railway.app"
BETTER_AUTH_SECRET="generate-a-random-32-byte-or-longer-secret"
WEBHOOK_SECRET="generate-a-random-32-byte-or-longer-secret"
EMAIL_WEBHOOK_SECRET="generate-a-random-32-byte-or-longer-secret"
OPENAI_API_KEY=""
CODEX_API_KEY=""
```

`PORT` is provided by Railway and does not need to be set manually. If you use a custom domain, update `CLIENT_ORIGIN`, `BETTER_AUTH_URL`, and `BETTER_AUTH_TRUSTED_ORIGINS` to that domain.

After the first deploy, seed the initial users once from the Railway shell or CLI:

```sh
bun run db:seed
```

## Playwright setup

Playwright is configured to use a separate PostgreSQL database on port `5433`.

1. Start the test database:

```sh
docker compose up -d postgres-test
```

2. Install browser binaries when needed:

```sh
bunx playwright install chromium
```

3. Run future end-to-end tests:

```sh
bun run test:e2e
```

The Playwright global setup loads `server/.env.test`, resets and seeds the test database, serves the API on `http://localhost:3001`, and serves Vite on `http://localhost:5174`.
