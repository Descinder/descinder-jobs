import { requireUser } from "@/lib/auth";
import { db } from "@/lib/server/repos/db";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();
  const { data: seekerProfile } = await db()
    .from("job_seeker_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.role === "job_seeker"
            ? "How startups and institutions see you."
            : "Your account identity."}
        </p>
      </div>
      <ProfileForm
        userId={user.id}
        name={user.name ?? ""}
        seeker={seekerProfile}
        role={user.role}
      />
    </div>
  );
}
