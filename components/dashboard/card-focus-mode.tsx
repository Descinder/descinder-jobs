"use client";

import React, { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

// ─── Seeker: profile completeness checklist ───────────────────────────────────
const SEEKER_STEPS = [
  { id: "headline", label: "Add headline", done: true },
  { id: "skills", label: "Add skills", done: true },
  { id: "bio", label: "Write a short bio", done: false },
  { id: "avatar", label: "Upload photo", done: false },
];

// ─── Employer: hiring setup checklist ────────────────────────────────────────
const EMPLOYER_STEPS = [
  { id: "company", label: "Create company profile", done: true },
  { id: "role", label: "Post your first role", done: false },
  { id: "criteria", label: "Set match criteria", done: false },
  { id: "team", label: "Invite team members", done: false },
];

function CheckIcon({ done }: { done: boolean }) {
  return (
    <span
      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
        done
          ? "border-emerald-500 bg-emerald-500"
          : "border-slate-300 bg-transparent"
      }`}
    >
      {done && (
        <svg
          aria-hidden="true"
          className="h-2.5 w-2.5 text-white"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 6 5 9 10 3" />
        </svg>
      )}
    </span>
  );
}

function FocusChecklist({
  steps,
  heading,
  subtext,
}: {
  steps: typeof SEEKER_STEPS;
  heading: string;
  subtext: string;
}) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  useEffect(() => {
    // Staggered highlight loop — draws attention to next incomplete step
    const nextIncomplete = steps.findIndex((s) => !s.done);
    if (nextIncomplete === -1) return;

    const id = setInterval(() => {
      setHighlightIdx(nextIncomplete);
      setTimeout(() => setHighlightIdx(null), 1200);
    }, 3600);
    return () => clearInterval(id);
  }, [steps]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[oklch(0.22_0.08_264)]">
            {heading}
          </h3>
          <p className="mt-0.5 text-[0.7rem] text-slate-400 leading-snug">{subtext}</p>
        </div>
        <span className="font-mono text-base font-semibold tabular-nums text-[oklch(0.72_0.18_75)] shrink-0">
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ...spring, delay: 0.4 }}
          className="h-full rounded-full bg-[oklch(0.72_0.18_75)]"
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{
              opacity: 1,
              x: 0,
              backgroundColor:
                highlightIdx === i
                  ? "oklch(0.72 0.18 75 / 0.08)"
                  : "transparent",
            }}
            transition={{ ...spring, delay: i * 0.06 }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
          >
            <CheckIcon done={step.done} />
            <span
              className={
                step.done
                  ? "text-slate-400 line-through"
                  : "text-[oklch(0.22_0.08_264)] font-medium"
              }
            >
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Floating action hint */}
      <AnimatePresence>
        {highlightIdx !== null && (
          <motion.div
            key="toolbar"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={spring}
            className="flex items-center gap-2 self-start rounded-2xl border border-[oklch(0.72_0.18_75)]/20 bg-white px-3.5 py-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.18_75)]" />
            <span className="text-[0.68rem] font-medium text-[oklch(0.22_0.08_264)]">
              Complete this step
            </span>
            <svg
              aria-hidden="true"
              className="h-3 w-3 text-[oklch(0.72_0.18_75)]"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="2 6 10 6 7 3" />
              <polyline points="7 9 10 6" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SeekerFocusMode = memo(function SeekerFocusModeInner() {
  return (
    <FocusChecklist
      steps={SEEKER_STEPS}
      heading="Complete your profile"
      subtext="Stronger profiles get 3× more views."
    />
  );
});

export const EmployerFocusMode = memo(function EmployerFocusModeInner() {
  return (
    <FocusChecklist
      steps={EMPLOYER_STEPS}
      heading="Set up hiring"
      subtext="Post roles and get matched interns in days."
    />
  );
});
