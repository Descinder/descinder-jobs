import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("alerts API: auth required; free instant→daily downgrade; owner-scoped; CRUD", async () => {
  const anon = await request.newContext({ baseURL: base });
  expect((await anon.get("/api/me/alerts")).status()).toBe(401);

  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", { data: { email: `alapi+${Date.now()}@example.test`, password: "test-password-123", name: "AA", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;

  // free seeker requests instant → downgraded to daily (instant_alerts_paid default true, no sub)
  const created = await ctx.post("/api/me/alerts", { headers: { "x-csrf-token": csrf }, data: { name: "Remote React", frequency: "instant", filters: { work_mode: "remote" } } });
  expect(created.status()).toBe(201);
  const body = await created.json();
  expect(body.downgraded).toBe(true);
  expect(body.alert.frequency).toBe("daily");
  expect(body.alert.isPremium).toBe(false);
  const alertId = body.alert.id as string;

  const list = await ctx.get("/api/me/alerts");
  expect((await list.json()).alerts.some((a: { id: string }) => a.id === alertId)).toBe(true);

  // owner-scoped: a different user cannot PATCH/DELETE it (404, no existence leak)
  const other = await request.newContext({ baseURL: base });
  await other.post("/api/auth/signup", { data: { email: `alother+${Date.now()}@example.test`, password: "test-password-123", name: "AO", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const ocsrf = (await other.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  expect((await other.patch(`/api/me/alerts/${alertId}`, { headers: { "x-csrf-token": ocsrf }, data: { name: "hacked" } })).status()).toBe(404);

  // owner can rename + delete
  const patched = await ctx.patch(`/api/me/alerts/${alertId}`, { headers: { "x-csrf-token": csrf }, data: { name: "Renamed" } });
  expect((await patched.json()).alert.name).toBe("Renamed");
  expect((await ctx.delete(`/api/me/alerts/${alertId}`, { headers: { "x-csrf-token": csrf } })).status()).toBe(200);

  const otherId = (await (await other.get("/api/me/profile")).json()).id as string;
  await db().from("users").delete().in("id", [userId, otherId]);
});
