import { requireUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <SettingsForm
        userId={user.id}
        email={user.email}
        marketingConsent={user.marketing_consent}
      />
      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Danger zone</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Account deletion and data export arrive in Plan 7.
        </p>
      </section>
    </div>
  );
}
