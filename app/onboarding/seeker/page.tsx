"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

export default function SeekerOnboardingPage() {
  const router = useRouter();

  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // TODO(Plan 3): wire to /api/profile/seeker or equivalent endpoint
    throw new Error("Not wired — Plan 3 frontend translation");
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-6 py-14">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-[oklch(0.72_0.18_75)]" />
            <span className="h-1.5 w-8 rounded-full bg-slate-200" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 ml-1">
              Step 1 of 2
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[oklch(0.22_0.08_264)] md:text-3xl">
            Tell us about yourself
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            This shapes how recruiters find you. You can edit everything later.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          variants={fadeUp}
          onSubmit={onSubmit}
          className="flex flex-col gap-5"
        >
          {/* Headline */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="headline"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Headline
            </Label>
            <Input
              id="headline"
              placeholder="e.g. Senior Frontend Engineer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
            <p className="text-[0.68rem] text-slate-400">
              One line that captures your role and level.
            </p>
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="location"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g. London, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
          </div>

          {/* Skills */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="skills"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Skills (comma-separated)
            </Label>
            <Input
              id="skills"
              placeholder="typescript, react, postgres"
              value={skillsRaw}
              onChange={(e) => setSkillsRaw(e.target.value)}
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
            <p className="text-[0.68rem] text-slate-400">
              e.g. typescript, react, postgres — separate each with a comma.
            </p>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="bio"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Short bio{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="2–3 sentences on what you're looking for and what you bring."
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "mt-1 w-full rounded-xl px-5 py-3 text-sm font-semibold tracking-tight",
              "bg-[oklch(0.22_0.08_264)] text-white",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.12)]",
              "transition-all duration-150 hover:bg-[oklch(0.28_0.08_264)]",
              "active:scale-[0.98] active:translate-y-px",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}
