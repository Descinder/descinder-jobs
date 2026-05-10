"use client";

import { motion } from "framer-motion";
import { BentoCard } from "./bento-card";
import {
  SeekerIntelligentList,
  EmployerIntelligentList,
} from "./card-intelligent-list";
import { SeekerCommandInput, EmployerCommandInput } from "./card-command-input";
import { SeekerLiveStatus, EmployerLiveStatus } from "./card-live-status";
import { SeekerDataStream, EmployerDataStream } from "./card-data-stream";
import { SeekerFocusMode, EmployerFocusMode } from "./card-focus-mode";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

// ─── Welcome banner ───────────────────────────────────────────────────────────
function WelcomeBanner({ name, role }: { name: string; role: "seeker" | "employer" }) {
  const greeting = role === "seeker" ? "Find your next role" : "Build your team";
  const sub =
    role === "seeker"
      ? "Your personalised job feed and match tools arrive in Plan 2."
      : "Full candidate management and analytics arrive in Plan 2.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.05 }}
      className="mb-8 flex flex-col gap-1 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          {role === "seeker" ? "Job seeker" : "Employer"} dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
          {greeting},{" "}
          <span className="text-[oklch(0.72_0.18_75)]">{name}</span>
        </h1>
      </div>
      <p className="max-w-[48ch] text-xs leading-relaxed text-[var(--muted-foreground)] md:text-right">
        {sub}
      </p>
    </motion.div>
  );
}

// ─── Seeker Bento grid ────────────────────────────────────────────────────────
export function SeekerBento({ name }: { name: string }) {
  return (
    <div>
      <WelcomeBanner name={name} role="seeker" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {/* Row 1 — 3 equal columns */}
        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <SeekerIntelligentList />
          </BentoCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <SeekerCommandInput />
          </BentoCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <SeekerLiveStatus />
          </BentoCard>
        </motion.div>

        {/* Row 2 — 70/30 split */}
        <motion.div variants={cardVariants} className="md:col-span-2">
          <BentoCard className="h-full">
            <SeekerDataStream />
          </BentoCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <SeekerFocusMode />
          </BentoCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Employer Bento grid ──────────────────────────────────────────────────────
export function EmployerBento({ name }: { name: string }) {
  return (
    <div>
      <WelcomeBanner name={name} role="employer" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {/* Row 1 — 3 equal columns */}
        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <EmployerIntelligentList />
          </BentoCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <EmployerCommandInput />
          </BentoCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <EmployerLiveStatus />
          </BentoCard>
        </motion.div>

        {/* Row 2 — 70/30 split */}
        <motion.div variants={cardVariants} className="md:col-span-2">
          <BentoCard className="h-full">
            <EmployerDataStream />
          </BentoCard>
        </motion.div>

        <motion.div variants={cardVariants}>
          <BentoCard className="h-full">
            <EmployerFocusMode />
          </BentoCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
