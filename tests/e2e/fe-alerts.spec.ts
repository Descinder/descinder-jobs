import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("alerts UI: create (daily) → listed; instant by free user → downgrade notice + stored daily; edit name; delete", async ({ page }) => {
  const stamp = Date.now();
  const email = `fe-alerts+${stamp}@example.test`;

  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "Alert Tester",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;
  const state = await ctx.storageState();
  await page.context().addCookies(state.cookies);

  // Deterministically exercise the downgrade path regardless of the shared
  // app_settings defaults: instant must be a PAID feature (else everyone gets
  // instant and no downgrade happens) and the global kill-switch must be on.
  // Capture prior values and restore them in cleanup (app_settings is a shared
  // singleton table; e2e runs workers:1 so this is safe serially).
  async function getSetting(key: string): Promise<unknown> {
    const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
    return (data as { value: unknown } | null)?.value;
  }
  async function setSetting(key: string, value: unknown) {
    await db().from("app_settings").upsert({ key, value } as never, { onConflict: "key" });
  }
  const priorPaid = await getSetting("instant_alerts_paid");
  const priorEnabled = await getSetting("feature_alerts_enabled");
  await setSetting("instant_alerts_paid", true);
  await setSetting("feature_alerts_enabled", true);

  await page.goto(`${base}/alerts`);
  await expect(page.getByRole("heading", { name: /Job alerts/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("alert-row")).toHaveCount(0);

  // 1) Create a daily alert → appears in the list, no downgrade notice.
  await page.fill("#al-name", `Daily React ${stamp}`);
  await page.selectOption("#al-freq", "daily");
  await page.fill("#al-q", "react");
  await page.getByRole("button", { name: /Create alert/i }).click();
  await expect(page.getByTestId("alert-row")).toHaveCount(1);
  await expect(page.getByText(`Daily React ${stamp}`)).toBeVisible();
  await expect(page.getByTestId("alert-notice")).toHaveCount(0);

  // 2) Create an INSTANT alert as a free (non-entitled) user → server
  //    downgrades to daily; UI shows the upsell notice; row reads DAILY.
  await page.fill("#al-name", `Instant React ${stamp}`);
  await page.selectOption("#al-freq", "instant");
  await page.getByRole("button", { name: /Create alert/i }).click();
  await expect(page.getByTestId("alert-notice")).toBeVisible();
  await expect(page.getByTestId("alert-notice")).toContainText(/saved as Daily/i);
  await expect(page.getByTestId("alert-row")).toHaveCount(2);
  // Authoritative check: the stored row is daily, not instant.
  const stored = await db()
    .from("job_alerts")
    .select("frequency, is_premium")
    .eq("user_id", userId)
    .eq("name", `Instant React ${stamp}`)
    .single();
  expect((stored.data as { frequency: string; is_premium: boolean }).frequency).toBe("daily");
  expect((stored.data as { is_premium: boolean }).is_premium).toBe(false);

  // 3) Edit the first alert's name.
  await page
    .getByTestId("alert-row")
    .filter({ hasText: `Daily React ${stamp}` })
    .getByRole("button", { name: /Edit/i })
    .click();
  await page.fill("#al-name", `Renamed React ${stamp}`);
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByText(`Renamed React ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Daily React ${stamp}`)).toHaveCount(0);

  // 4) Delete an alert → count drops.
  await page
    .getByTestId("alert-row")
    .filter({ hasText: `Instant React ${stamp}` })
    .getByRole("button", { name: /Delete/i })
    .click();
  await expect(page.getByTestId("alert-row")).toHaveCount(1);

  // Cleanup — restore app_settings to exactly its prior state (delete the key
  // if it didn't exist before, otherwise put the prior value back).
  if (priorPaid === undefined) await db().from("app_settings").delete().eq("key", "instant_alerts_paid");
  else await setSetting("instant_alerts_paid", priorPaid);
  if (priorEnabled === undefined) await db().from("app_settings").delete().eq("key", "feature_alerts_enabled");
  else await setSetting("feature_alerts_enabled", priorEnabled);
  await db().from("job_alerts").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});
