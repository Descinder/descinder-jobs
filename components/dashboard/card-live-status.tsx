"use client";

import React, { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const overshootSpring = { type: "spring" as const, stiffness: 480, damping: 22 };

// ─── Seeker: activity status ──────────────────────────────────────────────────
const SEEKER_EVENTS = [
  "Profile viewed by Folio",
  "New role matched: Rust Engineer",
  "Caelum shortlisted you",
  "Pith viewed your skills",
];

// ─── Employer: pipeline health ────────────────────────────────────────────────
const EMPLOYER_EVENTS = [
  "3 new applications today",
  "Shortlist review due Friday",
  "Top candidate active now",
  "Interview window opens tomorrow",
];

function BreathingDot({ color }: { color: "green" | "amber" }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <motion.span
        animate={{ scale: [1, 1.9, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inline-flex h-full w-full rounded-full ${color === "green" ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${color === "green" ? "bg-emerald-500" : "bg-amber-500"}`}
      />
    </span>
  );
}

function NotificationBadge({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 1200);
    const hide = setTimeout(() => setVisible(false), 4200);
    const cycle = setInterval(() => {
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    }, 6000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      clearInterval(cycle);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="badge"
          initial={{ opacity: 0, y: 8, scale: 0.82 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.9 }}
          transition={overshootSpring}
          className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 shadow-[0_4px_12px_-2px_rgba(16,185,129,0.12)]"
        >
          <BreathingDot color="green" />
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusCard({
  events,
  statusLabel,
  statusColor,
  badgeText,
}: {
  events: string[];
  statusLabel: string;
  statusColor: "green" | "amber";
  badgeText: string;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % events.length), 3800);
    return () => clearInterval(id);
  }, [events.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-[oklch(0.22_0.08_264)]">
          Activity
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </span>
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50/60 px-3.5 py-2.5">
        <BreathingDot color={statusColor} />
        <span className="text-xs font-medium text-[oklch(0.22_0.08_264)]">{statusLabel}</span>
      </div>

      {/* Cycling event */}
      <div className="relative h-9 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="absolute inset-0 text-xs leading-relaxed text-slate-500"
          >
            {events[idx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <NotificationBadge text={badgeText} />
    </div>
  );
}

export const SeekerLiveStatus = memo(function SeekerLiveStatusInner() {
  return (
    <StatusCard
      events={SEEKER_EVENTS}
      statusLabel="Profile active"
      statusColor="green"
      badgeText="New match available"
    />
  );
});

export const EmployerLiveStatus = memo(function EmployerLiveStatusInner() {
  return (
    <StatusCard
      events={EMPLOYER_EVENTS}
      statusLabel="Hiring active"
      statusColor="amber"
      badgeText="Candidate shortlisted"
    />
  );
});
