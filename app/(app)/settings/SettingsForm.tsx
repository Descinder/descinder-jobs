"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({
  userId,
  email,
  marketingConsent: initialMarketing,
}: {
  userId: string;
  email: string;
  marketingConsent: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [marketing, setMarketing] = useState(initialMarketing);
  const [saving, setSaving] = useState(false);

  async function toggleMarketing(next: boolean) {
    setMarketing(next);
    setSaving(true);
    await supabase
      .from("users")
      .update({
        marketing_consent: next,
        marketing_consent_at: next ? new Date().toISOString() : null,
      })
      .eq("id", userId);
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="max-w-xl space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="font-medium">{email}</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={marketing} onCheckedChange={(v) => toggleMarketing(v === true)} disabled={saving} />
        <span>Send me product updates by email</span>
      </label>
      <a href="/forgot-password" className={cn(buttonVariants({ variant: "outline" }))}>
        Change password
      </a>
    </section>
  );
}
