"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("1-10");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSubmitting(false); return; }

    const baseSlug = slugify(name) || `company-${Date.now()}`;
    let slug = baseSlug;
    for (let i = 1; i < 50; i++) {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${i}`;
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        name,
        slug,
        website: website || null,
        location: location || null,
        size,
        description: description || null,
      })
      .select()
      .single();
    if (companyErr || !company) {
      setError(companyErr?.message ?? "Failed to create company");
      setSubmitting(false);
      return;
    }

    const { error: memberErr } = await supabase
      .from("company_members")
      .insert({ company_id: company.id, user_id: user.id, role: "owner" });
    if (memberErr) { setError(memberErr.message); setSubmitting(false); return; }

    setSubmitting(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Set up your company</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is what candidates will see when they look at your jobs.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" type="url" placeholder="https://example.com"
            value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="e.g. London, UK"
            value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="size">Company size</Label>
          <select id="size" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="201-500">201–500</option>
            <option value="501+">501+</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Short description (optional)</Label>
          <Textarea id="description" rows={4} value={description}
            onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Continue"}
        </Button>
      </form>
    </main>
  );
}
