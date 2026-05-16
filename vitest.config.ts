import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import dotenv from "dotenv";

// Load .env.local so server-side modules (e.g. lib/env.ts) can validate env
// variables in the vitest/jsdom environment where Next.js doesn't do this.
// We parse the file and pass the values through test.env so they reach workers.
const localEnv = dotenv.config({ path: path.resolve(__dirname, ".env.local") }).parsed ?? {};

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    env: localEnv,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      // `server-only` throws outside RSC; replace with a no-op in tests so
      // that server-side modules (e.g. lib/server/repos/db.ts) can be imported.
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
});
