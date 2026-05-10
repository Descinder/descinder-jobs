import Link from "next/link";
import { NavActiveLinks, NavSignoutButton, RoleBadge } from "@/components/nav-active-pill";

export async function Nav({
  user,
}: {
  user: { name: string | null; role: string };
}) {
  const items = [
    ...(user.role === "employer" ? [{ href: "/company", label: "Company" }] : []),
    { href: "/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        borderBottom: "1px solid oklch(0.90 0.02 264 / 0.6)",
        background: "oklch(1 0 0 / 0.82)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        boxShadow: "0 1px 0 0 oklch(0.90 0.02 264 / 0.4), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
        {/* Left: wordmark + nav links */}
        <div className="flex items-center gap-7">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight text-[var(--foreground)] transition-opacity hover:opacity-70"
          >
            descinder
          </Link>

          <NavActiveLinks items={items} />
        </div>

        {/* Right: identity + signout */}
        <div className="flex items-center gap-3">
          {/* User identity */}
          <div className="hidden items-center gap-2.5 sm:flex">
            {user.name && (
              <span className="text-sm font-medium text-[var(--foreground)] tabular-nums">
                {user.name}
              </span>
            )}
            <RoleBadge role={user.role} />
          </div>

          {/* Divider */}
          <div className="hidden h-4 w-px bg-[var(--border)] sm:block" aria-hidden="true" />

          <NavSignoutButton />
        </div>
      </nav>
    </header>
  );
}
