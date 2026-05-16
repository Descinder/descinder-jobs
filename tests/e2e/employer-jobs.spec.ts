// NOTE: .env.local is loaded centrally in playwright.config.ts via dotenv.config()
// so all env vars are available here without a per-spec load.
import { test, expect, request } from "@playwright/test";

test("employer signs up → creates company → posts a job → it appears publicly", async () => {
  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const email = `emp+${Date.now()}@example.test`;

  const su = await ctx.post("/api/auth/signup", {
    data: { email, password: "test-password-123", name: "Emp", role: "employer", marketing_consent: false, accepted_terms: true },
  });
  expect(su.status()).toBe(201);
  const cookies = await ctx.storageState();
  const csrf = cookies.cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  const co = await ctx.post("/api/companies", {
    headers: { "x-csrf-token": csrf },
    data: { name: `Emp Co ${Date.now()}`, size: "11-50" },
  });
  expect(co.status()).toBe(201);

  const title = `Emp Senior Engineer ${Date.now()}`;
  const post = await ctx.post("/api/jobs", {
    headers: { "x-csrf-token": csrf },
    data: {
      title, description: "We are hiring for real, long enough text.", employment_type: "full_time",
      work_mode: "remote", experience_level: "senior", apply_method: "native", status: "published",
      salary_currency: "GBP",
    },
  });
  expect(post.status()).toBe(201);

  const list = await ctx.get(`/api/jobs?q=${encodeURIComponent(title)}`);
  expect((await list.json()).jobs.some((x: { title: string }) => x.title === title)).toBe(true);
});
