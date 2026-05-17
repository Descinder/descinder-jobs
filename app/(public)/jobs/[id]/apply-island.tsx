"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiError } from "@/lib/client/api";
import type { JobDetail } from "@/lib/client/types";

export function ApplyIsland({ job }: { job: JobDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [reported, setReported] = useState(false);
  // Backend applyNativeSchema requires a non-empty cover_letter (deliberate
  // product contract from Plan 2b-iii). The UI meets the contract rather than
  // the contract being weakened to fit the UI. (CV attach is Plan 3b.)
  const [showForm, setShowForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  async function externalApply() {
    try {
      // Backend returns { redirectUrl } (camelCase).
      const { redirectUrl } = await apiSend<{ redirectUrl: string }>("POST", `/api/jobs/${job.id}/external-click`);
      window.open(redirectUrl, "_blank", "noopener");
    } catch {
      window.open(job.applyUrl ?? job.readFullUrl ?? "#", "_blank", "noopener");
    }
  }

  async function submitNative() {
    setBusy(true); setPaywall(null);
    try {
      // cover_letter required (≥1 char); cv_file_id intentionally omitted
      // (undefined) — it is .optional() server-side. Never send null.
      await apiSend("POST", `/api/jobs/${job.id}/apply`, { cover_letter: coverLetter.trim() });
      setApplied(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { router.push("/signup"); return; }
      if (e instanceof ApiError && e.status === 402) {
        setPaywall((e.details as { paywall_reason?: string })?.paywall_reason ?? "subscribe_to_apply");
        return;
      }
      if (e instanceof ApiError && e.code === "CONFLICT") { setApplied(true); return; } // already applied
      setPaywall("error");
    } finally { setBusy(false); }
  }

  async function report() {
    try {
      // description is .optional() server-side → omit it entirely (never null).
      await apiSend("POST", "/api/reports", { target_type: "job", target_id: job.id, reason: "inappropriate" });
      setReported(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.push("/login");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {job.isExternal ? (
          <button onClick={externalApply}
            className="rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)]">
            Apply on source site
          </button>
        ) : (
          <button onClick={() => setShowForm((v) => !v)} disabled={applied}
            className="rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-50">
            {applied ? "Applied ✓" : "Apply on Descinder"}
          </button>
        )}
        <button onClick={report} disabled={reported} className="text-sm text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)] disabled:opacity-50">
          {reported ? "Reported" : "Report"}
        </button>
      </div>

      {!job.isExternal && showForm && !applied && (
        <form
          onSubmit={(e) => { e.preventDefault(); void submitNative(); }}
          className="flex flex-col gap-2 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-4"
        >
          <label htmlFor="cover_letter" className="text-sm font-medium text-[oklch(0.22_0.08_264)]">Cover letter</label>
          <textarea
            id="cover_letter"
            aria-label="Cover letter"
            rows={4}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="A few lines on why you're a fit."
            className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || coverLetter.trim().length === 0}
            className="mt-1 rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </form>
      )}

      {paywall && paywall !== "error" && (
        <div className="rounded-xl border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-4 py-3 text-sm text-[oklch(0.22_0.08_264)]">
          Applying on Descinder needs a subscription.{" "}
          <button onClick={() => router.push("/pricing")} className="font-semibold underline">See plans</button>
        </div>
      )}
      {paywall === "error" && <p className="text-sm text-red-600">Something went wrong. Try again.</p>}
    </div>
  );
}
