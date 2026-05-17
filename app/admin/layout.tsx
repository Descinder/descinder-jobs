"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/client/api";
import type { MeProfile } from "@/lib/client/types";
import { SiteHeader } from "@/components/shell/site-header";
import { Loading } from "@/components/shell/screen-states";

// Admin shell gate. Probes GET /api/me/profile on mount:
//  - 401            → /login (anonymous browser, never renders the shell)
//  - authed, !admin → static "Admins only" panel (NO redirect — would loop
//                      since a non-admin can never satisfy the gate)
//  - authed, admin  → SiteHeader + admin sub-nav + children
//  - 5xx/network    → stay loading (a transient outage must not boot a real
//                      admin or flash the 403)
// This only SHAPES the UI; every /api/admin/* route independently enforces
// requireRole(ctx.user,"admin") server-side (401 anon / 403 non-admin).
const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/ingestion", label: "Ingestion" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/approvals", label: "Approvals" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "admin" | "forbidden">("loading");

  useEffect(() => {
    let alive = true;
    apiGet<MeProfile>("/api/me/profile")
      .then((u) => {
        if (!alive) return;
        setState(u.role === "admin" ? "admin" : "forbidden");
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        // non-401 (5xx/network): stay loading, do not flash 403 / log out
      });
    return () => {
      alive = false;
    };
  }, [router]);

  if (state === "loading") {
    return (
      <div className="relative min-h-dvh bg-background">
        <SiteHeader />
        <Loading label="Checking access…" />
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="relative min-h-dvh bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-[640px] flex-col items-center gap-3 px-6 py-24 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
            Admins only
          </h1>
          <p className="text-sm text-[oklch(0.50_0.03_264)]">
            You do not have access to the admin control plane.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)]"
          >
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[1280px] px-6 py-6">
        <nav className="mb-6 flex flex-wrap gap-1 border-b border-[oklch(0.90_0.02_264)] pb-2 text-sm">
          {NAV.map((n) => {
            const active =
              n.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-1.5 font-medium ${
                  active
                    ? "bg-[oklch(0.22_0.08_264)] text-white"
                    : "text-[oklch(0.50_0.03_264)] hover:bg-[oklch(0.97_0.01_264)] hover:text-[oklch(0.22_0.08_264)]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <main className="relative z-10">{children}</main>
      </div>
    </div>
  );
}
