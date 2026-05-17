import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Live CV management screen: signup seeker → /cv → build-from-profile →
// CV appears → set primary → delete. Wired to /api/me/cvs* (Plan 3b Task 3).
test("CV management: build from profile → set primary → delete", async ({
  page,
}) => {
  const stamp = Date.now();
  const email = `fe-cv+${stamp}@example.test`;

  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "CV Tester",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  expect(su.status()).toBe(201);
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;

  const state = await ctx.storageState();
  await page.context().addCookies(state.cookies);

  await page.goto(`${base}/cv`);
  await expect(
    page.getByRole("heading", { name: /My CVs/i }),
  ).toBeVisible({ timeout: 15_000 });

  // Build a CV from profile → it should appear in the Base CVs grid.
  await page.getByRole("button", { name: /Build from profile/i }).click();
  await expect(page.getByText(/-cv\.txt/i)).toBeVisible({ timeout: 15_000 });

  // Verify it persisted via the API.
  const list1 = await ctx.get("/api/me/cvs");
  const j1 = await list1.json();
  expect(j1.base.length).toBeGreaterThanOrEqual(1);
  const cvId = j1.base[0].id as string;

  // Set primary → Primary badge appears.
  await page.getByRole("button", { name: /Set primary/i }).first().click();
  await expect(page.getByText("Primary", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  const list2 = await ctx.get("/api/me/cvs");
  expect(
    (await list2.json()).base.find(
      (c: { id: string }) => c.id === cvId,
    ).isPrimary,
  ).toBe(true);

  // Delete (auto-accept the confirm() dialog).
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Delete/i }).first().click();
  await expect(page.getByText(/No base CVs yet/i)).toBeVisible({
    timeout: 15_000,
  });
  const list3 = await ctx.get("/api/me/cvs");
  expect(
    (await list3.json()).base.some((c: { id: string }) => c.id === cvId),
  ).toBe(false);

  // Cleanup.
  await db().from("cv_files").delete().eq("user_id", userId);
  await db().from("job_seeker_profiles").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});
