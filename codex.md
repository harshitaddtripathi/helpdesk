# Helpdesk - AI-Powered Ticket Management System

## Project Overview

A ticket management system that uses AI to classify, respond to, and route support tickets. See `project-scope.md` for requirements and `implementation-plan.md` for the phased task breakdown.

## Tech Stack

- Frontend: React + TypeScript + Vite on port `5173`.
- Backend: Express + TypeScript + Bun on port `3000`.
- Database: PostgreSQL with Prisma ORM.
- AI: Codex API.
- Auth: Better Auth email/password with database sessions.

## Project Structure

- `client/`: React frontend application powered by Vite.
- `server/`: Express backend API.
- `prisma/`: Prisma schema, migrations, and seed script.
- `scripts/`: Bun scripts for local development and production start orchestration.

## Development Commands

Use Bun as the runtime and package manager. Do not use npm or yarn for project commands.

```bash
# Start both client and server
bun run dev

# Start only the server
bun run dev:api

# Start only the client
bun run dev:web

# Run Playwright E2E setup/tests
bun run test:e2e
```

The client proxies `/api/*` requests to the server via `vite.config.ts`.

## E2E Testing

- Root `package.json` owns Playwright scripts: `test:e2e`, `test:e2e:ui`, and `test:e2e:headed`.
- Playwright tests live under `e2e/tests`; the directory may intentionally contain only `.gitkeep`.
- `bun run test:e2e` uses `--pass-with-no-tests` so an empty E2E scaffold exits successfully after global setup.
- `e2e/global-setup.ts` loads `server/.env.test` and runs `bunx prisma migrate reset --force --skip-generate --config ../prisma.config.ts` from `server/`.
- `server/.env.test` is committed and contains only test-safe values. It points at `helpdesk_test` on `127.0.0.1:5433`, API port `3001`, and client origin `http://localhost:5174`.
- The Playwright config starts the API with `bun run --cwd server src/index.ts` and the client with `bun run --cwd client vite --port 5174`.
- With no tests discovered, Playwright does not launch `webServer` entries; add a real or temporary test when verifying server/client startup.

## Key Conventions

- Use TypeScript throughout.
- Use Bun as the runtime and package manager.
- Keep API routes under `/api/*`.
- Use Prisma for database access and migrations.
- Auth rate limiting is enabled only in production. Development and test environments bypass the auth rate limiter.

## Documentation

- Use the Context7 MCP server to fetch up-to-date documentation for libraries, frameworks, SDKs, APIs, CLIs, and cloud services before answering or implementing related work.
