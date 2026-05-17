"use client";

import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

// Generic admin table primitive — reused by users/companies/jobs (and later
// reports/audit). Rows are pre-mapped DTOs (admin-dto.ts); every cell renders
// its content as React text/children (no dangerouslySetInnerHTML) so emails /
// report descriptions / metadata are never an XSS vector.
export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
};

export function AdminTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  empty,
  onRetry,
}: {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  error: string | null;
  empty: string;
  onRetry?: () => void;
}) {
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[oklch(0.90_0.02_264)] text-left text-xs uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[oklch(0.94_0.01_264)] last:border-0"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-4 py-3 text-[oklch(0.36_0.04_264)] ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
