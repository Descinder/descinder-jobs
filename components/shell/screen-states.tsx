"use client";
import { Loader2, AlertCircle, Inbox } from "lucide-react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[oklch(0.50_0.03_264)]">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <AlertCircle className="h-6 w-6 text-red-500" />
      <p className="text-sm text-[oklch(0.22_0.08_264)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3 py-1.5 text-sm hover:bg-[oklch(0.97_0.01_264)]">
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <Inbox className="h-6 w-6 text-[oklch(0.66_0.02_264)]" />
      <p className="text-sm font-medium text-[oklch(0.22_0.08_264)]">{title}</p>
      {hint && <p className="text-xs text-[oklch(0.50_0.03_264)]">{hint}</p>}
    </div>
  );
}
