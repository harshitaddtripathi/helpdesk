# Implementation Plan

## Phase 1: Project Setup

- [ ] Initialize monorepo structure ( client', /server')
- [ ] Set up Express server with TypeScript
- [ ] Set up React app with TypeScript
- [ ] Set up PostgreSQL database

## Phase 2: Authentication

[ ] Create login page
[] Implement login API endpoint
[ ] Implement session-based authentication middleware
[ ] Implement logout API endpoint
[ ] Add route protection on the frontend
(redirect to login if unauthenticated)

## Phase 3: User Management

Goal: Allow admins to manage agent users with role-based access.

Tasks:
- Add user roles: admin and agent.
- Add backend role-based authorization middleware.
- Add admin-only endpoint to list users.
- Add admin-only endpoint to create agents.
- Add admin-only endpoint to update agent details.
- Add admin-only endpoint to deactivate or delete agents.
- Build admin user management page.
- Add create-agent form.
- Add edit-agent form.
- Hide admin navigation from agents.
- Block agent access to admin user management routes.

Exit criteria:
- Admin can create agent users.
- Admin can view and manage agents.
- Agents cannot access user management.
- Role checks are enforced by the backend.

## Phase 4: Ticket CRUD

Goal: Build core ticket operations and the main ticket list/detail experience.

Tasks:
- Add ticket creation endpoint.
- Add ticket list endpoint.
- Add ticket detail endpoint.
- Add ticket update endpoint.
- Add ticket delete or archive behavior if needed.
- Support ticket statuses:
  - Open
  - Resolved
  - Closed
- Support ticket categories:
  - General questions
  - Technical questions
  - Refund request
- Add filtering by status.
- Add filtering by category.
- Add sorting by created date and updated date.
- Add search by sender, subject, or message text.
- Build ticket list page.
- Build ticket detail page.
- Add ticket status controls.
- Add ticket category controls.
- Add ticket message timeline.

Exit criteria:
- Agents can view all tickets.
- Agents can filter, sort, and search tickets.
- Agents can open ticket details.
- Agents can update status and category.
- Ticket messages are visible in the detail view.

## Phase 5: AI Features

Goal: Integrate the Codex API for classification, summaries, suggested replies, and knowledge-base-assisted responses.

Tasks:
- Add backend AI service wrapper.
- Add secure API key configuration.
- Add knowledge base article model if not completed in Phase 1.
- Add admin endpoints for knowledge base CRUD.
- Build knowledge base management page.
- Add AI classification prompt.
- Constrain classification to the three supported categories.
- Store AI classification results.
- Add AI summary prompt.
- Store AI summaries.
- Add AI suggested reply prompt.
- Include relevant knowledge base content in suggested reply generation.
- Store AI-suggested replies separately from sent messages.
- Add UI for ticket summary.
- Add UI for suggested reply generation.
- Allow agents to edit suggested replies before sending.
- Add fallback behavior when AI confidence is low or no useful knowledge base content exists.

Exit criteria:
- AI can classify tickets into one supported category.
- AI can generate ticket summaries.
- AI can generate suggested replies using knowledge base content.
- Agents approve or edit AI replies before sending.
- AI output is stored for auditability.

## Phase 6: Email Integration

Goal: Connect inbound email to ticket creation and outbound replies, including basic threading.

Tasks:
- Choose SendGrid or Mailgun.
- Configure inbound email webhook.
- Add backend inbound webhook endpoint.
- Validate inbound webhook requests.
- Parse sender, recipient, subject, body, headers, and provider message ID.
- Create a ticket from a new inbound email.
- Store inbound email as a ticket message.
- Detect replies to existing tickets using headers, subject, or provider metadata.
- Attach inbound replies to the correct ticket.
- Add outbound email sending service.
- Add backend endpoint to send ticket replies.
- Store outbound replies as ticket messages.
- Add reply composer to the ticket detail page.
- Show inbound and outbound messages in the ticket timeline.
- Add error handling for failed outbound sends.

Exit criteria:
- New inbound emails create tickets.
- Replies to existing conversations attach to existing tickets where possible.
- Agents can send outbound replies from the app.
- Sent replies are visible in the ticket timeline.

## Phase 7: Dashboard

Goal: Add a dashboard with stats overview, category breakdown, and quick filters.

Tasks:
- Add dashboard metrics endpoint.
- Show total open tickets.
- Show resolved ticket count.
- Show closed ticket count.
- Show ticket counts by category.
- Show recent tickets.
- Show tickets needing attention.
- Add quick filters for open tickets.
- Add quick filters by category.
- Add basic date range filtering.
- Build dashboard page.
- Link dashboard cards to filtered ticket views.

Exit criteria:
- Users can see ticket workload at a glance.
- Users can view category distribution.
- Users can quickly jump into filtered ticket queues.

## Phase 8: Polish and Deployment

Goal: Improve reliability, validation, error handling, and prepare the app for production deployment.

Tasks:
- Add request validation for backend endpoints.
- Add consistent API error responses.
- Add frontend loading states.
- Add frontend empty states.
- Add frontend error states.
- Add form validation.
- Add backend logging.
- Add core backend tests.
- Add frontend tests for critical flows.
- Add end-to-end smoke tests.
- Add production Dockerfiles.
- Add production environment variable documentation.
- Configure database migrations for deployment.
- Configure production email provider settings.
- Configure production AI API credentials.
- Deploy to the selected cloud provider.
- Run a production smoke test.

Exit criteria:
- Core flows are validated and handle errors cleanly.
- Docker build succeeds.
- App is deployed.
- Admin can log in in production.
- Agents can manage tickets in production.
- Email and AI integrations work in production.
