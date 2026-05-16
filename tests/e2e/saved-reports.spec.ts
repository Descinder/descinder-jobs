import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

test("save/unsave idempotent + saved-ids; report requires auth", async () => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `SvCo ${stamp}`, slug: `svco-${stamp}`, size: "11-50" }).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `Sv Job ${stamp}`, description: "ten plus chars",
    employment_type: "full_time", work_mode: "remote", experience_level: "mid", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();

  const anon = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  expect((await anon.get("/api/me/saved-jobs/ids")).status()).toBe(200);
  expect((await (await anon.get("/api/me/saved-jobs/ids")).json()).jobIds).toEqual([]);
  expect((await anon.post("/api/reports", { data: { target_type: "job", target_id: job!.id, reason: "spam" } })).status()).toBe(401);

  const u = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  await u.post("/api/auth/signup", { data: { email: `sv+${stamp}@example.test`, password: "test-password-123", name: "Sv", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const csrf = (await u.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const uId = (await (await u.get("/api/me/profile")).json()).id;

  await u.post(`/api/jobs/${job!.id}/save`, { headers: { "x-csrf-token": csrf } });
  await u.post(`/api/jobs/${job!.id}/save`, { headers: { "x-csrf-token": csrf } });
  expect((await (await u.get("/api/me/saved-jobs/ids")).json()).jobIds).toContain(job!.id);
  await u.delete(`/api/jobs/${job!.id}/save`, { headers: { "x-csrf-token": csrf } });
  expect((await (await u.get("/api/me/saved-jobs/ids")).json()).jobIds).not.toContain(job!.id);
  expect((await u.post("/api/reports", { headers: { "x-csrf-token": csrf }, data: { target_type: "job", target_id: job!.id, reason: "spam", description: "fake" } })).status()).toBe(201);

  await db().from("reports").delete().eq("reporter_user_id", uId);
  await db().from("saved_jobs").delete().eq("user_id", uId);
  await db().from("jobs").delete().eq("id", job!.id);
  await db().from("companies").delete().eq("id", co!.id);
  await db().from("users").delete().eq("id", uId);
});
