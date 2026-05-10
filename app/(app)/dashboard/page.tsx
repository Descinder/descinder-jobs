import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "job_seeker") {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("job_seeker_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) redirect("/onboarding/seeker");
    return <SeekerDashboard name={user.name} />;
  }

  if (user.role === "employer") {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) redirect("/onboarding/company");
    return <EmployerDashboard name={user.name} />;
  }

  return <p>Admin dashboard — coming in Plan 5.</p>;
}

function SeekerDashboard({ name }: { name: string | null }) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {name ?? "there"}</h1>
      <p className="text-muted-foreground">Job browsing arrives in Plan 2.</p>
    </div>
  );
}

function EmployerDashboard({ name }: { name: string | null }) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {name ?? "there"}</h1>
      <p className="text-muted-foreground">Job posting arrives in Plan 2.</p>
    </div>
  );
}
