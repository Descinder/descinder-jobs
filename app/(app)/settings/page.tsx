import { SettingsForm } from "./SettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, subscription, and privacy preferences.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
