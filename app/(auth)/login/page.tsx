"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend, ApiError } from "@/lib/client/api";
import { AlertCircle, Loader2, Sparkles, MailCheck } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiSend("POST", "/api/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onMagicLink() {
    setError(null);
    setSubmitting(true);
    try {
      await apiSend("POST", "/api/auth/magic-link", { email });
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send magic link");
    } finally {
      setSubmitting(false);
    }
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
          Log in
        </h1>
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <a
            href="/signup"
            className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
          >
            Create an account
          </a>
        </p>
      </motion.div>

      {/* Password form */}
      <form onSubmit={onPasswordSubmit} className="space-y-5">
        <motion.div variants={fadeUp} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a
                href="/forgot-password"
                className="text-[0.7rem] text-muted-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Forgot?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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

        <motion.div variants={fadeUp}>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full active:scale-[0.98] active:-translate-y-px transition-transform"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Logging in…
              </span>
            ) : (
              "Log in"
            )}
          </Button>
        </motion.div>
      </form>

      {/* Divider */}
      <motion.div variants={fadeUp} className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </motion.div>

      {/* Magic link */}
      <AnimatePresence mode="wait">
        {magicLinkSent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ ...spring }}
            className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3.5 text-sm"
          >
            <MailCheck size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-foreground" />
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">Check your email</p>
              <p className="text-[0.75rem] text-muted-foreground">
                We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="button"
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 active:scale-[0.98] active:-translate-y-px transition-transform"
              onClick={onMagicLink}
              disabled={!email || submitting}
            >
              <Sparkles size={14} strokeWidth={2} />
              Send me a magic link
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
