// Negative-path authz e2e tests: job_seeker must get 403 on all employer endpoints.
// Cross-tenant: employer A must get 403 when mutating employer B's job.
// NOTE: .env.local is loaded centrally in playwright.config.ts via dotenv.config()
import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

async function signupAndGetContext(role: "job_seeker" | "employer", label: string) {
  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const email = `authzneg+${label}+${Date.now()}@example.test`;
  const su = await ctx.post("/api/auth/signup", {
    data: { email, password: "test-password-123", name: label, role, marketing_consent: false, accepted_terms: true },
  });
  if (su.status() !== 201) throw new Error(`signup failed: ${su.status()} ${await su.text()}`);
  const cookies = await ctx.storageState();
  const csrf = cookies.cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  return { ctx, csrf, email };
}

test("job_seeker gets 403 on all employer-only write endpoints", async () => {
  const { ctx, csrf } = await signupAndGetContext("job_seeker", "seeker-403");

  // POST /api/companies → must be 403
  const co = await ctx.post("/api/companies", {
    headers: { "x-csrf-token": csrf },
    data: { name: "SeekerCo", size: "1-10" },
  });
  expect(co.status()).toBe(403);

  // POST /api/jobs → must be 403
  const post = await ctx.post("/api/jobs", {
    headers: { "x-csrf-token": csrf },
    data: { title: "SeekerJob", description: "long enough to pass validation", employment_type: "full_time", work_mode: "remote", experience_level: "entry", apply_method: "native", status: "published", salary_currency: "GBP" },
  });
  expect(post.status()).toBe(403);

  // GET /api/me/company → must be 403
  const getco = await ctx.get("/api/me/company");
  expect(getco.status()).toBe(403);

  // PUT /api/me/company → must be 403
  const putco = await ctx.put("/api/me/company", {
    headers: { "x-csrf-token": csrf },
    data: { name: "new name" },
  });
  expect(putco.status()).toBe(403);

  // GET /api/me/jobs → must be 403
  const myjobs = await ctx.get("/api/me/jobs");
  expect(myjobs.status()).toBe(403);

  // For PATCH /api/jobs/:id, POST /api/jobs/:id/close|repost: use a known non-existent UUID —
  // 403 must come before 404 because role check precedes job existence check
  const fakeId = "00000000-0000-0000-0000-000000000001";

  const patch = await ctx.patch(`/api/jobs/${fakeId}`, {
    headers: { "x-csrf-token": csrf },
    data: { title: "Patched" },
  });
  expect(patch.status()).toBe(403);

  const close = await ctx.post(`/api/jobs/${fakeId}/close`, {
    headers: { "x-csrf-token": csrf },
  });
  expect(close.status()).toBe(403);

  const repost = await ctx.post(`/api/jobs/${fakeId}/repost`, {
    headers: { "x-csrf-token": csrf },
  });
  expect(repost.status()).toBe(403);
});

test("cross-tenant: employer A cannot mutate employer B's job", async () => {
  // Create employer B who owns the job
  const empB = await signupAndGetContext("employer", "empB");
  const coB = await empB.ctx.post("/api/companies", {
    headers: { "x-csrf-token": empB.csrf },
    data: { name: `TenantB Co ${Date.now()}`, size: "1-10" },
  });
  expect(coB.status()).toBe(201);
  const { slug: slugB } = await coB.json();

  const jobPost = await empB.ctx.post("/api/jobs", {
    headers: { "x-csrf-token": empB.csrf },
    data: { title: `TenantB Job ${Date.now()}`, description: "Employer B's job — long enough.", employment_type: "full_time", work_mode: "remote", experience_level: "mid", apply_method: "native", status: "published", salary_currency: "GBP" },
  });
  expect(jobPost.status()).toBe(201);
  const { id: jobId } = await jobPost.json();

  // Create employer A (attacker)
  const empA = await signupAndGetContext("employer", "empA");
  await empA.ctx.post("/api/companies", {
    headers: { "x-csrf-token": empA.csrf },
    data: { name: `TenantA Co ${Date.now()}`, size: "1-10" },
  });

  // Employer A tries to mutate employer B's job — must all get 403
  const patch = await empA.ctx.patch(`/api/jobs/${jobId}`, {
    headers: { "x-csrf-token": empA.csrf },
    data: { title: "Hijacked!" },
  });
  expect(patch.status()).toBe(403);

  const close = await empA.ctx.post(`/api/jobs/${jobId}/close`, {
    headers: { "x-csrf-token": empA.csrf },
  });
  expect(close.status()).toBe(403);

  const repost = await empA.ctx.post(`/api/jobs/${jobId}/repost`, {
    headers: { "x-csrf-token": empA.csrf },
  });
  expect(repost.status()).toBe(403);

  // Cleanup
  await db().from("jobs").delete().eq("id", jobId);
  const { data: coData } = await db().from("companies").select("id").eq("slug", slugB).maybeSingle();
  if (coData) await db().from("companies").delete().eq("id", coData.id);
});
