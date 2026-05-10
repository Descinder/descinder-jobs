"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export default function SeekerOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in"); setSubmitting(false); return; }
    const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const { error: err } = await supabase
      .from("job_seeker_profiles")
      .upsert({
        user_id: user.id,
        headline: headline || null,
        location: location || null,
        bio: bio || null,
        skills,
      });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Tell us about yourself</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You can come back and edit any of this later.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" placeholder="e.g. Senior Frontend Engineer"
            value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" placeholder="e.g. London, UK"
            value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="skills">Skills (comma-separated)</Label>
          <Input id="skills" placeholder="e.g. typescript, react, postgres"
            value={skillsRaw} onChange={(e) => setSkillsRaw(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Short bio (optional)</Label>
          <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Saving..." : "Continue"}
        </Button>
      </form>
    </main>
  );
}
