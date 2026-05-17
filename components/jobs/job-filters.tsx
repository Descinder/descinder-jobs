"use client";
import { useState } from "react";

export type JobFilterValues = {
  q: string; country: string; work_mode: string; employment_type: string;
  experience_level: string; source: string; salary_min: string; salary_max: string; sort: string;
};
const EMPTY: JobFilterValues = { q: "", country: "", work_mode: "", employment_type: "", experience_level: "", source: "", salary_min: "", salary_max: "", sort: "recent" };

export function JobFilters({ onApply }: { onApply: (v: JobFilterValues) => void }) {
  const [v, setV] = useState<JobFilterValues>(EMPTY);
  const set = (k: keyof JobFilterValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form
      aria-label="Job filters"
      onSubmit={(e) => { e.preventDefault(); onApply(v); }}
      className="flex flex-col gap-4 rounded-xl border border-[oklch(0.90_0.02_264)] bg-[oklch(0.97_0.01_264)] p-4"
    >
      <input aria-label="Keyword" placeholder="Search roles…" value={v.q} onChange={set("q")}
        className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm" />
      <select aria-label="Country" value={v.country} onChange={set("country")} className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm">
        <option value="">All countries</option><option value="GB">UK</option><option value="US">US</option><option value="AU">AU</option><option value="CA">CA</option>
      </select>
      <select aria-label="Work mode" value={v.work_mode} onChange={set("work_mode")} className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm">
        <option value="">Any work mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option>
      </select>
      <select aria-label="Employment type" value={v.employment_type} onChange={set("employment_type")} className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm">
        <option value="">Any type</option><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option>
      </select>
      <select aria-label="Experience" value={v.experience_level} onChange={set("experience_level")} className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm">
        <option value="">Any level</option><option value="entry">Entry</option><option value="mid">Mid</option><option value="senior">Senior</option><option value="lead">Lead</option>
      </select>
      <select aria-label="Source" value={v.source} onChange={set("source")} className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm">
        <option value="">All sources</option><option value="native">Descinder</option><option value="adzuna">Adzuna</option><option value="reed">Reed</option>
      </select>
      <div className="flex gap-2">
        <input aria-label="Min salary" inputMode="numeric" placeholder="Min £" value={v.salary_min} onChange={set("salary_min")} className="w-1/2 rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm" />
        <input aria-label="Max salary" inputMode="numeric" placeholder="Max £" value={v.salary_max} onChange={set("salary_max")} className="w-1/2 rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm" />
      </div>
      <select aria-label="Sort" value={v.sort} onChange={set("sort")} className="rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm">
        <option value="recent">Most recent</option><option value="salary">Highest salary</option>
      </select>
      <button type="submit" className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)]">Apply filters</button>
    </form>
  );
}
