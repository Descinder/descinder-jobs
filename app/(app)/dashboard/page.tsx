"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client/api";
import type { JobListItem } from "@/lib/client/types";
import { JobCard } from "@/components/jobs/job-card";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Verified GET /api/me/dashboard shape (lib/server/services/profile.ts#myDashboard):
// { name, role, matchedJobs, subscription:{status,plan_key,current_period_end}|null,
//   canApplyNative }. No applications[]/alerts[]/ai_cv_recent[] (screen-map §9
//   reconcile: applications live on their own page; alerts are a future plan).
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
      <Link
        href="/applications"
        className="mt-6 inline-block text-sm font-medium text-[oklch(0.32_0.07_264)] hover:underline"
      >
        My applications →
      </Link>
    </main>
  );
}
