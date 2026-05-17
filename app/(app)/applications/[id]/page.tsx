"use client";

import { use, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Application detail. GET /api/applications/:id (applicationDetail — applicant |
// company member | admin; anyone else → AppError NOT_FOUND so no existence
// leak). Real shape = lib/shared/dto.ts#toApplicationDetail:
//   ApplicationListItem & { coverLetter, cvFileId, externalUrl }
// §9c divergence: there is NO candidate name/headline/snippet on the DTO (the
// plan §5 assumed one). We show the cover letter, job/company/status and the
// CV download. cvFileId === null → no CV attached.
//
// "Download CV" → GET /api/applications/:id/cv → { url, filename } (verified:
// lib/server/services/applications.ts#applicationCv presigns a GET; same
// {url,filename} shape as 3b's cv download) → open url in a new tab.
//
// Status <select> → PATCH /api/applications/:id/status { status } using the
// EMPLOYER vocab from lib/shared/schemas/applications.ts#employerStatusSchema:
//   submitted | reviewed | shortlisted | rejected | hired
// (NOT the seeker/external vocab applied/interviewing/offer/hired/rejected).
// §9c: that PATCH returns { ok: true } — NOT the updated application — so after
// a successful PATCH we re-GET the detail to reflect the new displayStatus.
// employerSetStatus also rejects non-native applications (CONFLICT) and
// non-members (FORBIDDEN). use(params) for [id].

type ApplicationDetail = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  isExternal: boolean;
  displayStatus: string;
  withdrawn: boolean;
  submittedAt: string;
  coverLetter: string | null;
  cvFileId: string | null;
  externalUrl: string | null;
};

const EMPLOYER_STATUS = [
  "submitted",
  "reviewed",
  "shortlisted",
  "rejected",
  "hired",
] as const;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "noaccess" | "error">(
    "loading",
  );
  const [status, setStatus] = useState<string>("submitted");
  const [busy, setBusy] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(): Promise<void> {
    return apiGet<ApplicationDetail>(`/api/applications/${id}`)
      .then((a) => {
        setApp(a);
        setStatus(a.displayStatus);
        setSt("ok");
      })
      .catch((e) => {
        if (
          e instanceof ApiError &&
          (e.status === 404 || e.status === 403)
        )
          setSt("noaccess");
        else setSt("error");
      });
  }

  useEffect(() => {
    let alive = true;
    apiGet<ApplicationDetail>(`/api/applications/${id}`)
      .then((a) => {
        if (!alive) return;
        setApp(a);
        setStatus(a.displayStatus);
        setSt("ok");
      })
      .catch((e) => {
        if (!alive) return;
        if (
          e instanceof ApiError &&
          (e.status === 404 || e.status === 403)
        )
          setSt("noaccess");
        else setSt("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  async function downloadCv() {
    setError(null);
    setCvBusy(true);
    try {
      const { url } = await apiGet<{ url: string; filename: string }>(
        `/api/applications/${id}/cv`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not fetch the CV.",
      );
    } finally {
      setCvBusy(false);
    }
  }

  async function saveStatus() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await apiSend("PATCH", `/api/applications/${id}/status`, { status });
      await load();
      setNotice("Status updated. The candidate has been notified.");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not update the status.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "noaccess")
    return (
      <ErrorState message="You don't have access to this application." />
    );
  if (st === "error" || !app)
    return <ErrorState message="Couldn't load this application." />;

  const labelCls = "block text-sm font-medium text-[oklch(0.22_0.08_264)]";
  const fieldCls =
    "w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20";

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
            {app.jobTitle}
          </h1>
          <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
            {app.company} · Applied {fmtDate(app.submittedAt)}
            {app.withdrawn ? " · withdrawn by candidate" : ""}
          </p>
        </div>
      </div>

      <section className="mt-8 space-y-6 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-6">
        <div className="space-y-1.5">
          <p className={labelCls}>Cover letter</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[oklch(0.40_0.04_264)]">
            {app.coverLetter?.trim()
              ? app.coverLetter
              : "No cover letter was submitted."}
          </p>
        </div>

        <div className="space-y-1.5 border-t border-[oklch(0.94_0.01_264)] pt-6">
          <p className={labelCls}>CV</p>
          {app.cvFileId ? (
            <button
              type="button"
              onClick={downloadCv}
              disabled={cvBusy}
              className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2 text-sm font-semibold text-[oklch(0.22_0.08_264)] disabled:opacity-60"
            >
              {cvBusy ? "Preparing…" : "Download CV"}
            </button>
          ) : (
            <p className="text-sm text-[oklch(0.50_0.03_264)]">
              No CV attached to this application.
            </p>
          )}
        </div>

        <div className="space-y-1.5 border-t border-[oklch(0.94_0.01_264)] pt-6">
          <label htmlFor="appStatus" className={labelCls}>
            Status
          </label>
          <div className="flex items-center gap-3">
            <select
              id="appStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${fieldCls} max-w-[220px]`}
            >
              {EMPLOYER_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={saveStatus}
              disabled={busy || status === app.displayStatus}
              className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update status"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            {notice}
          </div>
        )}
      </section>
    </div>
  );
}
