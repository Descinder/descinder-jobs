"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/jobs (lib/server/services/admin.ts#adminListJobs):
//   envelope { jobs: toAdminJob[] }, query ?source & ?status.
// toAdminJob → { id,title,source,status,featured,companyId,sourceCompanyName,
//                createdAt }.
// Mutations (CSRF + requireRole server-side):
//   POST  /api/admin/jobs/:id/unpublish   no body (sets status "closed")
//   POST  /api/admin/jobs/:id/delete      no body
//   PATCH /api/admin/jobs/:id/featured    body jobFeaturedSchema { featured, until? }
type AdminJob = {
  id: string;
  title: string;
  source: string;
  status: string;
  featured: boolean;
  companyId: string | null;
  sourceCompanyName: string | null;
  createdAt: string;
};

export default function AdminJobsPage() {
  const [rows, setRows] = useState<AdminJob[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setSt("loading");
    const p = new URLSearchParams();
    if (source) p.set("source", source);
    if (status) p.set("status", status);
    apiGet<{ jobs: AdminJob[] }>(
      `/api/admin/jobs${p.toString() ? `?${p}` : ""}`,
    )
      .then((r) => {
        setRows(r.jobs);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, [source, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(
    fn: () => Promise<unknown>,
    id: string,
    okMsg: string,
  ) {
    setBusy(id);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
      load();
    } catch (e) {
      setMsg(
        e instanceof ApiError ? e.message : "Action failed. Please retry.",
      );
    } finally {
      setBusy(null);
    }
  }

  function unpublish(j: AdminJob) {
    run(
      () => apiSend("POST", `/api/admin/jobs/${j.id}/unpublish`),
      j.id,
      "Job unpublished.",
    );
  }
  function del(j: AdminJob) {
    if (!window.confirm(`Delete "${j.title}"? This is irreversible.`)) return;
    run(
      () => apiSend("POST", `/api/admin/jobs/${j.id}/delete`),
      j.id,
      "Job deleted.",
    );
  }
  function toggleFeatured(j: AdminJob) {
    // jobFeaturedSchema { featured:boolean, until?:string(datetime) }. We send
    // only `featured` (the `until` window is optional and omitted here).
    run(
      () =>
        apiSend("PATCH", `/api/admin/jobs/${j.id}/featured`, {
          featured: !j.featured,
        }),
      j.id,
      j.featured ? "Job un-featured." : "Job featured.",
    );
  }

  const columns: Column<AdminJob>[] = [
    {
      key: "title",
      header: "Title",
      cell: (j) => (
        <span className="font-medium text-[oklch(0.22_0.08_264)]">
          {j.title}
        </span>
      ),
    },
    { key: "source", header: "Source", cell: (j) => j.source },
    { key: "status", header: "Status", cell: (j) => j.status },
    {
      key: "featured",
      header: "Featured",
      cell: (j) => (j.featured ? "Yes" : "No"),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (j) => (
        <span className="whitespace-nowrap">
          <button
            disabled={busy === j.id}
            onClick={() => toggleFeatured(j)}
            className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
          >
            {j.featured ? "Un-feature" : "Feature"}
          </button>
          <button
            disabled={busy === j.id}
            onClick={() => unpublish(j)}
            className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
          >
            Unpublish
          </button>
          <button
            disabled={busy === j.id}
            onClick={() => del(j)}
            className="font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Jobs
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          <option value="native">Native</option>
          <option value="adzuna">Adzuna</option>
          <option value="reed">Reed</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>
      {msg && (
        <p className="mb-3 text-sm text-[oklch(0.36_0.04_264)]">{msg}</p>
      )}
      <AdminTable
        columns={columns}
        rows={rows}
        loading={st === "loading"}
        error={st === "error" ? "Couldn't load jobs." : null}
        empty="No jobs match."
        onRetry={load}
      />
    </div>
  );
}
