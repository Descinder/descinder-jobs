import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL || "http://localhost:3000";

test("account self-delete: wrong password rejected; correct password erases + revokes session (GDPR Art. 17)", async () => {
  const stamp = Date.now();
  const email = `sec-selfdel+${stamp}@example.test`;
  const password = "test-password-123";
  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: { email, password, name: "SelfDel", role: "job_seeker", marketing_consent: false, accepted_terms: true },
  });
  expect(su.status(), `signup: ${su.status()} ${await su.text()}`).toBe(201);
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  const prof = await ctx.get("/api/me/profile");
  expect(prof.status(), `profile: ${prof.status()} ${await prof.text()}`).toBe(200);
  const userId = (await prof.json()).id as string;

  // Wrong password → UNAUTHENTICATED (guards against session hijack / CSRF-adjacent triggers).
  const bad = await ctx.delete("/api/me/account", {
    headers: { "x-csrf-token": csrf },
    data: { password: "not-the-password" },
  });
  expect(bad.status(), `wrong pw: ${bad.status()} ${await bad.text()}`).toBe(401);
  // M2 regression guard: a fat-fingered password must NOT lock the account
  // out for 24h (per-user counter only bumps on failed password, and the
  // threshold is 5/day not 3/day, so 2 typos then correct still succeeds).
  const bad3 = await ctx.delete("/api/me/account", {
    headers: { "x-csrf-token": csrf },
    data: { password: "still-wrong" },
  });
  expect(bad3.status()).toBe(401);
  // User must STILL exist after wrong-password attempts.
  const { data: stillThere } = await db().from("users").select("id").eq("id", userId).maybeSingle();
  expect(stillThere).not.toBeNull();

  // Missing password body → VALIDATION.
  const bad2 = await ctx.delete("/api/me/account", { headers: { "x-csrf-token": csrf }, data: {} });
  expect(bad2.status()).toBe(422);

  // Correct password AFTER two typos → erasure succeeds (M2 guard).
  const ok = await ctx.delete("/api/me/account", {
    headers: { "x-csrf-token": csrf },
    data: { password },
  });
  expect(ok.status(), `delete: ${ok.status()} ${await ok.text()}`).toBe(200);
  expect((await ok.json()).deleted).toBe(true);

  // User row hard-deleted (not soft).
  const { data: gone } = await db().from("users").select("id").eq("id", userId).maybeSingle();
  expect(gone).toBeNull();

  // Session cookies cleared → subsequent authed call in the SAME context → 401.
  const after = await ctx.get("/api/me/profile");
  expect(after.status()).toBe(401);

  // M3: audit trail must have BOTH rows with the promised metadata shape.
  // Note on actor_id: `audit_log.actor_id` has FK ON DELETE SET NULL, so by
  // the time we can query (i.e. after erasure completes) both rows' actor_id
  // has been null'd by the cascade — the property "intent was written with
  // actor_id=userId at that moment" is provable by code review, not by
  // post-facto observation. We assert target_id (bare uuid, preserved) +
  // metadata shape.
  const { data: audits } = await db()
    .from("audit_log")
    .select("action, actor_id, target_id, metadata")
    .eq("target_id", userId)
    .in("action", ["account.self_delete.intent", "account.self_delete.erased"])
    .order("created_at", { ascending: true });
  const rows = (audits ?? []) as { action: string; actor_id: string | null; target_id: string; metadata: Record<string, unknown> | null }[];
  expect(rows.map((r) => r.action)).toEqual(["account.self_delete.intent", "account.self_delete.erased"]);
  expect(rows[0].target_id).toBe(userId);
  expect(rows[1].target_id).toBe(userId);
  const meta = rows[1].metadata ?? {};
  for (const k of ["objectsDeleted", "orphanedKeys", "stripeCanceled", "stripeAlreadyCanceled", "stripeCustomerDeleted"]) {
    expect(meta, `metadata missing ${k}`).toHaveProperty(k);
  }

  // Scoped cleanup — only THIS test's audit rows (target-only).
  await db().from("audit_log").delete().eq("target_id", userId);
});

test("account self-delete: H2 — refuses when user's company has an active subscription", async () => {
  const stamp = Date.now();
  const email = `sec-selfdel-h2+${stamp}@example.test`;
  const password = "test-password-123";
  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: { email, password, name: "H2 T", role: "employer", marketing_consent: false, accepted_terms: true },
  });
  expect(su.status(), `signup: ${su.status()} ${await su.text()}`).toBe(201);
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  const prof = await ctx.get("/api/me/profile");
  expect(prof.status()).toBe(200);
  const userId = (await prof.json()).id as string;

  // Seed a company + membership + an ACTIVE company sub → deletion must be
  // refused (zombie billing at Stripe if we allowed it).
  const { data: co } = await db()
    .from("companies")
    .insert({ name: `H2 Co ${stamp}`, slug: `h2-co-${stamp}`, size: "11-50" } as never)
    .select("id")
    .single();
  const companyId = (co as { id: string }).id;
  await db().from("company_members").insert({ company_id: companyId, user_id: userId, role: "owner" } as never);
  await db().from("subscriptions").insert({
    owner_type: "company", owner_id: companyId, plan_key: "company_monthly",
    status: "active", started_at: new Date().toISOString(),
  } as never);

  const blocked = await ctx.delete("/api/me/account", {
    headers: { "x-csrf-token": csrf },
    data: { password },
  });
  expect(blocked.status(), `expected CONFLICT: ${blocked.status()} ${await blocked.text()}`).toBe(409);
  expect((await blocked.json()).error.code).toBe("CONFLICT");
  // User must still exist.
  const { data: stillThere } = await db().from("users").select("id").eq("id", userId).maybeSingle();
  expect(stillThere).not.toBeNull();

  // Cancel the sub locally → deletion now proceeds.
  await db().from("subscriptions").update({ status: "canceled" } as never).eq("owner_id", companyId);
  const ok = await ctx.delete("/api/me/account", {
    headers: { "x-csrf-token": csrf },
    data: { password },
  });
  expect(ok.status(), `after cancel: ${ok.status()} ${await ok.text()}`).toBe(200);

  // Cleanup: user + memberships cascaded via eraseUser; scrub the seeded
  // company + sub + audit rows.
  await db().from("subscriptions").delete().eq("owner_id", companyId);
  await db().from("companies").delete().eq("id", companyId);
  await db().from("audit_log").delete().eq("target_id", userId);
});
