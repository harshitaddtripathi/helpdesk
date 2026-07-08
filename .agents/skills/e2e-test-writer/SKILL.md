---
name: e2e-test-writer
description: Write, update, and verify Playwright end-to-end tests for this Helpdesk project. Use when adding E2E coverage, debugging Playwright tests, working with the test database setup, or changing E2E test scripts/configuration.
---

# E2E Test Writer

Write Playwright E2E tests for the Helpdesk app using the existing root test scaffold.

## Project Setup

- Root `package.json` owns Playwright scripts: `test:e2e`, `test:e2e:ui`, and `test:e2e:headed`.
- Playwright tests live under `e2e/tests`; the directory may intentionally contain only `.gitkeep`.
- `bun run test:e2e` uses `--pass-with-no-tests` so an empty E2E scaffold exits successfully after global setup.
- `e2e/global-setup.ts` loads `server/.env.test` and runs `bunx prisma migrate reset --force --skip-generate --config ../prisma.config.ts` from `server/`.
- `server/.env.test` is committed and contains only test-safe values. It points at `helpdesk_test` on `127.0.0.1:5433`, API port `3001`, and client origin `http://localhost:5174`.
- `playwright.config.ts` starts the API with `bun run --cwd server src/index.ts` and the client with `bun run --cwd client vite --port 5174`.
- With no tests discovered, Playwright does not launch `webServer` entries; add a real or temporary test when verifying server/client startup.

## Workflow

1. Read the relevant UI, API, auth, and seed data paths before writing tests.
2. Prefer user-visible assertions over implementation details.
3. Use seeded test data from `prisma/seed.ts` when possible; add deterministic seed data only when the scenario needs it.
4. Keep tests independent because global setup resets and seeds the test database before the suite.
5. Avoid relying on production rate limiting. Auth rate limiting is enabled only in production, so development and test environments bypass it.
6. Run `bun run test:e2e` after changes. Use `bun run test:e2e:headed` or `bun run test:e2e:ui` only when interactive debugging is needed.

## Test Style

- Keep specs in `e2e/tests` with descriptive filenames ending in `.spec.ts`.
- Use the Playwright `test` and `expect` APIs from `@playwright/test`.
- Use the configured `baseURL` instead of hardcoding `http://localhost:5174` in tests.
- Prefer role, label, placeholder, and text locators that reflect the actual user experience.
- Add route/API assertions only when they verify behavior not visible in the UI.
- Clean up temporary smoke specs before finishing unless they are intended coverage.
