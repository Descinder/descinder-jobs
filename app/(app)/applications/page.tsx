"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

// Verified GET /api/me/applications (lib/server/services/applications.ts#myApplications):
//   { applications: ApplicationListItem[], total, page, page_size }
// ApplicationListItem (lib/shared/dto.ts#toApplicationListItem) =
//   { id, jobId, jobTitle, company, isExternal, displayStatus, withdrawn, submittedAt }
type AppItem = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  isExternal: boolean;
  displayStatus: string;
  withdrawn: boolean;
  submittedAt: string;
};
type AppList = {
  applications: AppItem[];
  total: number;
  page: number;
  page_size: number;
};

// Verified vocab: externalStatusSchema (lib/shared/schemas/applications.ts).
// Only external applications may be patched (native status is employer-set).
const EXTERNAL_STATUSES = [
  "applied",
  "interviewing",
  "offer",
  "hired",
  "rejected",
] as const;

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

export default function ApplicationsPage() {
  const [list, setList] = useState<AppItem[] | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const x = await apiGet<AppList>("/api/me/applications");
    setList(x.applications);
    setSt("ok");
  }, []);

  useEffect(() => {
    reload().catch(() => setSt("error"));
  }, [reload]);

  async function changeStatus(id: string, status: string) {
    setActionError(null);
    setSavingId(id);
    try {
      await apiSend<{ ok: true }>(
        "PATCH",
        `/api/me/applications/${id}/status`,
        { status },
      );
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not update status.",
      );
    } finally {
      setSavingId(null);
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "error" || !list)
    return (
      <ErrorState
        message="Couldn't load your applications."
        onRetry={() => reload().catch(() => setSt("error"))}
      />
    );

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        My applications
      </h1>

      {actionError && (
        <p className="mt-4 rounded-lg border border-[oklch(0.80_0.06_20)] bg-[oklch(0.97_0.02_20)] px-3 py-2 text-sm text-[oklch(0.48_0.14_20)]">
          {actionError}
        </p>
      )}

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No applications yet"
            hint="Apply to a job and it'll show up here."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
          {list.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-4 border-b border-[oklch(0.93_0.01_264)] px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[oklch(0.22_0.08_264)]">
                  {a.jobTitle}
                </div>
                <div className="mt-0.5 text-xs text-[oklch(0.50_0.03_264)]">
                  {a.company} · {fmtDate(a.submittedAt)}
                  {a.isExternal && (
                    <span className="ml-2 rounded border border-[oklch(0.84_0.03_264)] bg-[oklch(0.96_0.01_264)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[oklch(0.32_0.07_264)]">
                      External
                    </span>
                  )}
                  {a.withdrawn && (
                    <span className="ml-2 rounded border border-[oklch(0.80_0.06_20)] bg-[oklch(0.97_0.02_20)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[oklch(0.48_0.14_20)]">
                      Withdrawn
                    </span>
                  )}
                </div>
              </div>
              {a.isExternal && !a.withdrawn ? (
                <label className="flex items-center gap-2 text-xs text-[oklch(0.50_0.03_264)]">
                  Status
                  <select
                    aria-label={`Status for ${a.jobTitle}`}
                    disabled={savingId === a.id}
                    value={
                      (EXTERNAL_STATUSES as readonly string[]).includes(
                        a.displayStatus,
                      )
                        ? a.displayStatus
                        : "applied"
                    }
                    onChange={(e) => changeStatus(a.id, e.target.value)}
                    className="rounded-md border border-[oklch(0.90_0.02_264)] bg-white px-2 py-1.5 text-xs font-medium text-[oklch(0.22_0.08_264)] disabled:opacity-50"
                  >
                    {EXTERNAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="rounded-md border border-[oklch(0.90_0.02_264)] px-2.5 py-1.5 text-xs font-medium capitalize text-[oklch(0.32_0.07_264)]">
                  {a.displayStatus}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
