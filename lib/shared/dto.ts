// Pure mappers. Never spread raw DB rows to clients (data minimization, backend-spec §9a).

type JobRow = {
  id: string; source: "native" | "adzuna" | "reed"; title: string; description: string;
  employment_type: string; work_mode: string | null; location: string | null; country: string | null;
  salary_min: number | null; salary_max: number | null; salary_currency: string;
  salary_is_predicted: boolean; skills_required: string[]; experience_level: string | null;
  apply_method: string; external_apply_url: string | null; source_company_name: string | null;
  source_attribution: string | null; posted_at: string | null;
  company: { id: string; name: string; slug: string; logo_url: string | null; location: string | null; size: string | null } | null;
};

export type JobListItem = {
  id: string; source: JobRow["source"]; title: string;
  company: { name: string; slug: string | null; logoUrl: string | null };
  location: string | null; country: string | null; workMode: string | null;
  employmentType: string; experienceLevel: string | null;
  salaryMin: number | null; salaryMax: number | null; salaryCurrency: string; salaryEstimated: boolean;
  skills: string[]; postedAt: string | null; sourceAttribution: string | null;
  isExternal: boolean; applyUrl: string | null;
};

function companyName(r: JobRow): string {
  return r.company?.name ?? r.source_company_name ?? "Unknown";
}

export function toJobListItem(r: JobRow): JobListItem {
  return {
    id: r.id,
    source: r.source,
    title: r.title,
    company: {
      name: companyName(r),
      slug: r.company?.slug ?? null,
      logoUrl: r.company?.logo_url ?? null,
    },
    location: r.location,
    country: r.country,
    workMode: r.work_mode,
    employmentType: r.employment_type,
    experienceLevel: r.experience_level,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    salaryCurrency: r.salary_currency,
    salaryEstimated: r.salary_is_predicted,
    skills: r.skills_required ?? [],
    postedAt: r.posted_at,
    sourceAttribution: r.source_attribution,
    isExternal: r.apply_method === "external",
    applyUrl: r.external_apply_url,
  };
}

export type JobDetail = JobListItem & {
  description: string;
  companyProfileSlug: string | null;
  readFullUrl: string | null;
  similar: JobListItem[];
};

export function toJobDetail(r: JobRow, similar: JobRow[]): JobDetail {
  const base = toJobListItem(r);
  return {
    ...base,
    description: r.description,
    companyProfileSlug: r.source === "native" ? (r.company?.slug ?? null) : null,
    readFullUrl: r.source === "native" ? null : r.external_apply_url,
    similar: similar.map(toJobListItem),
  };
}

type CompanyRow = {
  id: string; name: string; slug: string; logo_url: string | null; website: string | null;
  description: string | null; location: string | null; size: string | null; suspended_at: string | null;
};
export type CompanyPublic = {
  name: string; slug: string; logoUrl: string | null; website: string | null;
  description: string | null; location: string | null; size: string | null;
};
export function toCompanyPublic(c: CompanyRow): CompanyPublic {
  return {
    name: c.name, slug: c.slug, logoUrl: c.logo_url, website: c.website,
    description: c.description, location: c.location, size: c.size,
  };
}

type ProfileRow = {
  id: string; email: string; role: string; name: string | null;
  seeker: {
    headline: string | null; bio: string | null; location: string | null;
    years_experience: number | null; skills: string[]; desired_role_types: string[];
    portfolio_url: string | null; github_url: string | null; linkedin_url: string | null;
  } | null;
};
export function toMeProfile(r: ProfileRow) {
  return {
    id: r.id, email: r.email, role: r.role, name: r.name,
    seeker: r.seeker
      ? {
          headline: r.seeker.headline, bio: r.seeker.bio, location: r.seeker.location,
          yearsExperience: r.seeker.years_experience, skills: r.seeker.skills ?? [],
          desiredRoleTypes: r.seeker.desired_role_types ?? [],
          portfolioUrl: r.seeker.portfolio_url, githubUrl: r.seeker.github_url, linkedinUrl: r.seeker.linkedin_url,
        }
      : null,
  };
}

type AppJob = {
  id: string; title: string; source: "native" | "adzuna" | "reed";
  company: { name: string; slug: string } | null;
  source_company_name: string | null; external_apply_url: string | null;
};
type AppRow = {
  id: string; status: string; external_status: string | null; withdrawn: boolean;
  cover_letter: string | null; cv_file_id: string | null; submitted_at: string;
  job: AppJob;
};

export type ApplicationListItem = {
  id: string; jobId: string; jobTitle: string; company: string;
  isExternal: boolean; displayStatus: string; withdrawn: boolean; submittedAt: string;
};

function appIsExternal(r: AppRow): boolean {
  return r.job.source !== "native";
}
function appCompany(r: AppRow): string {
  return r.job.company?.name ?? r.job.source_company_name ?? "Unknown";
}

export function toApplicationListItem(r: AppRow): ApplicationListItem {
  const external = appIsExternal(r);
  return {
    id: r.id,
    jobId: r.job.id,
    jobTitle: r.job.title,
    company: appCompany(r),
    isExternal: external,
    displayStatus: external ? (r.external_status ?? "applied") : r.status,
    withdrawn: r.withdrawn,
    submittedAt: r.submitted_at,
  };
}

export type ApplicationDetail = ApplicationListItem & {
  coverLetter: string | null;
  cvFileId: string | null;
  externalUrl: string | null;
};

export function toApplicationDetail(r: AppRow): ApplicationDetail {
  return {
    ...toApplicationListItem(r),
    coverLetter: r.cover_letter,
    cvFileId: r.cv_file_id,
    externalUrl: r.job.external_apply_url,
  };
}
