import "server-only";
import { db } from "@/lib/server/repos/db";

export async function savedJobIds(userId: string): Promise<string[]> {
  const { data, error } = await db().from("saved_jobs").select("job_id").eq("user_id", userId);
  if (error) throw new Error(`savedJobIds failed: ${error.message}`);
  return (data ?? []).map((r) => r.job_id as string);
}

export async function saveJob(userId: string, jobId: string): Promise<void> {
  const { error } = await db().from("saved_jobs")
    .upsert({ user_id: userId, job_id: jobId }, { onConflict: "user_id,job_id" });
  if (error) throw new Error(`saveJob failed: ${error.message}`);
}

export async function unsaveJob(userId: string, jobId: string): Promise<void> {
  const { error } = await db().from("saved_jobs").delete().eq("user_id", userId).eq("job_id", jobId);
  if (error) throw new Error(`unsaveJob failed: ${error.message}`);
}
