import { z } from "zod";
import { httpUrl } from "@/lib/shared/schemas/url";

const employment = z.enum(["full_time", "part_time", "contract", "internship"]);
const workMode = z.enum(["remote", "hybrid", "on_site"]);
const expLevel = z.enum(["entry", "mid", "senior", "lead"]);
const applyMethod = z.enum(["native", "external"]);
const jobStatus = z.enum(["draft", "published", "closed", "expired"]);

export const jobFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  work_mode: workMode.optional(),
  employment_type: employment.optional(),
  experience_level: expLevel.optional(),
  source: z.enum(["native", "adzuna", "reed"]).optional(),
  salary_min: z.coerce.number().int().nonnegative().optional(),
  salary_max: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(["newest", "relevant", "salary"]).default("relevant"),
  page: z.coerce.number().int().min(1).default(1),
  // Clamp to 100 rather than reject — allows `?page_size=500` without a 400 error.
  page_size: z.coerce.number().int().min(1).transform((v) => Math.min(v, 100)).default(20),
});
export type JobFilters = z.infer<typeof jobFiltersSchema>;

// Named base object so updateJobSchema can use .partial() without innerType().
const createJobObject = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(20000),
  employment_type: employment,
  work_mode: workMode,
  experience_level: expLevel,
  location: z.string().max(200).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  salary_min: z.number().int().nonnegative().optional(),
  salary_max: z.number().int().nonnegative().optional(),
  salary_currency: z.string().length(3).default("GBP"),
  skills_required: z.array(z.string().min(1).max(60)).max(50).default([]),
  apply_method: applyMethod,
  external_apply_url: httpUrl.optional(),
  status: z.enum(["draft", "published"]),
});

export const createJobSchema = createJobObject.refine(
  (d) => d.apply_method !== "external" || !!d.external_apply_url,
  {
    message: "external_apply_url required when apply_method is external",
    path: ["external_apply_url"],
  }
);
export type CreateJobInput = z.infer<typeof createJobSchema>;

// PATCH: all fields optional. Built from the named base to avoid .innerType()
// which does not exist on Zod 4 refined schemas.
export const updateJobSchema = createJobObject.partial();
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const createCompanySchema = z.object({
  name: z.string().min(1).max(160),
  website: httpUrl.optional(),
  location: z.string().max(200).optional(),
  size: z.enum(["1-10", "11-50", "51-200", "201-500", "501+"]),
  description: z.string().max(5000).optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();

export const seekerProfileSchema = z.object({
  headline: z.string().max(160).optional(),
  bio: z.string().max(5000).optional(),
  location: z.string().max(200).optional(),
  years_experience: z.number().int().min(0).max(70).optional(),
  skills: z.array(z.string().min(1).max(60)).max(80).default([]),
  desired_role_types: z.array(z.string().max(60)).max(20).default([]),
  portfolio_url: httpUrl.optional(),
  github_url: httpUrl.optional(),
  linkedin_url: httpUrl.optional(),
});
export type SeekerProfileInput = z.infer<typeof seekerProfileSchema>;

export const updateProfileSchema = z.object({ name: z.string().min(1).max(120) });
export { jobStatus };
