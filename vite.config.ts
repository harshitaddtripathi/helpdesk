import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const vitePort = Number(process.env.VITE_PORT ?? 5173);
const apiProxyTarget = process.env.VITE_API_URL || "http://localhost:3000";

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  server: {
    port: vitePort,
    strictPort: process.env.NODE_ENV === "test" || process.env.CI === "true",
    proxy: {
      "/health": apiProxyTarget,
      "/api": apiProxyTarget
    }
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false
  }
});
