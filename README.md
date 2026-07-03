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

Backend: `http://localhost:4000`

Default admin credentials come from `.env`:

- Email: `SEED_ADMIN_EMAIL`
- Password: `SEED_ADMIN_PASSWORD`

