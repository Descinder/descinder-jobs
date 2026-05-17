"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Verified GET /api/admin/metrics shape (lib/server/services/admin.ts#adminMetrics):
// { signups, nativeJobs, ingestedJobs, applications, activeSubs } — five counts.
// The screen-map (§6) promised revenue / acquisition / ingestion-health tiles;
// the built backend is leaner and exposes only these five. We render exactly
// what exists (§9d reconcile).
type Metrics = {
  signups: number;
  nativeJobs: number;
  ingestedJobs: number;
  applications: number;
  activeSubs: number;
};

const TILES: { key: keyof Metrics; label: string }[] = [
  { key: "signups", label: "Signups" },
  { key: "nativeJobs", label: "Native jobs" },
  { key: "ingestedJobs", label: "Ingested jobs" },
  { key: "applications", label: "Applications" },
  { key: "activeSubs", label: "Active subscriptions" },
];

export default function AdminDashboardPage() {
  const [m, setM] = useState<Metrics | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");

  function load() {
    setSt("loading");
    apiGet<Metrics>("/api/admin/metrics")
      .then((x) => {
        setM(x);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }
  useEffect(load, []);

  if (st === "loading") return <Loading />;
  if (st === "error" || !m)
    return <ErrorState message="Couldn't load admin metrics." onRetry={load} />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Admin dashboard
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map((t) => (
          <div
            key={t.key}
            className="rounded-xl border border-[oklch(0.90_0.02_264)] bg-white px-5 py-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
              {t.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
              {m[t.key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
