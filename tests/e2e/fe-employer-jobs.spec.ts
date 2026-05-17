import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Employer (signup + company via API for setup) → UI /jobs/new → fill + Publish
// → lands on /jobs/:id/edit → edit title → Save (assert "Saved." + persisted via
// GET /api/jobs/:id) → Close (confirm) → GET /api/jobs/:id now 404s (jobDetail
// gates on status==="published", so a closed job is no longer fetchable — the
// status change is reflected; §9c). Cleanup.
test("employer posts a job via UI → edit persists → close reflects", async ({
  page,
}) => {
  const stamp = Date.now();
  const email = `fe-emp-jobs+${stamp}@example.test`;

  // Setup: signup + company through the API request context, then share its
  // session cookies with the browser context.
  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "Jobs Employer",
      role: "employer",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  expect(su.status()).toBe(201);
  const csrf =
    (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")
      ?.value ?? "";
  const co = await ctx.post("/api/companies", {
    headers: { "x-csrf-token": csrf },
    data: { name: `FE Jobs Co ${stamp}`, size: "11-50" },
  });
  expect(co.status()).toBe(201);
  const userId = (await (await ctx.get("/api/me/profile")).json())
    .id as string;
  await page.context().addCookies((await ctx.storageState()).cookies);

  const title = `FE Native Engineer ${stamp}`;
  await page.goto(`${base}/jobs/new`);
  await page.getByLabel("Job title").fill(title);
  await page
    .getByLabel("Description")
    .fill("We are hiring for real, this description is long enough.");
  await page.getByLabel("Job type").selectOption("full_time");
  await page.getByLabel("Work mode").selectOption("remote");
  await page.getByLabel("Experience level").selectOption("senior");
  await page.getByLabel(/Skills required/i).fill("typescript, react");
  await page.getByRole("button", { name: /^Publish$/ }).click();
  await expect(page).toHaveURL(/\/jobs\/[^/]+\/edit/, { timeout: 15_000 });

  const jobId = page.url().match(/\/jobs\/([^/]+)\/edit/)?.[1] as string;
  expect(jobId).toBeTruthy();

  // Edit the title → Save → "Saved." + persisted.
  const newTitle = `${title} (Updated)`;
  await expect(page.getByLabel("Job title")).toHaveValue(title, {
    timeout: 10_000,
  });
  await page.getByLabel("Job title").fill(newTitle);
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  const got = await page.request.get(`${base}/api/jobs/${jobId}`);
  expect(got.ok()).toBeTruthy();
  expect((await got.json()).title).toBe(newTitle);

  // Close (auto-accept the confirm dialog).
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^Close$/ }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Status reflected: a closed job is no longer fetchable via GET /api/jobs/:id.
  const afterClose = await page.request.get(`${base}/api/jobs/${jobId}`);
  expect(afterClose.status()).toBe(404);

  // Cleanup.
  const { data: cm } = await db()
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();
  const companyId = cm?.company_id as string | undefined;
  if (companyId) {
    await db().from("jobs").delete().eq("company_id", companyId);
    await db().from("company_members").delete().eq("company_id", companyId);
    await db().from("companies").delete().eq("id", companyId);
  }
  await db().from("users").delete().eq("id", userId);
});
