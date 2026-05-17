import "server-only";
import { db } from "@/lib/server/repos/db";

const USER_COLS = "id, email, name, role, suspended_at, deleted_at, approval_status, created_at, acquisition_source";
const COMPANY_COLS = "id, name, slug, suspended_at, approval_status, created_at";
const JOB_COLS = "id, title, source, status, featured, company_id, source_company_name, created_at";
const REPORT_COLS = "id, target_type, target_id, reason, description, status, action_taken, created_at";

export async function listUsers(f: { q?: string; role?: string; limit?: number } = {}) {
  let qb = db().from("users").select(USER_COLS).order("created_at", { ascending: false }).limit(f.limit ?? 100);
  if (f.q) qb = qb.ilike("email", `%${f.q}%`);
  if (f.role) qb = qb.eq("role", f.role as never);
  const { data, error } = await qb;
  if (error) throw new Error(`listUsers failed: ${error.message}`);
  return (data ?? []) as { id: string }[] & Record<string, unknown>[];
}

export async function setUserSuspended(
  userId: string, suspended: boolean, adminId: string, reason: string | null,
): Promise<void> {
  const { error } = await db().from("users").update({
    suspended_at: suspended ? new Date().toISOString() : null,
    suspension_reason: suspended ? reason : null,
    suspended_by: suspended ? adminId : null,
  } as never).eq("id", userId);
  if (error) throw new Error(`setUserSuspended failed: ${error.message}`);
}

export async function softDeleteUser(userId: string): Promise<void> {
  const { error } = await db().from("users").update({ deleted_at: new Date().toISOString() } as never).eq("id", userId);
  if (error) throw new Error(`softDeleteUser failed: ${error.message}`);
}

export async function listCompanies(f: { q?: string; limit?: number } = {}) {
  let qb = db().from("companies").select(COMPANY_COLS).order("created_at", { ascending: false }).limit(f.limit ?? 100);
  if (f.q) qb = qb.ilike("name", `%${f.q}%`);
  const { data, error } = await qb;
  if (error) throw new Error(`listCompanies failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

export async function setCompanySuspended(
  companyId: string, suspended: boolean, adminId: string, reason: string | null,
): Promise<void> {
  const { error } = await db().from("companies").update({
    suspended_at: suspended ? new Date().toISOString() : null,
    suspension_reason: suspended ? reason : null,
    suspended_by: suspended ? adminId : null,
  } as never).eq("id", companyId);
  if (error) throw new Error(`setCompanySuspended failed: ${error.message}`);
}

export async function deleteCompany(companyId: string): Promise<void> {
  // jobs FK is ON DELETE CASCADE (00001) → company's jobs disappear from feeds.
  const { error } = await db().from("companies").delete().eq("id", companyId);
  if (error) throw new Error(`deleteCompany failed: ${error.message}`);
}

export async function listAdminJobs(f: { source?: string; status?: string; limit?: number } = {}) {
  let qb = db().from("jobs").select(JOB_COLS).order("created_at", { ascending: false }).limit(f.limit ?? 100);
  if (f.source) qb = qb.eq("source", f.source as never);
  if (f.status) qb = qb.eq("status", f.status as never);
  const { data, error } = await qb;
  if (error) throw new Error(`listAdminJobs failed: ${error.message}`);
  return (data ?? []) as { id: string }[] & Record<string, unknown>[];
}

export async function setJobStatusAdmin(jobId: string, status: "closed"): Promise<void> {
  const { error } = await db().from("jobs").update({ status } as never).eq("id", jobId);
  if (error) throw new Error(`setJobStatusAdmin failed: ${error.message}`);
}

export async function deleteJobAdmin(jobId: string): Promise<void> {
  const { error } = await db().from("jobs").delete().eq("id", jobId);
  if (error) throw new Error(`deleteJobAdmin failed: ${error.message}`);
}

export async function setJobFeatured(jobId: string, featured: boolean, until: string | null): Promise<void> {
  const { error } = await db().from("jobs").update({
    featured, featured_until: featured ? until : null,
  } as never).eq("id", jobId);
  if (error) throw new Error(`setJobFeatured failed: ${error.message}`);
}

export async function listReports(status?: string) {
  let qb = db().from("reports").select(REPORT_COLS).order("created_at", { ascending: false }).limit(200);
  if (status) qb = qb.eq("status", status as never);
  const { data, error } = await qb;
  if (error) throw new Error(`listReports failed: ${error.message}`);
  return (data ?? []) as { id: string }[] & Record<string, unknown>[];
}

export async function resolveReport(
  reportId: string, status: "reviewed" | "dismissed" | "actioned", actionTaken: string | null, adminId: string,
): Promise<void> {
  const { error } = await db().from("reports").update({
    status, action_taken: actionTaken, reviewed_by: adminId, reviewed_at: new Date().toISOString(),
  } as never).eq("id", reportId);
  if (error) throw new Error(`resolveReport failed: ${error.message}`);
}

export async function getSettings() {
  const { data, error } = await db().from("app_settings").select("key, value, updated_at").order("key");
  if (error) throw new Error(`getSettings failed: ${error.message}`);
  return (data ?? []) as { key: string; value: unknown; updated_at: string }[];
}

export async function setSetting(key: string, value: unknown, adminId: string): Promise<void> {
  const { error } = await db().from("app_settings").upsert({
    key, value, updated_at: new Date().toISOString(), updated_by: adminId,
  } as never, { onConflict: "key" });
  if (error) throw new Error(`setSetting failed: ${error.message}`);
}

export async function listApprovals() {
  const { data: u, error: ue } = await db().from("users").select(USER_COLS).eq("approval_status", "pending").limit(100);
  if (ue) throw new Error(`listApprovals(users) failed: ${ue.message}`);
  const { data: c, error: ce } = await db().from("companies").select(COMPANY_COLS).eq("approval_status", "pending").limit(100);
  if (ce) throw new Error(`listApprovals(companies) failed: ${ce.message}`);
  return { users: (u ?? []) as Record<string, unknown>[], companies: (c ?? []) as Record<string, unknown>[] };
}

export async function decideUserApproval(
  userId: string, approve: boolean, adminId: string, reason: string | null,
): Promise<boolean> {
  const { data, error } = await db().from("users").update({
    approval_status: approve ? "approved" : "rejected",
    approval_decided_at: new Date().toISOString(),
    approval_decided_by: adminId,
    approval_rejection_reason: approve ? null : reason,
  } as never).eq("id", userId).eq("approval_status", "pending").select("id");
  if (error) throw new Error(`decideUserApproval failed: ${error.message}`);
  return (data ?? []).length > 0; // false if not pending (idempotent / not found)
}

// companies appear in the approvals queue too (company_approval_required) —
// approve/reject must work for them, keyed by the same :id param.
export async function decideCompanyApproval(
  companyId: string, approve: boolean, adminId: string, reason: string | null,
): Promise<boolean> {
  const { data, error } = await db().from("companies").update({
    approval_status: approve ? "approved" : "rejected",
    approval_decided_at: new Date().toISOString(),
    approval_decided_by: adminId,
    approval_rejection_reason: approve ? null : reason,
  } as never).eq("id", companyId).eq("approval_status", "pending").select("id");
  if (error) throw new Error(`decideCompanyApproval failed: ${error.message}`);
  return (data ?? []).length > 0;
}
