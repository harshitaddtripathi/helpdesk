import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig, env } from "prisma/config";

const rootDir = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(rootDir, "prisma/seed.ts");

export default defineConfig({
  schema: resolve(rootDir, "prisma/schema.prisma"),
  migrations: {
    path: resolve(rootDir, "prisma/migrations"),
    seed: `bun -e import("${pathToFileURL(seedPath).href}")`
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
