import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: seekerProfile } = await supabase
    .from("job_seeker_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <ProfileForm
        userId={user.id}
        name={user.name ?? ""}
        seeker={seekerProfile}
        role={user.role}
      />
    </div>
  );
}
