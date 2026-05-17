"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client/api";
import type { JobDetail } from "@/lib/client/types";
import { Loading, ErrorState } from "@/components/shell/screen-states";
import { JobCard } from "@/components/jobs/job-card";
import { ApplyIsland } from "./apply-island";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    apiGet<JobDetail>(`/api/jobs/${id}`)
      .then((j) => { setJob(j); setStatus("ok"); })
      .catch((e) => setStatus(e?.status === 404 ? "notfound" : "error"));
  }, [id]);

  if (status === "loading") return <Loading />;
  if (status === "notfound") return <ErrorState message="This role is no longer available." />;
  if (status === "error" || !job) return <ErrorState message="Couldn't load this role." />;

  return (
    <main className="mx-auto max-w-[920px] px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">{job.title}</h1>
      <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
        {job.company.name}{job.location ? ` · ${job.location}` : ""}
      </p>
      {job.sourceAttribution && <p className="mt-1 text-[11px] text-[oklch(0.66_0.02_264)]">{job.sourceAttribution}</p>}

      <div className="my-6"><ApplyIsland job={job} /></div>

      <article className="prose prose-sm max-w-none whitespace-pre-wrap text-[oklch(0.22_0.08_264)]">{job.description}</article>

      {job.source === "native" && job.companyProfileSlug && (
        <Link href={`/companies/${job.companyProfileSlug}`} className="mt-6 inline-block text-sm font-medium text-[oklch(0.32_0.07_264)] hover:underline">
          View {job.company.name} profile →
        </Link>
      )}
      {job.similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-[oklch(0.22_0.08_264)]">Similar roles</h2>
          <div className="flex flex-col gap-3">
            {job.similar.map((s) => <JobCard key={s.id} job={s} saved={false} onToggleSave={() => {}} />)}
          </div>
        </section>
      )}
    </main>
  );
}
