import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Free seeker (no subscription) → AI-CV generate → backend returns
// 402 PAYWALL (paywall_reason: subscribe_for_ai_cv) → page shows the
// subscription paywall messaging inline (Plan 3b Task 4).
// The subscriber + real-AI success path needs provider keys (absent in CI),
// so it is asserted at the contract level by ai-cv-endpoints.spec.ts.
test("AI-CV generator: free seeker → paywall messaging", async ({ page }) => {
  const stamp = Date.now();
  const email = `fe-aicv+${stamp}@example.test`;

  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "AI CV Tester",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  expect(su.status()).toBe(201);
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;

  const state = await ctx.storageState();
  await page.context().addCookies(state.cookies);

  await page.goto(`${base}/cv/generate`);
  await expect(
    page.getByRole("heading", { name: /AI CV generator/i }),
  ).toBeVisible({ timeout: 15_000 });

  await page
    .getByLabel(/Job ID/i)
    .fill("11111111-1111-1111-1111-111111111111");
  await page
    .getByLabel(/Base CV text/i)
    .fill(
      "Experienced software engineer with a strong background in TypeScript, " +
        "Node.js and distributed systems, seeking a senior platform role.",
    );
  await page
    .getByRole("button", { name: /Generate tailored CV/i })
    .click();

  // Free seeker → 402 → inline paywall messaging + subscription link.
  await expect(page.getByText(/need an active subscription/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("link", { name: /See subscription options/i }),
  ).toBeVisible();

  // No uncaught navigation away from our origin.
  expect(new URL(page.url()).origin).toBe(new URL(base).origin);

  // Cleanup.
  await db().from("cv_generations").delete().eq("user_id", userId);
  await db().from("job_seeker_profiles").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});
