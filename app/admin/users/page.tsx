"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/users (lib/server/services/admin.ts#adminListUsers):
//   envelope { users: toAdminUser[] }, query ?q & ?role.
// toAdminUser → { id,email,name,role,suspended,deleted,approvalStatus,createdAt,
//                 acquisitionSource }.
// Mutations (all POST, CSRF + requireRole server-side):
//   /api/admin/users/:id/suspend       body adminReasonSchema { reason? }
//   /api/admin/users/:id/unsuspend     no body
//   /api/admin/users/:id/force-delete  no body (409 on admin self-delete)
type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  suspended: boolean;
  deleted: boolean;
  approvalStatus: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setSt("loading");
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (role) p.set("role", role);
    apiGet<{ users: AdminUser[] }>(
      `/api/admin/users${p.toString() ? `?${p}` : ""}`,
    )
      .then((r) => {
        setRows(r.users);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, [q, role]);

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
      load(); // optimistic refresh
    } catch (e) {
      setMsg(
        e instanceof ApiError ? e.message : "Action failed. Please retry.",
      );
    } finally {
      setBusy(null);
    }
  }

  function suspend(u: AdminUser) {
    const reason = window.prompt("Reason for suspension (optional):") ?? "";
    const body = reason.trim() ? { reason: reason.trim() } : {};
    act(`/api/admin/users/${u.id}/suspend`, body, u.id, "User suspended.");
  }
  function unsuspend(u: AdminUser) {
    act(
      `/api/admin/users/${u.id}/unsuspend`,
      undefined,
      u.id,
      "User unsuspended.",
    );
  }
  function forceDelete(u: AdminUser) {
    if (
      !window.confirm(
        `Force-delete ${u.email}? This is irreversible.`,
      )
    )
      return;
    act(
      `/api/admin/users/${u.id}/force-delete`,
      undefined,
      u.id,
      "User force-deleted.",
    );
  }

  const columns: Column<AdminUser>[] = [
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
      key: "status",
      header: "Status",
      cell: (u) =>
        u.deleted
          ? "Deleted"
          : u.suspended
            ? "Suspended"
            : u.approvalStatus,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (u) => (
        <span className="whitespace-nowrap">
          {u.suspended ? (
            <button
              disabled={busy === u.id}
              onClick={() => unsuspend(u)}
              className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
            >
              Unsuspend
            </button>
          ) : (
            <button
              disabled={busy === u.id}
              onClick={() => suspend(u)}
              className="mr-3 font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-50"
            >
              Suspend
            </button>
          )}
          <button
            disabled={busy === u.id}
            onClick={() => forceDelete(u)}
            className="font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            Force-delete
          </button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Users
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
          placeholder="Search email or name…"
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="job_seeker">Job seeker</option>
          <option value="employer">Employer</option>
          <option value="admin">Admin</option>
        </select>
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
        error={st === "error" ? "Couldn't load users." : null}
        empty="No users match."
        onRetry={load}
      />
    </div>
  );
}
