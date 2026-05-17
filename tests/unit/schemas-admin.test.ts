import { describe, it, expect } from "vitest";
import {
  adminReasonSchema, settingPatchSchema, reportPatchSchema,
  jobFeaturedSchema, approvalDecisionSchema,
} from "@/lib/shared/schemas/admin";

describe("admin schemas", () => {
  it("adminReasonSchema: optional trimmed reason ≤500", () => {
    expect(adminReasonSchema.safeParse({}).success).toBe(true);
    expect(adminReasonSchema.safeParse({ reason: "spam ring" }).success).toBe(true);
    expect(adminReasonSchema.safeParse({ reason: "x".repeat(501) }).success).toBe(false);
  });
  it("settingPatchSchema: non-empty key + any json value", () => {
    expect(settingPatchSchema.safeParse({ key: "job_posting_paid", value: true }).success).toBe(true);
    expect(settingPatchSchema.safeParse({ key: "", value: 1 }).success).toBe(false);
    expect(settingPatchSchema.safeParse({ key: "k" }).success).toBe(false);
  });
  it("reportPatchSchema: only resolution statuses; action_taken optional", () => {
    expect(reportPatchSchema.safeParse({ status: "actioned", action_taken: "removed job" }).success).toBe(true);
    expect(reportPatchSchema.safeParse({ status: "dismissed" }).success).toBe(true);
    expect(reportPatchSchema.safeParse({ status: "open" }).success).toBe(false);
  });
  it("jobFeaturedSchema: featured bool + optional iso until", () => {
    expect(jobFeaturedSchema.safeParse({ featured: true, until: "2026-07-01T00:00:00Z" }).success).toBe(true);
    expect(jobFeaturedSchema.safeParse({ featured: false }).success).toBe(true);
    expect(jobFeaturedSchema.safeParse({ featured: "yes" }).success).toBe(false);
  });
  it("approvalDecisionSchema: approve|reject + optional reason", () => {
    expect(approvalDecisionSchema.safeParse({ decision: "approve" }).success).toBe(true);
    expect(approvalDecisionSchema.safeParse({ decision: "reject", reason: "fake" }).success).toBe(true);
    expect(approvalDecisionSchema.safeParse({ decision: "maybe" }).success).toBe(false);
  });
});
