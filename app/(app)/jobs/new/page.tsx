"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiError } from "@/lib/client/api";

// Post a job (prototype: post-a-job.html). Body conforms exactly to
// createJobSchema (lib/shared/schemas/jobs.ts):
//   title(min2) description(min10) employment_type work_mode experience_level
//   location? country?(2-letter UPPER) salary_min? salary_max?
//   salary_currency(default GBP) skills_required[]? apply_method
//   external_apply_url?(required when apply_method=external) status:draft|published
// Two submits: "Save as draft" / "Publish". POST /api/jobs → { id }. On publish
// when job_posting_paid gating is on the API replies 402 PAYWALL → notice
// routing to /settings/billing (backend default-off, so normally free).
// Featured add-on: NO /api/jobs/:id/featured/intent endpoint exists (admin-only
// /api/admin/jobs/:id/featured + per-post /api/me/billing/job-post) → render a
// disabled "Featured listing — coming soon" (§9c; do not fabricate).

const EMPLOYMENT = [
  ["full_time", "Full-time"],
  ["part_time", "Part-time"],
  ["contract", "Contract"],
  ["internship", "Internship"],
] as const;
const WORK_MODE = [
  ["remote", "Remote"],
  ["hybrid", "Hybrid"],
  ["on_site", "On-site"],
] as const;
const EXP_LEVEL = [
  ["entry", "Entry"],
  ["mid", "Mid"],
  ["senior", "Senior"],
  ["lead", "Lead"],
] as const;

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [workMode, setWorkMode] = useState("remote");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("GBP");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [applyMethod, setApplyMethod] = useState<"native" | "external">(
    "native",
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(status: "draft" | "published") {
    setError(null);
    setPaywall(false);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        employment_type: employmentType,
        work_mode: workMode,
        experience_level: experienceLevel,
        salary_currency: salaryCurrency || "GBP",
        skills_required: skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        apply_method: applyMethod,
        status,
      };
      if (location) body.location = location;
      if (country) body.country = country.trim().toUpperCase();
      if (salaryMin) body.salary_min = Number(salaryMin);
      if (salaryMax) body.salary_max = Number(salaryMax);
      if (applyMethod === "external" && externalUrl)
        body.external_apply_url = externalUrl;

      const { id } = await apiSend<{ id: string }>("POST", "/api/jobs", body);
      // GET /api/jobs/:id 404s for non-published jobs (jobDetail gates on
      // status==="published"; §9c) — only route to /edit when published.
      if (status === "published") {
        router.push(`/jobs/${id}/edit`);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(true);
      } else {
        setError(
          err instanceof ApiError ? err.message : "Could not save the job.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldCls =
    "w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20";
  const labelCls =
    "block text-sm font-medium text-[oklch(0.22_0.08_264)]";

  return (
    <div className="mx-auto max-w-[760px]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
          Post a new job
        </h1>
        <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
          Your listing goes live on Descinder immediately after publishing.
        </p>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-8 space-y-6 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-6"
      >
        <div className="space-y-1.5">
          <label htmlFor="jobTitle" className={labelCls}>
            Job title
          </label>
          <input
            id="jobTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            className={fieldCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="jobDescription" className={labelCls}>
            Description
          </label>
          <textarea
            id="jobDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="What will this person do? What are you looking for?"
            className={fieldCls}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="jobType" className={labelCls}>
              Job type
            </label>
            <select
              id="jobType"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className={fieldCls}
            >
              {EMPLOYMENT.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="workMode" className={labelCls}>
              Work mode
            </label>
            <select
              id="workMode"
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className={fieldCls}
            >
              {WORK_MODE.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="experienceLevel" className={labelCls}>
              Experience level
            </label>
            <select
              id="experienceLevel"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className={fieldCls}
            >
              {EXP_LEVEL.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="location" className={labelCls}>
              Location{" "}
              <span className="font-normal text-[oklch(0.66_0.02_264)]">
                (optional)
              </span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London, UK"
              className={fieldCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="country" className={labelCls}>
              Country code{" "}
              <span className="font-normal text-[oklch(0.66_0.02_264)]">
                (optional, 2-letter)
              </span>
            </label>
            <input
              id="country"
              type="text"
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="GB"
              className={fieldCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="salaryMin" className={labelCls}>
              Salary min{" "}
              <span className="font-normal text-[oklch(0.66_0.02_264)]">
                (optional)
              </span>
            </label>
            <input
              id="salaryMin"
              type="number"
              min={0}
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="salaryMax" className={labelCls}>
              Salary max{" "}
              <span className="font-normal text-[oklch(0.66_0.02_264)]">
                (optional)
              </span>
            </label>
            <input
              id="salaryMax"
              type="number"
              min={0}
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              className={fieldCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="salaryCurrency" className={labelCls}>
              Currency
            </label>
            <input
              id="salaryCurrency"
              type="text"
              maxLength={3}
              value={salaryCurrency}
              onChange={(e) =>
                setSalaryCurrency(e.target.value.toUpperCase())
              }
              className={fieldCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="skills" className={labelCls}>
            Skills required{" "}
            <span className="font-normal text-[oklch(0.66_0.02_264)]">
              (comma-separated)
            </span>
          </label>
          <input
            id="skills"
            type="text"
            value={skillsRaw}
            onChange={(e) => setSkillsRaw(e.target.value)}
            placeholder="typescript, react, node"
            className={fieldCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="applyMethod" className={labelCls}>
            How candidates apply
          </label>
          <select
            id="applyMethod"
            value={applyMethod}
            onChange={(e) =>
              setApplyMethod(e.target.value as "native" | "external")
            }
            className={fieldCls}
          >
            <option value="native">On Descinder</option>
            <option value="external">External link</option>
          </select>
        </div>

        {applyMethod === "external" && (
          <div className="space-y-1.5">
            <label htmlFor="externalUrl" className={labelCls}>
              External apply URL
            </label>
            <input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://…"
              className={fieldCls}
            />
          </div>
        )}

        {/* Featured add-on — deferred (§9c). No featured/intent endpoint. */}
        <div className="rounded-lg border border-dashed border-[oklch(0.84_0.03_264)] bg-[oklch(0.97_0.01_264)] px-4 py-3">
          <p className="text-sm font-medium text-[oklch(0.50_0.03_264)]">
            Featured listing — coming soon
          </p>
          <p className="mt-0.5 text-xs text-[oklch(0.66_0.02_264)]">
            Boost a role to the top of search. This add-on isn&apos;t available
            yet.
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-2 cursor-not-allowed rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-1.5 text-xs font-medium text-[oklch(0.66_0.02_264)] opacity-60"
          >
            Feature this job
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {paywall && (
          <div className="flex items-center justify-between rounded-lg border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-4 py-3 text-sm">
            <span className="text-[oklch(0.22_0.08_264)]">
              Publishing this role requires payment.
            </span>
            <a
              href="/settings/billing"
              className="font-semibold underline"
            >
              Go to billing
            </a>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={submitting}
            className="rounded-lg border border-[oklch(0.90_0.02_264)] px-4 py-2.5 text-sm font-semibold text-[oklch(0.22_0.08_264)] disabled:opacity-60"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => submit("published")}
            disabled={submitting}
            className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
