"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Seeker prompts ───────────────────────────────────────────────────────────
const SEEKER_PROMPTS = [
  "Senior Postgres engineer in London",
  "Remote contract Rust roles",
  "Startup ops internship — climate tech",
  "Junior frontend, Berlin, part-time",
  "B2B SaaS growth engineer",
];

// ─── Employer prompts ─────────────────────────────────────────────────────────
const EMPLOYER_PROMPTS = [
  "React interns available in London",
  "Data analyst, 3–6 month placement",
  "Brand designer, top-match candidates",
  "Rust engineer, remote-ready",
  "Operations coordinator, immediate start",
];

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

function TypewriterBar({ prompts }: { prompts: string[] }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "erasing" | "processing">("typing");
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const phrase = prompts[phraseIdx % prompts.length];

    if (phase === "typing") {
      if (displayed.length < phrase.length) {
        frameRef.current = setTimeout(() => {
          setDisplayed(phrase.slice(0, displayed.length + 1));
        }, 42);
      } else {
        frameRef.current = setTimeout(() => setPhase("hold"), 1400);
      }
    } else if (phase === "hold") {
      frameRef.current = setTimeout(() => setPhase("erasing"), 600);
    } else if (phase === "erasing") {
      if (displayed.length > 0) {
        frameRef.current = setTimeout(() => {
          setDisplayed((d) => d.slice(0, -1));
        }, 22);
      } else {
        setPhase("processing");
      }
    } else if (phase === "processing") {
      frameRef.current = setTimeout(() => {
        setPhraseIdx((i) => i + 1);
        setPhase("typing");
      }, 900);
    }

    return () => {
      if (frameRef.current) clearTimeout(frameRef.current);
    };
  }, [displayed, phase, phraseIdx, prompts]);

  return (
    <div className="flex flex-col gap-3">
      {/* Label */}
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
        AI search
      </p>

      {/* Input simulation */}
      <div className="relative flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
        {/* Search icon */}
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-slate-400"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="7" cy="7" r="4.5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>

        <span className="min-w-0 flex-1 font-mono text-sm text-[oklch(0.22_0.08_264)]">
          {displayed}
          {/* Blinking cursor */}
          <motion.span
            aria-hidden="true"
            animate={{ opacity: phase === "processing" ? 0 : [1, 0, 1] }}
            transition={
              phase === "processing"
                ? {}
                : { duration: 0.9, repeat: Infinity, ease: "linear" }
            }
            className="ml-px inline-block h-[1.1em] w-0.5 translate-y-[1px] rounded-sm bg-[oklch(0.72_0.18_75)] align-middle"
          />
        </span>

        {/* Processing shimmer chip */}
        <AnimatePresence>
          {phase === "processing" && (
            <motion.span
              key="shimmer"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={spring}
              className="shrink-0 overflow-hidden rounded-full"
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[oklch(0.55_0.12_75)]"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.72 0.18 75 / 0.08) 0%, oklch(0.72 0.18 75 / 0.22) 40%, oklch(0.72 0.18 75 / 0.08) 80%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1s linear infinite",
                }}
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="inline-block h-1.5 w-1.5 rounded-full border border-[oklch(0.72_0.18_75)] border-t-transparent"
                />
                Matching
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Hint chips */}
      <div className="flex flex-wrap gap-1.5">
        {["Remote", "Full-time", "< 1yr exp"].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[0.65rem] font-medium text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}

export const SeekerCommandInput = memo(function SeekerCommandInputInner() {
  return <TypewriterBar prompts={SEEKER_PROMPTS} />;
});

export const EmployerCommandInput = memo(function EmployerCommandInputInner() {
  return <TypewriterBar prompts={EMPLOYER_PROMPTS} />;
});
