"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { POLICY_VERSION } from "@/lib/consent";

type Role = "job_seeker" | "employer";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("job_seeker");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [acquisitionSource, setAcquisitionSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });
      if (signUpError) throw signUpError;
      const userId = data.user?.id;
      if (!userId) throw new Error("Signup failed — no user id returned");

      await supabase
        .from("users")
        .update({
          role,
          acquisition_source: (acquisitionSource || null) as
            | "google" | "social_linkedin" | "social_twitter" | "social_other"
            | "referral" | "press_blog" | "event_university" | "paid_ad" | "other" | null,
          marketing_consent: marketingOptIn,
          marketing_consent_at: marketingOptIn ? new Date().toISOString() : null,
        })
        .eq("id", userId);

      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "terms_accepted",
          policy_version: POLICY_VERSION,
          metadata: { user_id: userId },
        }),
      });
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "privacy_accepted",
          policy_version: POLICY_VERSION,
          metadata: { user_id: userId },
        }),
      });
      if (marketingOptIn) {
        await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "marketing_opt_in",
            policy_version: POLICY_VERSION,
            metadata: { user_id: userId },
          }),
        });
      }

      router.push(role === "job_seeker" ? "/onboarding/seeker" : "/onboarding/company");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Already have one? <a className="underline underline-offset-4" href="/login">Log in</a>.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">I am a</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="job_seeker"
              checked={role === "job_seeker"} onChange={() => setRole("job_seeker")} />
            <span>job seeker</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="employer"
              checked={role === "employer"} onChange={() => setRole("employer")} />
            <span>employer (I&apos;m hiring)</span>
          </label>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="acquisition">How did you hear about us? (optional)</Label>
          <select id="acquisition" value={acquisitionSource}
            onChange={(e) => setAcquisitionSource(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
        </div>

        <div className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={acceptedTerms}
            onCheckedChange={(v) => setAcceptedTerms(v === true)}
            aria-label="I accept the Terms and Privacy policy"
            required
          />
          <span className="cursor-default leading-snug">
            I accept the <a href="/terms" className="underline">Terms</a> and{" "}
            <a href="/privacy" className="underline">Privacy policy</a>
          </span>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={marketingOptIn}
            onCheckedChange={(v) => setMarketingOptIn(v === true)}
            aria-label="Send me product updates (optional)"
          />
          <span className="cursor-default leading-snug">
            Send me product updates (optional)
          </span>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting || !acceptedTerms} className="w-full">
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
}
