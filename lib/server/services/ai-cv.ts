import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
import { featureGate } from "@/lib/server/gating";
import { buildAiCvMessages, AI_CV_PROMPT_VERSION } from "@/lib/server/ai/prompt";
import { providerChain, aiConfigured, type GenerationResult } from "@/lib/server/integrations/ai/chain";
import { putText } from "@/lib/server/integrations/storage/blob";
import { insertCvFile } from "@/lib/server/repos/cv";
import {
  consumeAiCvCredit, refundAiCvCredit, recordGeneration,
} from "@/lib/server/repos/ai-cv";

type User = SessionContext["user"];

async function aiCvCap(): Promise<number> {
  const { data } = await db().from("app_settings").select("value").eq("key", "ai_cv_monthly_cap").maybeSingle();
  const n = Number((data as { value: unknown } | null)?.value ?? 30);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

// Reserve-then-refund quota; injected `generate` in tests (real chain in prod).
export async function tailorCv(args: {
  user: User;
  jobId: string;
  baseText: string;
  generate?: (messages: ReturnType<typeof buildAiCvMessages>) => Promise<GenerationResult>;
}): Promise<{ generatedCvId: string; provider: string }> {
  const { user, jobId, baseText } = args;
  const generate = args.generate ?? providerChain;

  // 1. Feature gate (disabled / no active sub / advisory cap) → PAYWALL.
  const gate = await featureGate(user, "ai_cv");
  if (!gate.allowed) throw new AppError("PAYWALL", "AI-CV not available", { paywall_reason: gate.paywallReason });

  // 2. Provider availability (only when using the real chain).
  if (!args.generate && !aiConfigured()) {
    throw new AppError("CONFLICT", "AI provider is not configured on this environment");
  }

  // 3. Target job (title + description ONLY leave us — GDPR data minimisation).
  const { data: job } = await db().from("jobs").select("id, title, description").eq("id", jobId).maybeSingle();
  if (!job) throw new AppError("NOT_FOUND", "Job not found");
  const j = job as { id: string; title: string; description: string };

  // 4. Reserve a credit ATOMICALLY (authoritative cap; the gate above is advisory UX).
  const cap = await aiCvCap();
  const reserved = await consumeAiCvCredit(user.id, cap);
  if (!reserved) throw new AppError("PAYWALL", "AI-CV monthly limit reached", { paywall_reason: "ai_cv_cap_reached" });

  // 5. Generate (Groq→Claude). On ANY failure: refund + record failure + rethrow.
  const startedAt = Date.now();
  let result: GenerationResult;
  try {
    result = await generate(buildAiCvMessages({ baseText, jobTitle: j.title, jobDescription: j.description }));
  } catch (e) {
    await refundAiCvCredit(user.id);
    await recordGeneration({
      user_id: user.id, base_cv_id: null, job_id: j.id, generated_cv_id: null,
      ai_provider: "none", ai_model_used: "none", prompt_version: AI_CV_PROMPT_VERSION,
      latency_ms: Date.now() - startedAt, input_tokens: null, output_tokens: null,
      success: false, error_message: (e instanceof Error ? e.message : "ai error").slice(0, 500),
    });
    throw new AppError("INTERNAL", "AI generation failed");
  }

  // 6. Store the tailored markdown as an ai_tailored cv_files row (uncapped kind).
  const key = `cv-tailored/${randomUUID()}.md`;
  await putText(key, result.text);
  const bytes = Buffer.byteLength(result.text, "utf8");
  const generatedCvId = await insertCvFile(user.id, {
    r2_object_key: key,
    filename: `tailored-${j.title}.md`.replace(/[^\w.-]+/g, "_").slice(0, 120),
    mime_type: "text/markdown",
    size_bytes: bytes,
    kind: "ai_tailored",
    source_cv_id: null,
    tailored_for_job_id: j.id,
  });

  await recordGeneration({
    user_id: user.id, base_cv_id: null, job_id: j.id, generated_cv_id: generatedCvId,
    ai_provider: result.provider, ai_model_used: result.model, prompt_version: AI_CV_PROMPT_VERSION,
    latency_ms: Date.now() - startedAt, input_tokens: result.inputTokens, output_tokens: result.outputTokens,
    success: true, error_message: null,
  });
  return { generatedCvId, provider: result.provider };
}
