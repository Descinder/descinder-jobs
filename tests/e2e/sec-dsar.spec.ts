import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { downloadObject } from "../../lib/server/integrations/storage/blob";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("DSAR export includes all personal-data categories + owner-scoped re-download works", async () => {
  const stamp = Date.now();
  const email = `sec-dsar+${stamp}@example.test`;
  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: { email, password: "test-password-123", name: "DSAR T", role: "job_seeker", marketing_consent: true, accepted_terms: true },
  });
  expect(su.status(), `signup failed: ${su.status()} ${await su.text()}`).toBe(201);
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  // Prove the request-context session is live (mirrors the proven
  // ai-cv-endpoints idiom: signup → authed GET 200) and capture the id.
  const prof = await ctx.get("/api/me/profile");
  expect(prof.status(), `profile GET not authed: ${prof.status()} ${await prof.text()}`).toBe(200);
  const userId = (await prof.json()).id as string;

  // Seed the extra personal-data categories directly (the established e2e
  // seeding pattern — fewer HTTP failure points than driving each via the UI).
  await db().from("job_seeker_profiles").upsert({
    user_id: userId, headline: "Senior Dev", skills: ["typescript"], desired_role_types: [],
  } as never, { onConflict: "user_id" });
  await db().from("job_alerts").insert({
    user_id: userId, name: `DSAR alert ${stamp}`, frequency: "daily",
  } as never);

  // Request the export (authed + CSRF — same context that just proved 200).
  const exp = await ctx.post("/api/me/data-export", { headers: { "x-csrf-token": csrf } });
  expect(exp.status(), `data-export POST: ${exp.status()} ${await exp.text()}`).toBe(201);

  // The stored bundle must include every new personal-data category and
  // leak NO secret column.
  const { data: row } = await db().from("data_export_requests")
    .select("r2_object_key").eq("user_id", userId).eq("status", "complete").single();
  const key = (row as { r2_object_key: string }).r2_object_key;
  const bundle = JSON.parse(await downloadObject(key));
  for (const k of ["seeker_profile", "job_alerts", "saved_jobs", "consent_log", "subscriptions", "payments", "sessions", "company_memberships"]) {
    expect(bundle, `bundle missing ${k}`).toHaveProperty(k);
  }
  expect(bundle.seeker_profile?.headline).toBe("Senior Dev");
  expect(Array.isArray(bundle.job_alerts) && bundle.job_alerts.length).toBeGreaterThan(0);
  const flat = JSON.stringify(bundle);
  expect(flat).not.toContain("gotrue_refresh_token");
  expect(flat).not.toContain("csrf_token");

  // Owner-scoped re-download works for the owner; anon is auth-gated.
  const dl = await ctx.get("/api/me/data-export/download");
  expect(dl.status()).toBe(200);
  expect((await dl.json()).downloadUrl).toContain("http");
  const anon = await request.newContext({ baseURL: base });
  expect((await anon.get("/api/me/data-export/download")).status()).toBe(401);

  // Cleanup.
  await db().from("data_export_requests").delete().eq("user_id", userId);
  await db().from("job_alerts").delete().eq("user_id", userId);
  await db().from("job_seeker_profiles").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});
