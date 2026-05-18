import { z } from "zod";

// Subset of jobFiltersSchema an alert may persist (NO sort/page). Mirror the
// feed filter field types exactly so matching == feed semantics.
export const alertFiltersSchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    country: z.string().length(2).toUpperCase().optional(),
    work_mode: z.enum(["remote", "hybrid", "on_site"]).optional(),
    employment_type: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
    experience_level: z.enum(["entry", "mid", "senior", "lead"]).optional(),
    source: z.enum(["native", "adzuna", "reed"]).optional(),
    salary_min: z.coerce.number().int().nonnegative().optional(),
    salary_max: z.coerce.number().int().nonnegative().optional(),
  })
  .strict(); // reject sort/page/unknown keys
export type AlertFilters = z.infer<typeof alertFiltersSchema>;

const frequency = z.enum(["instant", "daily", "weekly"]);

export const alertCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  frequency,
  filters: alertFiltersSchema.optional(),
});
export type AlertCreateInput = z.infer<typeof alertCreateSchema>;

export const alertUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  frequency: frequency.optional(),
  filters: alertFiltersSchema.optional(),
});
export type AlertUpdateInput = z.infer<typeof alertUpdateSchema>;
