// Pure mappers. Admin sees more than the public DTOs but rows are still hand-
// mapped (never spread) — backend-spec §9a data minimisation at the boundary.

type UserRow = {
  id: string; email: string; name: string | null; role: string;
  suspended_at: string | null; deleted_at: string | null; approval_status: string;
  created_at: string; acquisition_source: string | null;
};
export function toAdminUser(u: UserRow) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role,
    suspended: !!u.suspended_at, deleted: !!u.deleted_at,
    approvalStatus: u.approval_status, createdAt: u.created_at,
    acquisitionSource: u.acquisition_source,
  };
}

type CompanyRow = {
  id: string; name: string; slug: string; suspended_at: string | null;
  approval_status: string; created_at: string;
};
export function toAdminCompany(c: CompanyRow) {
  return {
    id: c.id, name: c.name, slug: c.slug, suspended: !!c.suspended_at,
    approvalStatus: c.approval_status, createdAt: c.created_at,
  };
}

type JobRow = {
  id: string; title: string; source: string; status: string; featured: boolean;
  company_id: string | null; source_company_name: string | null; created_at: string;
};
export function toAdminJob(j: JobRow) {
  return {
    id: j.id, title: j.title, source: j.source, status: j.status, featured: j.featured,
    companyId: j.company_id, sourceCompanyName: j.source_company_name, createdAt: j.created_at,
  };
}

type ReportRow = {
  id: string; target_type: string; target_id: string; reason: string;
  description: string | null; status: string; action_taken: string | null; created_at: string;
};
export function toAdminReport(r: ReportRow) {
  return {
    id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason,
    description: r.description, status: r.status, actionTaken: r.action_taken, createdAt: r.created_at,
  };
}

type AuditRow = {
  id: string; actor_id: string | null; actor_type: string; action: string;
  target_type: string | null; target_id: string | null;
  metadata: Record<string, unknown> | null; created_at: string;
};
export function toAuditEntry(a: AuditRow) {
  return {
    id: a.id, actorId: a.actor_id, actorType: a.actor_type, action: a.action,
    targetType: a.target_type, targetId: a.target_id, metadata: a.metadata, createdAt: a.created_at,
  };
}

type SettingRow = { key: string; value: unknown; updated_at: string };
export function toSettingItem(s: SettingRow) {
  return { key: s.key, value: s.value, updatedAt: s.updated_at };
}
