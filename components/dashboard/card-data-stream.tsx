"use client";

import React, { memo } from "react";
import { motion } from "framer-motion";

// ─── Seeker: skills in demand ─────────────────────────────────────────────────
const SEEKER_STATS = [
  { label: "TypeScript", value: "+34%", delta: "up" },
  { label: "Rust", value: "+61%", delta: "up" },
  { label: "Postgres", value: "+22%", delta: "up" },
  { label: "Go", value: "+18%", delta: "up" },
  { label: "Next.js", value: "+29%", delta: "up" },
  { label: "Figma", value: "+14%", delta: "up" },
  { label: "Python", value: "+41%", delta: "up" },
  { label: "K8s", value: "+11%", delta: "up" },
];

// ─── Employer: hiring trends ──────────────────────────────────────────────────
const EMPLOYER_STATS = [
  { label: "Avg time-to-hire", value: "11 days", delta: "down" },
  { label: "Applications today", value: "47", delta: "up" },
  { label: "Match score avg", value: "83%", delta: "up" },
  { label: "Active roles", value: "3", delta: "neutral" },
  { label: "Offers accepted", value: "91%", delta: "up" },
  { label: "Top skill: TS", value: "68 apps", delta: "up" },
  { label: "Interviews set", value: "7", delta: "up" },
  { label: "Pending review", value: "12", delta: "neutral" },
];

const deltaColors: Record<string, string> = {
  up: "text-emerald-600",
  down: "text-sky-600",
  neutral: "text-slate-400",
};

function DataStream({ stats }: { stats: typeof SEEKER_STATS }) {
  // Duplicate for seamless loop
  const items = [...stats, ...stats];

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex gap-3"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 22,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{ width: "max-content" }}
      >
        {items.map((stat, i) => (
          <div
            key={`${stat.label}-${i}`}
            className="flex w-28 shrink-0 flex-col rounded-2xl border border-slate-200/60 bg-slate-50/60 px-4 py-3"
          >
            <span className="text-[0.62rem] font-medium uppercase tracking-wider text-slate-400 leading-tight">
              {stat.label}
            </span>
            <span
              className={`mt-1 font-mono text-base font-semibold tabular-nums leading-none ${deltaColors[stat.delta]}`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export const SeekerDataStream = memo(function SeekerDataStreamInner() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-[oklch(0.22_0.08_264)]">
          Skills in demand
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </span>
      </div>
      <DataStream stats={SEEKER_STATS} />
    </div>
  );
});

export const EmployerDataStream = memo(function EmployerDataStreamInner() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-[oklch(0.22_0.08_264)]">
          Hiring pulse
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </span>
      </div>
      <DataStream stats={EMPLOYER_STATS} />
    </div>
  );
});
