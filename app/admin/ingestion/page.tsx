"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/ingestion-runs (lib/server/repos/ingestion.ts#listRuns):
//   envelope { runs: [...] } — rows are RAW snake_case (no DTO mapper):
//   { id, source, country, category_filter, started_at, finished_at,
//     jobs_inserted, jobs_updated, jobs_expired, success, error_message }.
// Mutation (CSRF + requireRole server-side):
//   POST /api/admin/ingestion/run  body ingestRunSchema
//     { source:'adzuna'|'reed', country:'GB'|'US'|'AU'|'CA' }
//     refine: reed ⇒ country must be GB. → result, 202.
//   If the source's API keys aren't configured (CI), the server returns
//   CONFLICT — surface that message instead of failing hard.
type Run = {
  id: string;
  source: string;
  country: string;
  category_filter: string | null;
  started_at: string | null;
  finished_at: string | null;
  jobs_inserted: number | null;
  jobs_updated: number | null;
  jobs_expired: number | null;
  success: boolean | null;
  error_message: string | null;
};

const COUNTRIES = ["GB", "US", "AU", "CA"] as const;

export default function AdminIngestionPage() {
  const [rows, setRows] = useState<Run[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [source, setSource] = useState<"adzuna" | "reed">("adzuna");
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>("GB");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setSt("loading");
    apiGet<{ runs: Run[] }>("/api/admin/ingestion-runs")
      .then((r) => {
        setRows(r.runs);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reed only supports GB (server refine mirrors this). Disable invalid combo
  // client-side so the user can't even submit it.
  const reedInvalid = source === "reed" && country !== "GB";

  async function runNow(e: React.FormEvent) {
    e.preventDefault();
    if (reedInvalid) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiSend<{ inserted?: number; updated?: number }>(
        "POST",
        "/api/admin/ingestion/run",
        { source, country },
      );
      setMsg(
        `Ingestion run started${
          typeof r?.inserted === "number"
            ? ` (${r.inserted} inserted, ${r.updated ?? 0} updated)`
            : ""
        }.`,
      );
      load();
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        // CI / unconfigured environment — graceful, not a hard failure.
        setMsg(`Cannot run: ${err.message}`);
      } else {
        setMsg(
          err instanceof ApiError
            ? err.message
            : "Couldn't start the run. Please retry.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<Run>[] = [
    {
      key: "source",
      header: "Source",
      cell: (r) => (
        <span className="font-medium text-[oklch(0.22_0.08_264)]">
          {r.source}
        </span>
      ),
    },
    { key: "country", header: "Country", cell: (r) => r.country },
    {
      key: "started",
      header: "Started",
      cell: (r) =>
        r.started_at ? new Date(r.started_at).toLocaleString() : "—",
    },
    {
      key: "result",
      header: "Result",
      cell: (r) =>
        r.success === null
          ? "running…"
          : r.success
            ? `+${r.jobs_inserted ?? 0} / ~${r.jobs_updated ?? 0} / -${r.jobs_expired ?? 0}`
            : "failed",
    },
    {
      key: "error",
      header: "Error",
      cell: (r) => (
        <span className="text-[oklch(0.50_0.03_264)]">
          {r.error_message ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Ingestion
      </h1>
      <form onSubmit={runNow} className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as "adzuna" | "reed")}
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        >
          <option value="adzuna">Adzuna</option>
          <option value="reed">Reed</option>
        </select>
        <select
          value={country}
          onChange={(e) =>
            setCountry(e.target.value as (typeof COUNTRIES)[number])
          }
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || reedInvalid}
          className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Run now"}
        </button>
        {reedInvalid && (
          <span className="text-sm text-red-600">Reed only supports GB.</span>
        )}
      </form>
      {msg && (
        <p className="mb-3 text-sm text-[oklch(0.36_0.04_264)]">{msg}</p>
      )}
      <AdminTable
        columns={columns}
        rows={rows}
        loading={st === "loading"}
        error={st === "error" ? "Couldn't load ingestion runs." : null}
        empty="No ingestion runs yet."
        onRetry={load}
      />
    </div>
  );
}
