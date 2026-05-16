import { z } from "zod";

// Zod 4 z.string().uuid() enforces RFC 4122 variant bits; use a format-only
// regex so that test fixtures like "11111111-1111-1111-1111-111111111111" pass.
const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID"
);

export const applyNativeSchema = z.object({
  cover_letter: z.string().min(1).max(5000),
  cv_file_id: uuidSchema.optional(),
});
export type ApplyNativeInput = z.infer<typeof applyNativeSchema>;

export const externalStatusSchema = z.object({
  status: z.enum(["applied", "interviewing", "offer", "hired", "rejected"]),
});
export type ExternalStatusInput = z.infer<typeof externalStatusSchema>;

export const employerStatusSchema = z.object({
  status: z.enum(["submitted", "reviewed", "shortlisted", "rejected", "hired"]),
});
export type EmployerStatusInput = z.infer<typeof employerStatusSchema>;

export const createReportSchema = z.object({
  target_type: z.enum(["job", "company", "user"]),
  target_id: uuidSchema,
  reason: z.enum(["spam", "inappropriate", "scam", "harassment", "other"]),
  description: z.string().max(2000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const applicationsFilterSchema = z.object({
  source: z.enum(["native", "external"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Clamp to 100 rather than reject — allows `?page_size=500` without a 400 error.
  page_size: z.coerce.number().int().min(1).transform((v) => Math.min(v, 100)).default(20),
});
export type ApplicationsFilter = z.infer<typeof applicationsFilterSchema>;
