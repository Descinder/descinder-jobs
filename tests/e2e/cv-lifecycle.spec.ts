import { test, expect, request } from "@playwright/test";

test("seeker: request upload URL → PUT bytes → list → set primary → download → delete; build-from-profile", async () => {
  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const email = `cvlife+${Date.now()}@example.test`;
  const su = await ctx.post("/api/auth/signup", {
    data: { email, password: "test-password-123", name: "CV Life", role: "job_seeker", marketing_consent: false, accepted_terms: true },
  });
  expect(su.status()).toBe(201);
  const csrf = (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  const up = await ctx.post("/api/me/cvs/upload-url", {
    headers: { "x-csrf-token": csrf },
    data: { filename: "resume.pdf", mime_type: "application/pdf", size_bytes: 20 },
  });
  expect(up.status()).toBe(201);
  const { cvId, uploadUrl } = await up.json();

  const bytes = "%PDF-1.4 fake pdf bytes";
  const putRes = await ctx.put(uploadUrl, { headers: { "Content-Type": "application/pdf" }, data: bytes });
  expect(putRes.ok()).toBe(true);

  const list1 = await ctx.get("/api/me/cvs");
  expect((await list1.json()).base.some((c: { id: string }) => c.id === cvId)).toBe(true);

  const pr = await ctx.patch(`/api/me/cvs/${cvId}/primary`, { headers: { "x-csrf-token": csrf } });
  expect(pr.status()).toBe(200);
  const list2 = await ctx.get("/api/me/cvs");
  expect((await list2.json()).base.find((c: { id: string }) => c.id === cvId).isPrimary).toBe(true);

  const dl = await ctx.get(`/api/me/cvs/${cvId}/download`);
  expect(dl.status()).toBe(200);
  const { url } = await dl.json();
  const fetched = await ctx.get(url);
  expect(fetched.status()).toBe(200);
  expect(await fetched.text()).toContain("fake pdf bytes");

  const bf = await ctx.post("/api/me/cvs/build-from-profile", { headers: { "x-csrf-token": csrf } });
  expect(bf.status()).toBe(201);
  const list3 = await ctx.get("/api/me/cvs");
  expect((await list3.json()).base.length).toBeGreaterThanOrEqual(2);

  const del = await ctx.delete(`/api/me/cvs/${cvId}`, { headers: { "x-csrf-token": csrf } });
  expect(del.status()).toBe(200);
  const list4 = await ctx.get("/api/me/cvs");
  expect((await list4.json()).base.some((c: { id: string }) => c.id === cvId)).toBe(false);
});

test("CV ops are owner-scoped: another user cannot access someone else's CV", async () => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const owner = await request.newContext({ baseURL: base });
  const attacker = await request.newContext({ baseURL: base });

  const oe = `cvown+${Date.now()}@example.test`;
  await owner.post("/api/auth/signup", { data: { email: oe, password: "test-password-123", name: "Owner", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const oc = (await owner.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const up = await owner.post("/api/me/cvs/upload-url", { headers: { "x-csrf-token": oc }, data: { filename: "o.pdf", mime_type: "application/pdf", size_bytes: 10 } });
  const { cvId } = await up.json();

  const ae = `cvatk+${Date.now()}@example.test`;
  await attacker.post("/api/auth/signup", { data: { email: ae, password: "test-password-123", name: "Atk", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const ac = (await attacker.storageState()).cookies.find((c) => c.name === "ds_csrf")?.value ?? "";

  const dl = await attacker.get(`/api/me/cvs/${cvId}/download`);
  expect(dl.status()).toBe(404);
  const del = await attacker.delete(`/api/me/cvs/${cvId}`, { headers: { "x-csrf-token": ac } });
  expect(del.status()).toBe(404);
});
