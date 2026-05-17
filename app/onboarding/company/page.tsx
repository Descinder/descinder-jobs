"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiError } from "@/lib/client/api";

// Employer onboarding — single-step company setup (prototype:
// employer-onboarding.html). Submits POST /api/companies (createCompanySchema:
// name required, size required enum, website/location/description optional),
// then → /dashboard. The "Company name" label and "Continue" button are the
// Plan-1 acceptance contract (signup-employer.spec.ts). `size` is REQUIRED by
// createCompanySchema (enum), so the select always carries a valid value.
const SIZES = ["1-10", "11-50", "51-200", "201-500", "501+"] as const;
type Size = (typeof SIZES)[number];
const SIZE_LABELS: Record<Size, string> = {
  "1-10": "1–10 people",
  "11-50": "11–50 people",
  "51-200": "51–200 people",
  "201-500": "201–500 people",
  "501+": "501+ people",
};

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState<Size>("11-50");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiSend("POST", "/api/companies", {
        name,
        website: website || undefined,
        location: location || undefined,
        size,
        description: description || undefined,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create company.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* ── Brand panel ── */}
      <aside className="hidden flex-col justify-between bg-[oklch(0.22_0.08_264)] p-10 text-white lg:flex">
        <span className="text-lg font-bold tracking-[-0.02em]">descinder</span>
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
            Step 1 of 1 · Employer
          </div>
          <h2 className="text-3xl font-bold leading-tight">
            Set up your
            <br />
            company.
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            This is what candidates see when they look at your jobs. A strong
            profile attracts better applicants.
          </p>
        </div>
        <div className="text-xs text-white/40">
          You can always refine this later from your company settings.
        </div>
      </aside>

      {/* ── Form side ── */}
      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
              Set up your company
            </h1>
            <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
              This is what candidates will see when they look at your jobs. You
              can always refine it later.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Company name
            </label>
            <input
              id="companyName"
              type="text"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Folio Labs"
              className="w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="website"
                className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
              >
                Website{" "}
                <span className="font-normal text-[oklch(0.66_0.02_264)]">
                  (optional)
                </span>
              </label>
              <input
                id="website"
                type="url"
                autoComplete="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="companyLocation"
                className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
              >
                Location{" "}
                <span className="font-normal text-[oklch(0.66_0.02_264)]">
                  (optional)
                </span>
              </label>
              <input
                id="companyLocation"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London, UK"
                className="w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="companySize"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Company size
            </label>
            <select
              id="companySize"
              value={size}
              onChange={(e) => setSize(e.target.value as Size)}
              className="w-full rounded-lg border border-[oklch(0.90_0.02_264)] bg-white px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {SIZE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              About the company{" "}
              <span className="font-normal text-[oklch(0.66_0.02_264)]">
                (optional)
              </span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What does your company do? What's it like to work there?"
              className="w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Creating company…" : "Continue"}
          </button>
        </form>
      </main>
    </div>
  );
}
