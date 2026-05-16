// NOTE: .env.local is loaded centrally in playwright.config.ts via dotenv.config()
// so all env vars are available here without a per-spec load.
import { test, expect } from "@playwright/test";
import { signUpWithPassword, signInWithPassword } from "../../lib/server/auth/gotrue";

test("gotrue wrapper: signup then signin returns a user id + refresh token", async () => {
  const email = `gt+${Date.now()}@example.test`;
  const su = await signUpWithPassword(email, "test-password-123", { name: "GT" });
  expect(su.userId).toMatch(/[0-9a-f-]{36}/);
  const si = await signInWithPassword(email, "test-password-123");
  expect(si.userId).toBe(su.userId);
  expect(typeof si.refreshToken).toBe("string");
  expect(si.refreshToken.length).toBeGreaterThan(10);
});
