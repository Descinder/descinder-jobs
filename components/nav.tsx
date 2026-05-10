import Link from "next/link";
import { Button } from "@/components/ui/button";

export async function Nav({ user }: { user: { name: string | null; role: string } }) {
  return (
    <nav className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">descinder</Link>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {user.role === "employer" && <Link href="/company" className="hover:text-foreground">Company</Link>}
          <Link href="/profile" className="hover:text-foreground">Profile</Link>
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
        </div>
      </div>
      <form action="/api/auth/signout" method="post">
        <Button type="submit" variant="outline" size="sm">Log out</Button>
      </form>
    </nav>
  );
}
