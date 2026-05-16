import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema } from "@/lib/shared/schemas/auth";
describe("auth schemas", () => {
  it("signup: accepts a valid payload", () => {
    expect(signupSchema.safeParse({ email:"a@b.co", password:"longenough1", name:"A B", role:"job_seeker", marketing_consent:false, accepted_terms:true }).success).toBe(true);
  });
  it("signup: rejects short password", () => {
    expect(signupSchema.safeParse({ email:"a@b.co", password:"short", name:"A", role:"job_seeker", marketing_consent:false, accepted_terms:true }).success).toBe(false);
  });
  it("signup: rejects when terms not accepted", () => {
    expect(signupSchema.safeParse({ email:"a@b.co", password:"longenough1", name:"A", role:"job_seeker", marketing_consent:false, accepted_terms:false }).success).toBe(false);
  });
  it("login: requires email + password", () => {
    expect(loginSchema.safeParse({ email:"a@b.co", password:"x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email:"nope" }).success).toBe(false);
  });
});
