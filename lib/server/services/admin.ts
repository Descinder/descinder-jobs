import "server-only";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
import { recordAudit, listAuditLog } from "@/lib/server/repos/audit";
import {
  toAdminUser, toAdminCompany, toAdminJob, toAdminReport, toAuditEntry, toSettingItem,
} from "@/lib/shared/admin-dto";
import {
  listUsers, setUserSuspended, softDeleteUser,
  listCompanies, setCompanySuspended, deleteCompany,
  listAdminJobs, setJobStatusAdmin, deleteJobAdmin, setJobFeatured,
  listReports, resolveReport, getSettings, setSetting,
  listApprovals, decideUserApproval, decideCompanyApproval,
} from "@/lib/server/repos/admin";

type Admin = SessionContext["user"];

// ── Metrics ────────────────────────────────────────────────────────────────
export async function adminMetrics(_admin: Admin) {
  // Explicit head+count queries (no clever generic helper — keeps supabase-js
  // builder typing clean under strict mode).
  const [signups, nativeJobs, ingestedJobs, applications, activeSubs] = await Promise.all([
    db().from("users").select("id", { count: "exact", head: true }),
    db().from("jobs").select("id", { count: "exact", head: true }).eq("source", "native"),
    db().from("jobs").select("id", { count: "exact", head: true }).neq("source", "native"),
    db().from("applications").select("id", { count: "exact", head: true }),
    db().from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
  ]);
  return {
    signups: signups.count ?? 0,
    nativeJobs: nativeJobs.count ?? 0,
    ingestedJobs: ingestedJobs.count ?? 0,
    applications: applications.count ?? 0,
    activeSubs: activeSubs.count ?? 0,
  };
}

// ── Users ──────────────────────────────────────────────────────────────────
export async function adminListUsers(_admin: Admin, q?: string, role?: string) {
  return { users: (await listUsers({ q, role })).map((u) => toAdminUser(u as never)) };
}
export async function adminSuspendUser(admin: Admin, userId: string, reason: string | null) {
  await setUserSuspended(userId, true, admin.id, reason);
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "user.suspend", targetType: "user", targetId: userId, metadata: { reason } });
}
export async function adminUnsuspendUser(admin: Admin, userId: string) {
  await setUserSuspended(userId, false, admin.id, null);
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "user.unsuspend", targetType: "user", targetId: userId, metadata: null });
}
export async function adminForceDeleteUser(admin: Admin, userId: string) {
  if (userId === admin.id) throw new AppError("CONFLICT", "Cannot delete your own admin account");
  // Audit BEFORE the irreversible write (no transaction available) so a
  // post-delete audit failure can't yield a silent unaudited destruction.
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "user.force_delete", targetType: "user", targetId: userId, metadata: null });
  await softDeleteUser(userId);
}

// ── Companies ──────────────────────────────────────────────────────────────
export async function adminListCompanies(_admin: Admin, q?: string) {
  return { companies: (await listCompanies({ q })).map((c) => toAdminCompany(c as never)) };
}
export async function adminSuspendCompany(admin: Admin, companyId: string, suspended: boolean, reason: string | null) {
  await setCompanySuspended(companyId, suspended, admin.id, reason);
  await recordAudit({ actorId: admin.id, actorType: "admin", action: suspended ? "company.suspend" : "company.unsuspend", targetType: "company", targetId: companyId, metadata: { reason } });
}
export async function adminDeleteCompany(admin: Admin, companyId: string) {
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "company.delete", targetType: "company", targetId: companyId, metadata: null });
  await deleteCompany(companyId); // cascades the company's jobs (FK on delete cascade)
}

// ── Jobs ───────────────────────────────────────────────────────────────────
export async function adminListJobs(_admin: Admin, source?: string, status?: string) {
  return { jobs: (await listAdminJobs({ source, status })).map((j) => toAdminJob(j as never)) };
}
export async function adminUnpublishJob(admin: Admin, jobId: string) {
  await setJobStatusAdmin(jobId, "closed");
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "job.unpublish", targetType: "job", targetId: jobId, metadata: null });
}
export async function adminDeleteJob(admin: Admin, jobId: string) {
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "job.delete", targetType: "job", targetId: jobId, metadata: null });
  await deleteJobAdmin(jobId);
}
export async function adminSetJobFeatured(admin: Admin, jobId: string, featured: boolean, until: string | null) {
  await setJobFeatured(jobId, featured, until);
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "job.featured", targetType: "job", targetId: jobId, metadata: { featured, until } });
}

// ── Reports ────────────────────────────────────────────────────────────────
export async function adminListReports(_admin: Admin, status?: string) {
  return { reports: (await listReports(status)).map((r) => toAdminReport(r as never)) };
}
export async function adminResolveReport(
  admin: Admin, reportId: string, status: "reviewed" | "dismissed" | "actioned", actionTaken: string | null,
) {
  await resolveReport(reportId, status, actionTaken, admin.id);
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "report.resolve", targetType: "report", targetId: reportId, metadata: { status, actionTaken } });
}

// ── Settings ───────────────────────────────────────────────────────────────
export async function adminGetSettings(_admin: Admin) {
  return { settings: (await getSettings()).map((s) => toSettingItem(s as never)) };
}
export async function adminUpdateSetting(admin: Admin, key: string, value: unknown) {
  await setSetting(key, value, admin.id);
  await recordAudit({ actorId: admin.id, actorType: "admin", action: "settings.update", targetType: "setting", targetId: null, metadata: { key, value } });
  // NOTE: realtime invalidation broadcast (backend-spec §6.7) deferred to Plan 3
  // (needs the frontend channel listener); the gating layer reads settings live.
}

// ── Audit log view ─────────────────────────────────────────────────────────
export async function adminAuditLog(_admin: Admin, f: { action?: string; actorId?: string; targetId?: string }) {
  return { entries: (await listAuditLog(f)).map((e) => toAuditEntry(e as never)) };
}

// ── Approvals ──────────────────────────────────────────────────────────────
export async function adminListApprovals(_admin: Admin) {
  const { users, companies } = await listApprovals();
  return { users: users.map((u) => toAdminUser(u as never)), companies: companies.map((c) => toAdminCompany(c as never)) };
}
// The :id may be a pending user OR a pending company (both surfaced by the
// approvals queue). Try user first, then company; 404 only if neither pending.
export async function adminDecideApproval(
  admin: Admin, id: string, decision: "approve" | "reject", reason: string | null,
) {
  const approve = decision === "approve";
  if (await decideUserApproval(id, approve, admin.id, reason)) {
    await recordAudit({ actorId: admin.id, actorType: "admin", action: `approval.${decision}`, targetType: "user", targetId: id, metadata: { reason } });
    return;
  }
  if (await decideCompanyApproval(id, approve, admin.id, reason)) {
    await recordAudit({ actorId: admin.id, actorType: "admin", action: `approval.${decision}`, targetType: "company", targetId: id, metadata: { reason } });
    return;
  }
  throw new AppError("NOT_FOUND", "No pending approval for that id");
}
