import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { checkRateLimit } from "../../lib/server/repos/rate-limit";

test("checkRateLimit: fixed window allows up to limit then blocks; new window resets", async () => {
  const id = `rl-${Date.now()}`;
  const r1 = await checkRateLimit("test_bucket", id, 3, 3600);
  const r2 = await checkRateLimit("test_bucket", id, 3, 3600);
  const r3 = await checkRateLimit("test_bucket", id, 3, 3600);
  const r4 = await checkRateLimit("test_bucket", id, 3, 3600);
  expect([r1.allowed, r2.allowed, r3.allowed, r4.allowed]).toEqual([true, true, true, false]);
  expect(r4.remaining).toBe(0);

  await db().from("rate_limits").delete().eq("identifier", id);
});
