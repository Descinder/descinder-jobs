import { describe, it, expect } from "vitest";
import { toAdminUser, toAdminJob, toAdminReport, toAuditEntry, toSettingItem } from "@/lib/shared/admin-dto";

describe("admin DTOs (data-minimised)", () => {
  it("toAdminUser exposes moderation-relevant fields only", () => {
    expect(toAdminUser({
      id: "u1", email: "a@b.c", name: "A", role: "job_seeker",
      suspended_at: null, deleted_at: null, approval_status: "auto_approved",
      created_at: "2026-01-01T00:00:00Z", acquisition_source: "google",
    })).toEqual({
      id: "u1", email: "a@b.c", name: "A", role: "job_seeker",
      suspended: false, deleted: false, approvalStatus: "auto_approved",
      createdAt: "2026-01-01T00:00:00Z", acquisitionSource: "google",
    });
  });
  it("toAdminJob marks source + status + featured", () => {
    expect(toAdminJob({
      id: "j1", title: "Eng", source: "native", status: "published", featured: true,
      company_id: "c1", source_company_name: null, created_at: "2026-01-02T00:00:00Z",
    })).toEqual({
      id: "j1", title: "Eng", source: "native", status: "published", featured: true,
      companyId: "c1", sourceCompanyName: null, createdAt: "2026-01-02T00:00:00Z",
    });
  });
  it("toAdminReport + toAuditEntry + toSettingItem", () => {
    expect(toAdminReport({
      id: "r1", target_type: "job", target_id: "j1", reason: "spam",
      description: "d", status: "open", action_taken: null, created_at: "2026-01-03T00:00:00Z",
    })).toEqual({
      id: "r1", targetType: "job", targetId: "j1", reason: "spam",
      description: "d", status: "open", actionTaken: null, createdAt: "2026-01-03T00:00:00Z",
    });
    expect(toAuditEntry({
      id: "a1", actor_id: "ad1", actor_type: "admin", action: "user.suspend",
      target_type: "user", target_id: "u1", metadata: { reason: "spam" }, created_at: "2026-01-04T00:00:00Z",
    })).toEqual({
      id: "a1", actorId: "ad1", actorType: "admin", action: "user.suspend",
      targetType: "user", targetId: "u1", metadata: { reason: "spam" }, createdAt: "2026-01-04T00:00:00Z",
    });
    expect(toSettingItem({ key: "job_posting_paid", value: false, updated_at: "2026-01-05T00:00:00Z" }))
      .toEqual({ key: "job_posting_paid", value: false, updatedAt: "2026-01-05T00:00:00Z" });
  });
});
