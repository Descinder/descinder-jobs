export type JobListItem = {
  id: string; source: "native" | "adzuna" | "reed"; title: string;
  company: { name: string; slug: string | null; logoUrl: string | null };
  location: string | null; country: string | null; workMode: string | null;
  employmentType: string; experienceLevel: string | null;
  salaryMin: number | null; salaryMax: number | null; salaryCurrency: string; salaryEstimated: boolean;
  skills: string[]; postedAt: string | null; sourceAttribution: string | null;
  isExternal: boolean; applyUrl: string | null;
};
export type JobsResponse = { jobs: JobListItem[]; total: number; page: number; page_size: number };
export type JobDetail = JobListItem & {
  description: string; companyProfileSlug: string | null; readFullUrl: string | null;
  similar: JobListItem[];
};
export type SessionUser = { id: string; email: string; role: "job_seeker" | "employer" | "admin"; name: string | null };
export type MeProfile = { id: string; email: string; role: SessionUser["role"]; name: string | null; seeker: unknown | null };
export type BillingOverview = { status: string; plan: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; active: boolean; pastDue: boolean; paymentMethod: unknown | null };
