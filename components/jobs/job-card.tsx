"use client";
import Link from "next/link";
import type { JobListItem } from "@/lib/client/types";

function monogram(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "—";
}
function salary(j: JobListItem) {
  if (j.salaryMin == null && j.salaryMax == null) return null;
  const fmt = (n: number) => `${j.salaryCurrency} ${n.toLocaleString()}`;
  const range = j.salaryMin != null && j.salaryMax != null ? `${fmt(j.salaryMin)} – ${fmt(j.salaryMax)}`
    : fmt((j.salaryMin ?? j.salaryMax)!);
  return j.salaryEstimated ? `Est. ${range}` : range;
}

export function JobCard({ job, saved, onToggleSave }: {
  job: JobListItem; saved: boolean; onToggleSave: (id: string, next: boolean) => void;
}) {
  const s = salary(job);
  return (
    <div className="group flex gap-4 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-4 transition-all duration-150 hover:-translate-y-px hover:border-[oklch(0.32_0.07_264)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.22_0.08_264)] font-mono text-xs font-semibold text-white">
        {job.company.logoUrl ? <img src={job.company.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : monogram(job.company.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/jobs/${job.id}`} className="text-[17px] font-semibold tracking-tight text-[oklch(0.22_0.08_264)] hover:underline">{job.title}</Link>
          <button
            aria-label={saved ? "Unsave" : "Save"}
            onClick={() => onToggleSave(job.id, !saved)}
            className={saved ? "text-[oklch(0.72_0.18_75)]" : "text-[oklch(0.66_0.02_264)] hover:text-[oklch(0.22_0.08_264)]"}
          >{saved ? "★" : "☆"}</button>
        </div>
        <p className="text-sm text-[oklch(0.50_0.03_264)]">
          {job.company.name}{job.location ? ` · ${job.location}` : ""}{job.country ? ` · ${job.country}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[oklch(0.50_0.03_264)]">
          {s && <span className="font-mono">{s}</span>}
          {job.workMode && <span className="rounded bg-[oklch(0.97_0.01_264)] px-2 py-0.5">{job.workMode}</span>}
          {job.experienceLevel && <span className="rounded bg-[oklch(0.97_0.01_264)] px-2 py-0.5">{job.experienceLevel}</span>}
          <span className="rounded bg-[oklch(0.97_0.01_264)] px-2 py-0.5">{job.employmentType}</span>
        </div>
        {job.sourceAttribution && <p className="mt-2 text-[11px] text-[oklch(0.66_0.02_264)]">{job.sourceAttribution}</p>}
      </div>
    </div>
  );
}
