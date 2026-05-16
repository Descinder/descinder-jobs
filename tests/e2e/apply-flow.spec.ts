import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

test("free seeker hits 402 paywall on native apply; subscriber applies; dup → 409", async () => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `ApplyCo ${stamp}`, slug: `applyco-${stamp}`, size: "11-50" }).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `ApplyFlow ${stamp}`, description: "ten plus chars here",
    employment_type: "full_time", work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();

  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const email = `applyflow+${stamp}@example.test`;
  await ctx.post("/api/auth/signup", { data: { email, password: "test-password-123", name: "AF", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  const blocked = await ctx.post(`/api/jobs/${job!.id}/apply`, { headers: { "x-csrf-token": csrf }, data: { cover_letter: "I am very keen on this role." } });
  expect(blocked.status()).toBe(402);
  expect((await blocked.json()).error.details.paywall_reason).toBe("subscribe_to_apply");

  const userId = (await (await ctx.get("/api/me/profile")).json()).id;
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() });

  const okRes = await ctx.post(`/api/jobs/${job!.id}/apply`, { headers: { "x-csrf-token": csrf }, data: { cover_letter: "I am very keen on this role." } });
  expect(okRes.status()).toBe(201);
  const dup = await ctx.post(`/api/jobs/${job!.id}/apply`, { headers: { "x-csrf-token": csrf }, data: { cover_letter: "again" } });
  expect(dup.status()).toBe(409);

  const list = await ctx.get("/api/me/applications");
  expect((await list.json()).applications.some((a: { jobId: string }) => a.jobId === job!.id)).toBe(true);

  await db().from("applications").delete().eq("user_id", userId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("jobs").delete().eq("id", job!.id);
  await db().from("companies").delete().eq("id", co!.id);
  await db().from("users").delete().eq("id", userId);
});
