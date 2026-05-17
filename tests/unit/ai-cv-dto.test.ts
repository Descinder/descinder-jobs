import { describe, it, expect } from "vitest";
import { toGenerationListItem } from "@/lib/shared/ai-cv-dto";

describe("toGenerationListItem", () => {
  it("exposes only safe metadata (no prompt body, no error internals to client)", () => {
    expect(toGenerationListItem({
      id: "g1", job_id: "j1", generated_cv_id: "c1", ai_provider: "groq",
      ai_model_used: "llama-3.3-70b-versatile", success: true,
      created_at: "2026-05-17T00:00:00Z", error_message: "stack trace secret",
    })).toEqual({
      id: "g1", jobId: "j1", generatedCvId: "c1", provider: "groq",
      model: "llama-3.3-70b-versatile", success: true, createdAt: "2026-05-17T00:00:00Z",
    });
  });
});
