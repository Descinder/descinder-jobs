export type IngestedJobInsert = {
  source: "adzuna" | "reed";
  external_id: string;
  title: string;
  description: string;
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  work_mode: "remote" | "hybrid" | "on_site";
  experience_level: "entry" | "mid" | "senior" | "lead";
  location: string | null;
  country: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_is_predicted: boolean;
  skills_required: string[];
  apply_method: "external";
  external_apply_url: string;
  source_company_name: string;
  source_attribution: string;
  company_id: null;
  status: "published";
  posted_at: string;
};

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  GB: "GBP", US: "USD", AU: "AUD", CA: "CAD",
};

export function inferWorkMode(title: string, description: string): "remote" | "hybrid" | "on_site" {
  const hay = `${title} ${description}`.toLowerCase();
  if (/\bremote\b|work from (home|anywhere)|fully[- ]remote/.test(hay)) return "remote";
  if (/\bhybrid\b/.test(hay)) return "hybrid";
  return "on_site";
}

export function inferExperience(title: string): "entry" | "mid" | "senior" | "lead" {
  const t = title.toLowerCase();
  if (/\b(lead|principal|staff|head of)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?|snr)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|graduate|entry|intern)\b/.test(t)) return "entry";
  return "mid";
}

// Accept an ISO-8601 timestamp; fall back to now() if absent or unparseable
// (resilience: a malformed provider date must not abort an otherwise-good run
// via a timestamptz insert error).
function isoOrNow(s?: string): string {
  if (!s) return new Date().toISOString();
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

type RawAdzuna = {
  id: string; title: string; description: string; created: string; redirect_url: string;
  salary_min?: number; salary_max?: number; salary_is_predicted?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  contract_time?: string;
};

export function mapAdzunaJob(r: RawAdzuna, country: string): IngestedJobInsert {
  const empType =
    r.contract_time === "part_time" ? "part_time"
    : r.contract_time === "contract" ? "contract"
    : "full_time";
  return {
    source: "adzuna",
    external_id: String(r.id),
    title: r.title,
    description: r.description,
    employment_type: empType,
    work_mode: inferWorkMode(r.title, r.description),
    experience_level: inferExperience(r.title),
    location: r.location?.display_name ?? null,
    country,
    salary_min: typeof r.salary_min === "number" ? Math.round(r.salary_min) : null,
    salary_max: typeof r.salary_max === "number" ? Math.round(r.salary_max) : null,
    salary_currency: CURRENCY_BY_COUNTRY[country] ?? "GBP",
    salary_is_predicted: r.salary_is_predicted === "1",
    skills_required: [],
    apply_method: "external",
    external_apply_url: r.redirect_url,
    source_company_name: r.company?.display_name ?? "Unknown",
    source_attribution: "Sourced from Adzuna",
    company_id: null,
    status: "published",
    posted_at: isoOrNow(r.created),
  };
}

type RawReed = {
  jobId: number | string; jobTitle: string; employerName?: string; locationName?: string;
  minimumSalary?: number; maximumSalary?: number; currency?: string;
  jobDescription: string; jobUrl: string; date?: string;
};

// Reed dd/mm/yyyy → ISO; fall back to now if unparseable.
function reedDateToIso(d?: string): string {
  if (!d) return new Date().toISOString();
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return new Date().toISOString();
  return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`).toISOString();
}

export function mapReedJob(r: RawReed): IngestedJobInsert {
  return {
    source: "reed",
    external_id: String(r.jobId),
    title: r.jobTitle,
    description: r.jobDescription,
    employment_type: "full_time", // Reed search has no reliable contract field
    work_mode: inferWorkMode(r.jobTitle, r.jobDescription),
    experience_level: inferExperience(r.jobTitle),
    location: r.locationName ?? null,
    country: "GB", // Reed is UK only
    salary_min: typeof r.minimumSalary === "number" && r.minimumSalary > 0 ? Math.round(r.minimumSalary) : null,
    salary_max: typeof r.maximumSalary === "number" && r.maximumSalary > 0 ? Math.round(r.maximumSalary) : null,
    salary_currency: r.currency || "GBP",
    salary_is_predicted: false, // Reed posts real salaries
    skills_required: [],
    apply_method: "external",
    external_apply_url: r.jobUrl,
    source_company_name: r.employerName ?? "Unknown",
    source_attribution: "Sourced from Reed",
    company_id: null,
    status: "published",
    posted_at: reedDateToIso(r.date),
  };
}
