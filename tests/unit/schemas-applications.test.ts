import { describe, it, expect } from "vitest";
import { applyNativeSchema, externalStatusSchema, createReportSchema, applicationsFilterSchema } from "@/lib/shared/schemas/applications";

describe("application schemas", () => {
  it("applyNative: cover_letter required (1..5000), cv_file_id optional uuid", () => {
    expect(applyNativeSchema.safeParse({ cover_letter: "I am keen." }).success).toBe(true);
    expect(applyNativeSchema.safeParse({ cover_letter: "I am keen.", cv_file_id: "11111111-1111-1111-1111-111111111111" }).success).toBe(true);
    expect(applyNativeSchema.safeParse({ cover_letter: "" }).success).toBe(false);
    expect(applyNativeSchema.safeParse({ cover_letter: "x", cv_file_id: "not-a-uuid" }).success).toBe(false);
  });
  it("externalStatus: only the seeker self-report vocabulary", () => {
    expect(externalStatusSchema.safeParse({ status: "interviewing" }).success).toBe(true);
    expect(externalStatusSchema.safeParse({ status: "shortlisted" }).success).toBe(false);
  });
  it("createReport: target_type enum + reason enum + optional description", () => {
    expect(createReportSchema.safeParse({ target_type: "job", target_id: "11111111-1111-1111-1111-111111111111", reason: "spam" }).success).toBe(true);
    expect(createReportSchema.safeParse({ target_type: "nope", target_id: "11111111-1111-1111-1111-111111111111", reason: "spam" }).success).toBe(false);
  });
  it("applicationsFilter: defaults + optional filters", () => {
    const r = applicationsFilterSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.page_size).toBe(20);
    expect(applicationsFilterSchema.safeParse({ source: "external" }).success).toBe(true);
  });
});
