import "server-only";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { requireRole, requireCompanyMember } from "@/lib/server/auth/authz";
import { featureGate } from "@/lib/server/gating";
import { toJobListItem, toJobDetail, type JobListItem, type JobDetail } from "@/lib/shared/dto";
import { getMemberCompany } from "@/lib/server/repos/companies";
import {
  listJobs, getJobById, getSimilarJobs, getCompanyJobs, createJob, updateJob, setJobStatus, getJobOwnerCompany,
} from "@/lib/server/repos/jobs";
import type { JobFilters, CreateJobInput, UpdateJobInput } from "@/lib/shared/schemas/jobs";

export async function listJobsForFeed(f: JobFilters): Promise<{
  jobs: JobListItem[]; total: number; page: number; page_size: number;
}> {
  const { rows, total } = await listJobs(f);
  return { jobs: rows.map((r) => toJobListItem(r as never)), total, page: f.page, page_size: f.page_size };
}

export async function jobDetail(id: string): Promise<JobDetail> {
  const row = await getJobById(id);
  if (!row || row.status !== "published") throw new AppError("NOT_FOUND", "Job not found");
  const sim = await getSimilarJobs(id);
  return toJobDetail(row as never, sim as never);
}

async function memberCompanyId(user: SessionContext["user"]): Promise<string> {
  const co = await getMemberCompany(user.id);
  if (!co) throw new AppError("FORBIDDEN", "No company for this user");
  return co.id as string;
}

export async function employerCreateJob(
  user: SessionContext["user"] | null, input: CreateJobInput,
): Promise<{ id: string }> {
  const u = requireRole(user, "employer");
  const companyId = await memberCompanyId(u);
  if (input.status === "published") {
    const gate = await featureGate(u, "employer_publish");
    if (!gate.allowed) throw new AppError("PAYWALL", "Publishing requires payment", { paywall_reason: gate.paywallReason });
  }
  const id = await createJob({ ...input, company_id: companyId });
  return { id };
}

export async function employerUpdateJob(
  user: SessionContext["user"] | null, jobId: string, patch: UpdateJobInput,
): Promise<void> {
  const u = requireRole(user, "employer");
  const owner = await getJobOwnerCompany(jobId);
  if (!owner) throw new AppError("NOT_FOUND", "Job not found");
  await requireCompanyMember(u, owner);
  if (patch.status === "published") {
    const gate = await featureGate(u, "employer_publish");
    if (!gate.allowed) {
      throw new AppError("PAYWALL", "Publishing requires payment", { paywall_reason: gate.paywallReason });
    }
  }
  await updateJob(jobId, patch);
}

export async function employerCloseJob(user: SessionContext["user"] | null, jobId: string): Promise<void> {
  const u = requireRole(user, "employer");
  const owner = await getJobOwnerCompany(jobId);
  if (!owner) throw new AppError("NOT_FOUND", "Job not found");
  await requireCompanyMember(u, owner);
  await setJobStatus(jobId, "closed");
}

export async function employerRepostJob(user: SessionContext["user"] | null, jobId: string): Promise<void> {
  const u = requireRole(user, "employer");
  const owner = await getJobOwnerCompany(jobId);
  if (!owner) throw new AppError("NOT_FOUND", "Job not found");
  await requireCompanyMember(u, owner);
  const gate = await featureGate(u, "employer_publish");
  if (!gate.allowed) {
    throw new AppError("PAYWALL", "Publishing requires payment", { paywall_reason: gate.paywallReason });
  }
  await setJobStatus(jobId, "published");
}

export async function similarJobs(id: string): Promise<{ jobs: JobListItem[] }> {
  const base = await getJobById(id);
  if (!base || base.status !== "published") throw new AppError("NOT_FOUND", "Job not found");
  const rows = await getSimilarJobs(id);
  return { jobs: rows.map((r) => toJobListItem(r as never)) };
}

export async function employerListOwnJobs(
  user: SessionContext["user"] | null,
): Promise<{ jobs: JobListItem[] }> {
  const u = requireRole(user, "employer");
  const co = await getMemberCompany(u.id);
  if (!co) throw new AppError("NOT_FOUND", "No company");
  const rows = await getCompanyJobs(co.id as string, true);
  return { jobs: rows.map((r) => toJobListItem(r as never)) };
}
