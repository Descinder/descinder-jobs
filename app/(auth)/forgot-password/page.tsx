"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, MailCheck } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ ...spring }}
          className="space-y-5"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <MailCheck size={20} strokeWidth={1.5} className="text-foreground" />
          </motion.div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a reset link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Follow it to choose a new password.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it?{" "}
            <button
              type="button"
              onClick={() => { setSent(false); }}
              className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Try again
            </button>
          </p>
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
              Reset password
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </motion.div>

          <form onSubmit={onSubmit} className="space-y-5">
            <motion.div variants={fadeUp} className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
                className="w-full active:scale-[0.98] active:-translate-y-px transition-transform"
              >
                Send reset link
              </Button>
            </motion.div>
          </form>

          <motion.p variants={fadeUp} className="text-sm text-muted-foreground">
            Remembered it?{" "}
            <a
              href="/login"
              className="font-medium text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Back to log in
            </a>
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
