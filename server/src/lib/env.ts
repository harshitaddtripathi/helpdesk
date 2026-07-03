export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? "helpdesk_session",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-session-secret-change-me",
  SESSION_TTL_DAYS: Number(process.env.SESSION_TTL_DAYS ?? 7),
  CODEX_API_KEY: process.env.CODEX_API_KEY ?? "",
  EMAIL_WEBHOOK_SECRET: process.env.EMAIL_WEBHOOK_SECRET ?? ""
};

