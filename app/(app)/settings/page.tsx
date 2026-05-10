import { requireUser } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, notifications, and privacy preferences.
        </p>
      </div>
      <SettingsForm
        userId={user.id}
        email={user.email}
        marketingConsent={user.marketing_consent}
      />
    </div>
  );
}
