import { z } from "zod";

export const adminReasonSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type AdminReasonInput = z.infer<typeof adminReasonSchema>;

// Settings are an ALLOW-LIST with per-key value types (seeded in migrations
// 00001/00009). An unconstrained key/value write would let `"false"` (string)
// silently invert gating (`x !== true`/`=== false` comparisons), or pollute the
// table with bogus keys. Reject unknown keys and wrong value types.
export const SETTING_TYPES = {
  ai_cv_monthly_cap: "number",
  company_approval_required: "boolean",
  default_job_expiry_days: "number",
  feature_ai_cv_enabled: "boolean",
  feature_alerts_enabled: "boolean",
  feature_external_apply_enabled: "boolean",
  featured_listing_price_gbp: "number",
  instant_alerts_paid: "boolean",
  job_post_price_gbp: "number",
  job_posting_paid: "boolean",
  seeker_subscription_paid: "boolean",
  seeker_subscription_price_gbp: "number",
  signup_disabled: "boolean",
  user_approval_required: "boolean",
} as const;

export const settingPatchSchema = z
  .object({
    key: z.enum(Object.keys(SETTING_TYPES) as [string, ...string[]]),
    value: z.union([z.boolean(), z.number()]),
  })
  .superRefine((d, ctx) => {
    const expected = SETTING_TYPES[d.key as keyof typeof SETTING_TYPES];
    if (typeof d.value !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: `Setting "${d.key}" requires a ${expected} value`,
      });
    }
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
