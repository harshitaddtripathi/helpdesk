function readEnv(name: string) {
  return process.env[name]?.trim();
}

function requireEnv(name: string) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireSecret(name: string, minLength = 32) {
  const value = requireEnv(name);

  if (isPlaceholderSecret(value)) {
    throw new Error(`${name} must be replaced with a real secret.`);
  }

  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters.`);
  }

  return value;
}

function isPlaceholderSecret(value: string) {
  const normalizedValue = value.toLowerCase();

  return (
    normalizedValue.includes("replace-with") ||
    normalizedValue.includes("change-me") ||
    normalizedValue.includes("changeme")
  );
}

function normalizeOrigin(value: string, name: string) {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a valid URL origin.`);
  }
}

function requireUrl(name: string, fallback?: string) {
  const value = readEnv(name) ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

function parseOriginList(value: string | undefined, fallbackOrigin: string) {
  const origins = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (origins?.length ? origins : [fallbackOrigin]).map((origin, index) =>
    normalizeOrigin(origin, `BETTER_AUTH_TRUSTED_ORIGINS[${index}]`)
  );
}

function addDevelopmentOrigins(origins: string[]) {
  if (isProduction) {
    return origins;
  }

  const trustedOrigins = new Set(origins);

  for (const hostname of ["localhost", "127.0.0.1"]) {
    for (let portNumber = 5173; portNumber <= 5179; portNumber += 1) {
      trustedOrigins.add(`http://${hostname}:${portNumber}`);
    }
  }

  return [...trustedOrigins];
}

const nodeEnv = readEnv("NODE_ENV") ?? "development";
const isProduction = nodeEnv === "production";
const port = Number(readEnv("PORT") ?? 3000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer.");
}

if (isProduction) {
  requireEnv("CLIENT_ORIGIN");
  requireEnv("BETTER_AUTH_URL");
  requireEnv("EMAIL_WEBHOOK_SECRET");
}

const clientOrigin = normalizeOrigin(
  requireUrl("CLIENT_ORIGIN", isProduction ? undefined : "http://localhost:5173"),
  "CLIENT_ORIGIN"
);
const emailWebhookSecret = readEnv("EMAIL_WEBHOOK_SECRET") ?? "";

if (emailWebhookSecret && isPlaceholderSecret(emailWebhookSecret)) {
  throw new Error("EMAIL_WEBHOOK_SECRET must be replaced with a real secret.");
}

if (emailWebhookSecret && emailWebhookSecret.length < 32) {
  throw new Error("EMAIL_WEBHOOK_SECRET must be at least 32 characters.");
}

export const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  DATABASE_URL: requireEnv("DATABASE_URL"),
  CLIENT_ORIGIN: clientOrigin,
  BETTER_AUTH_TRUSTED_ORIGINS: addDevelopmentOrigins(
    parseOriginList(readEnv("BETTER_AUTH_TRUSTED_ORIGINS"), clientOrigin)
  ),
  BETTER_AUTH_URL: requireUrl("BETTER_AUTH_URL", isProduction ? undefined : `http://localhost:${port}`),
  BETTER_AUTH_SECRET: requireSecret("BETTER_AUTH_SECRET"),
  CODEX_API_KEY: readEnv("CODEX_API_KEY") ?? "",
  EMAIL_WEBHOOK_SECRET: emailWebhookSecret
};
