export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "dev-better-auth-secret-change-me-at-least-32-characters",
  CODEX_API_KEY: process.env.CODEX_API_KEY ?? "",
  EMAIL_WEBHOOK_SECRET: process.env.EMAIL_WEBHOOK_SECRET ?? ""
};
