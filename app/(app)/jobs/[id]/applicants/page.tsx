"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/client/api";
import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

// Applicants for a job. GET /api/jobs/:id/applications (employerListApplicants —
// requireRole("employer") + requireCompanyMember). Non-member → AppError
// FORBIDDEN (403); missing job → NOT_FOUND (404). Both surface as a generic
// "no access" message (no existence leak).
//
// §9c divergence: the real envelope is { applications: ApplicationListItem[] }
// (lib/shared/dto.ts#toApplicationListItem). ApplicationListItem exposes NO
// candidate name/headline (the plan §5 assumed it would) — it carries
// { id, jobId, jobTitle, company, isExternal, displayStatus, withdrawn,
// submittedAt }. We render job/status/submitted columns and link each row to
// /applications/:id where cover letter + CV live. use(params) for [id].
type ApplicationListItem = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  isExternal: boolean;
  displayStatus: string;
  withdrawn: boolean;
  submittedAt: string;
};

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

export default function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [apps, setApps] = useState<ApplicationListItem[] | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "noaccess" | "error">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    apiGet<{ applications: ApplicationListItem[] }>(
      `/api/jobs/${id}/applications`,
    )
      .then((r) => {
        if (!alive) return;
        setApps(r.applications);
        setSt("ok");
      })
      .catch((e) => {
        if (!alive) return;
        if (
          e instanceof ApiError &&
          (e.status === 403 || e.status === 404)
        )
          setSt("noaccess");
        else setSt("error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (st === "loading") return <Loading />;
  if (st === "noaccess")
    return (
      <ErrorState message="You don't have access to this job's applicants." />
    );
  if (st === "error" || !apps)
    return <ErrorState message="Couldn't load applicants." />;

  return (
    <div className="mx-auto max-w-[960px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
            Applicants
          </h1>
          <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
            People who applied to this role.
          </p>
        </div>
        <Link
          href={`/jobs/${id}/edit`}
          className="shrink-0 rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2 text-sm font-medium text-[oklch(0.22_0.08_264)]"
        >
          Edit job
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
          <EmptyState
            title="No applicants yet"
            hint="Candidates who apply will appear here."
          />
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[oklch(0.90_0.02_264)] text-left text-xs uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[oklch(0.94_0.01_264)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[oklch(0.22_0.08_264)]">
                    {a.jobTitle}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-md border border-[oklch(0.90_0.02_264)] bg-[oklch(0.97_0.01_264)] px-2 py-0.5 text-xs font-medium text-[oklch(0.40_0.04_264)]">
                      {a.withdrawn ? "withdrawn" : a.displayStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[oklch(0.50_0.03_264)]">
                    {fmtDate(a.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/applications/${a.id}`}
                      className="font-medium text-[oklch(0.32_0.07_264)] hover:underline"
                    >
                      View application
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
