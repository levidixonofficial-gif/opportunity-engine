import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signOut } from "@/lib/auth/actions";
import { Sidebar, MobileNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");

  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { onboardedAt: true } });
  if (!profile?.onboardedAt) redirect("/onboarding");

  const sub = await db.subscription.findUnique({ where: { userId: user.id }, select: { plan: true } });

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r bg-surface md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-fg text-sm">OE</span>
          Opportunity Engine
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="border-t p-3 text-sm">
          <div className="flex items-center justify-between px-2">
            <span className="truncate text-muted">{user.email}</span>
            <Badge tone={sub?.plan === "free" ? "neutral" : "accent"}>{sub?.plan ?? "free"}</Badge>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="mt-2 w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-surface px-5 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-accent text-accent-fg text-sm">OE</span>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">Sign out</Button>
          </form>
        </header>

        <main className="flex-1 px-5 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
