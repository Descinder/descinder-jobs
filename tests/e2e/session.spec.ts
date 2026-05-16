// NOTE: .env.local is loaded centrally in playwright.config.ts via dotenv.config()
// so all env vars are available here without a per-spec load.
import { test, expect } from "@playwright/test";
import { signUpWithPassword, signInWithPassword } from "../../lib/server/auth/gotrue";
import { createSession, readSession, revokeSession } from "../../lib/server/auth/session";
import { db } from "../../lib/server/repos/db";

test("session: create → read returns user; revoke → read returns null", async () => {
  const email = `ses+${Date.now()}@example.test`;
  const { userId } = await signUpWithPassword(email, "test-password-123", { name: "Ses" });
  const auth = await signInWithPassword(email, "test-password-123");
  const { sessionId, csrfToken } = await createSession({
    userId, refreshToken: auth.refreshToken, userAgent: "test", ip: "127.0.0.1",
  });
  expect(sessionId).toMatch(/[0-9a-f-]{36}/);
  expect(csrfToken).toMatch(/^[0-9a-f]{64}$/);
  const ctx = await readSession(sessionId);
  expect(ctx?.user.id).toBe(userId);
  expect(ctx?.user.email).toBe(email);
  await revokeSession(sessionId);
  expect(await readSession(sessionId)).toBeNull();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await db()!.from("sessions").delete().eq("user_id", userId);
});
