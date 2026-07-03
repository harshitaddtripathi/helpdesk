# Tech Stack

## Frontend
- React with TypeScript - widely adopted, strong ecosystem for building dashboards and data-heavy UIs
- Tailwind CSS - fast styling without fighting a component library
- React Router - client-side routing

## Backend
- Node.js with Express and TypeScript - keeps the entire stack in one language and is simple to set up for REST APIs
- Database sessions for authentication

## Database
- PostgreSQL - relational data such as tickets, users, and categories fits naturally into tables with foreign keys. It also works well for filtering and sorting queries.

## ORM
- Prisma - type-safe database access, easy migrations, and works well with TypeScript

## AI
- Codex API - for ticket classification, summaries, and suggested replies. Strong at following instructions and working with structured output.

## Email
- SendGrid or Mailgun - for sending outbound replies. Inbound email can be handled via webhooks.

## Deployment
- Docker + a cloud provider such as AWS, Railway, Fly.io, or similar
