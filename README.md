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

## Vercel frontend deployment

The frontend can be deployed to Vercel from this repo. Set this Vercel environment variable so browser API and auth requests go to the backend service:

```sh
VITE_API_BASE_URL="https://your-render-service.onrender.com"
```

Do not include a trailing slash.

Also set the backend service `CLIENT_ORIGIN` to the primary Vercel frontend URL, and set `BETTER_AUTH_TRUSTED_ORIGINS` to every frontend origin that can call the backend. Vercel preview URLs can be added with a wildcard, for example:

```sh
BETTER_AUTH_TRUSTED_ORIGINS="https://your-production-domain.vercel.app,https://helpdesk-*-your-vercel-team.vercel.app"
```

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
GOOGLE_GENERATIVE_AI_API_KEY=""
GOOGLE_GENERATIVE_AI_MODEL="gemini-3.5-flash"
CODEX_API_KEY=""
```

`PORT` is provided by Railway and does not need to be set manually. If you use a custom domain, update `CLIENT_ORIGIN`, `BETTER_AUTH_URL`, and `BETTER_AUTH_TRUSTED_ORIGINS` to that domain.

After the first deploy, seed the initial users once from the Railway shell or CLI:

```sh
bun run db:seed
```

To populate the ticket queue with demo tickets, run this once against the deployed database:

```sh
bun run db:demo-tickets
```

## Render backend deployment

This repo includes `render.yaml` for deploying only the backend API on Render. No folder restructuring is required; Render can build from the repository root.

Render settings:

```sh
Build Command: bun install --frozen-lockfile && bun run build:backend
Pre-Deploy Command: bun run db:deploy
Start Command: bun run start
Health Check Path: /health
```

Set these variables on the Render service:

```sh
PORT=10000
DATABASE_URL="your Supabase pooled/runtime connection string"
DIRECT_URL="your Supabase direct connection string"
CLIENT_ORIGIN="https://your-frontend-domain"
BETTER_AUTH_TRUSTED_ORIGINS="https://your-frontend-domain"
BETTER_AUTH_URL="https://your-render-service.onrender.com"
BETTER_AUTH_SECRET="generate-a-random-32-byte-or-longer-secret"
WEBHOOK_SECRET="generate-a-random-32-byte-or-longer-secret"
EMAIL_WEBHOOK_SECRET="generate-a-random-32-byte-or-longer-secret"
GOOGLE_GENERATIVE_AI_API_KEY=""
GOOGLE_GENERATIVE_AI_MODEL="gemini-3.5-flash"
CODEX_API_KEY=""
```

Render does not read local `.env` or `server/.env` files. Add these values in the Render dashboard under the service's Environment tab, or provide them when syncing the Blueprint.

After the first successful Render deploy, seed initial users once from the Render shell:

```sh
bun run db:seed
```

To populate the ticket queue with demo tickets, run this once from the Render shell:

```sh
bun run db:demo-tickets
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
