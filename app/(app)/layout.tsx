import { Nav } from "@/components/nav";
import { AppAmbient } from "@/components/app-ambient";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="relative min-h-dvh bg-background">
      {/* Ambient background — client component, pointer-events-none, fixed */}
      <AppAmbient />

      {/* Sticky nav */}
      <Nav user={{ name: user.name, role: user.role }} />

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-350 px-6 py-10 md:px-10">
        {children}
      </main>
    </div>
  );
}
