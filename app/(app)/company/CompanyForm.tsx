"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

// ─── Spring preset ────────────────────────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

// ─── Save-state machine ───────────────────────────────────────────────────────
type SaveState = "idle" | "saving" | "saved" | "error";

// ─── Listing preview card ─────────────────────────────────────────────────────
function ListingPreview({
  name,
  website,
  location,
  size,
  description,
}: {
  name: string;
  website: string;
  location: string;
  size: string;
  description: string;
}) {
  const displayName = name.trim() || "Your company name";
  const displayDesc = description.trim() || "Add a description to tell interns what you do and why they should apply.";
  const domain = website
    ? website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
      <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Listing preview
      </p>

      {/* Company identity row */}
      <div className="flex items-start gap-3">
        {/* Avatar placeholder — logo upload comes in a later plan */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-sm font-semibold text-muted-foreground">
          {displayName[0]?.toUpperCase() ?? "C"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {displayName}
          </p>
          {(location || domain) && (
            <p className="mt-0.5 truncate text-[0.72rem] text-muted-foreground">
              {[location, domain].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-3.5 line-clamp-3 text-[0.78rem] leading-relaxed text-muted-foreground">
        {displayDesc}
      </p>

      {/* Meta pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {size && (
          <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
            {size} employees
          </span>
        )}
        <span className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
          Preview only
        </span>
      </div>
    </div>
  );
}

// ─── Logo upload placeholder (future state) ───────────────────────────────────
function LogoUploadPlaceholder() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <svg
          className="h-5 w-5 text-muted-foreground"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="16" height="16" rx="3" />
          <path d="M6.5 13.5l3-4 2.5 3 1.5-2 2.5 3" />
          <circle cx="7" cy="7.5" r="1" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Company logo</p>
        <p className="mt-0.5 text-[0.72rem] text-muted-foreground">
          Logo upload coming in a later release.
        </p>
      </div>
    </div>
  );
}

// ─── Save button ──────────────────────────────────────────────────────────────
function SaveButton({ state }: { state: SaveState }) {
  return (
    <Button
      type="submit"
      disabled={state === "saving" || state === "saved"}
      size="default"
      className="relative min-w-[120px] active:scale-[0.98] active:-translate-y-px transition-transform"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            Save changes
          </motion.span>
        )}
        {state === "saving" && (
          <motion.span
            key="saving"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <motion.span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, ease: "linear", repeat: Infinity }}
            />
            Saving
          </motion.span>
        )}
        {state === "saved" && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className="flex items-center gap-1.5"
          >
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="h-3.5 w-3.5"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path d="M2 7l4 4 6-6" />
            </motion.svg>
            Saved
          </motion.span>
        )}
        {state === "error" && (
          <motion.span
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Try again
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function CompanyForm({ company }: { company: Company }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(company.name);
  const [website, setWebsite] = useState(company.website ?? "");
  const [location, setLocation] = useState(company.location ?? "");
  const [size, setSize] = useState(company.size ?? "1-10");
  const [description, setDescription] = useState(company.description ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setError(null);
    const { error: err } = await supabase
      .from("companies")
      .update({
        name,
        website: website || null,
        location: location || null,
        size,
        description: description || null,
      })
      .eq("id", company.id);

    if (err) {
      setError(err.message);
      setSaveState("error");
      return;
    }

    setSaveState("saved");
    router.refresh();
    setTimeout(() => setSaveState("idle"), 2400);
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">
      {/* ── Left: form ── */}
      <form onSubmit={onSubmit} className="space-y-0">
        {/* Logo placeholder */}
        <div className="pb-8">
          <LogoUploadPlaceholder />
        </div>

        {/* Section: Public profile */}
        <section className="space-y-5 border-t border-border pt-8">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Public profile
          </p>

          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your company do? What kind of work will interns be doing?"
            />
            <p className="text-[0.72rem] text-muted-foreground">
              Shown on all your job listings — keep it under 150 words.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London, UK"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Team size</Label>
            <select
              id="size"
              className={cn(
                "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                "transition-colors outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              <option value="1-10">1–10 people</option>
              <option value="11-50">11–50 people</option>
              <option value="51-200">51–200 people</option>
              <option value="201-500">201–500 people</option>
              <option value="501+">501+ people</option>
            </select>
          </div>
        </section>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-border pt-7">
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4">
            <SaveButton state={saveState} />
            <AnimatePresence>
              {saveState === "saved" && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="text-sm text-[oklch(0.72_0.18_75)]"
                >
                  Saved.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>

      {/* ── Right: preview ── */}
      <aside>
        <ListingPreview
          name={name}
          website={website}
          location={location}
          size={size}
          description={description}
        />
      </aside>
    </div>
  );
}
