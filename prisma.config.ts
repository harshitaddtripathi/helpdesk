import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

const datasourceUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!datasourceUrl) {
  throw new Error("Prisma requires DIRECT_URL or DATABASE_URL to be set.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts"
  },
  datasource: {
    url: datasourceUrl
  }
});
