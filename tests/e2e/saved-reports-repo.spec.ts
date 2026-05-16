import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { saveJob, unsaveJob, savedJobIds } from "../../lib/server/repos/saved";
import { createReport } from "../../lib/server/repos/reports";

test("saved repo: save is idempotent, unsave removes; reports insert", async () => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `SR ${stamp}`, slug: `sr-${stamp}`, size: "11-50" }).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `SR Job ${stamp}`, description: "ten plus chars",
    employment_type: "full_time", work_mode: "remote", experience_level: "mid", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();
  const { userId } = await signUpWithPassword(`sr+${stamp}@example.test`, "test-password-123", { name: "SR" });

  await saveJob(userId, job!.id);
  await saveJob(userId, job!.id);
  expect(await savedJobIds(userId)).toContain(job!.id);
  await unsaveJob(userId, job!.id);
  expect(await savedJobIds(userId)).not.toContain(job!.id);

  await createReport(userId, { target_type: "job", target_id: job!.id, reason: "spam", description: "looks fake" });
  const { count } = await db().from("reports").select("id", { count: "exact", head: true }).eq("reporter_user_id", userId);
  expect(count).toBe(1);

  await db().from("reports").delete().eq("reporter_user_id", userId);
  await db().from("saved_jobs").delete().eq("user_id", userId);
  await db().from("jobs").delete().eq("id", job!.id);
  await db().from("companies").delete().eq("id", co!.id);
  await db().from("users").delete().eq("id", userId);
});
