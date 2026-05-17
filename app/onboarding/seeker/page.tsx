"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiSend, ApiError } from "@/lib/client/api";

// Seeker onboarding — single-step profile build (prototype: seeker-onboarding.html).
// Submits to PUT /api/me/seeker-profile (seekerProfileSchema), then → /dashboard.
// Labels (`Headline`, `Location`, `Skills (comma-separated)`, `Bio`) and the
// `Continue` button are the Plan-1 acceptance contract (profile-edit.spec.ts).
export default function SeekerOnboardingPage() {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiSend("PUT", "/api/me/seeker-profile", {
        headline: headline || undefined,
        location: location || undefined,
        bio: bio || undefined,
        skills: skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
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
            Step 1 of 1 · Job seeker
          </div>
          <h2 className="text-3xl font-bold leading-tight">
            Tell us
            <br />
            about yourself.
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Your profile is how employers find and evaluate you. A complete
            profile gets significantly more views.
          </p>
        </div>
        <div className="text-xs text-white/40">
          You can edit any of this later from your profile.
        </div>
      </aside>

      {/* ── Form side ── */}
      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
              Build your profile
            </h1>
            <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
              You can edit any of this later from your profile settings.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="headline"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Headline
            </label>
            <input
              id="headline"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Senior Product Designer, 6 yrs exp."
              maxLength={160}
              className="w-full rounded-lg border border-[oklch(0.84_0.03_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)]"
            />
            <p className="text-xs text-[oklch(0.50_0.03_264)]">
              Appears under your name in search results. Keep it direct and
              specific.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="location"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. London, UK"
              maxLength={200}
              className="w-full rounded-lg border border-[oklch(0.84_0.03_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="skills"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Skills (comma-separated)
            </label>
            <input
              id="skills"
              type="text"
              value={skillsRaw}
              onChange={(e) => setSkillsRaw(e.target.value)}
              placeholder="Figma, Design Systems, User Research"
              className="w-full rounded-lg border border-[oklch(0.84_0.03_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)]"
            />
            <p className="text-xs text-[oklch(0.50_0.03_264)]">
              Separate skills with a comma. Employers filter candidates by these.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Bio{" "}
              <span className="font-normal text-[oklch(0.66_0.02_264)]">
                (optional)
              </span>
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short paragraph about your background, what you're looking for, and what you bring to a team."
              maxLength={5000}
              className="w-full rounded-lg border border-[oklch(0.84_0.03_264)] px-3 py-2 text-sm outline-none focus:border-[oklch(0.32_0.07_264)]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </main>
    </div>
  );
}
