"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type SeekerProfile = Database["public"]["Tables"]["job_seeker_profiles"]["Row"];

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: nameErr } = await supabase
      .from("users")
      .update({ name: name || null })
      .eq("id", userId);
    if (nameErr) { setError(nameErr.message); setSaving(false); return; }

    if (role === "job_seeker") {
      const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      const { error: profileErr } = await supabase
        .from("job_seeker_profiles")
        .upsert({
          user_id: userId,
          headline: headline || null,
          location: location || null,
          bio: bio || null,
          skills,
        });
      if (profileErr) { setError(profileErr.message); setSaving(false); return; }
    }

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {role === "job_seeker" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" value={skillsRaw} onChange={(e) => setSkillsRaw(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
