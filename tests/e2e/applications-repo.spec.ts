import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import {
  createNativeApplication, getApplicationById, listMyApplications,
  withdrawApplication, logExternalClick, upsertExternalStub,
} from "../../lib/server/repos/applications";

test("applications repo: native insert, dup blocked, withdraw scrubs PII, external stub idempotent", async () => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `AppRepo ${stamp}`, slug: `apprepo-${stamp}`, size: "11-50" }).select("id").single();
  const { data: nat } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `AppRepo Native ${stamp}`, description: "ten plus chars here",
    employment_type: "full_time", work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();
  const { data: ext } = await db().from("jobs").insert({
    source: "adzuna", external_id: `ax-${stamp}`, title: `AppRepo Ext ${stamp}`, description: "snippet here ok",
    employment_type: "full_time", work_mode: "remote", experience_level: "mid", status: "published",
    apply_method: "external", external_apply_url: "https://adzuna.example/x", source_company_name: "Caelum",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();
  const { userId } = await signUpWithPassword(`apprepo+${stamp}@example.test`, "test-password-123", { name: "AR" });

  const appId = await createNativeApplication(nat!.id, userId, { cover_letter: "Keen here.", cv_file_id: null });
  expect(appId).toMatch(/[0-9a-f-]{36}/);

  let dupErr: unknown = null;
  try { await createNativeApplication(nat!.id, userId, { cover_letter: "again", cv_file_id: null }); }
  catch (e) { dupErr = e; }
  expect(dupErr).not.toBeNull();

  const got = await getApplicationById(appId);
  expect(got?.job.id).toBe(nat!.id);
  expect(got?.cover_letter).toBe("Keen here.");

  await withdrawApplication(appId);
  const afterW = await getApplicationById(appId);
  expect(afterW?.withdrawn).toBe(true);
  expect(afterW?.cover_letter).toBeNull();
  expect(afterW?.cv_file_id).toBeNull();

  await logExternalClick(ext!.id, userId);
  await logExternalClick(ext!.id, null);
  const s1 = await upsertExternalStub(ext!.id, userId);
  const s2 = await upsertExternalStub(ext!.id, userId);
  expect(s1).toBe(s2);

  const mine = await listMyApplications(userId, { source: undefined, page: 1, page_size: 20 } as never);
  expect(mine.rows.length).toBeGreaterThanOrEqual(2);

  await db().from("applications").delete().eq("user_id", userId);
  await db().from("external_apply_clicks").delete().eq("job_id", ext!.id);
  await db().from("jobs").delete().in("id", [nat!.id, ext!.id]);
  await db().from("companies").delete().eq("id", co!.id);
  await db().from("users").delete().eq("id", userId);
});
