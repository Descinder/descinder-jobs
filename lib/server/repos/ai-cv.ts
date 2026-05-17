import "server-only";
import { db } from "@/lib/server/repos/db";

// Atomic reserve (true iff a credit was available & consumed) — race-safe cap.
export async function consumeAiCvCredit(userId: string, cap: number): Promise<boolean> {
  const { data, error } = await db().rpc("consume_ai_cv_credit", { p_user: userId, p_cap: cap });
  if (error) throw new Error(`consumeAiCvCredit failed: ${error.message}`);
  return data === true;
}
export async function refundAiCvCredit(userId: string): Promise<void> {
  const { error } = await db().rpc("refund_ai_cv_credit", { p_user: userId });
  if (error) throw new Error(`refundAiCvCredit failed: ${error.message}`);
}

export type GenerationRecord = {
  user_id: string; base_cv_id: string | null; job_id: string; generated_cv_id: string | null;
  ai_provider: string; ai_model_used: string; prompt_version: string;
  latency_ms: number | null; input_tokens: number | null; output_tokens: number | null;
  success: boolean; error_message: string | null;
};
export async function recordGeneration(r: GenerationRecord): Promise<string> {
  const { data, error } = await db().from("cv_generations").insert(r as never).select("id").single();
  if (error || !data) throw new Error(`recordGeneration failed: ${error?.message}`);
  return data.id;
}
export async function listGenerations(userId: string, limit = 50): Promise<Record<string, unknown>[]> {
  const { data, error } = await db().from("cv_generations")
    .select("id, job_id, generated_cv_id, ai_provider, ai_model_used, success, created_at, error_message")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`listGenerations failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}
