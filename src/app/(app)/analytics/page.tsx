import { requireUser } from "@/lib/auth";
import { getPersonalAnalytics } from "@/server/services/analytics";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUser();
  const a = await getPersonalAnalytics(user.id);
  const maxTasks = Math.max(1, ...a.tasksLast14.map((d) => d.count));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Analytics"
        description="Your own numbers only — nothing here is a platform average or a projection."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Activity streak" value={`${a.streak} day${a.streak === 1 ? "" : "s"}`} />
        <Stat label="Revenue (actual)" value={formatCurrency(a.totals.revenueCents)} />
        <Stat label="Profit (actual)" value={formatCurrency(a.totals.profitCents)} />
        <Stat label="Tasks done" value={`${a.totals.tasksDone}/${a.totals.tasksTotal}`} />
        <Stat label="Contacts" value={String(a.totals.contacts)} />
        <Stat label="Customers" value={String(a.totals.customers)} />
        <Stat label="Deals won" value={String(a.totals.dealsWon)} />
        <Stat label="AI + generator uses" value={String(a.totals.aiMessages + a.totals.generatorRuns)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Progress funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {a.funnel.map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-sm">
                  <span>{step.label}</span>
                  <span className={step.value > 0 ? "text-success" : "text-muted"}>
                    {step.value > 0 ? "✓" : "—"}
                  </span>
                </div>
                <Progress value={step.value > 0 ? 100 : 0} className="mt-1 h-1.5" />
              </div>
            ))}
            <p className="text-xs text-muted">
              The loop: save → choose → plan → execute → track. Each step you complete unlocks the
              next.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tasks completed — last 14 days</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {a.tasksLast14.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-accent"
                    style={{ height: `${(d.count / maxTasks) * 90}px` }}
                    title={`${d.count} on ${d.day}`}
                  />
                  <span className="text-[9px] text-muted">{d.day.slice(3)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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
