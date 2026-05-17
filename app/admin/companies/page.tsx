"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/companies (lib/server/services/admin.ts#adminListCompanies):
//   envelope { companies: toAdminCompany[] }, query ?q only (NO ?role/?status).
// toAdminCompany → { id,name,slug,suspended,approvalStatus,createdAt }.
// Mutations (all POST, CSRF + requireRole server-side):
//   /api/admin/companies/:id/suspend    body adminReasonSchema { reason? }
//   /api/admin/companies/:id/unsuspend  no body
//   /api/admin/companies/:id/delete     no body (cascades the company's jobs)
type AdminCompany = {
  id: string;
  name: string;
  slug: string;
  suspended: boolean;
  approvalStatus: string;
  createdAt: string;
};

export default function AdminCompaniesPage() {
  const [rows, setRows] = useState<AdminCompany[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setSt("loading");
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    apiGet<{ companies: AdminCompany[] }>(
      `/api/admin/companies${p.toString() ? `?${p}` : ""}`,
    )
      .then((r) => {
        setRows(r.companies);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(
    path: string,
    body: unknown,
    id: string,
    okMsg: string,
  ) {
    setBusy(id);
    setMsg(null);
    try {
      await apiSend("POST", path, body);
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

  function suspend(c: AdminCompany) {
    const reason = window.prompt("Reason for suspension (optional):") ?? "";
    const body = reason.trim() ? { reason: reason.trim() } : {};
    act(
      `/api/admin/companies/${c.id}/suspend`,
      body,
      c.id,
      "Company suspended.",
    );
  }
  function unsuspend(c: AdminCompany) {
    act(
      `/api/admin/companies/${c.id}/unsuspend`,
      undefined,
      c.id,
      "Company unsuspended.",
    );
  }
  function del(c: AdminCompany) {
    if (
      !window.confirm(
        `Delete ${c.name}? This cascades and removes all of its jobs.`,
      )
    )
      return;
    act(
      `/api/admin/companies/${c.id}/delete`,
      undefined,
      c.id,
      "Company deleted.",
    );
  }

  const columns: Column<AdminCompany>[] = [
    {
      key: "name",
      header: "Name",
      cell: (c) => (
        <span className="font-medium text-[oklch(0.22_0.08_264)]">
          {c.name}
        </span>
      ),
    },
    { key: "slug", header: "Slug", cell: (c) => c.slug },
    {
      key: "status",
      header: "Status",
      cell: (c) => (c.suspended ? "Suspended" : c.approvalStatus),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (c) => (
        <span className="whitespace-nowrap">
          {c.suspended ? (
            <button
              disabled={busy === c.id}
              onClick={() => unsuspend(c)}
              className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
            >
              Unsuspend
            </button>
          ) : (
            <button
              disabled={busy === c.id}
              onClick={() => suspend(c)}
              className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
            >
              Suspend
            </button>
          )}
          <button
            disabled={busy === c.id}
            onClick={() => del(c)}
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
        Companies
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company name…"
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>
      {msg && (
        <p className="mb-3 text-sm text-[oklch(0.36_0.04_264)]">{msg}</p>
      )}
      <AdminTable
        columns={columns}
        rows={rows}
        loading={st === "loading"}
        error={st === "error" ? "Couldn't load companies." : null}
        empty="No companies match."
        onRetry={load}
      />
    </div>
  );
}
