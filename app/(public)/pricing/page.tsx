"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";

export default function PricingPage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function subscribe() {
    setBusy(true); setMsg(null);
    try {
      await apiGet("/api/me/profile"); // 401 → anon
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { router.push("/signup?next=/pricing"); return; }
    }
    try {
      await apiSend("POST", "/api/me/billing/subscribe", { plan: "seeker_monthly" });
      router.push("/settings/billing");
    } catch (e) {
      if (e instanceof ApiError && e.code === "CONFLICT") setMsg("Subscriptions aren't available on this environment yet.");
      else if (e instanceof ApiError && e.status === 401) router.push("/signup?next=/pricing");
      else setMsg("Couldn't start checkout. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-14 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">One plan. Everything to land the role.</h1>
      <p className="mt-2 text-sm text-[oklch(0.50_0.03_264)]">Browsing and external applies are always free. Subscribe for AI-tailored CVs, native applies, unified tracking and instant alerts.</p>
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[oklch(0.84_0.03_264)] bg-white p-6 text-left shadow-[0_4px_16px_oklch(0_0_0/0.10)]">
        <p className="font-mono text-2xl font-bold text-[oklch(0.22_0.08_264)]">£14.99<span className="text-sm font-normal text-[oklch(0.50_0.03_264)]">/month</span></p>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-[oklch(0.22_0.08_264)]">
          <li>AI-tailored CV per role</li><li>Apply natively on Descinder</li><li>Unified application tracking</li><li>Instant job alerts</li>
        </ul>
        <button onClick={subscribe} disabled={busy} className="mt-6 w-full rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-3 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-50">
          {busy ? "Starting…" : "Subscribe"}
        </button>
        {msg && <p className="mt-3 text-center text-sm text-[oklch(0.50_0.03_264)]">{msg}</p>}
      </div>
    </main>
  );
}
