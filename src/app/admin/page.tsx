import { adminOverview } from "@/server/services/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { FlagToggle } from "./FlagToggle";

export const metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const o = await adminOverview();

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Users" value={`${o.users} (${o.admins} admin)`} />
        <Stat label="Opportunities" value={`${o.published}/${o.opps} published`} />
        <Stat label="Feature flags" value={String(o.flags.length)} />
        <Stat label="New feedback" value={String(o.feedbackNew)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Feature flags</CardTitle></CardHeader>
        <CardContent className="divide-y text-sm">
          {o.flags.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="font-medium">{f.key}</p>
                <p className="text-xs text-muted">{f.description}</p>
              </div>
              <FlagToggle flagKey={f.key} state={f.state} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent audit log</CardTitle></CardHeader>
        <CardContent className="divide-y text-sm">
          {o.recentAudit.length === 0 ? (
            <p className="py-2 text-muted">No events yet.</p>
          ) : (
            o.recentAudit.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <Badge>{a.action}</Badge>{" "}
                  <span className="text-muted">{a.targetType ?? ""} {a.targetId ?? ""}</span>
                </span>
                <span className="text-xs text-muted-2">
                  {a.actor?.email ?? "system"} · {a.createdAt.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
