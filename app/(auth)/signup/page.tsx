"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { POLICY_VERSION } from "@/lib/consent";
import { apiSend, ApiError } from "@/lib/client/api";
import { Briefcase, Search, AlertCircle, Loader2, MailCheck } from "lucide-react";

// ─── Spring presets ───────────────────────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

type Role = "job_seeker" | "employer";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("job_seeker");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [acquisitionSource, setAcquisitionSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const res = await apiSend<{ next?: string; pending_confirmation?: boolean }>(
        "POST", "/api/auth/signup",
        { email, password, name, role, acquisition_source: acquisitionSource || undefined, marketing_consent: marketingOptIn, accepted_terms: acceptedTerms },
      );
      if (res.pending_confirmation) { setPendingConfirmation(true); return; }
      router.push(res.next ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create account.");
    } finally { setSubmitting(false); }
  }

  if (pendingConfirmation) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div
          variants={fadeUp}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <MailCheck size={20} strokeWidth={1.5} className="text-foreground" />
        </motion.div>
        <motion.div variants={fadeUp} className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>. Follow it to
            finish setting up your account.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-7"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Already have one?{" "}
          <a
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Log in
          </a>
        </p>
      </motion.div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Account credentials group */}
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-[0.7rem] text-muted-foreground">
              At least 8 characters.
            </p>
          </div>
        </motion.div>

        {/* Role selector */}
        <motion.div variants={fadeUp}>
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-foreground">I am a</legend>
            {/*
              Each radio <input> fills its card absolutely (opacity-0) so
              Playwright's .check() hits it directly. Visual content sits
              above via pointer-events-none spans on top.
            */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Job seeker card */}
              <div
                className={[
                  "relative rounded-lg border transition-all duration-150",
                  role === "job_seeker"
                    ? "border-foreground bg-foreground/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border-border bg-background hover:border-foreground/40",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="role"
                  value="job_seeker"
                  checked={role === "job_seeker"}
                  onChange={() => setRole("job_seeker")}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="pointer-events-none relative flex flex-col gap-2 p-3.5">
                  <Search size={15} strokeWidth={2} aria-hidden="true"
                    className={role === "job_seeker" ? "text-foreground" : "text-muted-foreground"} />
                  <span className="text-xs font-medium leading-none">Job seeker</span>
                  <span className="text-[0.65rem] leading-snug text-muted-foreground">
                    Find internships &amp; roles
                  </span>
                </span>
              </div>

              {/* Employer card */}
              <div
                className={[
                  "relative rounded-lg border transition-all duration-150",
                  role === "employer"
                    ? "border-foreground bg-foreground/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "border-border bg-background hover:border-foreground/40",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="role"
                  value="employer"
                  checked={role === "employer"}
                  onChange={() => setRole("employer")}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="pointer-events-none relative flex flex-col gap-2 p-3.5">
                  <Briefcase size={15} strokeWidth={2} aria-hidden="true"
                    className={role === "employer" ? "text-foreground" : "text-muted-foreground"} />
                  <span className="text-xs font-medium leading-none">Employer</span>
                  <span className="text-[0.65rem] leading-snug text-muted-foreground">
                    Post roles &amp; hire interns
                  </span>
                </span>
              </div>
            </div>
          </fieldset>
        </motion.div>

        {/* Optional metadata */}
        <motion.div variants={fadeUp} className="space-y-1.5">
          <Label htmlFor="acquisition">How did you hear about us? (optional)</Label>
          <select
            id="acquisition"
            value={acquisitionSource}
            onChange={(e) => setAcquisitionSource(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Prefer not to say</option>
            <option value="google">Google search</option>
            <option value="social_linkedin">LinkedIn</option>
            <option value="social_twitter">Twitter / X</option>
            <option value="social_other">Other social media</option>
            <option value="referral">A friend or colleague</option>
            <option value="press_blog">Press / blog article</option>
            <option value="event_university">Event or university</option>
            <option value="paid_ad">An advert</option>
            <option value="other">Other</option>
          </select>
        </motion.div>

        {/* Consent group */}
        <motion.div
          variants={fadeUp}
          className="space-y-3 border-t border-border pt-4"
        >
          <div className="flex items-start gap-2.5 text-sm">
            <Checkbox
              checked={acceptedTerms}
              onCheckedChange={(v) => setAcceptedTerms(v === true)}
              aria-label="I accept the Terms and Privacy policy"
              required
              className="mt-0.5 shrink-0"
            />
            <span className="cursor-default leading-snug text-muted-foreground">
              I accept the{" "}
              <a href="/terms" className="font-medium text-foreground underline underline-offset-4 hover:opacity-70">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="font-medium text-foreground underline underline-offset-4 hover:opacity-70">
                Privacy policy
              </a>
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-sm">
            <Checkbox
              checked={marketingOptIn}
              onCheckedChange={(v) => setMarketingOptIn(v === true)}
              aria-label="Send me product updates (optional)"
              className="mt-0.5 shrink-0"
            />
            <span className="cursor-default leading-snug text-muted-foreground">
              Send me product updates{" "}
              <span className="text-[0.7rem] opacity-60">(optional)</span>
            </span>
          </div>
        </motion.div>

        {/* Inline error */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ ...spring }}
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.div variants={fadeUp}>
          <Button
            type="submit"
            disabled={submitting || !acceptedTerms}
            className="w-full active:scale-[0.98] active:-translate-y-px transition-transform"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Creating account…
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
