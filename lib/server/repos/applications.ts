import "server-only";
import { db } from "@/lib/server/repos/db";
import type { ApplicationsFilter } from "@/lib/shared/schemas/applications";

const APP_SELECT = `
  id, status, external_status, withdrawn, withdrawn_at, cover_letter, cv_file_id,
  submitted_at, updated_at, job_id, user_id,
  job:jobs ( id, title, source, source_company_name, external_apply_url,
             company:companies ( name, slug ) )
`;

export type AppRepoRow = Record<string, unknown>;

function normalizeJoin(d: Record<string, unknown>): Record<string, unknown> {
  const j = d.job as unknown;
  d.job = Array.isArray(j) ? j[0] : j;
  const job = d.job as Record<string, unknown> | null;
  if (job) {
    const c = job.company as unknown;
    job.company = Array.isArray(c) ? (c[0] ?? null) : (c ?? null);
  }
  return d;
}

export async function createNativeApplication(
  jobId: string, userId: string, input: { cover_letter: string; cv_file_id: string | null },
): Promise<string> {
  const { data, error } = await db().from("applications").insert({
    job_id: jobId, user_id: userId, cover_letter: input.cover_letter,
    cv_file_id: input.cv_file_id, status: "submitted",
  }).select("id").single();
  if (error || !data) throw new Error(`createNativeApplication failed: ${error?.message}`);
  return data.id;
}

export async function getApplicationById(id: string): Promise<AppRepoRow | null> {
  const { data, error } = await db().from("applications").select(APP_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`getApplicationById failed: ${error.message}`);
  if (!data) return null;
  return normalizeJoin(data as Record<string, unknown>) as AppRepoRow;
}

export async function listMyApplications(
  userId: string, f: ApplicationsFilter,
): Promise<{ rows: AppRepoRow[]; total: number }> {
  const from = (f.page - 1) * f.page_size;
  const { data, error, count } = await db().from("applications")
    .select(APP_SELECT, { count: "exact" }).eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .range(from, from + f.page_size - 1);
  if (error) throw new Error(`listMyApplications failed: ${error.message}`);
  const rows = (data ?? []).map((d) => normalizeJoin(d as Record<string, unknown>) as AppRepoRow);
  const filtered = f.source
    ? rows.filter((r) => {
        const src = ((r.job as Record<string, unknown>)?.source as string) ?? "native";
        return f.source === "external" ? src !== "native" : src === "native";
      })
    : rows;
  return { rows: filtered, total: count ?? filtered.length };
}

export async function listApplicationsForJob(jobId: string): Promise<AppRepoRow[]> {
  const { data, error } = await db().from("applications").select(APP_SELECT)
    .eq("job_id", jobId).order("submitted_at", { ascending: false });
  if (error) throw new Error(`listApplicationsForJob failed: ${error.message}`);
  return (data ?? []).map((d) => normalizeJoin(d as Record<string, unknown>) as AppRepoRow);
}

export async function setEmployerStatus(id: string, status: string): Promise<void> {
  const { error } = await db().from("applications").update({ status } as never).eq("id", id);
  if (error) throw new Error(`setEmployerStatus failed: ${error.message}`);
}

export async function setExternalStatus(id: string, externalStatus: string): Promise<void> {
  const { error } = await db().from("applications").update({ external_status: externalStatus } as never).eq("id", id);
  if (error) throw new Error(`setExternalStatus failed: ${error.message}`);
}

export async function withdrawApplication(id: string): Promise<void> {
  const { error } = await db().from("applications")
    .update({ withdrawn: true, withdrawn_at: new Date().toISOString(), cover_letter: null, cv_file_id: null })
    .eq("id", id);
  if (error) throw new Error(`withdrawApplication failed: ${error.message}`);
}

export async function logExternalClick(jobId: string, userId: string | null): Promise<void> {
  const { error } = await db().from("external_apply_clicks").insert({ job_id: jobId, user_id: userId });
  if (error) throw new Error(`logExternalClick failed: ${error.message}`);
}

export async function upsertExternalStub(jobId: string, userId: string): Promise<string> {
  const { data: existing } = await db().from("applications").select("id")
    .eq("job_id", jobId).eq("user_id", userId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db().from("applications")
    .insert({ job_id: jobId, user_id: userId, status: "submitted", external_status: "applied" })
    .select("id").single();
  if (error || !data) throw new Error(`upsertExternalStub failed: ${error?.message}`);
  return data.id;
}
