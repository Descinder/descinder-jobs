import { defineConfig } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

// Load .env.local so env vars reach every worker process.
// Next.js does this automatically; the Playwright runner does not.
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  tsconfig: "./tsconfig.e2e.json",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // Run against a PRODUCTION server, not `next dev`. `next dev` compiles each
  // route on first hit and recompiles on change — under a long serial suite
  // that causes intermittent cold-start / ERR_CONNECTION_REFUSED on unrelated
  // specs. A built `next start` has no per-route compilation and is
  // deterministic, and it exercises the bundle that actually ships.
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
