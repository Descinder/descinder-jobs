import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Admin moderation through the live UI. Suspension must take effect
// immediately (readSession nulls a suspended user → their next authed request
// is 401); unsuspend restores access. The admin acts via the rendered
// /admin/users page (real button → real /api/admin/users/:id/suspend with the
// adminReasonSchema body), not the API directly.

test("admin suspends a signed-up user via the UI → victim is 401 immediately; unsuspend restores", async ({
  page,
}) => {
  // ── Admin: signup via API + DB-promote (the 2d-i pattern), reuse cookies. ──
  const api = await request.newContext({ baseURL: base });
  const adminEmail = `fe-admmod-admin+${Date.now()}@example.test`;
  await api.post("/api/auth/signup", {
    data: {
      email: adminEmail,
      password: "test-password-123",
      name: "Mod Admin",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const adminId = (await (await api.get("/api/me/profile")).json())
    .id as string;
  await db()
    .from("users")
    .update({ role: "admin" } as never)
    .eq("id", adminId);
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);

  // ── Victim: a freshly signed-up seeker with its own authed context. ──
  const victim = await request.newContext({ baseURL: base });
  const victimEmail = `fe-admmod-victim+${Date.now()}@example.test`;
  await victim.post("/api/auth/signup", {
    data: {
      email: victimEmail,
      password: "test-password-123",
      name: "Victim",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const victimId = (await (await victim.get("/api/me/profile")).json())
    .id as string;
  // Victim is authenticated before suspension.
  expect((await victim.get("/api/me/profile")).status()).toBe(200);

  // ── Admin opens /admin/users, searches the victim, clicks Suspend. ──
  // window.prompt is auto-accepted with a reason (adminReasonSchema {reason?}).
  page.on("dialog", (d) =>
    d.type() === "prompt"
      ? d.accept("policy violation")
      : d.accept(),
  );
  await page.goto(`${base}/admin/users`);
  await expect(
    page.getByRole("heading", { name: /^Users$/ }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("Search email or name…").fill(victimEmail);
  await page.getByRole("button", { name: /^Search$/ }).click();

  const victimRow = page.locator("tr", {
    has: page.getByText(victimEmail, { exact: true }),
  });
  await expect(victimRow).toBeVisible({ timeout: 10_000 });
  await victimRow.getByRole("button", { name: /^Suspend$/ }).click();
  await expect(page.getByText(/User suspended\./i)).toBeVisible({
    timeout: 10_000,
  });

  // Suspension is immediate: victim's next authed request is 401.
  expect((await victim.get("/api/me/profile")).status()).toBe(401);

  // The action was audit-logged with the prompt reason (server contract).
  const { data: au } = await db()
    .from("audit_log")
    .select("action, metadata, actor_id")
    .eq("target_id", victimId)
    .eq("action", "user.suspend")
    .single();
  expect((au as { actor_id: string }).actor_id).toBe(adminId);
  expect(
    (au as unknown as { metadata: { reason: string } }).metadata.reason,
  ).toBe("policy violation");

  // ── Unsuspend via the UI restores access. ──
  await page.getByRole("button", { name: /^Search$/ }).click();
  await expect(victimRow).toBeVisible({ timeout: 10_000 });
  await victimRow.getByRole("button", { name: /^Unsuspend$/ }).click();
  await expect(page.getByText(/User unsuspended\./i)).toBeVisible({
    timeout: 10_000,
  });
  expect((await victim.get("/api/me/profile")).status()).toBe(200);

  // ── Cleanup. ──
  await db().from("audit_log").delete().eq("target_id", victimId);
  await db().from("users").delete().in("id", [adminId, victimId]);
});

// Reports queue resolution + allow-listed settings PATCH, both through the
// rendered admin UI, both audit-logged server-side. Asserts the report status
// PERSISTS (DB read) and that an `audit_log` row with actor_type='admin' was
// written for the settings change; restores the seeded `signup_disabled`
// default so the suite stays deterministic.
test("admin resolves a seeded report + flips an allow-listed setting via the UI → both persisted & audited", async ({
  page,
}) => {
  const api = await request.newContext({ baseURL: base });
  const adminEmail = `fe-admmod2-admin+${Date.now()}@example.test`;
  await api.post("/api/auth/signup", {
    data: {
      email: adminEmail,
      password: "test-password-123",
      name: "Mod Admin 2",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const adminId = (await (await api.get("/api/me/profile")).json())
    .id as string;
  await db()
    .from("users")
    .update({ role: "admin" } as never)
    .eq("id", adminId);
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);

  // ── Seed an open report (reporter = the admin user; target = a synthetic
  //    uuid — the resolve path doesn't dereference the target). ──
  const targetId = "00000000-0000-4000-8000-0000000000ad";
  const { data: rep } = await db()
    .from("reports")
    .insert({
      reporter_user_id: adminId,
      target_type: "job",
      target_id: targetId,
      reason: "spam",
      description: "e2e seeded report",
      status: "open",
    } as never)
    .select("id")
    .single();
  const reportId = (rep as { id: string }).id;

  // ── Resolve it via /admin/reports: status=actioned + action_taken. ──
  await page.goto(`${base}/admin/reports`);
  await expect(
    page.getByRole("heading", { name: /^Reports$/ }),
  ).toBeVisible({ timeout: 15_000 });

  const repRow = page.locator("tr", {
    has: page.getByText("e2e seeded report", { exact: true }),
  });
  await expect(repRow).toBeVisible({ timeout: 10_000 });
  await repRow.locator("select").selectOption("actioned");
  await repRow
    .getByPlaceholder("Action taken (optional)")
    .fill("removed by e2e");
  await repRow.getByRole("button", { name: /^Resolve$/ }).click();
  await expect(page.getByText(/Report resolved\./i)).toBeVisible({
    timeout: 10_000,
  });

  // Persisted in the DB (not just optimistic UI).
  const { data: persisted } = await db()
    .from("reports")
    .select("status, action_taken, reviewed_by")
    .eq("id", reportId)
    .single();
  expect((persisted as { status: string }).status).toBe("actioned");
  expect((persisted as { action_taken: string }).action_taken).toBe(
    "removed by e2e",
  );
  expect((persisted as { reviewed_by: string }).reviewed_by).toBe(adminId);

  // Audit row for the resolve.
  const { data: repAudit } = await db()
    .from("audit_log")
    .select("actor_type, actor_id")
    .eq("target_id", reportId)
    .eq("action", "report.resolve")
    .single();
  expect((repAudit as { actor_type: string }).actor_type).toBe("admin");
  expect((repAudit as { actor_id: string }).actor_id).toBe(adminId);

  // ── Flip the allow-listed boolean `signup_disabled` → true via the UI. ──
  // The control is a toggle that MUST send a real boolean (the 2d-i H1 type
  // guard 422s a string for a boolean key).
  await page.goto(`${base}/admin/settings`);
  await expect(
    page.getByRole("heading", { name: /^Settings$/ }),
  ).toBeVisible({ timeout: 15_000 });

  const setRow = page.locator("tr", {
    has: page.getByText("signup_disabled", { exact: true }),
  });
  await expect(setRow).toBeVisible({ timeout: 10_000 });
  await setRow.getByRole("button").click(); // toggle false → true
  await expect(page.getByText(/Saved "signup_disabled"\./i)).toBeVisible({
    timeout: 10_000,
  });

  // Persisted as a real JSON boolean (not the string "true").
  const { data: setVal } = await db()
    .from("app_settings")
    .select("value")
    .eq("key", "signup_disabled")
    .single();
  expect((setVal as { value: unknown }).value).toBe(true);

  // Audit row for the settings change (actor_type='admin').
  const { data: setAudit } = await db()
    .from("audit_log")
    .select("actor_type, actor_id, metadata")
    .eq("action", "settings.update")
    .eq("actor_id", adminId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  expect((setAudit as { actor_type: string }).actor_type).toBe("admin");
  expect(
    (setAudit as unknown as { metadata: { key: string; value: unknown } })
      .metadata,
  ).toMatchObject({ key: "signup_disabled", value: true });

  // ── Restore the seeded default + clean up. ──
  await db()
    .from("app_settings")
    .update({ value: false, updated_by: null } as never)
    .eq("key", "signup_disabled");
  await db().from("audit_log").delete().eq("actor_id", adminId);
  await db().from("audit_log").delete().eq("target_id", reportId);
  await db().from("reports").delete().eq("id", reportId);
  await db().from("users").delete().eq("id", adminId);
});
