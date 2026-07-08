import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxyTarget = process.env.VITE_API_URL || "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/health": apiProxyTarget,
      "/api": apiProxyTarget
    }
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true
  }
});
