import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-fg text-sm">OE</span>
            Opportunity Engine
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
            <Link href="/opportunities" className="hover:text-foreground">Opportunities</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className={buttonVariants()}>Go to dashboard</Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm text-muted hover:text-foreground">Sign in</Link>
                <Link href="/sign-in" className={buttonVariants()}>Start exploring</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Opportunity Engine. Not financial advice. No income is guaranteed.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
