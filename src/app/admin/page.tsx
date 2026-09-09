import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin(); // server-side gate — hiding the nav link is not the control

  const [users, opportunities, published, flags, recentSignups] = await Promise.all([
    db.user.count(),
    db.opportunity.count(),
    db.opportunity.count({ where: { status: "published" } }),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { email: true, role: true, createdAt: true } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <Badge tone="accent">server-enforced</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Users" value={users} />
        <Stat label="Opportunities" value={`${published}/${opportunities} published`} />
        <Stat label="Feature flags" value={flags.length} />
      </div>

      <Card>
        <CardHeader><CardTitle>Feature flags</CardTitle></CardHeader>
        <CardContent className="divide-y text-sm">
          {flags.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">{f.key}</p>
                <p className="text-xs text-muted">{f.description}</p>
              </div>
              <Badge tone={f.state === "on" ? "success" : f.state === "off" ? "neutral" : "warning"}>{f.state}</Badge>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted">Editing UI ships with the admin CRUD in Phase 7. Toggle via DB / seed for now.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent signups</CardTitle></CardHeader>
        <CardContent className="divide-y text-sm">
          {recentSignups.map((u) => (
            <div key={u.email} className="flex items-center justify-between py-2">
              <span>{u.email}</span>
              <span className="text-xs text-muted">{u.role} · {u.createdAt.toLocaleDateString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
