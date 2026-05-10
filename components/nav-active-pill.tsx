"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 320, damping: 34 };

interface NavItem {
  href: string;
  label: string;
}

export function NavActiveLinks({
  items,
}: {
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
              active
                ? "text-[var(--foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active-pill"
                className="absolute inset-0 rounded-md bg-[var(--accent)]/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                transition={spring}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function NavSignoutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)]",
          "bg-[var(--background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]",
          "transition-colors duration-150 hover:bg-[var(--muted)]",
          "active:scale-[0.98] active:translate-y-px",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.06)]"
        )}
      >
        Sign out
      </button>
    </form>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const label = role === "employer" ? "Employer" : "Job seeker";
  const isEmployer = role === "employer";
  return (
    <span
      className={cn(
        "hidden items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider sm:inline-flex",
        isEmployer
          ? "bg-[var(--accent)]/14 text-[oklch(0.55_0.12_75)]"
          : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
      )}
    >
      {label}
    </span>
  );
}
