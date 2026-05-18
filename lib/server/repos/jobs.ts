import "server-only";
import { db } from "@/lib/server/repos/db";
import type { JobFilters, CreateJobInput, UpdateJobInput } from "@/lib/shared/schemas/jobs";

const JOB_SELECT = `
  id, source, title, description, employment_type, work_mode, location, country,
  salary_min, salary_max, salary_currency, salary_is_predicted, skills_required,
  experience_level, apply_method, external_apply_url, source_company_name,
  source_attribution, posted_at, status, company_id,
  company:companies ( id, name, slug, logo_url, location, size )
`;

export type JobRepoRow = {
  id: string;
  title: string;
  company?: { id: string; name: string; slug: string; logo_url: string | null; location: string | null; size: string | null } | null;
  [key: string]: unknown;
};

// `posted_after` is an internal matcher-only param (alert matching), NEVER added
// to the public jobFiltersSchema — the feed never sends it so feed behaviour is
// unchanged. JobFilters is imported from the shared schema, so we widen here.
type JobFiltersInternal = JobFilters & { posted_after?: string };

export async function listJobs(f: JobFiltersInternal): Promise<{ rows: JobRepoRow[]; total: number }> {
  let q = db().from("jobs").select(JOB_SELECT, { count: "exact" }).eq("status", "published");
  if (f.q) q = q.textSearch("search_vector", f.q, { type: "websearch" });
  if (f.country) q = q.eq("country", f.country);
  if (f.work_mode) q = q.eq("work_mode", f.work_mode);
  if (f.employment_type) q = q.eq("employment_type", f.employment_type);
  if (f.experience_level) q = q.eq("experience_level", f.experience_level);
  if (f.source) q = q.eq("source", f.source);
  if (f.posted_after) q = q.gte("posted_at", f.posted_after); // internal: alert matcher only
  // Salary filters keep jobs whose range overlaps the requested range, AND jobs
  // with no disclosed salary (NULL) — most ingested Adzuna/Reed listings have no
  // salary, and hiding them on any salary filter would silently drop a large
  // chunk of inventory. f.salary_* are zod-validated non-negative ints (safe to
  // interpolate into the PostgREST or() filter string — not user strings).
  if (typeof f.salary_min === "number") {
    q = q.or(`salary_max.gte.${f.salary_min},salary_max.is.null`);
  }
  if (typeof f.salary_max === "number") {
    q = q.or(`salary_min.lte.${f.salary_max},salary_min.is.null`);
  }
  if (f.sort === "newest") q = q.order("posted_at", { ascending: false, nullsFirst: false });
  else if (f.sort === "salary") q = q.order("salary_max", { ascending: false, nullsFirst: false });
  else q = q.order("featured", { ascending: false }).order("posted_at", { ascending: false, nullsFirst: false });
  const from = (f.page - 1) * f.page_size;
  q = q.range(from, from + f.page_size - 1);
  const { data, error, count } = await q;
  if (error) throw new Error(`listJobs failed: ${error.message}`);
  return { rows: (data ?? []) as JobRepoRow[], total: count ?? 0 };
}

export async function getJobById(id: string): Promise<JobRepoRow | null> {
  const { data, error } = await db().from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`getJobById failed: ${error.message}`);
  return (data as JobRepoRow) ?? null;
}

export async function getSimilarJobs(id: string, limit = 4): Promise<JobRepoRow[]> {
  const base = await getJobById(id);
  if (!base) return [];
  const skills = (base.skills_required as string[]) ?? [];
  let q = db().from("jobs").select(JOB_SELECT).eq("status", "published").neq("id", id).limit(limit);
  if (skills.length) q = q.overlaps("skills_required", skills);
  else q = q.eq("employment_type", base.employment_type as "full_time" | "part_time" | "contract" | "internship");
  const { data, error } = await q;
  if (error) throw new Error(`getSimilarJobs failed: ${error.message}`);
  return (data ?? []) as JobRepoRow[];
}

export async function getCompanyJobs(companyId: string, includeNonPublished = false): Promise<JobRepoRow[]> {
  let q = db().from("jobs").select(JOB_SELECT).eq("company_id", companyId).order("created_at", { ascending: false });
  if (!includeNonPublished) q = q.eq("status", "published");
  const { data, error } = await q;
  if (error) throw new Error(`getCompanyJobs failed: ${error.message}`);
  return (data ?? []) as JobRepoRow[];
}

export async function createJob(input: Omit<CreateJobInput, "external_apply_url"> & { company_id: string; external_apply_url?: string | null }): Promise<string> {
  const now = new Date().toISOString();
  const publish = input.status === "published";
  const { data, error } = await db().from("jobs").insert({
    company_id: input.company_id, source: "native", title: input.title, description: input.description,
    employment_type: input.employment_type, work_mode: input.work_mode, experience_level: input.experience_level,
    location: input.location ?? null, country: input.country ?? null,
    salary_min: input.salary_min ?? null, salary_max: input.salary_max ?? null,
    salary_currency: input.salary_currency, skills_required: input.skills_required,
    apply_method: input.apply_method, external_apply_url: input.external_apply_url ?? null,
    status: input.status, posted_at: publish ? now : null,
    expires_at: publish ? new Date(Date.now() + 60 * 864e5).toISOString() : null,
  }).select("id").single();
  if (error || !data) throw new Error(`createJob failed: ${error?.message}`);
  return data.id;
}

export async function updateJob(id: string, patch: UpdateJobInput): Promise<void> {
  const { error } = await db().from("jobs").update(patch).eq("id", id);
  if (error) throw new Error(`updateJob failed: ${error.message}`);
}

export async function setJobStatus(id: string, status: "draft" | "published" | "closed" | "expired"): Promise<void> {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 60 * 864e5).toISOString();
  const patch =
    status === "published"
      ? { status, posted_at: now, expires_at: expires }
      : { status };
  const { error } = await db().from("jobs").update(patch).eq("id", id);
  if (error) throw new Error(`setJobStatus failed: ${error.message}`);
}

export async function getJobOwnerCompany(id: string): Promise<string | null> {
  const { data } = await db().from("jobs").select("company_id").eq("id", id).maybeSingle();
  return (data?.company_id as string) ?? null;
}
