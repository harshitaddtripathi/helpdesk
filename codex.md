# Helpdesk - AI-Powered Ticket Management System

## Project Overview

A ticket management system that uses AI to classify, respond to, and route support tickets. See `project-scope.md` for requirements and `implementation-plan.md` for the phased task breakdown.

## Tech Stack

- Frontend: React + TypeScript + Vite on port `5173`.
- Backend: Express + TypeScript + Bun on port `4000`.
- Database: PostgreSQL with Prisma ORM.
- AI: Codex API.
- Auth: Database sessions.

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
```

The client proxies `/api/*` requests to the server via `vite.config.ts`.

## Key Conventions

- Use TypeScript throughout.
- Use Bun as the runtime and package manager.
- Keep API routes under `/api/*`.
- Use Prisma for database access and migrations.

## Documentation

- Use the Context7 MCP server to fetch up-to-date documentation for libraries, frameworks, SDKs, APIs, CLIs, and cloud services before answering or implementing related work.
