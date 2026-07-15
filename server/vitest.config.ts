import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "server",
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"]
  }
});
