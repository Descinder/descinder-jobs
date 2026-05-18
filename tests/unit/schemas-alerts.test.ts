import { describe, it, expect } from "vitest";
import { alertCreateSchema, alertUpdateSchema, alertFiltersSchema } from "@/lib/shared/schemas/alerts";

describe("alertFiltersSchema", () => {
  it("accepts a subset of feed filters; rejects sort/page and unknown keys", () => {
    expect(alertFiltersSchema.safeParse({ q: "react", country: "GB", work_mode: "remote" }).success).toBe(true);
    expect(alertFiltersSchema.safeParse({}).success).toBe(true);
    expect(alertFiltersSchema.safeParse({ sort: "newest" }).success).toBe(false);
    expect(alertFiltersSchema.safeParse({ page: 2 }).success).toBe(false);
    expect(alertFiltersSchema.safeParse({ bogus: 1 }).success).toBe(false);
  });
});
describe("alertCreateSchema", () => {
  it("requires name + frequency enum; filters optional", () => {
    expect(alertCreateSchema.safeParse({ name: "Remote React", frequency: "instant" }).success).toBe(true);
    expect(alertCreateSchema.safeParse({ name: "X", frequency: "daily", filters: { country: "US" } }).success).toBe(true);
    expect(alertCreateSchema.safeParse({ name: "", frequency: "daily" }).success).toBe(false);
    expect(alertCreateSchema.safeParse({ name: "X", frequency: "yearly" }).success).toBe(false);
    expect(alertCreateSchema.safeParse({ frequency: "daily" }).success).toBe(false);
  });
});
describe("alertUpdateSchema", () => {
  it("all fields optional but at least the shape is partial", () => {
    expect(alertUpdateSchema.safeParse({ name: "Renamed" }).success).toBe(true);
    expect(alertUpdateSchema.safeParse({ frequency: "weekly" }).success).toBe(true);
    expect(alertUpdateSchema.safeParse({}).success).toBe(true);
    expect(alertUpdateSchema.safeParse({ frequency: "nope" }).success).toBe(false);
  });
});
