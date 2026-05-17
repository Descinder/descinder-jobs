import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function adminCtx(tag: string) {
  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", { data: { email: `${tag}+${Date.now()}@example.test`, password: "test-password-123", name: "AD", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const id = (await (await ctx.get("/api/me/profile")).json()).id;
  await db().from("users").update({ role: "admin" } as never).eq("id", id);
  const cookies = await ctx.storageState();
  const csrf = cookies.cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  return { ctx, id, csrf };
}

test("admin can suspend a user (session invalidated) and the action is audit-logged", async () => {
  const { ctx: admin, id: adminId, csrf } = await adminCtx("admmod-admin");

  const victim = await request.newContext({ baseURL: base });
  await victim.post("/api/auth/signup", { data: { email: `victim+${Date.now()}@example.test`, password: "test-password-123", name: "V", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const victimId = (await (await victim.get("/api/me/profile")).json()).id;
  // victim authed before suspension
  expect((await victim.get("/api/me/profile")).status()).toBe(200);

  const susp = await admin.post(`/api/admin/users/${victimId}/suspend`, { headers: { "x-csrf-token": csrf }, data: { reason: "spam ring" } });
  expect(susp.status()).toBe(200);

  // readSession nulls suspended users → victim's next request is 401
  expect((await victim.get("/api/me/profile")).status()).toBe(401);

  const { data: au } = await db().from("audit_log").select("action, metadata, actor_id").eq("target_id", victimId).eq("action", "user.suspend").single();
  expect((au as { actor_id: string }).actor_id).toBe(adminId);
  expect((au as unknown as { metadata: { reason: string } }).metadata.reason).toBe("spam ring");

  // unsuspend restores access
  expect((await admin.post(`/api/admin/users/${victimId}/unsuspend`, { headers: { "x-csrf-token": csrf } })).status()).toBe(200);
  expect((await victim.get("/api/me/profile")).status()).toBe(200);

  await db().from("audit_log").delete().eq("target_id", victimId);
  await db().from("users").delete().in("id", [adminId, victimId]);
});

test("admin resolves a report; settings PATCH persists + is audited; cannot self-delete", async () => {
  const { ctx: admin, id: adminId, csrf } = await adminCtx("admmod2-admin");

  const { data: rep } = await db().from("reports").insert({
    reporter_user_id: adminId, target_type: "job", target_id: adminId, reason: "spam", status: "open",
  } as never).select("id").single();
  const repId = (rep as { id: string }).id;
  const pr = await admin.patch(`/api/admin/reports/${repId}`, { headers: { "x-csrf-token": csrf }, data: { status: "actioned", action_taken: "removed" } });
  expect(pr.status()).toBe(200);
  const { data: rr } = await db().from("reports").select("status").eq("id", repId).single();
  expect((rr as { status: string }).status).toBe("actioned");

  // allow-listed key with correct value type (unknown keys / wrong types are
  // rejected — H1 hardening); restore the seeded default afterwards.
  const ps = await admin.patch("/api/admin/settings", { headers: { "x-csrf-token": csrf }, data: { key: "signup_disabled", value: true } });
  expect(ps.status()).toBe(200);
  const { data: setting } = await db().from("app_settings").select("value").eq("key", "signup_disabled").single();
  expect((setting as { value: unknown }).value).toBe(true);
  // wrong value type for a boolean key is rejected (422), not silently coerced
  const bad = await admin.patch("/api/admin/settings", { headers: { "x-csrf-token": csrf }, data: { key: "signup_disabled", value: "false" } });
  expect(bad.status()).toBe(422);
  const { count: auditCount } = await db().from("audit_log").select("id", { count: "exact", head: true }).eq("action", "settings.update").eq("actor_id", adminId);
  expect((auditCount ?? 0)).toBeGreaterThanOrEqual(1);

  // admin cannot force-delete self
  const selfDel = await admin.post(`/api/admin/users/${adminId}/force-delete`, { headers: { "x-csrf-token": csrf } });
  expect(selfDel.status()).toBe(409);

  await db().from("reports").delete().eq("id", repId);
  await db().from("app_settings").update({ value: false } as never).eq("key", "signup_disabled"); // restore seeded default
  await db().from("audit_log").delete().eq("actor_id", adminId);
  await db().from("users").delete().eq("id", adminId);
});
