import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("admin endpoints: 401 anon, 403 non-admin, 200 admin", async () => {
  const anon = await request.newContext({ baseURL: base });
  for (const p of ["/api/admin/metrics", "/api/admin/users", "/api/admin/companies", "/api/admin/jobs", "/api/admin/reports", "/api/admin/settings", "/api/admin/audit-log", "/api/admin/approvals"]) {
    expect((await anon.get(p)).status()).toBe(401);
  }

  const seeker = await request.newContext({ baseURL: base });
  await seeker.post("/api/auth/signup", { data: { email: `adep+${Date.now()}@example.test`, password: "test-password-123", name: "S", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  expect((await seeker.get("/api/admin/metrics")).status()).toBe(403);

  const admin = await request.newContext({ baseURL: base });
  await admin.post("/api/auth/signup", { data: { email: `adep-admin+${Date.now()}@example.test`, password: "test-password-123", name: "AD", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const adminId = (await (await admin.get("/api/me/profile")).json()).id;
  await db().from("users").update({ role: "admin" } as never).eq("id", adminId);
  const m = await admin.get("/api/admin/metrics");
  expect(m.status()).toBe(200);
  const body = await m.json();
  expect(typeof body.signups).toBe("number");
  expect(typeof body.activeSubs).toBe("number");
  await db().from("users").delete().eq("id", adminId);
});
