import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { createAlert, listMyAlerts, getAlert, updateAlert, deleteAlert, recordDelivery, isDelivered } from "../../lib/server/repos/alerts";
import { matchJobsForAlert } from "../../lib/server/services/alert-match";

test("alerts repo: CRUD owner-scoped; deliveries dedup; matcher reuses the feed query", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`alrt+${stamp}@example.test`, "test-password-123", { name: "AL" });
  const { data: co } = await db().from("companies").insert({ name: `AlrtCo ${stamp}`, slug: `alrtco-${stamp}`, size: "11-50" } as never).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title: `Alert Remote React ${stamp}`,
    description: "react typescript remote role ten plus chars", employment_type: "full_time",
    work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never).select("id").single();
  const jobId = (job as { id: string }).id;

  const id = await createAlert(userId, { name: `Remote React ${stamp}`, frequency: "daily", filters: { q: `Alert Remote React ${stamp}`, work_mode: "remote" } });
  expect(id).toMatch(/[0-9a-f-]{36}/);
  expect((await listMyAlerts(userId)).some((a) => a.id === id)).toBe(true);
  const got = await getAlert(id);
  expect(got!.user_id).toBe(userId);

  await updateAlert(id, { name: `Renamed ${stamp}`, frequency: "weekly" });
  expect((await getAlert(id))!.name).toBe(`Renamed ${stamp}`);

  // matcher: the new job satisfies the alert's filters (reuses listJobs)
  const matches = await matchJobsForAlert(got!, "1970-01-01T00:00:00Z");
  expect(matches.some((m) => m.id === jobId)).toBe(true);

  // delivery dedup
  expect(await isDelivered(id, jobId)).toBe(false);
  await recordDelivery(id, jobId);
  expect(await isDelivered(id, jobId)).toBe(true);
  await recordDelivery(id, jobId); // idempotent (unique constraint) — must not throw

  await deleteAlert(id);
  expect(await getAlert(id)).toBeNull();

  await db().from("jobs").delete().eq("id", jobId);
  await db().from("companies").delete().eq("id", (co as { id: string }).id);
  await db().from("users").delete().eq("id", userId);
});
