import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Full employer applicants journey through the live UI:
//  - employerA signs up + creates a company + a published native job (API setup)
//  - a seeker signs up, subscribes (DB insert — mirrors employer-applicants.spec)
//    and applies via POST /api/jobs/:id/apply
//  - employerA opens /jobs/:id/applicants in the browser → sees the applicant →
//    opens /applications/:id → changes status via the employer-vocab <select>
//    ("shortlisted") → asserts persisted via GET /api/applications/:id
//  - a non-member employerB hits /jobs/:id/applicants → "no access" (server 403)
//  - company editor: employerA edits the company name → Save → "Saved." →
//    asserts persisted via GET /api/me/company
// Cleanup at the end.
test("employer reviews applicant via UI → sets status → persists; non-member 403; company editor saves", async ({
  page,
}) => {
  const stamp = Date.now();
  const aEmail = `fe-appA+${stamp}@example.test`;
  const bEmail = `fe-appB+${stamp}@example.test`;
  const sEmail = `fe-appS+${stamp}@example.test`;

  // ── employerA: signup + company + published native job (API) ──
  const empA = await request.newContext({ baseURL: base });
  expect(
    (
      await empA.post("/api/auth/signup", {
        data: {
          email: aEmail,
          password: "test-password-123",
          name: "EmpA FE",
          role: "employer",
          marketing_consent: false,
          accepted_terms: true,
        },
      })
    ).status(),
  ).toBe(201);
  const aCsrf =
    (await empA.storageState()).cookies.find((c) => c.name === "ds_csrf")
      ?.value ?? "";
  expect(
    (
      await empA.post("/api/companies", {
        headers: { "x-csrf-token": aCsrf },
        data: { name: `FE App Co ${stamp}`, size: "11-50" },
      })
    ).status(),
  ).toBe(201);
  const aId = (await (await empA.get("/api/me/profile")).json()).id as string;
  const jobRes = await empA.post("/api/jobs", {
    headers: { "x-csrf-token": aCsrf },
    data: {
      title: `FE App Engineer ${stamp}`,
      description: "ten plus chars description here",
      employment_type: "full_time",
      work_mode: "remote",
      experience_level: "mid",
      apply_method: "native",
      status: "published",
      salary_currency: "GBP",
    },
  });
  expect(jobRes.status()).toBe(201);
  const jobId = (await jobRes.json()).id as string;

  // ── seeker: signup + subscribe + apply (API) ──
  const seeker = await request.newContext({ baseURL: base });
  expect(
    (
      await seeker.post("/api/auth/signup", {
        data: {
          email: sEmail,
          password: "test-password-123",
          name: "Seeker FE",
          role: "job_seeker",
          marketing_consent: false,
          accepted_terms: true,
        },
      })
    ).status(),
  ).toBe(201);
  const sCsrf =
    (await seeker.storageState()).cookies.find((c) => c.name === "ds_csrf")
      ?.value ?? "";
  const sId = (await (await seeker.get("/api/me/profile")).json())
    .id as string;
  await db().from("subscriptions").insert({
    owner_type: "user",
    owner_id: sId,
    plan_key: "seeker_monthly",
    status: "active",
    started_at: new Date().toISOString(),
  });
  const appRes = await seeker.post(`/api/jobs/${jobId}/apply`, {
    headers: { "x-csrf-token": sCsrf },
    data: { cover_letter: "I am very keen on this native role." },
  });
  expect(appRes.status()).toBe(201);
  const appId = (await appRes.json()).id as string;

  // ── employerA browser session: applicants list ──
  await page.context().addCookies((await empA.storageState()).cookies);
  await page.goto(`${base}/jobs/${jobId}/applicants`);
  await expect(
    page.getByRole("heading", { name: "Applicants" }),
  ).toBeVisible({ timeout: 15_000 });
  const row = page.getByRole("row").filter({ hasText: `FE App Engineer ${stamp}` });
  await expect(row).toBeVisible({ timeout: 10_000 });

  // ── open the application detail → set status ──
  await row.getByRole("link", { name: /View application/i }).click();
  await expect(page).toHaveURL(new RegExp(`/applications/${appId}`), {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: `FE App Engineer ${stamp}` }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByText("I am very keen on this native role."),
  ).toBeVisible();

  await page.getByLabel("Status").selectOption("shortlisted");
  await page.getByRole("button", { name: /Update status/i }).click();
  await expect(page.getByText(/Status updated/i)).toBeVisible({
    timeout: 10_000,
  });

  // persisted: GET /api/applications/:id reflects the new status
  const got = await empA.get(`/api/applications/${appId}`);
  expect(got.status()).toBe(200);
  expect((await got.json()).displayStatus).toBe("shortlisted");

  // ── non-member employerB → 403 → "no access" message ──
  const empB = await request.newContext({ baseURL: base });
  expect(
    (
      await empB.post("/api/auth/signup", {
        data: {
          email: bEmail,
          password: "test-password-123",
          name: "EmpB FE",
          role: "employer",
          marketing_consent: false,
          accepted_terms: true,
        },
      })
    ).status(),
  ).toBe(201);
  const bCsrf =
    (await empB.storageState()).cookies.find((c) => c.name === "ds_csrf")
      ?.value ?? "";
  expect(
    (
      await empB.post("/api/companies", {
        headers: { "x-csrf-token": bCsrf },
        data: { name: `FE App Co B ${stamp}`, size: "1-10" },
      })
    ).status(),
  ).toBe(201);
  const bId = (await (await empB.get("/api/me/profile")).json()).id as string;
  // server-side authz check: empB is not a member of the job's company
  expect((await empB.get(`/api/jobs/${jobId}/applications`)).status()).toBe(
    403,
  );

  const pageB = await page.context().browser()!.newPage();
  await pageB.context().addCookies((await empB.storageState()).cookies);
  await pageB.goto(`${base}/jobs/${jobId}/applicants`);
  await expect(
    pageB.getByText(/don't have access to this job's applicants/i),
  ).toBeVisible({ timeout: 15_000 });
  await pageB.close();

  // ── company editor: edit name via UI → Save → assert persisted ──
  await page.goto(`${base}/company`);
  const newName = `FE App Co Renamed ${stamp}`;
  await expect(page.getByLabel("Company name")).toHaveValue(
    `FE App Co ${stamp}`,
    { timeout: 15_000 },
  );
  await page.getByLabel("Company name").fill(newName);
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  const co = await empA.get("/api/me/company");
  expect(co.status()).toBe(200);
  expect((await co.json()).name).toBe(newName);

  // ── cleanup ──
  await db().from("applications").delete().eq("id", appId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("subscriptions").delete().eq("owner_id", sId);
  await db().from("companies").delete().like("slug", `%-${stamp}%`);
  await db()
    .from("company_members")
    .delete()
    .in("user_id", [aId, bId]);
  await db().from("companies").delete().like("name", `FE App Co%${stamp}%`);
  await db().from("users").delete().in("id", [aId, bId, sId]);
});
