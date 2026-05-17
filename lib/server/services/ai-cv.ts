import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
import { featureGate } from "@/lib/server/gating";
import { buildAiCvMessages, AI_CV_PROMPT_VERSION } from "@/lib/server/ai/prompt";
import { providerChain, aiConfigured, type GenerationResult } from "@/lib/server/integrations/ai/chain";
import { putText, deleteObject } from "@/lib/server/integrations/storage/blob";
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

  // 5–6. Generate → store → record, under ONE compensation boundary: ANY failure
  // after the atomic reserve (generate, blob put, cv_files insert, audit insert)
  // must refund the credit, write a failed audit row, and delete a written blob
  // (no lost quota, no orphaned R2 PII, always an audit trail).
  const startedAt = Date.now();
  let blobKey: string | null = null;
  let provider = "none";
  let model = "none";
  try {
    const result: GenerationResult = await generate(
      buildAiCvMessages({ baseText, jobTitle: j.title, jobDescription: j.description }),
    );
    provider = result.provider;
    model = result.model;

    const bytes = Buffer.byteLength(result.text, "utf8");
    // Guard the cv_files ≤5MB CHECK before we write anything to blob storage.
    if (bytes > 5 * 1024 * 1024) throw new Error("Generated CV exceeds size limit");

    const key = `cv-tailored/${randomUUID()}.md`;
    await putText(key, result.text);
    blobKey = key;

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
      ai_provider: provider, ai_model_used: model, prompt_version: AI_CV_PROMPT_VERSION,
      latency_ms: Date.now() - startedAt, input_tokens: result.inputTokens, output_tokens: result.outputTokens,
      success: true, error_message: null,
    });
    return { generatedCvId, provider };
  } catch (e) {
    // Compensation — each step independent so one failure can't suppress the rest.
    try { await refundAiCvCredit(user.id); } catch { /* best-effort */ }
    if (blobKey) { try { await deleteObject(blobKey); } catch { /* best-effort */ } }
    try {
      await recordGeneration({
        user_id: user.id, base_cv_id: null, job_id: j.id, generated_cv_id: null,
        ai_provider: provider, ai_model_used: model, prompt_version: AI_CV_PROMPT_VERSION,
        latency_ms: Date.now() - startedAt, input_tokens: null, output_tokens: null,
        success: false, error_message: (e instanceof Error ? e.message : "ai error").slice(0, 500),
      });
    } catch { /* best-effort audit */ }
    if (e instanceof AppError) throw e;
    throw new AppError("INTERNAL", "AI generation failed");
  }
}
