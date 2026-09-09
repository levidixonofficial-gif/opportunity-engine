import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AttributionCapture } from "@/components/attribution-capture";
import { BackToTop } from "@/components/ui/back-to-top";
import { MarketingMobileNav } from "@/components/marketing-nav";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  return (
    <div className="flex min-h-full flex-col">
      <AttributionCapture />
      <header className="sticky top-0 z-30 border-b bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-accent-fg">OE</span>
            <span className="hidden sm:inline">Opportunity Engine</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            {user ? (
              <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="hidden text-sm text-muted hover:text-foreground sm:inline">
                  Sign in
                </Link>
                <Link href="/sign-in" className={buttonVariants({ size: "sm" })}>
                  Start exploring
                </Link>
              </>
            )}
            <MarketingMobileNav items={NAV} signedIn={!!user} />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

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

      <BackToTop />
    </div>
  );
}
