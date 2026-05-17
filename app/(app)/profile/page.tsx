"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client/api";
import { Loading, ErrorState } from "@/components/shell/screen-states";
import { ProfileForm } from "./ProfileForm";

// GET /api/me/profile → toMeProfile shape (verified lib/shared/dto.ts#toMeProfile).
// seeker keys are camelCase here (yearsExperience/desiredRoleTypes/...), distinct
// from the snake_case PUT /api/me/seeker-profile schema (seekerProfileSchema).
type MeProfile = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  seeker: {
    headline: string | null;
    bio: string | null;
    location: string | null;
    yearsExperience: number | null;
    skills: string[];
    desiredRoleTypes: string[];
    portfolioUrl: string | null;
    githubUrl: string | null;
    linkedinUrl: string | null;
  } | null;
};

export default function ProfilePage() {
  const [p, setP] = useState<MeProfile | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    apiGet<MeProfile>("/api/me/profile")
      .then((x) => {
        setP(x);
        setSt("ok");
      })
      .catch(() => setSt("error"));
  }, []);

  if (st === "loading") return <Loading />;
  if (st === "error" || !p)
    return <ErrorState message="Couldn't load your profile." />;

  const isSeeker = p.role === "job_seeker";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSeeker
            ? "How startups and institutions see you."
            : "Your account identity."}
        </p>
      </div>
      <ProfileForm
        name={p.name ?? ""}
        seeker={p.seeker}
        role={p.role}
      />
    </div>
  );
}
