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
