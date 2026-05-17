"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/approvals (lib/server/services/admin.ts#adminListApprovals):
//   envelope { users: toAdminUser[], companies: toAdminCompany[] }
//   (both already-mapped DTOs, filtered to approval_status='pending').
// Mutation (CSRF + requireRole server-side):
//   PATCH /api/admin/approvals/:id  body approvalDecisionSchema
//     { decision:'approve'|'reject', reason?:string }  → { decision }
//   ONE endpoint — the id may be a pending user OR company; the server tries
//   user-approval then company-approval (the 2d-i M3 single-endpoint fix).
//   NOT ?type= + /approve + /reject.
type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};
type AdminCompany = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export default function AdminApprovalsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setSt("loading");
    apiGet<{ users: AdminUser[]; companies: AdminCompany[] }>(
      "/api/admin/approvals",
    )
      .then((r) => {
        setUsers(r.users);
        setCompanies(r.companies);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(
    id: string,
    decision: "approve" | "reject",
    reason?: string,
  ) {
    setBusy(id);
    setMsg(null);
    try {
      // approvalDecisionSchema { decision, reason? } — omit reason when blank
      // so the optional string isn't sent as "".
      const body: { decision: "approve" | "reject"; reason?: string } = {
        decision,
      };
      if (reason && reason.trim()) body.reason = reason.trim();
      await apiSend("PATCH", `/api/admin/approvals/${id}`, body);
      setMsg(decision === "approve" ? "Approved." : "Rejected.");
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Action failed. Please retry.");
    } finally {
      setBusy(null);
    }
  }

  function approve(id: string) {
    decide(id, "approve");
  }
  function reject(id: string) {
    const reason = window.prompt("Reason for rejection (optional):") ?? "";
    decide(id, "reject", reason);
  }

  const actionCell = (id: string) => (
    <span className="whitespace-nowrap">
      <button
        disabled={busy === id}
        onClick={() => approve(id)}
        className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={busy === id}
        onClick={() => reject(id)}
        className="font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        Reject
      </button>
    </span>
  );

  const userCols: Column<AdminUser>[] = [
    {
      key: "email",
      header: "Email",
      cell: (u) => (
        <span className="font-medium text-[oklch(0.22_0.08_264)]">
          {u.email}
        </span>
      ),
    },
    { key: "name", header: "Name", cell: (u) => u.name ?? "—" },
    { key: "role", header: "Role", cell: (u) => u.role },
    {
      key: "created",
      header: "Joined",
      cell: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (u) => actionCell(u.id),
    },
  ];

  const companyCols: Column<AdminCompany>[] = [
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
      key: "created",
      header: "Created",
      cell: (c) => new Date(c.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (c) => actionCell(c.id),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Approvals
      </h1>
      {msg && (
        <p className="mb-3 text-sm text-[oklch(0.36_0.04_264)]">{msg}</p>
      )}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
        Pending users
      </h2>
      <div className="mb-8">
        <AdminTable
          columns={userCols}
          rows={users}
          loading={st === "loading"}
          error={st === "error" ? "Couldn't load approvals." : null}
          empty="No pending users."
          onRetry={load}
        />
      </div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
        Pending companies
      </h2>
      <AdminTable
        columns={companyCols}
        rows={companies}
        loading={st === "loading"}
        error={st === "error" ? "Couldn't load approvals." : null}
        empty="No pending companies."
        onRetry={load}
      />
    </div>
  );
}
