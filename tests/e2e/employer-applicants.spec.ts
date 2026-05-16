import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

test("employer sees applicants + sets status; non-member employer 403; detail no-leak 404", async () => {
  const stamp = Date.now();
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

  const empA = await request.newContext({ baseURL: base });
  await empA.post("/api/auth/signup", { data: { email: `empA+${stamp}@example.test`, password: "test-password-123", name: "EmpA", role: "employer", marketing_consent: false, accepted_terms: true } });
  const aCsrf = (await empA.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  await empA.post("/api/companies", { headers: { "x-csrf-token": aCsrf }, data: { name: `EA Co ${stamp}`, size: "11-50" } });
  const jobRes = await empA.post("/api/jobs", { headers: { "x-csrf-token": aCsrf }, data: { title: `EA Job ${stamp}`, description: "ten plus chars", employment_type: "full_time", work_mode: "remote", experience_level: "mid", apply_method: "native", status: "published", salary_currency: "GBP" } });
  const jobId = (await jobRes.json()).id;

  const seeker = await request.newContext({ baseURL: base });
  await seeker.post("/api/auth/signup", { data: { email: `appsk+${stamp}@example.test`, password: "test-password-123", name: "Sk", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const sCsrf = (await seeker.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const sId = (await (await seeker.get("/api/me/profile")).json()).id;
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: sId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() });
  const appRes = await seeker.post(`/api/jobs/${jobId}/apply`, { headers: { "x-csrf-token": sCsrf }, data: { cover_letter: "Keen on this." } });
  const appId = (await appRes.json()).id;

  const applicants = await empA.get(`/api/jobs/${jobId}/applications`);
  expect(applicants.status()).toBe(200);
  expect((await applicants.json()).applications.length).toBe(1);
  const setStatus = await empA.patch(`/api/applications/${appId}/status`, { headers: { "x-csrf-token": aCsrf }, data: { status: "shortlisted" } });
  expect(setStatus.status()).toBe(200);

  const empB = await request.newContext({ baseURL: base });
  await empB.post("/api/auth/signup", { data: { email: `empB+${stamp}@example.test`, password: "test-password-123", name: "EmpB", role: "employer", marketing_consent: false, accepted_terms: true } });
  const bCsrf = (await empB.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  await empB.post("/api/companies", { headers: { "x-csrf-token": bCsrf }, data: { name: `EB Co ${stamp}`, size: "11-50" } });
  expect((await empB.get(`/api/jobs/${jobId}/applications`)).status()).toBe(403);
  expect((await empB.patch(`/api/applications/${appId}/status`, { headers: { "x-csrf-token": bCsrf }, data: { status: "hired" } })).status()).toBe(403);

  expect((await seeker.get(`/api/applications/${appId}`)).status()).toBe(200);
  expect((await empA.get(`/api/applications/${appId}`)).status()).toBe(200);
  expect((await empB.get(`/api/applications/${appId}`)).status()).toBe(404);

  await db().from("applications").delete().eq("id", appId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("subscriptions").delete().eq("owner_id", sId);
  await db().from("companies").delete().like("slug", `%-${stamp}%`);
  await db().from("users").delete().in("id", [sId]);
});
