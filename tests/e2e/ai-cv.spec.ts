import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { tailorCv } from "../../lib/server/services/ai-cv";
import type { GenerationResult } from "../../lib/server/integrations/ai/chain";

async function seed(stamp: number) {
  const { userId } = await signUpWithPassword(`aicv+${stamp}@example.test`, "test-password-123", { name: "AI" });
  const { data: co } = await db().from("companies").insert({ name: `AICo ${stamp}`, slug: `aico-${stamp}`, size: "11-50" } as never).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title: `AICV Engineer ${stamp}`,
    description: "Build platform things. TypeScript, Postgres.", employment_type: "full_time",
    work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never).select("id").single();
  // active subscription + ensure the ai_cv gate is satisfiable
  await db().from("subscriptions").insert({
    owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active",
    stripe_subscription_id: `sub_aicv_${stamp}`, cancel_at_period_end: false,
  } as never);
  return { userId, jobId: (job as { id: string }).id };
}

test("tailorCv: success consumes a credit, stores ai_tailored cv, logs generation", async () => {
  const stamp = Date.now();
  const { userId, jobId } = await seed(stamp);
  const fake = async (): Promise<GenerationResult> =>
    ({ text: "# Tailored CV\n\nGreat fit.", provider: "groq", model: "llama-3.3-70b-versatile", inputTokens: 100, outputTokens: 200 });

  const out = await tailorCv({
    user: { id: userId, email: `aicv+${stamp}@example.test`, role: "job_seeker" } as never,
    jobId, baseText: "Experienced engineer. ".repeat(10), generate: fake,
  });
  expect(out.generatedCvId).toMatch(/[0-9a-f-]{36}/);
  expect(out.provider).toBe("groq");

  const { data: u } = await db().from("users").select("ai_cv_uses_this_period").eq("id", userId).single();
  expect((u as { ai_cv_uses_this_period: number }).ai_cv_uses_this_period).toBe(1);
  const { data: cv } = await db().from("cv_files").select("kind, tailored_for_job_id").eq("id", out.generatedCvId).single();
  expect((cv as { kind: string }).kind).toBe("ai_tailored");
  expect((cv as { tailored_for_job_id: string }).tailored_for_job_id).toBe(jobId);
  const { data: gen } = await db().from("cv_generations").select("success, ai_provider, prompt_version").eq("generated_cv_id", out.generatedCvId).single();
  expect((gen as { success: boolean }).success).toBe(true);

  await db().from("cv_generations").delete().eq("user_id", userId);
  await db().from("cv_files").delete().eq("user_id", userId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("users").delete().eq("id", userId);
});

test("tailorCv: provider failure refunds the credit and records a failed generation", async () => {
  const stamp = Date.now() + 1;
  const { userId, jobId } = await seed(stamp);
  const boom = async (): Promise<GenerationResult> => { throw new Error("provider 503"); };

  await expect(tailorCv({
    user: { id: userId, email: `aicv+${stamp}@example.test`, role: "job_seeker" } as never,
    jobId, baseText: "Experienced engineer. ".repeat(10), generate: boom,
  })).rejects.toThrow();

  const { data: u } = await db().from("users").select("ai_cv_uses_this_period").eq("id", userId).single();
  expect((u as { ai_cv_uses_this_period: number }).ai_cv_uses_this_period).toBe(0); // refunded
  const { data: gen } = await db().from("cv_generations").select("success").eq("user_id", userId).maybeSingle();
  expect((gen as { success: boolean } | null)?.success).toBe(false);

  await db().from("cv_generations").delete().eq("user_id", userId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("users").delete().eq("id", userId);
});

test("tailorCv: at cap → PAYWALL, no provider call, no generation row", async () => {
  const stamp = Date.now() + 2;
  const { userId, jobId } = await seed(stamp);
  await db().from("users").update({ ai_cv_uses_this_period: 999999 } as never).eq("id", userId);
  let called = false;
  const fake = async (): Promise<GenerationResult> => { called = true; return { text: "x", provider: "groq", model: "m", inputTokens: 0, outputTokens: 0 }; };
  await expect(tailorCv({
    user: { id: userId, email: `aicv+${stamp}@example.test`, role: "job_seeker" } as never,
    jobId, baseText: "Experienced engineer. ".repeat(10), generate: fake,
  })).rejects.toMatchObject({ code: "PAYWALL" });
  expect(called).toBe(false);
  const { count } = await db().from("cv_generations").select("id", { count: "exact", head: true }).eq("user_id", userId);
  expect(count ?? 0).toBe(0);

  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("users").delete().eq("id", userId);
});

test("tailorCv: POST-generation failure (oversized output) refunds credit + records failed + no cv row", async () => {
  const stamp = Date.now() + 3;
  const { userId, jobId } = await seed(stamp);
  // generation "succeeds" but the output exceeds the cv_files 5MB CHECK → the
  // service must compensate (refund + failed audit + no orphan), not lose quota.
  const huge = async (): Promise<GenerationResult> =>
    ({ text: "A".repeat(6 * 1024 * 1024), provider: "groq", model: "llama-3.3-70b-versatile", inputTokens: 1, outputTokens: 1 });
  await expect(tailorCv({
    user: { id: userId, email: `aicv+${stamp}@example.test`, role: "job_seeker" } as never,
    jobId, baseText: "Experienced engineer. ".repeat(10), generate: huge,
  })).rejects.toThrow();

  const { data: u } = await db().from("users").select("ai_cv_uses_this_period").eq("id", userId).single();
  expect((u as { ai_cv_uses_this_period: number }).ai_cv_uses_this_period).toBe(0); // refunded, not lost
  const { data: gen } = await db().from("cv_generations").select("success").eq("user_id", userId).maybeSingle();
  expect((gen as { success: boolean } | null)?.success).toBe(false); // audit row written
  const { count: cvCount } = await db().from("cv_files").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "ai_tailored");
  expect(cvCount ?? 0).toBe(0); // no orphan cv_files row

  await db().from("cv_generations").delete().eq("user_id", userId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("users").delete().eq("id", userId);
});
