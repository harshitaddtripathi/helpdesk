import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const datasourceUrl =
  readEnv("DIRECT_URL") ||
  readEnv("DATABASE_URL") ||
  readEnvFileValue(".env.local", "DIRECT_URL") ||
  readEnvFileValue(".env.local", "DATABASE_URL") ||
  readEnvFileValue(".env", "DIRECT_URL") ||
  readEnvFileValue(".env", "DATABASE_URL");

if (!datasourceUrl) {
  console.log("Skipping Prisma generate: DIRECT_URL or DATABASE_URL is not set.");
  process.exit(0);
}

const result = spawnSync("bun", ["run", "db:generate"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);

function readEnv(name: string) {
  return process.env[name]?.trim();
}

function readEnvFileValue(path: string, name: string) {
  if (!existsSync(path)) {
    return undefined;
  }

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

    const [, key, rawValue] = match ?? [];

    if (key !== name || rawValue === undefined) {
      continue;
    }

    return rawValue.replace(/^['"]|['"]$/g, "").trim();
  }

  return undefined;
}
