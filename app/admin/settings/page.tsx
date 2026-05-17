"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { SETTING_TYPES } from "@/lib/shared/schemas/admin";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Verified GET /api/admin/settings (lib/server/services/admin.ts#adminGetSettings):
//   envelope { settings: toSettingItem[] } — each { key, value, updatedAt }.
//   Values are JSONB → arrive as REAL booleans / numbers (seed 00001/00009).
// Mutation (CSRF + requireRole server-side):
//   PATCH /api/admin/settings  body settingPatchSchema
//     { key: <SETTING_TYPES key>, value: boolean | number }
//   superRefine: typeof value MUST equal SETTING_TYPES[key]
//     — sending a STRING for a boolean/number key 422s (the 2d-i H1
//       hardening). So boolean keys send a real `true/false`; number keys
//       send a real `Number(...)` — never the raw input string.
// We render ONLY the allow-listed keys (unknown rows from the table are
// ignored; missing keys still render with a typed default control).
type SettingItem = { key: string; value: unknown; updatedAt: string };

const KEYS = Object.keys(SETTING_TYPES) as (keyof typeof SETTING_TYPES)[];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setSt("loading");
    apiGet<{ settings: SettingItem[] }>("/api/admin/settings")
      .then((r) => {
        const byKey: Record<string, unknown> = {};
        for (const s of r.settings) byKey[s.key] = s.value;
        setValues(byKey);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: keyof typeof SETTING_TYPES, value: boolean | number) {
    // Optimistic local set so the control reflects the change immediately.
    setValues((v) => ({ ...v, [key]: value }));
    setBusy(key);
    setMsg(null);
    try {
      // value is already the correct JS primitive (boolean | number) — never
      // a string. settingPatchSchema's superRefine enforces typeof===expected.
      await apiSend("PATCH", "/api/admin/settings", { key, value });
      setMsg(`Saved "${key}".`);
      load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Save failed. Please retry.");
      load(); // re-sync from the server on failure (revert optimistic value)
    } finally {
      setBusy(null);
    }
  }

  if (st === "loading") {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
          Settings
        </h1>
        <Loading />
      </div>
    );
  }
  if (st === "error") {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
          Settings
        </h1>
        <ErrorState message="Couldn't load settings." onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Settings
      </h1>
      {msg && (
        <p className="mb-3 text-sm text-[oklch(0.36_0.04_264)]">{msg}</p>
      )}
      <div className="overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[oklch(0.90_0.02_264)] text-left text-xs uppercase tracking-wide text-[oklch(0.50_0.03_264)]">
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((key) => {
              const type = SETTING_TYPES[key];
              const raw = values[key];
              return (
                <tr
                  key={key}
                  className="border-b border-[oklch(0.94_0.01_264)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-[oklch(0.22_0.08_264)]">
                    {key}
                  </td>
                  <td className="px-4 py-3 text-[oklch(0.50_0.03_264)]">
                    {type}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {type === "boolean" ? (
                      <button
                        type="button"
                        disabled={busy === key}
                        onClick={() => save(key, !(raw === true))}
                        aria-pressed={raw === true}
                        className={`inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                          raw === true
                            ? "bg-[oklch(0.22_0.08_264)]"
                            : "bg-[oklch(0.85_0.02_264)]"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            raw === true
                              ? "translate-x-[22px]"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    ) : (
                      <NumberCell
                        initial={typeof raw === "number" ? raw : 0}
                        disabled={busy === key}
                        onSave={(n) => save(key, n)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumberCell({
  initial,
  disabled,
  onSave,
}: {
  initial: number;
  disabled: boolean;
  onSave: (n: number) => void;
}) {
  const [v, setV] = useState(String(initial));
  return (
    <span className="flex items-center justify-end gap-2 whitespace-nowrap">
      <input
        type="number"
        step="any"
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
        className="w-28 rounded-lg border border-[oklch(0.90_0.02_264)] px-2 py-1.5 text-right text-sm disabled:opacity-50"
      />
      <button
        type="button"
        disabled={disabled || v.trim() === "" || Number.isNaN(Number(v))}
        // Coerce to a REAL number before sending — settingPatchSchema rejects
        // a string for a number key (the H1 type guard).
        onClick={() => onSave(Number(v))}
        className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Save
      </button>
    </span>
  );
}
