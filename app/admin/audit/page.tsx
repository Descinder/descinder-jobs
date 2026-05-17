"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { AdminTable, type Column } from "@/components/admin/admin-table";

// Verified GET /api/admin/audit-log (lib/server/services/admin.ts#adminAuditLog):
//   envelope { entries: toAuditEntry[] }, query params:
//     ?action  → exact action match
//     ?actor   → actor_id
//     ?target  → target_id
//   toAuditEntry → { id,actorId,actorType,action,targetType,targetId,
//                     metadata,createdAt }. Read-only.
type AuditEntry = {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [target, setTarget] = useState("");

  const load = useCallback(() => {
    setSt("loading");
    const p = new URLSearchParams();
    if (action.trim()) p.set("action", action.trim());
    if (actor.trim()) p.set("actor", actor.trim());
    if (target.trim()) p.set("target", target.trim());
    apiGet<{ entries: AuditEntry[] }>(
      `/api/admin/audit-log${p.toString() ? `?${p}` : ""}`,
    )
      .then((r) => {
        setRows(r.entries);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, [action, actor, target]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<AuditEntry>[] = [
    {
      key: "time",
      header: "Time",
      cell: (e) => new Date(e.createdAt).toLocaleString(),
    },
    {
      key: "actor",
      header: "Actor",
      cell: (e) => (
        <span>
          <span className="font-medium text-[oklch(0.22_0.08_264)]">
            {e.actorType}
          </span>
          {e.actorId ? (
            <span className="ml-1 text-[oklch(0.50_0.03_264)]">
              {e.actorId.slice(0, 8)}…
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (e) => (
        <span className="font-medium text-[oklch(0.22_0.08_264)]">
          {e.action}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target",
      cell: (e) =>
        e.targetType
          ? `${e.targetType}${e.targetId ? ` ${e.targetId.slice(0, 8)}…` : ""}`
          : "—",
    },
    {
      key: "metadata",
      header: "Metadata",
      cell: (e) => (
        // Rendered as plain text (JSON.stringify) — never dangerouslySetInnerHTML;
        // metadata is attacker-influenced (report reasons, suspension notes).
        <span className="text-[oklch(0.50_0.03_264)]">
          {e.metadata ? JSON.stringify(e.metadata) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Audit log
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <input
          type="text"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Action (e.g. settings.update)"
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Actor id"
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target id"
          className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white"
        >
          Filter
        </button>
      </form>
      <AdminTable
        columns={columns}
        rows={rows}
        loading={st === "loading"}
        error={st === "error" ? "Couldn't load the audit log." : null}
        empty="No audit entries match."
        onRetry={load}
      />
    </div>
  );
}
