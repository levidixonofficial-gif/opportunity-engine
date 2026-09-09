import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "@/lib/auth/actions";
import { unreadCount } from "@/server/services/notifications";
import { NavLinks, MobileBottomNav, MobileMenuButton } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GlobalSearchTrigger } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { BackToTop } from "@/components/ui/back-to-top";
import { ContactButton } from "@/components/contact-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { onboardedAt: true },
  });
  if (!profile?.onboardedAt) redirect("/onboarding");

  const [sub, unread] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id }, select: { plan: true } }),
    unreadCount(user.id),
  ]);

  const signOutButton = (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
        Sign out
      </Button>
    </form>
  );

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-surface md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-accent-fg">OE</span>
          Opportunity Engine
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="space-y-3 border-t p-3 text-sm">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="truncate text-muted" title={user.email}>
              {user.email}
            </span>
            <Badge tone={sub?.plan === "free" ? "neutral" : "accent"}>{sub?.plan ?? "free"}</Badge>
          </div>
          {user.role === "admin" && (
            <Link href="/admin" className="block px-1 text-xs text-accent hover:underline">
              Admin →
            </Link>
          )}
          {signOutButton}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-surface/90 px-4 backdrop-blur md:h-16 md:px-6">
          <MobileMenuButton>{signOutButton}</MobileMenuButton>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
            <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-accent-fg">OE</span>
          </Link>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0 md:w-full">
            <GlobalSearchTrigger className="md:w-72" />
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell initialUnread={unread} />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-10">
          {children}
        </main>
        <MobileBottomNav />
      </div>

      <BackToTop />
      <ContactButton />
    </div>
  );
}
