import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Admin shell access control. The layout gate only SHAPES the UI; the real
// guarantee is server-side requireRole on /api/admin/*. This spec proves both:
// anon → /login, signed-up non-admin → "Admins only" + a genuine 403 from the
// API, and a DB-promoted admin → live metric tiles.

test("anonymous visiting /admin is redirected to /login", async ({ page }) => {
  await page.goto(`${base}/admin`);
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});

test("signed-up non-admin sees 'Admins only' and the API returns a real 403", async ({
  page,
}) => {
  const email = `fe-admacc-nonadmin+${Date.now()}@example.test`;
  await page.goto(`${base}/signup`);
  await page.getByLabel("Full name").fill("Non Admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.locator('input[name="role"][value="job_seeker"]').check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/seeker/, { timeout: 15_000 });

  await page.goto(`${base}/admin`);
  await expect(page.getByRole("heading", { name: /Admins only/i })).toBeVisible({
    timeout: 15_000,
  });

  // Server is authoritative: the metrics endpoint truly 403s for a non-admin
  // (uses the page's authenticated cookies).
  const res = await page.request.get(`${base}/api/admin/metrics`);
  expect(res.status()).toBe(403);

  const id = (await (await page.request.get(`${base}/api/me/profile`)).json())
    .id as string;
  await db().from("users").delete().eq("id", id);
});

test("DB-promoted admin sees the metric tiles render with numbers", async ({
  page,
}) => {
  // Sign up via API, promote to admin in the DB (the 2d-i e2e pattern), then
  // drive the UI with that authenticated browser context.
  const api = await request.newContext({ baseURL: base });
  const email = `fe-admacc-admin+${Date.now()}@example.test`;
  await api.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "Real Admin",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const id = (await (await api.get("/api/me/profile")).json()).id as string;
  await db()
    .from("users")
    .update({ role: "admin" } as never)
    .eq("id", id);

  // Reuse the API context's cookies for the browser.
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);

  await page.goto(`${base}/admin`);
  await expect(
    page.getByRole("heading", { name: /Admin dashboard/i }),
  ).toBeVisible({ timeout: 15_000 });

  // The five real metric tiles render, each with a numeric value.
  for (const label of [
    "Signups",
    "Native jobs",
    "Ingested jobs",
    "Applications",
    "Active subscriptions",
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  // At least the "Signups" count is a number (this admin exists → ≥ 1).
  const signupTile = page
    .locator("div", { has: page.getByText("Signups", { exact: true }) })
    .last();
  await expect(signupTile).toContainText(/\d/);

  await db().from("users").delete().eq("id", id);
});
