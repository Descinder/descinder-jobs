"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiSend, ApiError } from "@/lib/client/api";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Token is carried by the callback-set cookie per the built backend —
      // do NOT add a token body field.
      await apiSend("POST", "/api/auth/password/reset", { new_password: password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ ...spring }}
          className="space-y-5"
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <ShieldCheck size={20} strokeWidth={1.5} className="text-foreground" />
          </motion.div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Password updated
            </h2>
            <p className="text-sm text-muted-foreground">
              Redirecting you to log in…
            </p>
          </div>

          {/* Amber progress bar */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.7, ease: "linear" }}
            style={{ originX: 0 }}
            className="h-0.5 w-full rounded-full bg-[oklch(0.72_0.18_75)]"
          />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          variants={container}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -20, transition: { duration: 0.15 } }}
          className="space-y-7"
        >
          <motion.div variants={fadeUp} className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Set new password
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose something strong — at least 8 characters.
            </p>
          </motion.div>

          <form onSubmit={onSubmit} className="space-y-5">
            <motion.div variants={fadeUp} className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
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
            </motion.div>

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
                    Updating…
                  </span>
                ) : (
                  "Update password"
                )}
              </Button>
            </motion.div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
