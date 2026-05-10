"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onMagicLink() {
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify` },
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMagicLinkSent(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          New here? <a className="underline underline-offset-4" href="/signup">Create an account</a>.
        </p>
      </div>

      <form onSubmit={onPasswordSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="/forgot-password" className="text-xs underline underline-offset-4">Forgot?</a>
          </div>
          <Input id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <div className="relative text-center">
        <hr className="border-t border-border" />
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
          or
        </span>
      </div>

      <Button type="button" variant="outline" className="w-full"
        onClick={onMagicLink} disabled={!email || submitting}>
        Send me a magic link
      </Button>

      {magicLinkSent && (
        <p className="text-sm text-muted-foreground">Check your email — we sent you a link.</p>
      )}
    </div>
  );
}
