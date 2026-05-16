import { describe, it, expect } from "vitest";
import { requireUser, requireRole, requireOwnerOrAdmin } from "@/lib/server/auth/authz";
import { AppError } from "@/lib/shared/errors";
const seeker = { id: "u1", email: "a@b.c", role: "job_seeker" as const, name: null };
const admin = { id: "u2", email: "x@y.z", role: "admin" as const, name: null };
describe("authz", () => {
  it("requireUser throws UNAUTHENTICATED when null", () => {
    expect(() => requireUser(null)).toThrowError(AppError);
    try { requireUser(null); } catch (e) { expect((e as AppError).code).toBe("UNAUTHENTICATED"); }
  });
  it("requireUser returns the user when present", () => { expect(requireUser(seeker)).toBe(seeker); });
  it("requireRole allows matching role and admin override", () => {
    expect(requireRole(seeker, "job_seeker")).toBe(seeker);
    expect(requireRole(admin, "job_seeker")).toBe(admin);
  });
  it("requireRole throws FORBIDDEN on mismatch", () => {
    try { requireRole(seeker, "employer"); } catch (e) { expect((e as AppError).code).toBe("FORBIDDEN"); }
  });
  it("requireOwnerOrAdmin: owner ok, admin ok, other forbidden", () => {
    expect(requireOwnerOrAdmin(seeker, "u1")).toBe(seeker);
    expect(requireOwnerOrAdmin(admin, "u1")).toBe(admin);
    try { requireOwnerOrAdmin(seeker, "u9"); } catch (e) { expect((e as AppError).code).toBe("FORBIDDEN"); }
  });
});
