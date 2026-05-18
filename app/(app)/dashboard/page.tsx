"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/client/api";
import type { JobListItem } from "@/lib/client/types";
import { JobCard } from "@/components/jobs/job-card";
import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

// Verified GET /api/me/dashboard shape (lib/server/services/profile.ts#myDashboard):
// { name, role, matchedJobs, subscription:{status,plan_key,current_period_end}|null,
//   canApplyNative }. No applications[]/alerts[]/ai_cv_recent[] (screen-map §9
//   reconcile: applications AND alerts have their own pages — the dashboard
//   only links out to them, it does not embed their lists; alerts shipped 4c).
type Dash = {
  name: string | null;
  role: string;
  matchedJobs: JobListItem[];
  subscription: {
    status: string;
    plan_key: string;
    current_period_end: string | null;
  } | null;
  canApplyNative: boolean;
};

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    apiGet<Dash>("/api/me/dashboard")
      .then((x) => {
        setD(x);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, []);
  if (st === "loading") return <Loading />;
  if (st === "error" || !d)
    return <ErrorState message="Couldn't load your dashboard." />;
  if (d.role === "employer") return <EmployerDashboard name={d.name} />;
  return <SeekerDashboard d={d} />;
}

// ── Seeker branch (3b — unchanged) ──────────────────────────────────────────
function SeekerDashboard({ d }: { d: Dash }) {
  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Welcome back{d.name ? `, ${d.name}` : ""}
      </h1>
      {d.subscription && (
        <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
          {d.subscription.plan_key} · {d.subscription.status}
        </p>
      )}
      {!d.canApplyNative && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-4 py-3 text-sm">
          <span className="text-[oklch(0.22_0.08_264)]">
            Subscribe to apply on Descinder, get AI-tailored CVs and instant
            alerts.
          </span>
          <Link href="/pricing" className="font-semibold underline">
            See plans
          </Link>
        </div>
      )}
      {d.canApplyNative && (
        <div className="mt-4 flex gap-3 text-sm">
          <Link
            href="/cv/generate"
            className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 font-semibold text-white"
          >
            Tailor a CV
          </Link>
          <Link
            href="/settings/billing"
            className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2"
          >
            Manage subscription
          </Link>
        </div>
      )}
      <h2 className="mt-8 mb-3 text-lg font-semibold text-[oklch(0.22_0.08_264)]">
        Roles that match your profile
      </h2>
      <div className="flex flex-col gap-3">
        {d.matchedJobs.length === 0 && (
          <p className="text-sm text-[oklch(0.50_0.03_264)]">
            Add skills to your profile to see matches.
          </p>
        )}
        {d.matchedJobs.map((j) => (
          <JobCard key={j.id} job={j} saved={false} onToggleSave={() => {}} />
        ))}
      </div>
      <div className="mt-6 flex gap-5 text-sm">
        <Link
          href="/applications"
          className="font-medium text-[oklch(0.32_0.07_264)] hover:underline"
        >
          My applications →
        </Link>
        <Link
          href="/alerts"
          className="font-medium text-[oklch(0.32_0.07_264)] hover:underline"
        >
          Job alerts →
        </Link>
      </div>
    </main>
  );
}

// ── Employer branch (3c) ────────────────────────────────────────────────────
// Composed from GET /api/me/jobs + GET /api/me/company (no
// /api/me/employer-dashboard — not built; §9c). GET /api/me/jobs returns
// JobListItem[] (toJobListItem) which exposes NO status field and NO per-job
// applicant count, so the table links to per-job applicants instead of a status
// badge or count (§9c divergence). A new employer has no company → /api/me/company
// 404s → redirect-style prompt to finish onboarding.
// GET /api/me/company → toCompanyPublic shape (lib/shared/dto.ts).
type CompanyPublic = {
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  location: string | null;
  size: string | null;
};

function EmployerDashboard({ name }: { name: string | null }) {
  const [company, setCompany] = useState<CompanyPublic | null>(null);
  const [jobs, setJobs] = useState<JobListItem[] | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "no-company" | "error">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<CompanyPublic>("/api/me/company"),
      apiGet<{ jobs: JobListItem[] }>("/api/me/jobs"),
    ])
      .then(([co, jr]) => {
        if (!alive) return;
        setCompany(co);
        setJobs(jr.jobs);
        setSt("ok");
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 404) setSt("no-company");
        else setSt("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (st === "loading") return <Loading />;
  if (st === "error")
    return <ErrorState message="Couldn't load your dashboard." />;
  if (st === "no-company")
    return (
      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <EmptyState
          title="Finish setting up your company"
          hint="Create your company profile to start posting roles."
        />
        <div className="mt-4 flex justify-center">
          <Link
            href="/onboarding/company"
            className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Set up company
          </Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-[1100px] px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
            Welcome back{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
            {company?.name}
            {company?.location ? ` · ${company.location}` : ""}
            {company?.size ? ` · ${company.size}` : ""}
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="shrink-0 rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white"
        >
          Post a job
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/company"
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2"
        >
          Edit company profile
        </Link>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-[oklch(0.22_0.08_264)]">
        Your jobs
      </h2>

      {jobs && jobs.length === 0 ? (
        <div className="rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
          <EmptyState
            title="Post your first role"
            hint="Published roles appear to candidates on Descinder."
          />
          <div className="flex justify-center pb-6">
            <Link
              href="/jobs/new"
              className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Post a job
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[oklch(0.90_0.02_264)] text-left text-xs uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs?.map((j) => (
                <tr
                  key={j.id}
                  className="border-b border-[oklch(0.94_0.01_264)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[oklch(0.22_0.08_264)]">
                    {j.title}
                  </td>
                  <td className="px-4 py-3 text-[oklch(0.50_0.03_264)]">
                    {j.employmentType}
                  </td>
                  <td className="px-4 py-3 text-[oklch(0.50_0.03_264)]">
                    {j.location ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/jobs/${j.id}/applicants`}
                      className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline"
                    >
                      Applicants
                    </Link>
                    <Link
                      href={`/jobs/${j.id}/edit`}
                      className="font-medium text-[oklch(0.32_0.07_264)] hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
