import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
      <section className="flex flex-col justify-between bg-background p-8 sm:p-16">
        <header>
          <span className="text-lg font-semibold tracking-tight">descinder</span>
        </header>
        <div className="max-w-2xl">
          <h1 className="text-balance text-5xl font-semibold tracking-tighter sm:text-6xl">
            Hire smarter. Find better.
          </h1>
          <p className="mt-4 max-w-md text-pretty text-muted-foreground">
            A focused job board for serious work. Marketing surface arrives in Plan 8 — for now,
            sign up and explore.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/signup" className={buttonVariants({ variant: "default" })}>
              Create an account
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Log in
            </Link>
          </div>
        </div>
        <footer className="text-xs text-muted-foreground">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/cookies">Cookies</Link>
        </footer>
      </section>
      <aside className="hidden bg-primary lg:block" />
    </main>
  );
}
