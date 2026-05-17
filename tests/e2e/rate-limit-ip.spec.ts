import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("auth_login per-IP limit: 21st attempt from same IP within window → 429", async () => {
  const ip = `9.9.9.${Math.floor(Math.random() * 200) + 1}`;
  const ctx = await request.newContext({ baseURL: base, extraHTTPHeaders: { "x-forwarded-for": ip } });
  let last = 200;
  for (let i = 0; i < 22; i++) {
    const r = await ctx.post("/api/auth/login", { data: { email: `nobody+${i}@example.test`, password: "wrong-password" } });
    last = r.status();
    if (last === 429) break;
  }
  expect(last).toBe(429); // limit (20) exceeded → RATE_LIMITED before auth check
  await db().from("rate_limits").delete().like("identifier", "9.9.9.%");
});
