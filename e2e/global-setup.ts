import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

export default async function globalSetup() {
  loadEnv({ path: resolve(process.cwd(), "server/.env.test"), override: true });

  execSync("bunx prisma migrate reset --force --skip-generate --config ../prisma.config.ts", {
    cwd: resolve(process.cwd(), "server"),
    stdio: "inherit",
    env: {
      ...process.env
    }
  });
}
