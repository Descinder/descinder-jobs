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
