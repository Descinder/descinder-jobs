import "server-only";
import { env } from "@/lib/env";

export type RawAdzunaJob = {
  id: string; title: string; description: string; created: string; redirect_url: string;
  salary_min?: number; salary_max?: number; salary_is_predicted?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  contract_time?: string;
};

const COUNTRY_PATH: Record<string, string> = { GB: "gb", US: "us", AU: "au", CA: "ca" };

export function adzunaConfigured(): boolean {
  return !!env.ADZUNA_APP_ID && !!env.ADZUNA_APP_KEY;
}

// One page of tech jobs (Adzuna `it-jobs` category) for a country.
export async function fetchAdzunaPage(country: string, page: number): Promise<RawAdzunaJob[]> {
  if (!adzunaConfigured()) throw new Error("Adzuna API keys not configured");
  const cc = COUNTRY_PATH[country];
  if (!cc) throw new Error(`Unsupported Adzuna country: ${country}`);
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${cc}/search/${page}`);
  url.searchParams.set("app_id", env.ADZUNA_APP_ID as string);
  url.searchParams.set("app_key", env.ADZUNA_APP_KEY as string);
  url.searchParams.set("results_per_page", "50");
  url.searchParams.set("category", "it-jobs");
  url.searchParams.set("content-type", "application/json");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Adzuna ${country} page ${page} failed: ${res.status}`);
  const json = (await res.json()) as { results?: RawAdzunaJob[] };
  return json.results ?? [];
}
