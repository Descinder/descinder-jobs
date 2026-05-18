"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

// Verified GET /api/me/alerts (lib/server/services/alerts.ts#listMyAlertsDTO):
//   { alerts: AlertDTO[] }
// AlertDTO (lib/shared/alerts-dto.ts#toAlertDTO) =
//   { id, name, filters, frequency, isPremium, createdAt }  (no user_id/last_run_at)
type Freq = "instant" | "daily" | "weekly";
type AlertDTO = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  frequency: Freq;
  isPremium: boolean;
  createdAt: string;
};
type ListResp = { alerts: AlertDTO[] };
type MutResp = { alert: AlertDTO; downgraded: boolean };

const WORK_MODE = ["remote", "hybrid", "on_site"] as const;
const EMP_TYPE = ["full_time", "part_time", "contract", "internship"] as const;
const EXP_LEVEL = ["entry", "mid", "senior", "lead"] as const;
const SOURCE = ["native", "adzuna", "reed"] as const;

type FormState = {
  name: string;
  frequency: Freq;
  q: string;
  country: string;
  work_mode: string;
  employment_type: string;
  experience_level: string;
  source: string;
  salary_min: string;
  salary_max: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  frequency: "daily",
  q: "",
  country: "",
  work_mode: "",
  employment_type: "",
  experience_level: "",
  source: "",
  salary_min: "",
  salary_max: "",
};

function formFromAlert(a: AlertDTO): FormState {
  const f = a.filters as Record<string, unknown>;
  const s = (k: string) => (f[k] == null ? "" : String(f[k]));
  return {
    name: a.name,
    frequency: a.frequency,
    q: s("q"),
    country: s("country"),
    work_mode: s("work_mode"),
    employment_type: s("employment_type"),
    experience_level: s("experience_level"),
    source: s("source"),
    salary_min: s("salary_min"),
    salary_max: s("salary_max"),
  };
}

// Build the request body. Empty strings are OMITTED (alertFiltersSchema is
// .strict() — an empty enum/"" fails validation; an absent optional is fine).
function toPayload(fs: FormState): {
  name: string;
  frequency: Freq;
  filters: Record<string, unknown>;
} {
  const filters: Record<string, unknown> = {};
  if (fs.q.trim()) filters.q = fs.q.trim();
  if (fs.country.trim()) filters.country = fs.country.trim();
  if (fs.work_mode) filters.work_mode = fs.work_mode;
  if (fs.employment_type) filters.employment_type = fs.employment_type;
  if (fs.experience_level) filters.experience_level = fs.experience_level;
  if (fs.source) filters.source = fs.source;
  if (fs.salary_min.trim()) filters.salary_min = Number(fs.salary_min);
  if (fs.salary_max.trim()) filters.salary_max = Number(fs.salary_max);
  return { name: fs.name.trim(), frequency: fs.frequency, filters };
}

function filterSummary(f: Record<string, unknown>): string {
  const parts: string[] = [];
  if (f.q) parts.push(`“${String(f.q)}”`);
  if (f.work_mode) parts.push(String(f.work_mode).replace("_", " "));
  if (f.employment_type) parts.push(String(f.employment_type).replace("_", " "));
  if (f.experience_level) parts.push(String(f.experience_level));
  if (f.country) parts.push(String(f.country));
  if (f.source) parts.push(String(f.source));
  // `!= null` not truthiness: a stored salary_min/max of 0 is a real filter
  // ("≥ 0") and must NOT be hidden as if unset (server-state honesty).
  if (f.salary_min != null && f.salary_min !== "") parts.push(`≥ ${String(f.salary_min)}`);
  if (f.salary_max != null && f.salary_max !== "") parts.push(`≤ ${String(f.salary_max)}`);
  return parts.length ? parts.join(" · ") : "All jobs";
}

const inputCls =
  "w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm";
const labelCls =
  "block text-xs font-medium text-[oklch(0.50_0.03_264)] mb-1";

export default function AlertsPage() {
  const [list, setList] = useState<AlertDTO[] | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const x = await apiGet<ListResp>("/api/me/alerts");
    setList(x.alerts);
    setSt("ok");
  }, []);

  useEffect(() => {
    reload().catch(() => setSt("error"));
  }, [reload]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(a: AlertDTO) {
    setEditId(a.id);
    setForm(formFromAlert(a));
    setActionError(null);
    setNotice(null);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setActionError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setNotice(null);
    if (!form.name.trim()) {
      setActionError("Give your alert a name.");
      return;
    }
    // Client-side guards so the user gets a FIELD-SPECIFIC message instead of
    // the server's generic "Validation failed" (the API is still the
    // authority — this only improves the message, never bypasses it).
    if (form.country.trim() && !/^[A-Za-z]{2}$/.test(form.country.trim())) {
      setActionError("Country must be a 2-letter code (e.g. GB).");
      return;
    }
    for (const [k, label] of [
      ["salary_min", "Salary min"] as const,
      ["salary_max", "Salary max"] as const,
    ]) {
      const raw = form[k].trim();
      if (raw && (!Number.isInteger(Number(raw)) || Number(raw) < 0)) {
        setActionError(`${label} must be a whole number of 0 or more.`);
        return;
      }
    }
    if (
      form.salary_min.trim() &&
      form.salary_max.trim() &&
      Number(form.salary_min) > Number(form.salary_max)
    ) {
      setActionError("Salary min can't be greater than salary max.");
      return;
    }
    setSaving(true);
    try {
      const body = toPayload(form);
      const r = editId
        ? await apiSend<MutResp>("PATCH", `/api/me/alerts/${editId}`, body)
        : await apiSend<MutResp>("POST", "/api/me/alerts", body);
      if (r.downgraded) {
        setNotice(
          "Instant alerts require a subscription — this alert was saved as Daily.",
        );
      }
      setEditId(null);
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not save the alert.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setActionError(null);
    setNotice(null);
    setDeletingId(id);
    try {
      await apiSend<{ deleted: true }>("DELETE", `/api/me/alerts/${id}`);
      if (editId === id) cancelEdit();
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not delete the alert.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "error" || !list)
    return (
      <ErrorState
        message="Couldn't load your alerts."
        onRetry={() => reload().catch(() => setSt("error"))}
      />
    );

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
        Job alerts
      </h1>
      <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
        We email you new roles that match. Instant alerts need a subscription —
        daily &amp; weekly digests are free.
      </p>

      {notice && (
        <p
          data-testid="alert-notice"
          className="mt-4 rounded-lg border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-3 py-2 text-sm text-[oklch(0.22_0.08_264)]"
        >
          {notice}{" "}
          <Link href="/pricing" className="font-semibold underline">
            See plans
          </Link>
        </p>
      )}
      {actionError && (
        <p
          data-testid="alert-error"
          className="mt-4 rounded-lg border border-[oklch(0.80_0.06_20)] bg-[oklch(0.97_0.02_20)] px-3 py-2 text-sm text-[oklch(0.48_0.14_20)]"
        >
          {actionError}
        </p>
      )}

      <form
        onSubmit={submit}
        className="mt-6 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-[oklch(0.22_0.08_264)]">
          {editId ? "Edit alert" : "New alert"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="al-name">
              Name
            </label>
            <input
              id="al-name"
              className={inputCls}
              value={form.name}
              maxLength={120}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Remote React, senior"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="al-freq">
              Frequency
            </label>
            <select
              id="al-freq"
              className={inputCls}
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value as Freq)}
            >
              <option value="instant">Instant (subscription)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="al-q">
              Keywords
            </label>
            <input
              id="al-q"
              className={inputCls}
              value={form.q}
              maxLength={200}
              onChange={(e) => set("q", e.target.value)}
              placeholder="react typescript"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="al-wm">
              Work mode
            </label>
            <select
              id="al-wm"
              className={inputCls}
              value={form.work_mode}
              onChange={(e) => set("work_mode", e.target.value)}
            >
              <option value="">Any</option>
              {WORK_MODE.map((v) => (
                <option key={v} value={v}>
                  {v.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="al-et">
              Employment type
            </label>
            <select
              id="al-et"
              className={inputCls}
              value={form.employment_type}
              onChange={(e) => set("employment_type", e.target.value)}
            >
              <option value="">Any</option>
              {EMP_TYPE.map((v) => (
                <option key={v} value={v}>
                  {v.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="al-xp">
              Experience
            </label>
            <select
              id="al-xp"
              className={inputCls}
              value={form.experience_level}
              onChange={(e) => set("experience_level", e.target.value)}
            >
              <option value="">Any</option>
              {EXP_LEVEL.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="al-src">
              Source
            </label>
            <select
              id="al-src"
              className={inputCls}
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            >
              <option value="">Any</option>
              {SOURCE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="al-cty">
              Country (2-letter)
            </label>
            <input
              id="al-cty"
              className={inputCls}
              value={form.country}
              maxLength={2}
              onChange={(e) => set("country", e.target.value)}
              placeholder="GB"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="al-smin">
              Salary min
            </label>
            <input
              id="al-smin"
              type="number"
              min={0}
              className={inputCls}
              value={form.salary_min}
              onChange={(e) => set("salary_min", e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="al-smax">
              Salary max
            </label>
            <input
              id="al-smax"
              type="number"
              min={0}
              className={inputCls}
              value={form.salary_max}
              onChange={(e) => set("salary_max", e.target.value)}
            />
          </div>
        </div>
        {form.frequency === "instant" && (
          <p className="mt-3 text-xs text-[oklch(0.50_0.03_264)]">
            Instant alerts require an active subscription. Without one this is
            saved as a daily digest.
          </p>
        )}
        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving || deletingId !== null}
            className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : editId ? "Save changes" : "Create alert"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-[oklch(0.90_0.02_264)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="mt-8 mb-3 text-lg font-semibold text-[oklch(0.22_0.08_264)]">
        Your alerts
      </h2>
      {list.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          hint="Create one above and we'll email matching roles."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
          {list.map((a) => (
            <div
              key={a.id}
              data-testid="alert-row"
              className="flex flex-wrap items-center gap-4 border-b border-[oklch(0.93_0.01_264)] px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[oklch(0.22_0.08_264)]">
                  {a.name}
                </div>
                <div className="mt-0.5 text-xs text-[oklch(0.50_0.03_264)]">
                  <span className="font-mono uppercase">{a.frequency}</span>
                  {a.isPremium && (
                    <span className="ml-2 rounded border border-[oklch(0.84_0.03_264)] bg-[oklch(0.96_0.01_264)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[oklch(0.32_0.07_264)]">
                      Premium
                    </span>
                  )}
                  {" · "}
                  {filterSummary(a.filters)}
                </div>
              </div>
              <button
                onClick={() => startEdit(a)}
                disabled={saving || deletingId !== null}
                className="text-sm font-medium text-[oklch(0.32_0.07_264)] hover:underline disabled:opacity-60"
              >
                Edit
              </button>
              <button
                onClick={() => remove(a.id)}
                disabled={saving || deletingId === a.id}
                className="text-sm font-medium text-[oklch(0.48_0.14_20)] hover:underline disabled:opacity-60"
              >
                {deletingId === a.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
