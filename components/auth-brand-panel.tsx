"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// ─── Spring presets (match home-hero) ────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };
const fastSpring = { type: "spring" as const, stiffness: 200, damping: 28 };

// ─── Stagger variants ─────────────────────────────────────────────────────────
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.15,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

// ─── Role / discipline marquee ────────────────────────────────────────────────
const DISCIPLINES = [
  "Product Design",
  "Full-Stack Engineering",
  "Data & Analytics",
  "Growth & Marketing",
  "Operations",
  "Brand Strategy",
  "Climate Tech",
  "FinTech",
  "EdTech",
  "B2B SaaS",
  "Research",
  "UX Writing",
];

function MarqueeStrip() {
  const items = [...DISCIPLINES, ...DISCIPLINES];
  return (
    <div className="relative overflow-hidden border-t border-white/10 py-3.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[oklch(0.22_0.08_264)] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[oklch(0.22_0.08_264)] to-transparent z-10" />
      <motion.div
        className="flex gap-7 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {items.map((d, i) => (
          <span
            key={i}
            className="text-[0.65rem] font-semibold uppercase tracking-[0.17em] text-white/40"
          >
            {d}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Floating geometric orbs ──────────────────────────────────────────────────
function FloatingOrb({
  cx, cy, r, delay, duration,
}: {
  cx: number; cy: number; r: number; delay: number; duration: number;
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      animate={{
        cy: [cy, cy - 16, cy + 9, cy],
        opacity: [0.22, 0.40, 0.22],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// ─── Ambient SVG geometry ─────────────────────────────────────────────────────
function BrandGeometry() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 480 900"
    >
      <defs>
        <radialGradient id="bg-amber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.72 0.18 75)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 75)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bg-navy-deep" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.38 0.12 264)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.38 0.12 264)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Large ambient orbs */}
      <circle cx="400" cy="80" r="260" fill="url(#bg-navy-deep)" />
      <circle cx="40" cy="780" r="200" fill="url(#bg-amber)" />

      {/* Animated accent orbs */}
      <g fill="oklch(0.72 0.18 75 / 0.35)">
        <FloatingOrb cx={360} cy={200} r={5}  delay={0}   duration={4.4} />
        <FloatingOrb cx={420} cy={340} r={3.5} delay={1.2} duration={5.8} />
        <FloatingOrb cx={440} cy={140} r={2.5} delay={2.3} duration={4.9} />
        <FloatingOrb cx={320} cy={420} r={4}   delay={0.7} duration={6.2} />
        <FloatingOrb cx={390} cy={480} r={2.5} delay={1.9} duration={3.8} />
      </g>

      {/* Dot grid — top-right quadrant */}
      <g fill="oklch(0.70 0.02 264 / 0.20)">
        {Array.from({ length: 7 }, (_, col) =>
          Array.from({ length: 8 }, (_, row) => (
            <circle
              key={`${col}-${row}`}
              cx={290 + col * 36}
              cy={40 + row * 36}
              r={1.4}
            />
          ))
        )}
      </g>

      {/* Thin geometric accent lines */}
      <line
        x1="0" y1="320" x2="180" y2="320"
        stroke="oklch(0.72 0.18 75 / 0.12)"
        strokeWidth="1"
      />
      <line
        x1="60" y1="360" x2="200" y2="360"
        stroke="oklch(0.72 0.18 75 / 0.08)"
        strokeWidth="1"
      />
    </svg>
  );
}

// ─── Credential / proof pill ──────────────────────────────────────────────────
function ProofPill({
  stat, label, delay,
}: {
  stat: string; label: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className="flex flex-col"
    >
      <span className="font-mono text-xl font-semibold tabular-nums text-white/90 tracking-tight">
        {stat}
      </span>
      <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
    </motion.div>
  );
}

// ─── Magnetic wordmark link ───────────────────────────────────────────────────
function MagneticWordmark() {
  const ref = useRef<HTMLAnchorElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, fastSpring);
  const y = useSpring(rawY, fastSpring);

  function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    rawX.set((e.clientX - (rect.left + rect.width / 2)) * 0.25);
    rawY.set((e.clientY - (rect.top + rect.height / 2)) * 0.25);
  }

  function handleLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href="/"
      style={{ x, y }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
    >
      descinder
    </motion.a>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-dvh flex-col overflow-hidden bg-[oklch(0.22_0.08_264)] lg:flex">
      <BrandGeometry />

      {/* Content layer */}
      <div className="relative z-10 flex flex-1 flex-col px-10 pb-0 pt-10">
        {/* Wordmark */}
        <MagneticWordmark />

        {/* Central copy — left-aligned, controlled scale */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-auto pb-10"
        >
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40"
          >
            Internship matching platform
          </motion.p>

          {/* Headline */}
          <motion.h2
            variants={fadeUp}
            className="text-[2.1rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-[2.4rem]"
          >
            Find the work that{" "}
            <span className="text-[oklch(0.72_0.18_75)]">builds</span>
            <br />
            your career.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-[42ch] text-sm leading-relaxed text-white/55"
          >
            Descinder connects ambitious interns with startups and institutions
            that run structured programmes — applied skills, real output,
            tracked progress.
          </motion.p>

          {/* Proof stats */}
          <motion.div
            variants={fadeUp}
            className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-6"
          >
            <ProofPill stat="3,847" label="interns placed" delay={0.55} />
            <ProofPill stat="612"   label="active roles"   delay={0.65} />
            <ProofPill stat="94%"   label="match rate"     delay={0.75} />
          </motion.div>

          {/* Amber accent rule */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.9 }}
            style={{ originX: 0 }}
            className="mt-8 h-0.5 w-16 rounded-full bg-[oklch(0.72_0.18_75)]"
          />
        </motion.div>
      </div>

      {/* Bottom marquee */}
      <div className="relative z-10">
        <MarqueeStrip />
      </div>
    </aside>
  );
}
