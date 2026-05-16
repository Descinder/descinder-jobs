import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/server/repos/db";
import { SeekerBento, EmployerBento } from "@/components/dashboard/bento-grid";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "job_seeker") {
    const { data: profile } = await db()
      .from("job_seeker_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) redirect("/onboarding/seeker");
    return <SeekerBento name={user.name ?? "there"} />;
  }

  if (user.role === "employer") {
    const { data: membership } = await db()
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) redirect("/onboarding/company");
    return <EmployerBento name={user.name ?? "there"} />;
  }

  return <p className="text-muted-foreground text-sm">Admin dashboard — coming in Plan 5.</p>;
}
