import "server-only";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { requireUser, requireRole, requireCompanyMember } from "@/lib/server/auth/authz";
import { featureGate } from "@/lib/server/gating";
import { db } from "@/lib/server/repos/db";
import { getJobById, getJobOwnerCompany } from "@/lib/server/repos/jobs";
import { getCvById } from "@/lib/server/repos/cv";
import { presignGet } from "@/lib/server/integrations/storage/blob";
import { toApplicationListItem, toApplicationDetail } from "@/lib/shared/dto";
import {
  createNativeApplication, getApplicationById, listMyApplications, listApplicationsForJob,
  setEmployerStatus, setExternalStatus, withdrawApplication, logExternalClick, upsertExternalStub,
} from "@/lib/server/repos/applications";
import type { ApplyNativeInput, ApplicationsFilter } from "@/lib/shared/schemas/applications";

export async function applyNative(
  user: SessionContext["user"] | null, jobId: string, input: ApplyNativeInput,
): Promise<{ id: string }> {
  const u = requireUser(user);
  const job = await getJobById(jobId);
  if (!job || job.status !== "published") throw new AppError("NOT_FOUND", "Job not found");
  if (job.source !== "native") throw new AppError("CONFLICT", "This job is applied to externally");
  const gate = await featureGate(u, "apply_native");
  if (!gate.allowed) {
    throw new AppError("PAYWALL", "Subscribe to apply to Descinder-posted jobs", { paywall_reason: gate.paywallReason });
  }
  if (input.cv_file_id) {
    const cv = await getCvById(input.cv_file_id);
    if (!cv || cv.user_id !== u.id) throw new AppError("NOT_FOUND", "CV not found");
  }
  try {
    const id = await createNativeApplication(jobId, u.id, {
      cover_letter: input.cover_letter, cv_file_id: input.cv_file_id ?? null,
    });
    return { id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      throw new AppError("CONFLICT", "You have already applied to this job");
    }
    throw new AppError("INTERNAL", "Could not submit application");
  }
}

export async function externalApply(
  user: SessionContext["user"] | null, jobId: string,
): Promise<{ redirectUrl: string }> {
  const job = await getJobById(jobId);
  if (!job || job.status !== "published") throw new AppError("NOT_FOUND", "Job not found");
  if ((job.source as string) === "native" || (job.apply_method as string) === "native") {
    throw new AppError("CONFLICT", "This job is applied to on Descinder, not externally");
  }
  const url = job.external_apply_url as string | null;
  if (!url) throw new AppError("CONFLICT", "This job has no external application URL");
  await logExternalClick(jobId, user?.id ?? null);
  if (user) {
    const { data: sub } = await db()
      .from("subscriptions").select("status")
      .eq("owner_type", "user").eq("owner_id", user.id)
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    const active = !!sub && (sub.status === "active" || sub.status === "trialing");
    if (active) await upsertExternalStub(jobId, user.id);
  }
  return { redirectUrl: url };
}

export async function myApplications(
  user: SessionContext["user"] | null, f: ApplicationsFilter,
) {
  const u = requireUser(user);
  const { rows, total } = await listMyApplications(u.id, f);
  return { applications: rows.map((r) => toApplicationListItem(r as never)), total, page: f.page, page_size: f.page_size };
}

export async function updateMyExternalStatus(
  user: SessionContext["user"] | null, appId: string, status: string,
) {
  const u = requireUser(user);
  const app = await getApplicationById(appId);
  if (!app || app.user_id !== u.id) throw new AppError("NOT_FOUND", "Application not found");
  const src = (app.job as Record<string, unknown>).source as string;
  if (src === "native") throw new AppError("FORBIDDEN", "Native application status is set by the employer");
  await setExternalStatus(appId, status);
  return { ok: true };
}

export async function withdraw(user: SessionContext["user"] | null, appId: string) {
  const u = requireUser(user);
  const app = await getApplicationById(appId);
  if (!app || app.user_id !== u.id) throw new AppError("NOT_FOUND", "Application not found");
  await withdrawApplication(appId);
  return { ok: true };
}

async function canViewApplication(u: SessionContext["user"], app: Record<string, unknown>): Promise<boolean> {
  if (app.user_id === u.id) return true;
  if (u.role === "admin") return true;
  const jobId = app.job_id as string;
  const owner = await getJobOwnerCompany(jobId);
  if (!owner) return false;
  try { await requireCompanyMember(u, owner); return true; } catch { return false; }
}

export async function applicationDetail(user: SessionContext["user"] | null, appId: string) {
  const u = requireUser(user);
  const app = await getApplicationById(appId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found");
  if (!(await canViewApplication(u, app as Record<string, unknown>))) {
    throw new AppError("NOT_FOUND", "Application not found");
  }
  return toApplicationDetail(app as never);
}

export async function applicationCv(user: SessionContext["user"] | null, appId: string) {
  const u = requireUser(user);
  const app = await getApplicationById(appId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found");
  if (!(await canViewApplication(u, app as Record<string, unknown>))) {
    throw new AppError("NOT_FOUND", "Application not found");
  }
  const cvId = app.cv_file_id as string | null;
  if (!cvId) throw new AppError("NOT_FOUND", "No CV attached");
  const cv = await getCvById(cvId);
  if (!cv) throw new AppError("NOT_FOUND", "No CV attached");
  const url = await presignGet(cv.r2_object_key);
  return { url, filename: cv.filename };
}

export async function employerListApplicants(
  user: SessionContext["user"] | null, jobId: string,
) {
  const u = requireRole(user, "employer");
  const owner = await getJobOwnerCompany(jobId);
  if (!owner) throw new AppError("NOT_FOUND", "Job not found");
  await requireCompanyMember(u, owner);
  const rows = await listApplicationsForJob(jobId);
  return { applications: rows.map((r) => toApplicationListItem(r as never)) };
}

export async function employerSetStatus(
  user: SessionContext["user"] | null, appId: string, status: string,
) {
  const u = requireRole(user, "employer");
  const app = await getApplicationById(appId);
  if (!app) throw new AppError("NOT_FOUND", "Application not found");
  const src = (app.job as Record<string, unknown>).source as string;
  if (src !== "native") throw new AppError("CONFLICT", "Only native applications have employer-managed status");
  const owner = await getJobOwnerCompany(app.job_id as string);
  if (!owner) throw new AppError("NOT_FOUND", "Job not found");
  await requireCompanyMember(u, owner);
  await setEmployerStatus(appId, status);
  return { ok: true };
}
