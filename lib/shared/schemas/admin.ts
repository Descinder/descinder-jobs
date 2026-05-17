import { z } from "zod";

export const adminReasonSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type AdminReasonInput = z.infer<typeof adminReasonSchema>;

// value is arbitrary JSON (settings hold booleans/numbers/strings).
export const settingPatchSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.union([z.boolean(), z.number(), z.string()]),
});
export type SettingPatchInput = z.infer<typeof settingPatchSchema>;

export const reportPatchSchema = z.object({
  status: z.enum(["reviewed", "dismissed", "actioned"]),
  action_taken: z.string().trim().max(500).optional(),
});
export type ReportPatchInput = z.infer<typeof reportPatchSchema>;

export const jobFeaturedSchema = z.object({
  featured: z.boolean(),
  until: z.string().datetime().optional(),
});
export type JobFeaturedInput = z.infer<typeof jobFeaturedSchema>;

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional(),
});
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
