"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Spring presets ───────────────────────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };
const fastSpring = { type: "spring" as const, stiffness: 200, damping: 28 };

// ─── Stagger parent variants ─────────────────────────────────────────────────
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

const fadeRight = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { ...spring } },
};

// ─── Live stat ticker ─────────────────────────────────────────────────────────
const STATS = [
  { value: 3_847, label: "interns placed", suffix: "" },
  { value: 612, label: "active roles", suffix: "" },
  { value: 94, label: "match rate", suffix: "%" },
];

function StatTicker({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick);
    }, 600);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return (
    <span className="font-mono tabular-nums text-foreground">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Floating geometric orbs (perpetual) ─────────────────────────────────────
function FloatingOrb({
  cx,
  cy,
  r,
  delay,
  duration,
}: {
  cx: number;
  cy: number;
  r: number;
  delay: number;
  duration: number;
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      animate={{
        cy: [cy, cy - 18, cy + 10, cy],
        opacity: [0.18, 0.32, 0.18],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// ─── Magnetic CTA button ──────────────────────────────────────────────────────
function MagneticButton({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "ghost";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, fastSpring);
  const y = useSpring(rawY, fastSpring);

  function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    rawX.set((e.clientX - cx) * 0.3);
    rawY.set((e.clientY - cy) * 0.3);
  }

  function handleLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  const base =
    "relative inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]";

  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90"
      : "border border-[var(--border)] bg-transparent text-foreground hover:bg-[var(--muted)]";

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x, y }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(base, styles)}
    >
      {children}
    </motion.a>
  );
}

// ─── Marquee strip (perpetual) ────────────────────────────────────────────────
const CATEGORIES = [
  "Product Design",
  "Full-Stack Engineering",
  "Growth & Marketing",
  "Data & Analytics",
  "Operations",
  "Brand Strategy",
  "Research",
  "Climate Tech",
  "FinTech",
  "EdTech",
  "HealthTech",
  "B2B SaaS",
];

function MarqueeStrip() {
  const items = [...CATEGORIES, ...CATEGORIES];
  return (
    <div className="relative mt-auto overflow-hidden border-t border-[var(--border)] py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--background)] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--background)] to-transparent z-10" />
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 30,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {items.map((cat, i) => (
          <span
            key={i}
            className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]"
          >
            {cat}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Background geometry (SVG, pointer-events-none, fixed) ───────────────────
function HeroGeometry() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 800 700"
    >
      <defs>
        <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.72 0.18 75)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 75)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="navy-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.35 0.10 264)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="oklch(0.35 0.10 264)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Large ambient orbs */}
      <circle cx="650" cy="100" r="260" fill="url(#navy-glow)" />
      <circle cx="100" cy="600" r="200" fill="url(#orb-glow)" />

      {/* Animated smaller orbs */}
      <g fill="oklch(0.72 0.18 75 / 0.3)">
        <FloatingOrb cx={600} cy={220} r={6} delay={0} duration={4.2} />
        <FloatingOrb cx={680} cy={380} r={4} delay={1.1} duration={5.6} />
        <FloatingOrb cx={730} cy={160} r={3} delay={2.2} duration={4.8} />
        <FloatingOrb cx={560} cy={460} r={5} delay={0.8} duration={6.1} />
        <FloatingOrb cx={620} cy={510} r={3} delay={1.8} duration={3.9} />
      </g>

      {/* Grid dot pattern — top-right quadrant */}
      <g fill="oklch(0.50 0.03 264 / 0.25)">
        {Array.from({ length: 8 }, (_, col) =>
          Array.from({ length: 6 }, (_, row) => (
            <circle
              key={`${col}-${row}`}
              cx={500 + col * 40}
              cy={60 + row * 40}
              r={1.5}
            />
          ))
        )}
      </g>
    </svg>
  );
}

// ─── Spotlight border card (right panel stat) ─────────────────────────────────
function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("relative overflow-hidden rounded-xl border border-[var(--border)]", className)}
      style={{
        background: hovered
          ? `radial-gradient(circle at ${coords.x}% ${coords.y}%, oklch(0.72 0.18 75 / 0.08), transparent 60%), var(--card)`
          : "var(--card)",
      }}
    >
      {hovered && (
        <div
          className="pointer-events-none absolute inset-px rounded-xl border border-[var(--accent)]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{
            background: `radial-gradient(circle at ${coords.x}% ${coords.y}%, oklch(0.72 0.18 75 / 0.12), transparent 50%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Right panel: live stats ──────────────────────────────────────────────────
function RightPanel() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % STATS.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6 lg:p-8">
      {/* Glassmorphism badge */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.6 }}
        className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/60 px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] text-[var(--muted-foreground)]"
      >
        <motion.span
          animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
        />
        Hiring is live
      </motion.div>

      {/* Stats grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-3"
      >
        {STATS.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <SpotlightCard className="px-5 py-4">
              <p className="text-[0.7rem] font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                <AnimatePresence mode="wait">
                  {i === activeIdx ? (
                    <motion.span
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[var(--accent)]"
                    >
                      <StatTicker value={stat.value} suffix={stat.suffix} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <StatTicker value={stat.value} suffix={stat.suffix} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </p>
            </SpotlightCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Decorative role pill stack */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-2 flex flex-wrap gap-2"
      >
        {["Product Design", "Engineering", "Marketing", "Analytics", "Operations"].map(
          (role, i) => (
            <motion.span
              key={role}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring, delay: 1.3 + i * 0.07 }}
              className="rounded-md border border-[var(--border)] bg-[var(--muted)]/60 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--muted-foreground)]"
            >
              {role}
            </motion.span>
          )
        )}
      </motion.div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function HomeHero() {
  return (
    <main className="flex min-h-[100dvh] flex-col">
      {/* ── Two-panel hero ── */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[3fr_2fr]">
        {/* LEFT: Content pane */}
        <section className="relative flex flex-col overflow-hidden bg-[var(--background)] px-8 pb-0 pt-10 sm:px-14 sm:pt-14">
          <HeroGeometry />

          <div className="relative z-10 flex flex-1 flex-col">
            {/* Nav / wordmark */}
            <motion.div
              variants={fadeRight}
              initial="hidden"
              animate="show"
              className="mb-auto"
            >
              <Link
                href="/"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                descinder
              </Link>
            </motion.div>

            {/* Hero copy */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="py-16 lg:py-20"
            >
              {/* Eyebrow */}
              <motion.p
                variants={fadeUp}
                className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]"
              >
                Internship matching platform
              </motion.p>

              {/* Headline — controlled hierarchy, not oversized */}
              <motion.h1
                variants={fadeUp}
                className="text-4xl font-semibold tracking-tighter leading-none text-foreground md:text-5xl lg:text-[3.5rem]"
              >
                Find the work that{" "}
                <span className="text-[var(--accent)]">builds</span>
                <br />
                your career.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-[52ch] text-base leading-relaxed text-[var(--muted-foreground)]"
              >
                Descinder connects ambitious interns with startups and institutions that run
                structured programmes — applied skills, real output, tracked progress.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                <MagneticButton href="/signup" variant="primary">
                  Create an account
                </MagneticButton>
                <MagneticButton href="/login" variant="ghost">
                  Log in
                </MagneticButton>
              </motion.div>

              {/* Social proof line */}
              <motion.p
                variants={fadeUp}
                className="mt-6 flex items-center gap-2 text-xs text-[var(--muted-foreground)]"
              >
                <span className="flex -space-x-1.5">
                  {["/seed/ab1/32/32", "/seed/cd2/32/32", "/seed/ef3/32/32"].map((seed, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`https://picsum.photos${seed}`}
                      alt=""
                      aria-hidden="true"
                      className="h-6 w-6 rounded-full border-2 border-[var(--background)] object-cover"
                    />
                  ))}
                </span>
                3,847 interns matched this year
              </motion.p>
            </motion.div>

            {/* Marquee at bottom of left pane */}
            <MarqueeStrip />
          </div>
        </section>

        {/* RIGHT: Stats panel — navy tinted */}
        <aside className="hidden border-l border-[var(--border)] bg-[var(--secondary)] lg:flex lg:flex-col lg:justify-center">
          <RightPanel />
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-8 py-4 sm:px-14">
        <nav className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <span aria-hidden="true" className="select-none">
            ·
          </span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <span aria-hidden="true" className="select-none">
            ·
          </span>
          <Link href="/cookies" className="transition-colors hover:text-foreground">
            Cookies
          </Link>
        </nav>
      </footer>
    </main>
  );
}
