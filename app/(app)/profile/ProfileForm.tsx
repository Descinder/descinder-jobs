"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type SeekerProfile = Database["public"]["Tables"]["job_seeker_profiles"]["Row"];

// ─── Spring preset (matches project-wide convention) ─────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

// ─── Save-state machine ───────────────────────────────────────────────────────
type SaveState = "idle" | "saving" | "saved" | "error";

// ─── Profile completeness signal ─────────────────────────────────────────────
function CompletenessBar({ score }: { score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Profile strength
        </span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {score}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-[oklch(0.72_0.18_75)]"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ ...spring, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ─── Skill pill ───────────────────────────────────────────────────────────────
function SkillPill({ label }: { label: string }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={spring}
      className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2.5 py-0.5 text-[0.7rem] font-medium text-muted-foreground"
    >
      {label}
    </motion.span>
  );
}

// ─── Tips card (right panel) ──────────────────────────────────────────────────
function TipsCard({ isSeeker }: { isSeeker: boolean }) {
  const tips = isSeeker
    ? [
        "A specific headline gets 3× more views than a generic one.",
        "List 5–10 concrete skills — tools, languages, frameworks.",
        "Keep your bio under 200 words; focus on what you've built.",
      ]
    : [
        "A complete name helps startups and institutions find you.",
        "You can add a profile photo once your account is verified.",
      ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Tips
      </p>
      <ul className="mt-3 space-y-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.72_0.18_75)]" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Save button with animated states ────────────────────────────────────────
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
export function ProfileForm({
  userId,
  name: initialName,
  seeker,
  role,
}: {
  userId: string;
  name: string;
  seeker: SeekerProfile | null;
  role: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(seeker?.headline ?? "");
  const [location, setLocation] = useState(seeker?.location ?? "");
  const [bio, setBio] = useState(seeker?.bio ?? "");
  const [skillsRaw, setSkillsRaw] = useState((seeker?.skills ?? []).join(", "));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const isSeeker = role === "job_seeker";

  // Parse skills for pill preview
  const parsedSkills = useMemo(
    () => skillsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    [skillsRaw]
  );

  // Profile completeness score
  const completeness = useMemo(() => {
    if (!isSeeker) return name.trim() ? 100 : 20;
    let score = 0;
    if (name.trim()) score += 20;
    if (headline.trim()) score += 25;
    if (location.trim()) score += 15;
    if (parsedSkills.length > 0) score += 25;
    if (bio.trim().length > 30) score += 15;
    return score;
  }, [name, headline, location, parsedSkills, bio, isSeeker]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setError(null);

    const { error: nameErr } = await supabase
      .from("users")
      .update({ name: name || null })
      .eq("id", userId);

    if (nameErr) {
      setError(nameErr.message);
      setSaveState("error");
      return;
    }

    if (isSeeker) {
      const skills = parsedSkills;
      const { error: profileErr } = await supabase
        .from("job_seeker_profiles")
        .upsert({
          user_id: userId,
          headline: headline || null,
          location: location || null,
          bio: bio || null,
          skills,
        });
      if (profileErr) {
        setError(profileErr.message);
        setSaveState("error");
        return;
      }
    }

    setSaveState("saved");
    router.refresh();

    // Reset to idle after 2.4 s so button is re-usable
    setTimeout(() => setSaveState("idle"), 2400);
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
      {/* ── Left: form ── */}
      <form onSubmit={onSubmit} className="space-y-0">
        {/* Section: Identity */}
        <section className="pb-8">
          <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Identity
          </p>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="h-9"
            />
          </div>
        </section>

        {/* Section: Professional (seeker only) */}
        {isSeeker && (
          <section className="space-y-5 border-t border-border pt-8">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Professional
            </p>

            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Frontend engineer focused on performance"
                className="h-9"
              />
              <p className="text-[0.72rem] text-muted-foreground">
                One line that describes your professional focus.
              </p>
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

            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                placeholder="TypeScript, React, Node.js"
                className="h-9"
              />
              <AnimatePresence>
                {parsedSkills.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 flex flex-wrap gap-1.5 overflow-hidden"
                  >
                    {parsedSkills.map((skill) => (
                      <SkillPill key={skill} label={skill} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">Bio</Label>
                <span
                  className={cn(
                    "font-mono text-[0.68rem] tabular-nums transition-colors",
                    bio.length > 280
                      ? "text-destructive"
                      : bio.length > 200
                      ? "text-[oklch(0.72_0.18_75)]"
                      : "text-muted-foreground"
                  )}
                >
                  {bio.length}/300
                </span>
              </div>
              <Textarea
                id="bio"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell startups and institutions what you've built and what you're working toward."
                maxLength={300}
              />
              <p className="text-[0.72rem] text-muted-foreground">
                Keep it under 200 words — concrete beats comprehensive.
              </p>
            </div>
          </section>
        )}

        {/* Footer: error + save */}
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

            {/* "Saved." text node — required by E2E test */}
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

      {/* ── Right: sidebar ── */}
      <aside className="space-y-5">
        <CompletenessBar score={completeness} />
        <div className="h-px bg-border" />
        <TipsCard isSeeker={isSeeker} />
      </aside>
    </div>
  );
}
