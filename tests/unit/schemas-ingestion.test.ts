import { describe, it, expect } from "vitest";
import { ingestRunSchema } from "@/lib/shared/schemas/ingestion";

describe("ingestRunSchema", () => {
  it("accepts adzuna with a supported country", () => {
    expect(ingestRunSchema.safeParse({ source: "adzuna", country: "GB" }).success).toBe(true);
    expect(ingestRunSchema.safeParse({ source: "adzuna", country: "US" }).success).toBe(true);
  });
  it("accepts reed with GB only", () => {
    expect(ingestRunSchema.safeParse({ source: "reed", country: "GB" }).success).toBe(true);
    expect(ingestRunSchema.safeParse({ source: "reed", country: "US" }).success).toBe(false);
  });
  it("rejects unknown source / country", () => {
    expect(ingestRunSchema.safeParse({ source: "indeed", country: "GB" }).success).toBe(false);
    expect(ingestRunSchema.safeParse({ source: "adzuna", country: "ZZ" }).success).toBe(false);
  });
});
