import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./CompanyForm";

export default async function CompanyPage() {
  const user = await requireRole("employer");
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies(*)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership?.companies) redirect("/onboarding/company");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Company</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How your organisation appears on listings and intern profiles.
        </p>
      </div>
      <CompanyForm company={membership.companies} />
    </div>
  );
}
