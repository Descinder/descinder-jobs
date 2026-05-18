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

// Review H1 closure: an instant-ENTITLED user (active sub) creating/patching to
// instant must be stored is_premium=true (grandfather, spec §307) so a later
// instant_alerts_paid flip keeps 4b firing it. This path was untested — which
// is exactly why H1 (PATCH-to-instant never set is_premium) slipped.
test("instant-entitled user: create instant + PATCH daily→instant both set isPremium (grandfather)", async () => {
  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", { data: { email: `alprem+${Date.now()}@example.test`, password: "test-password-123", name: "AP", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;
  // active subscription → instant_alerts gate allowed (instant_alerts_paid default true)
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() } as never);

  // create instant → entitled → frequency stays instant, isPremium true, not downgraded
  const c = await ctx.post("/api/me/alerts", { headers: { "x-csrf-token": csrf }, data: { name: "Inst", frequency: "instant", filters: { work_mode: "remote" } } });
  expect(c.status()).toBe(201);
  const cb = await c.json();
  expect(cb.downgraded).toBeFalsy();
  expect(cb.alert.frequency).toBe("instant");
  expect(cb.alert.isPremium).toBe(true);

  // create a daily alert, then PATCH it to instant → must also set isPremium (H1)
  const d = await ctx.post("/api/me/alerts", { headers: { "x-csrf-token": csrf }, data: { name: "Day", frequency: "daily" } });
  const dailyId = (await d.json()).alert.id as string;
  const up = await ctx.patch(`/api/me/alerts/${dailyId}`, { headers: { "x-csrf-token": csrf }, data: { frequency: "instant" } });
  expect(up.status()).toBe(200);
  const ub = await up.json();
  expect(ub.alert.frequency).toBe("instant");
  expect(ub.alert.isPremium).toBe(true); // was false on create (daily); PATCH must grandfather

  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("users").delete().eq("id", userId);
});
