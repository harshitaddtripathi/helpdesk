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

## Key Conventions

- Use TypeScript throughout.
- Use Bun as the runtime and package manager.
- Keep API routes under `/api/*`.
- Use Prisma for database access and migrations.
- In the React client, use Axios for HTTP requests and TanStack Query for server-state fetching, caching, mutations, and invalidation. Avoid adding new raw `fetch` calls for API data unless there is a specific reason.
- Auth rate limiting is enabled only in production. Development and test environments bypass the auth rate limiter.
- Use the `$e2e-test-writer` project agent when writing, updating, or debugging Playwright E2E tests.

## Documentation

- Use the Context7 MCP server to fetch up-to-date documentation for libraries, frameworks, SDKs, APIs, CLIs, and cloud services before answering or implementing related work.
