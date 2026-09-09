import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/misc";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/opportunities", label: "Opportunities" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // server-enforced at the layout — every /admin/* route inherits this

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← App
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <Badge tone="accent">server-enforced</Badge>
      </div>
      <nav className="mb-6 flex gap-1 rounded-md border bg-surface p-0.5 text-sm">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="rounded px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-foreground">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
