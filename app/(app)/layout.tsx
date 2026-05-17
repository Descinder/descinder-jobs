import { SiteHeader } from "@/components/shell/site-header";
import { AppAmbient } from "@/components/app-ambient";
import { PaywallProvider } from "@/components/paywall-modal";
import { AuthGate } from "./AuthGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-background">
      {/* Ambient background — client component, pointer-events-none, fixed */}
      <AppAmbient />

      {/* Shared shell header (3a) */}
      <SiteHeader />

      {/* Client auth-gate: anon → /login; server still enforces per-endpoint.
          PaywallProvider mounts the app-wide paywall modal (402 PAYWALL). */}
      <AuthGate>
        <PaywallProvider>
          <main className="relative z-10 mx-auto max-w-350 px-6 py-10 md:px-10">
            {children}
          </main>
        </PaywallProvider>
      </AuthGate>
    </div>
  );
}
