import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/server/services/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

const QUICK_ACTIONS = [
  { label: "Find an opportunity", href: "/opportunities" },
  { label: "Review my plan", href: "/plan" },
  { label: "Ask the AI coach", href: "/ai" },
  { label: "Log revenue", href: "/money" },
  { label: "Add a lead", href: "/leads" },
  { label: "Set a goal", href: "/goals" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const { progress, todaysTasks, goals, currentOpportunity, recommendations } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted">Here is where things stand and what to do next.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue logged" value={formatCurrency(progress.revenueCents)} />
        <Stat label="Estimated profit" value={formatCurrency(progress.profitCents)} />
        <Stat label="Tasks done" value={`${progress.completedTasks}/${progress.totalTasks || 0}`} />
        <Stat label="Open leads" value={String(progress.leadCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s actions</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? (
              <EmptyState
                title="No open tasks"
                description="Pick an opportunity and generate a plan — its steps become tasks here."
                action={
                  <Link href="/opportunities" className={buttonVariants({ size: "sm" })}>
                    Explore opportunities
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y">
                {todaysTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.detail && <p className="text-xs text-muted">{t.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current opportunity</CardTitle>
          </CardHeader>
          <CardContent>
            {currentOpportunity ? (
              <>
                <Badge>{currentOpportunity.category.label}</Badge>
                <p className="mt-2 font-medium">{currentOpportunity.name}</p>
                <Link
                  href={`/opportunities/${currentOpportunity.slug}`}
                  className="mt-2 inline-block text-sm text-accent hover:underline"
                >
                  Open →
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted">
                You haven&apos;t selected one yet. Saving an opportunity and marking it “selected” pins it here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <p className="text-sm text-muted">No active goals.</p>
            ) : (
              goals.map((g) => {
                const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm">
                      <span>{g.title}</span>
                      <span className="text-muted">
                        {g.metric === "revenue"
                          ? `${formatCurrency(g.currentValue)} / ${formatCurrency(g.targetValue)}`
                          : `${g.currentValue} / ${g.targetValue}`}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended for you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map(({ opportunity, fit }) => (
              <Link
                key={opportunity.id}
                href={`/opportunities/${opportunity.slug}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{opportunity.name}</p>
                  <p className="truncate text-xs text-muted">{opportunity.summary}</p>
                </div>
                {fit && <Badge tone="accent">{fit.score}</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {a.label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
