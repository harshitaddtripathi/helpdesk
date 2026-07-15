import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

type Env = {
  DATABASE_URL: string;
  DIRECT_URL: string;
};

config({ path: ".env.local", override: false });
config({ path: ".env", override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts"
  },
  datasource: {
    url: env<Env>("DIRECT_URL")
  }
});
