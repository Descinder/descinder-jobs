"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { usePaywall } from "@/lib/client/use-paywall";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Verified POST /api/me/ai-cv/generate (lib/shared/schemas/ai-cv.ts):
//   body { jobId: uuid, baseText: string (min 50, max 20000) }
//   → 201 { generatedCvId, provider }
//   → 402 PAYWALL details.paywall_reason in
//       { subscribe_for_ai_cv | ai_cv_disabled | ai_cv_cap_reached }
//   → 409 CONFLICT when the AI provider is unconfigured (CI has no keys)
// Verified GET /api/me/ai-cv (lib/shared/ai-cv-dto.ts):
//   { generations: [{ id, jobId, generatedCvId, provider, model,
//                      success, createdAt }] }
// NOTE: no /api/me/ai-cv/quota and no ai-cv export-pdf endpoint exist —
// quota is advisory (derived from history); PDF export is DEFERRED (copy
// markdown / open the saved ai_tailored CV via /api/me/cvs/:id/download).

type GenItem = {
  id: string;
  jobId: string | null;
  generatedCvId: string | null;
  provider: string;
  model: string;
  success: boolean;
  createdAt: string;
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const PAYWALL_COPY: Record<string, string> = {
  subscribe_for_ai_cv:
    "AI-tailored CVs need an active subscription. Subscribe to unlock.",
  ai_cv_cap_reached:
    "You've used all your AI-CV generations for this period.",
  ai_cv_disabled:
    "AI-CV generation is currently disabled on this environment.",
};

export default function AiCvGeneratePage() {
  const [history, setHistory] = useState<GenItem[] | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");

  const { raisePaywall, hasProvider } = usePaywall();

  const [jobId, setJobId] = useState("");
  const [baseText, setBaseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [result, setResult] = useState<{
    generatedCvId: string;
    provider: string;
  } | null>(null);

  const reload = useCallback(async () => {
    const x = await apiGet<{ generations: GenItem[] }>("/api/me/ai-cv");
    setHistory(x.generations);
    setSt("ok");
  }, []);

  useEffect(() => {
    reload().catch(() => setSt("error"));
  }, [reload]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPaywall(null);
    setResult(null);
    // Targeted client guard so a pasted URL/slug gets clear guidance instead of
    // a generic "Validation failed" 422 (server still enforces the real check).
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId.trim())) {
      setError("Enter a valid job ID (the UUID from a job's page URL).");
      return;
    }
    if (baseText.trim().length < 50) {
      setError("Paste at least 50 characters of your base CV.");
      return;
    }
    setSubmitting(true);
    try {
      const out = await apiSend<{ generatedCvId: string; provider: string }>(
        "POST",
        "/api/me/ai-cv/generate",
        { jobId, baseText },
      );
      setResult(out);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "PAYWALL" || err.status === 402) {
          const reason =
            (err.details as { paywall_reason?: string } | undefined)
              ?.paywall_reason ?? "subscribe_for_ai_cv";
          // Prefer the app-wide paywall modal (provider mounted in the (app)
          // layout). Keep the inline notice as a fallback if no provider —
          // and so the e2e/visual paywall messaging stays present.
          if (hasProvider) raisePaywall(reason);
          setPaywall(PAYWALL_COPY[reason] ?? PAYWALL_COPY.subscribe_for_ai_cv);
        } else if (err.code === "CONFLICT" || err.status === 409) {
          setError(
            "AI generation isn't available on this environment yet.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Could not generate a tailored CV.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function openTailored(cvId: string) {
    try {
      const { url } = await apiGet<{ url: string; filename: string }>(
        `/api/me/cvs/${cvId}/download`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Could not open that tailored CV.");
    }
  }

  // Advisory only — no quota endpoint; count successful generations.
  const usedThisHistory =
    history?.filter((g) => g.success).length ?? 0;

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
          AI CV generator
        </h1>
        <Link
          href="/cv"
          className="text-sm font-medium text-[oklch(0.32_0.07_264)] hover:underline"
        >
          ← Back to my CVs
        </Link>
      </div>
      <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
        Rewrites your base CV for a specific role. Your base CV is not
        modified.
        {history && (
          <span className="ml-1">
            {usedThisHistory} generation
            {usedThisHistory === 1 ? "" : "s"} so far.
          </span>
        )}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ── Inputs ── */}
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-5"
        >
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.08_264)]">
            Target job
          </h2>

          <label className="mt-4 block text-sm font-medium text-[oklch(0.32_0.07_264)]">
            Job ID
            <input
              type="text"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="mt-1 w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 font-mono text-sm outline-none focus:border-[oklch(0.32_0.07_264)]"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-[oklch(0.32_0.07_264)]">
            Base CV text
            <textarea
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              placeholder="Paste your CV text here (at least 50 characters)…"
              rows={12}
              className="mt-1 w-full resize-y rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)]"
              required
              minLength={50}
            />
          </label>
          <p className="mt-1 text-xs text-[oklch(0.66_0.02_264)]">
            {baseText.trim().length} / 50 minimum characters
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Generating…" : "Generate tailored CV"}
          </button>

          {paywall && (
            <div className="mt-4 rounded-lg border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-4 py-3 text-sm">
              <p className="text-[oklch(0.22_0.08_264)]">{paywall}</p>
              <Link
                href="/settings/billing"
                className="mt-2 inline-block font-semibold underline"
              >
                See subscription options
              </Link>
            </div>
          )}
          {error && (
            <p className="mt-4 rounded-lg border border-[oklch(0.80_0.06_20)] bg-[oklch(0.97_0.02_20)] px-3 py-2 text-sm text-[oklch(0.48_0.14_20)]">
              {error}
            </p>
          )}
        </form>

        {/* ── Output ── */}
        <div className="rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-5">
          <h2 className="text-lg font-semibold text-[oklch(0.22_0.08_264)]">
            Result
          </h2>
          {result ? (
            <div className="mt-4">
              <p className="text-sm text-[oklch(0.22_0.08_264)]">
                Tailored CV generated with{" "}
                <strong>{result.provider}</strong>. It's saved to your CVs.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openTailored(result.generatedCvId)}
                  className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm font-medium hover:bg-[oklch(0.97_0.01_264)]"
                >
                  Open tailored CV
                </button>
                <Link
                  href="/cv"
                  className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3 py-2 text-sm font-semibold text-white"
                >
                  View in my CVs
                </Link>
              </div>
              <p className="mt-3 text-xs text-[oklch(0.66_0.02_264)]">
                PDF export is coming soon — open the saved CV to copy its
                contents in the meantime.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[oklch(0.50_0.03_264)]">
              Enter a job ID and your base CV text, then hit Generate. The
              tailored result is saved to your CVs.
            </p>
          )}
        </div>
      </div>

      {/* ── History ── */}
      <section className="mt-10">
        <h2 className="mb-4 border-b border-[oklch(0.90_0.02_264)] pb-3 text-lg font-semibold text-[oklch(0.22_0.08_264)]">
          Generation history
        </h2>
        {st === "loading" && <Loading />}
        {st === "error" && (
          <ErrorState
            message="Couldn't load your generation history."
            onRetry={() => reload().catch(() => setSt("error"))}
          />
        )}
        {st === "ok" &&
          (history && history.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
              {history.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center gap-4 border-b border-[oklch(0.93_0.01_264)] px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[oklch(0.22_0.08_264)]">
                      {g.success ? "Tailored CV" : "Generation failed"}
                    </div>
                    <div className="mt-0.5 text-xs text-[oklch(0.50_0.03_264)]">
                      {g.provider} · {fmtDate(g.createdAt)}
                    </div>
                  </div>
                  {g.success && g.generatedCvId && (
                    <button
                      type="button"
                      onClick={() => openTailored(g.generatedCvId!)}
                      className="rounded-md border border-[oklch(0.90_0.02_264)] px-2.5 py-1.5 text-xs font-medium hover:bg-[oklch(0.97_0.01_264)]"
                    >
                      Open
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[oklch(0.50_0.03_264)]">
              No generations yet.
            </p>
          ))}
      </section>
    </div>
  );
}
