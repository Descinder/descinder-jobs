// Pure mapper. cv_generations.error_message may hold provider/internal detail —
// it is NEVER exposed to the client (only success boolean + safe metadata).
type GenRow = {
  id: string; job_id: string | null; generated_cv_id: string | null;
  ai_provider: string; ai_model_used: string; success: boolean;
  created_at: string; error_message: string | null;
};
export function toGenerationListItem(g: GenRow) {
  return {
    id: g.id,
    jobId: g.job_id,
    generatedCvId: g.generated_cv_id,
    provider: g.ai_provider,
    model: g.ai_model_used,
    success: g.success,
    createdAt: g.created_at,
  };
}
