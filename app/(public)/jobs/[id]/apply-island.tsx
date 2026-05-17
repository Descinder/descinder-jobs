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

  async function apply() {
    if (job.isExternal) {
      try {
        const { redirect_url } = await apiSend<{ redirect_url: string }>("POST", `/api/jobs/${job.id}/external-click`);
        window.open(redirect_url, "_blank", "noopener");
      } catch { window.open(job.applyUrl ?? job.readFullUrl ?? "#", "_blank", "noopener"); }
      return;
    }
    setBusy(true); setPaywall(null);
    try {
      await apiSend("POST", `/api/jobs/${job.id}/apply`, { cover_letter: null, cv_file_id: null });
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
      await apiSend("POST", "/api/reports", { target_type: "job", target_id: job.id, reason: "inappropriate", description: null });
      setReported(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.push("/login");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button onClick={apply} disabled={busy || applied}
          className="rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-50">
          {applied ? "Applied ✓" : job.isExternal ? "Apply on source site" : busy ? "Applying…" : "Apply on Descinder"}
        </button>
        <button onClick={report} disabled={reported} className="text-sm text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)] disabled:opacity-50">
          {reported ? "Reported" : "Report"}
        </button>
      </div>
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
