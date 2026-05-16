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
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
