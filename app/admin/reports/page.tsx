"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/reports (lib/server/services/admin.ts#adminListReports):
//   envelope { reports: toAdminReport[] }, query ?status (server .eq(status) —
//   default 'open' is the live queue; resolve sets reviewed|dismissed|actioned).
// toAdminReport → { id,targetType,targetId,reason,description,status,
//                   actionTaken,createdAt }.
// Mutation (CSRF + requireRole server-side):
//   PATCH /api/admin/reports/:id  body reportPatchSchema
//     { status:'reviewed'|'dismissed'|'actioned', action_taken?:string }
//     → { status }. (NOT 'open' — that is only the unresolved seed state.)
type AdminReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  actionTaken: string | null;
  createdAt: string;
};

type ResolveStatus = "reviewed" | "dismissed" | "actioned";

export default function AdminReportsPage() {
  const [rows, setRows] = useState<AdminReport[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [status, setStatus] = useState("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<
    Record<string, { status: ResolveStatus; actionTaken: string }>
  >({});

  const load = useCallback(() => {
    setSt("loading");
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    apiGet<{ reports: AdminReport[] }>(
      `/api/admin/reports${p.toString() ? `?${p}` : ""}`,
    )
      .then((r) => {
        setRows(r.reports);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  function fieldOf(id: string) {
    return form[id] ?? { status: "reviewed" as ResolveStatus, actionTaken: "" };
  }

  async function resolve(r: AdminReport) {
    const f = fieldOf(r.id);
    setBusy(r.id);
    setMsg(null);
    try {
      // reportPatchSchema: status enum + optional action_taken (omit when blank
      // so the optional string isn't sent as "").
      const body: { status: ResolveStatus; action_taken?: string } = {
        status: f.status,
      };
      const at = f.actionTaken.trim();
      if (at) body.action_taken = at;
      await apiSend("PATCH", `/api/admin/reports/${r.id}`, body);
      setMsg("Report resolved.");
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Action failed. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<AdminReport>[] = [
    {
      key: "target",
      header: "Target",
      cell: (r) => (
        <span className="font-medium text-[oklch(0.22_0.08_264)]">
          {r.targetType}
          <span className="ml-1 font-normal text-[oklch(0.50_0.03_264)]">
            {r.targetId.slice(0, 8)}…
          </span>
        </span>
      ),
    },
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    {
      key: "description",
      header: "Description",
      cell: (r) => (
        <span className="text-[oklch(0.50_0.03_264)]">
          {r.description ?? "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (r) => r.status },
    {
      key: "resolve",
      header: "Resolve",
      align: "right",
      cell: (r) => {
        const f = fieldOf(r.id);
        return (
          <span className="flex items-center justify-end gap-2 whitespace-nowrap">
            <select
              value={f.status}
              disabled={busy === r.id}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  [r.id]: {
                    ...fieldOf(r.id),
                    status: e.target.value as ResolveStatus,
                  },
                }))
              }
              className="rounded-lg border border-[oklch(0.90_0.02_264)] px-2 py-1.5 text-sm disabled:opacity-50"
            >
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="actioned">Actioned</option>
            </select>
            <input
              type="text"
              value={f.actionTaken}
              disabled={busy === r.id}
              placeholder="Action taken (optional)"
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  [r.id]: { ...fieldOf(r.id), actionTaken: e.target.value },
                }))
              }
              className="w-44 rounded-lg border border-[oklch(0.90_0.02_264)] px-2 py-1.5 text-sm disabled:opacity-50"
            />
            <button
              disabled={busy === r.id}
              onClick={() => resolve(r)}
              className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Resolve
            </button>
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Reports
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        >
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
          <option value="actioned">Actioned</option>
          <option value="">All statuses</option>
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
        error={st === "error" ? "Couldn't load reports." : null}
        empty="No reports match."
        onRetry={load}
      />
    </div>
  );
}
