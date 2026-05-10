"use client";

import React, { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

// ─── Seeker: recent job discovery feed ───────────────────────────────────────
const SEEKER_JOBS = [
  { id: "s1", title: "Staff Product Engineer", co: "Caelum", loc: "Remote", hot: true },
  { id: "s2", title: "Frontend Architect", co: "Pith", loc: "London", hot: false },
  { id: "s3", title: "Backend Engineer — Rust", co: "Folio", loc: "Remote", hot: true },
  { id: "s4", title: "Growth Engineer", co: "Marrow", loc: "Berlin", hot: false },
];

// ─── Employer: recent applications ───────────────────────────────────────────
const EMPLOYER_APPS = [
  { id: "e1", title: "React Intern", candidate: "T. Okonkwo", status: "Review" },
  { id: "e2", title: "Data Analyst", candidate: "S. Lindqvist", status: "Shortlist" },
  { id: "e3", title: "Ops Coordinator", candidate: "M. Ferreira", status: "Review" },
  { id: "e4", title: "Brand Designer", candidate: "A. Nakamura", status: "Offer" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const statusColors: Record<string, string> = {
  Review: "bg-slate-100 text-slate-500",
  Shortlist: "bg-amber-50 text-amber-600",
  Offer: "bg-emerald-50 text-emerald-600",
};

// ─── Seeker list ──────────────────────────────────────────────────────────────
function SeekerList() {
  const [items, setItems] = useState(SEEKER_JOBS);

  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => shuffle(prev));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {items.map((job) => (
          <motion.div
            key={job.id}
            layoutId={job.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="flex items-center justify-between rounded-xl bg-slate-50/60 px-3.5 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-[oklch(0.22_0.08_264)] leading-tight">
                {job.title}
              </p>
              <p className="text-[0.7rem] text-slate-400 leading-tight mt-0.5">
                {job.co} · {job.loc}
              </p>
            </div>
            {job.hot && (
              <span className="ml-2 shrink-0 rounded-full bg-[oklch(0.72_0.18_75)]/12 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-[oklch(0.55_0.12_75)]">
                Hot
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Employer list ────────────────────────────────────────────────────────────
function EmployerList() {
  const [items, setItems] = useState(EMPLOYER_APPS);

  useEffect(() => {
    const id = setInterval(() => {
      setItems((prev) => shuffle(prev));
    }, 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {items.map((app) => (
          <motion.div
            key={app.id}
            layoutId={app.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="flex items-center justify-between rounded-xl bg-slate-50/60 px-3.5 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-[oklch(0.22_0.08_264)] leading-tight">
                {app.candidate}
              </p>
              <p className="text-[0.7rem] text-slate-400 leading-tight mt-0.5">{app.title}</p>
            </div>
            <span
              className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider ${statusColors[app.status] ?? "bg-slate-100 text-slate-500"}`}
            >
              {app.status}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Public exports ───────────────────────────────────────────────────────────
export const SeekerIntelligentList = memo(function SeekerIntelligentListInner() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-[oklch(0.22_0.08_264)]">
          Recent jobs
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">
          Demo
        </span>
      </div>
      <SeekerList />
    </>
  );
});

export const EmployerIntelligentList = memo(function EmployerIntelligentListInner() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-[oklch(0.22_0.08_264)]">
          Recent applications
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">
          Demo
        </span>
      </div>
      <EmployerList />
    </>
  );
});
