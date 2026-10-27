/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the Flask API is reached through this proxy, so the
// browser sees one origin and CORS is not involved.
const api = process.env.VITE_DEV_API ?? "http://127.0.0.1:5000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": api } },
  preview: { port: 4173, proxy: { "/api": api } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: false,
  },
});
