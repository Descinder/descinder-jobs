import { describe, it, expect } from "vitest";
import { aiCvGenerateSchema } from "@/lib/shared/schemas/ai-cv";

describe("aiCvGenerateSchema", () => {
  const jobId = "11111111-1111-1111-1111-111111111111";
  it("accepts a uuid jobId + base text within bounds", () => {
    expect(aiCvGenerateSchema.safeParse({ jobId, baseText: "x".repeat(200) }).success).toBe(true);
  });
  it("rejects bad uuid, too-short, too-long", () => {
    expect(aiCvGenerateSchema.safeParse({ jobId: "nope", baseText: "x".repeat(200) }).success).toBe(false);
    expect(aiCvGenerateSchema.safeParse({ jobId, baseText: "short" }).success).toBe(false);
    expect(aiCvGenerateSchema.safeParse({ jobId, baseText: "x".repeat(20001) }).success).toBe(false);
  });
});
