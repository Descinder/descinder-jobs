"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/use-session";
import { apiSend } from "@/lib/client/api";

export function SiteHeader() {
  const s = useSession();
  const router = useRouter();
  async function logout() {
    try { await apiSend("POST", "/api/auth/logout"); } catch { /* ignore */ }
    router.push("/");
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-30 border-b border-[oklch(0.90_0.02_264)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3.5">
        <Link href="/" className="text-lg font-bold tracking-[-0.02em] text-[oklch(0.22_0.08_264)]">descinder</Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]">Jobs</Link>
          <Link href="/pricing" className="text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]">Pricing</Link>
          {(s.status === "loading" || s.status === "error") && <span className="h-4 w-16 animate-pulse rounded bg-[oklch(0.97_0.01_264)]" />}
          {s.status === "anon" && (
            <>
              <Link href="/login" className="text-[oklch(0.22_0.08_264)] hover:opacity-80">Log in</Link>
              <Link href="/signup" className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 font-semibold text-white hover:bg-[oklch(0.28_0.08_264)]">Sign up</Link>
            </>
          )}
          {s.status === "authed" && (
            <>
              {s.user.role === "admin" && <Link href="/admin" className="text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]">Admin</Link>}
              {s.user.role === "job_seeker" && <Link href="/alerts" className="text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]">Alerts</Link>}
              <Link href="/dashboard" className="text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]">Dashboard</Link>
              <button onClick={logout} className="text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]">Log out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
