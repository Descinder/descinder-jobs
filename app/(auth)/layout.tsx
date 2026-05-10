import { AuthBrandPanel } from "@/components/auth-brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[3fr_2fr]">
      {/* Brand panel — client component for motion, hidden on mobile */}
      <AuthBrandPanel />

      {/* Form panel */}
      <section className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
        {/* Mobile-only wordmark */}
        <a
          href="/"
          className="mb-10 block text-base font-semibold tracking-tight text-foreground lg:hidden"
        >
          descinder
        </a>

        <div className="w-full max-w-sm">
          {children}
        </div>

        {/* Footer links */}
        <nav className="mt-12 flex items-center gap-4 text-xs text-muted-foreground">
          <a href="/privacy" className="transition-colors hover:text-foreground">Privacy</a>
          <span aria-hidden="true" className="select-none">·</span>
          <a href="/terms" className="transition-colors hover:text-foreground">Terms</a>
          <span aria-hidden="true" className="select-none">·</span>
          <a href="/cookies" className="transition-colors hover:text-foreground">Cookies</a>
        </nav>
      </section>
    </div>
  );
}
