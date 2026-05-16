import { describe, it, expect } from "vitest";
import { subscribeSchema, jobPostPaySchema } from "@/lib/shared/schemas/billing";

describe("subscribeSchema", () => {
  it("accepts the two plan keys, rejects others", () => {
    expect(subscribeSchema.safeParse({ plan: "seeker_monthly" }).success).toBe(true);
    expect(subscribeSchema.safeParse({ plan: "company_monthly" }).success).toBe(true);
    expect(subscribeSchema.safeParse({ plan: "year_pack" }).success).toBe(false);
    expect(subscribeSchema.safeParse({}).success).toBe(false);
  });
});
describe("jobPostPaySchema", () => {
  it("requires a uuid jobId", () => {
    expect(jobPostPaySchema.safeParse({ jobId: "11111111-1111-1111-1111-111111111111" }).success).toBe(true);
    expect(jobPostPaySchema.safeParse({ jobId: "nope" }).success).toBe(false);
  });
});
