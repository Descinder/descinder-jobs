import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

test("external apply is free for anon + free user; subscriber gets idempotent stub", async () => {
  const stamp = Date.now();
  const { data: job } = await db().from("jobs").insert({
    source: "adzuna", external_id: `ea-${stamp}`, title: `ExtApply ${stamp}`, description: "snippet ok here",
    employment_type: "full_time", work_mode: "remote", experience_level: "mid", status: "published",
    apply_method: "external", external_apply_url: "https://adzuna.example/ea", source_company_name: "Caelum",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();

  const anon = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const a = await anon.post(`/api/jobs/${job!.id}/external-click`);
  expect(a.status()).toBe(200);
  expect((await a.json()).redirectUrl).toBe("https://adzuna.example/ea");

  const sub = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const email = `extsub+${stamp}@example.test`;
  await sub.post("/api/auth/signup", { data: { email, password: "test-password-123", name: "ES", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const userId = (await (await sub.get("/api/me/profile")).json()).id;
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() });

  await sub.post(`/api/jobs/${job!.id}/external-click`);
  await sub.post(`/api/jobs/${job!.id}/external-click`);
  const apps = await (await sub.get("/api/me/applications")).json();
  const stub = apps.applications.filter((x: { jobId: string }) => x.jobId === job!.id);
  expect(stub.length).toBe(1);
  expect(stub[0].isExternal).toBe(true);

  await db().from("applications").delete().eq("user_id", userId);
  await db().from("external_apply_clicks").delete().eq("job_id", job!.id);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("jobs").delete().eq("id", job!.id);
  await db().from("users").delete().eq("id", userId);
});
