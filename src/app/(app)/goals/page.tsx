import { requireUser } from "@/lib/auth";
import { listGoals } from "@/server/services/goals";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/misc";
import { NewGoalButton } from "./GoalDialog";
import { GoalActions } from "./GoalActions";

export const metadata = { title: "Goals" };

const MONEY_METRICS = new Set(["revenue", "profit"]);

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Goals"
        description="Set a target; the number updates itself from your transactions, tasks, and contacts."
      >
        <NewGoalButton />
      </PageHeader>

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="A goal like “first $100” or “5 paying customers” gives the dashboard something to track."
          action={<NewGoalButton />}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const money = MONEY_METRICS.has(g.metric);
            const pct = g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0;
            const fmt = (n: number) => (money ? formatCurrency(n) : String(n));
            return (
              <Card key={g.id} className={g.status === "achieved" ? "border-success" : undefined}>
                <CardContent className="space-y-2 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-xs text-muted capitalize">
                        {g.metric} {g.targetDate ? `· by ${new Date(g.targetDate).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {g.status === "achieved" && <Badge tone="success">Achieved</Badge>}
                      <GoalActions goalId={g.id} status={g.status} />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Progress</span>
                    <span>
                      {fmt(g.currentValue)} / {fmt(g.targetValue)}
                    </span>
                  </div>
                  <Progress value={pct} />
                  {g.metric === "custom" && (
                    <p className="text-xs text-muted">Custom goals are updated manually.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
