import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://localhost:3000",
      "/api": "http://localhost:3000"
    }
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true
  }
});
