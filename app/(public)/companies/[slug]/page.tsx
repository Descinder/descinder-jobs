"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/client/api";
import type { JobListItem } from "@/lib/client/types";
import { Loading, ErrorState } from "@/components/shell/screen-states";

type CompanyResponse = {
  company: {
    name: string; slug: string; logoUrl: string | null; website: string | null;
    description: string | null; location: string | null; size: string | null;
  };
  openJobs: JobListItem[];
};

export default function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<CompanyResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");
  useEffect(() => {
    apiGet<CompanyResponse>(`/api/companies/${slug}`)
      .then((x) => { setData(x); setStatus("ok"); })
      .catch(() => setStatus("notfound"));
  }, [slug]);
  if (status === "loading") return <Loading />;
  if (status === "notfound" || !data) return <ErrorState message="Company not found." />;
  const { company: c, openJobs } = data;
  return (
    <main className="mx-auto max-w-[920px] px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">{c.name}</h1>
      {c.location && <p className="text-sm text-[oklch(0.50_0.03_264)]">{c.location}{c.size ? ` · ${c.size}` : ""}</p>}
      {c.website && <a href={c.website} target="_blank" rel="noopener" className="text-sm text-[oklch(0.32_0.07_264)] hover:underline">{c.website}</a>}
      {c.description && <p className="mt-4 whitespace-pre-wrap text-sm text-[oklch(0.22_0.08_264)]">{c.description}</p>}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[oklch(0.22_0.08_264)]">Open roles</h2>
        <div className="flex flex-col gap-2">
          {openJobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="rounded-lg border border-[oklch(0.90_0.02_264)] px-4 py-3 text-sm hover:border-[oklch(0.32_0.07_264)]">{j.title}</Link>
          ))}
          {openJobs.length === 0 && <p className="text-sm text-[oklch(0.50_0.03_264)]">No open roles right now.</p>}
        </div>
      </section>
    </main>
  );
}
