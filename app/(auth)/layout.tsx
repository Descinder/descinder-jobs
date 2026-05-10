export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      <aside className="hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <a href="/" className="text-xl font-semibold tracking-tight">descinder</a>
        <p className="max-w-sm text-pretty text-2xl leading-tight tracking-tight">
          Hire smarter. Find better. Built for serious work.
        </p>
        <span className="text-xs opacity-60">© Descinder Jobs</span>
      </aside>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
