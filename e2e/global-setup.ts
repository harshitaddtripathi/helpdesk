import { execSync } from "node:child_process";
import { Socket } from "node:net";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

export default async function globalSetup() {
  loadEnv({ path: resolve(process.cwd(), "server/.env.test"), override: true });
  await waitForDatabase();

  resetDatabaseWithRetry();
}

async function waitForDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set before running E2E tests.");
  }

  const { hostname, port } = parseDatabaseEndpoint(databaseUrl);
  const timeoutMs = 60_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(hostname, port)) {
      return;
    }

    await delay(1_000);
  }

  throw new Error(
    `Could not reach the E2E test database at ${hostname}:${port}. ` +
      "Start it with `docker compose up -d postgres-test`, then rerun `bun run test:e2e`."
  );
}

function resetDatabaseWithRetry() {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      execSync("bunx prisma migrate reset --force --skip-generate --config ../prisma.config.ts", {
        cwd: resolve(process.cwd(), "server"),
        stdio: "inherit",
        env: {
          ...process.env
        }
      });
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(`Prisma reset failed on attempt ${attempt}; retrying...`);
    }
  }
}

function parseDatabaseEndpoint(databaseUrl: string) {
  const parsedUrl = new URL(databaseUrl);
  const port = Number(parsedUrl.port || "5432");

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("DATABASE_URL must include a valid port.");
  }

  return {
    hostname: parsedUrl.hostname,
    port
  };
}

function canConnect(hostname: string, port: number) {
  return new Promise<boolean>((resolveConnection) => {
    const socket = new Socket();

    socket.setTimeout(2_000);
    socket.once("connect", () => {
      socket.destroy();
      resolveConnection(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolveConnection(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolveConnection(false);
    });
    socket.connect(port, hostname);
  });
}

function delay(ms: number) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}
