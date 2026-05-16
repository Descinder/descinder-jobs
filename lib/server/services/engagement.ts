import "server-only";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { requireUser } from "@/lib/server/auth/authz";
import { getJobById } from "@/lib/server/repos/jobs";
import { savedJobIds, saveJob, unsaveJob } from "@/lib/server/repos/saved";
import { createReport } from "@/lib/server/repos/reports";
import type { CreateReportInput } from "@/lib/shared/schemas/applications";

export async function mySavedJobIds(user: SessionContext["user"] | null): Promise<{ jobIds: string[] }> {
  const u = requireUser(user);
  return { jobIds: await savedJobIds(u.id) };
}

export async function saveJobForUser(user: SessionContext["user"] | null, jobId: string) {
  const u = requireUser(user);
  const job = await getJobById(jobId);
  if (!job) throw new AppError("NOT_FOUND", "Job not found");
  await saveJob(u.id, jobId);
  return { ok: true };
}

export async function unsaveJobForUser(user: SessionContext["user"] | null, jobId: string) {
  const u = requireUser(user);
  await unsaveJob(u.id, jobId);
  return { ok: true };
}

export async function submitReport(user: SessionContext["user"] | null, input: CreateReportInput) {
  const u = requireUser(user);
  await createReport(u.id, input);
  return { ok: true };
}
