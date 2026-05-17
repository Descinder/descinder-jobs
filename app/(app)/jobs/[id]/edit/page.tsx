"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { JobDetail } from "@/lib/client/types";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Edit / close / repost a job. GET /api/jobs/:id (jobDetail) prefills — NOTE
// it 404s for any job whose status !== "published" (drafts/closed are NOT
// fetchable via this endpoint, and JobDetail exposes no `status` field; §9c).
// PATCH /api/jobs/:id (updateJobSchema — all fields optional, same keys/enums
// as createJobSchema). POST .../close → status closed; POST .../repost →
// status published (gated by employer_publish). use(params) for [id].

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

export default function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [st, setSt] = useState<"loading" | "ok" | "notfound" | "error">(
    "loading",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [workMode, setWorkMode] = useState("remote");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [location, setLocation] = useState("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGet<JobDetail>(`/api/jobs/${id}`)
      .then((j) => {
        setTitle(j.title);
        setDescription(j.description);
        setEmploymentType(j.employmentType || "full_time");
        setWorkMode(j.workMode || "remote");
        setExperienceLevel(j.experienceLevel || "mid");
        setLocation(j.location ?? "");
        setSkillsRaw((j.skills ?? []).join(", "));
        setSt("ok");
      })
      .catch((e) =>
        setSt(e instanceof ApiError && e.status === 404 ? "notfound" : "error"),
      );
  }, [id]);

  async function save() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await apiSend("PATCH", `/api/jobs/${id}`, {
        title,
        description,
        employment_type: employmentType,
        work_mode: workMode,
        experience_level: experienceLevel,
        location: location || undefined,
        skills_required: skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setNotice("Saved.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the job.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(kind: "close" | "repost") {
    if (
      !window.confirm(
        kind === "close"
          ? "Close this job? It will stop appearing in search."
          : "Repost this job? It will be published again.",
      )
    )
      return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await apiSend("POST", `/api/jobs/${id}/${kind}`, {});
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Could not ${kind} the job.`,
      );
      setBusy(false);
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "notfound")
    // Drafts/closed jobs aren't fetchable via the public detail endpoint, so the
    // full edit form can't prefill — but Repost (publish) and Close DON'T need a
    // prefill, so surface them here as actions instead of a dead end. Repost a
    // closed role to relist it, or a draft to publish it.
    return (
      <main className="mx-auto max-w-[640px] px-6 py-10">
        <h1 className="text-xl font-semibold text-[oklch(0.22_0.08_264)]">This role isn&apos;t currently published</h1>
        <p className="mt-2 text-sm text-[oklch(0.50_0.03_264)]">
          Drafts and closed roles can&apos;t be edited inline. You can publish it (repost) or close it; full editing is available once it&apos;s live.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => action("repost")}
            disabled={busy}
            className="rounded-xl bg-[oklch(0.22_0.08_264)] px-4 py-2 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-50"
          >
            {busy ? "Working…" : "Publish (repost)"}
          </button>
          <button
            onClick={() => action("close")}
            disabled={busy}
            className="rounded-xl border border-[oklch(0.90_0.02_264)] px-4 py-2 text-sm font-medium text-[oklch(0.22_0.08_264)] hover:bg-[oklch(0.97_0.01_264)] disabled:opacity-50"
          >
            Close
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </main>
    );
  if (st === "error")
    return <ErrorState message="Couldn't load this job." />;

  const fieldCls =
    "w-full rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)] focus:ring-2 focus:ring-[oklch(0.32_0.07_264)]/20";
  const labelCls = "block text-sm font-medium text-[oklch(0.22_0.08_264)]";

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
            Edit job
          </h1>
          <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
            Changes apply to your live listing.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => action("close")}
            disabled={busy}
            className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => action("repost")}
            disabled={busy}
            className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-2 text-sm font-semibold text-[oklch(0.22_0.08_264)] disabled:opacity-60"
          >
            Repost
          </button>
        </div>
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
            className={fieldCls}
          />
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
            className={fieldCls}
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            {notice}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
