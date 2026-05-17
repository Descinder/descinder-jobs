"use client";
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import type { JobsResponse } from "@/lib/client/types";
import { JobCard } from "@/components/jobs/job-card";
import { JobFilters, type JobFilterValues } from "@/components/jobs/job-filters";
import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

function qs(v: Partial<JobFilterValues>, page: number) {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries(v)) if (val) p.set(k, String(val));
  p.set("page", String(page));
  p.set("page_size", "20");
  return p.toString();
}

export default function HomePage() {
  const [filters, setFilters] = useState<JobFilterValues | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobsResponse | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiGet<JobsResponse>(`/api/jobs?${qs(filters ?? {}, page)}`);
      setData(res);
      // saved-jobs/ids returns { jobIds } and is 200 for anon ({jobIds:[]}).
      try {
        const ids = await apiGet<{ jobIds: string[] }>("/api/me/saved-jobs/ids");
        setSaved(new Set(ids.jobIds));
      } catch { /* defensive: treat as no saved ids */ }
      setStatus("ok");
    } catch { setStatus("error"); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  async function toggleSave(id: string, next: boolean) {
    setSaved((p) => { const n = new Set(p); next ? n.add(id) : n.delete(id); return n; });
    try {
      await apiSend(next ? "POST" : "DELETE", `/api/jobs/${id}/save`);
    } catch (e) {
      setSaved((p) => { const n = new Set(p); next ? n.delete(id) : n.add(id); return n; }); // revert
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">Tech jobs in the UK, US, AU &amp; CA</h1>
        <p className="text-sm text-[oklch(0.50_0.03_264)]">{data ? `${data.total} roles` : "Loading roles…"}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <aside><JobFilters onApply={(v) => { setPage(1); setFilters(v); }} /></aside>
        <section className="flex flex-col gap-3">
          {status === "loading" && <Loading label="Loading roles…" />}
          {status === "error" && <ErrorState message="Couldn't load jobs." onRetry={load} />}
          {status === "ok" && data && data.jobs.length === 0 && <EmptyState title="No roles match those filters" hint="Try widening your search." />}
          {status === "ok" && data && data.jobs.map((j) => (
            <JobCard key={j.id} job={j} saved={saved.has(j.id)} onToggleSave={toggleSave} />
          ))}
          {status === "ok" && data && data.total > data.page_size && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span className="text-[oklch(0.50_0.03_264)]">Page {data.page}</span>
              <button disabled={page * data.page_size >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
