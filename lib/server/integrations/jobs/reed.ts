import "server-only";
import { env } from "@/lib/env";

export type RawReedJob = {
  jobId: number | string; jobTitle: string; employerName?: string; locationName?: string;
  minimumSalary?: number; maximumSalary?: number; currency?: string;
  jobDescription: string; jobUrl: string; date?: string;
};

export function reedConfigured(): boolean {
  return !!env.REED_API_KEY;
}

// One page (Reed paginates by resultsToTake/resultsToSkip). Tech keyword filter.
export async function fetchReedPage(page: number): Promise<RawReedJob[]> {
  if (!reedConfigured()) throw new Error("Reed API key not configured");
  const take = 100;
  const skip = (page - 1) * take;
  const url = new URL("https://www.reed.co.uk/api/1.0/search");
  url.searchParams.set("keywords", "software OR engineer OR developer OR data OR devops");
  url.searchParams.set("resultsToTake", String(take));
  url.searchParams.set("resultsToSkip", String(skip));
  // Reed uses HTTP Basic with the API key as username, empty password.
  const auth = Buffer.from(`${env.REED_API_KEY}:`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Reed page ${page} failed: ${res.status}`);
  const json = (await res.json()) as { results?: RawReedJob[] };
  return json.results ?? [];
}
