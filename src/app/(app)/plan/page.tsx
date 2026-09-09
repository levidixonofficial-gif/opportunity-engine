import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPlans } from "@/server/services/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { TaskRow } from "./TaskRow";

export const metadata = { title: "My Plan" };

export default async function PlanPage() {
  const user = await requireUser();
  const plans = await listPlans(user.id);

  if (plans.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">My Plan</h1>
        <EmptyState
          title="You haven't started a plan yet"
          description="Pick an opportunity and generate its launch plan — its steps become tasks you can work through here."
          action={
            <Link href="/opportunities" className={buttonVariants({ size: "sm" })}>
              Explore opportunities
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My Plan</h1>
      {plans.map((plan) => {
        const done = plan.tasks.filter((t) => t.status === "done").length;
        const active = plan.tasks.filter((t) => t.status !== "skipped");
        return (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.title}</CardTitle>
                <Badge tone={plan.status === "completed" ? "success" : "neutral"}>{plan.status}</Badge>
              </div>
              {plan.opportunity && (
                <Link
                  href={`/opportunities/${plan.opportunity.slug}`}
                  className="text-xs text-accent hover:underline"
                >
                  {plan.opportunity.name}
                </Link>
              )}
              <Progress value={active.length ? (done / active.length) * 100 : 0} className="mt-2" />
              <p className="text-xs text-muted">{done} of {active.length} tasks done</p>
            </CardHeader>
            <CardContent className="divide-y pt-0">
              {plan.tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
