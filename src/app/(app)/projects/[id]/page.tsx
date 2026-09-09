import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/server/services/projects";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Progress } from "@/components/ui/misc";
import { TaskRow } from "../../plan/TaskRow";
import { StatusControl } from "./StatusControl";
import { addProjectTaskAction, addMilestoneAction, toggleMilestoneAction, deleteMilestoneAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const p = await getProject(user.id, id);
  return { title: p?.name ?? "Project" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await getProject(user.id, id);
  if (!project) notFound();

  const revenue = project.transactions
    .filter((t) => t.type === "revenue")
    .reduce((s, t) => s + t.amountCents, 0);
  const expenses = project.transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountCents, 0);
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;
  const activeTasks = project.tasks.filter((t) => t.status !== "skipped").length;
  const pct = project.revenueTargetCents ? Math.min(100, (revenue / project.revenueTargetCents) * 100) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2">
        <Link href="/projects" className="text-sm text-muted hover:text-foreground">
          ← Projects
        </Link>
      </div>
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
      >
        <StatusControl projectId={project.id} status={project.status} />
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={formatCurrency(revenue)} />
        <Stat label="Expenses" value={formatCurrency(expenses)} />
        <Stat label="Profit" value={formatCurrency(revenue - expenses)} />
        <Stat label="Tasks" value={`${doneTasks}/${activeTasks}`} />
      </div>

      {pct !== null && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex justify-between text-sm">
              <span>Revenue vs. target</span>
              <span className="text-muted">
                {formatCurrency(revenue)} / {formatCurrency(project.revenueTargetCents!)}
              </span>
            </div>
            <Progress value={pct} className="mt-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {project.tasks.length === 0 ? (
                <p className="py-3 text-sm text-muted">No tasks yet.</p>
              ) : (
                project.tasks.map((t) => <TaskRow key={t.id} task={t} />)
              )}
            </div>
            <form action={addProjectTaskAction.bind(null, project.id)} className="mt-3 flex gap-2">
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Add a task…"
                className="h-9 flex-1 rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button className="rounded-md border px-3 text-sm hover:bg-surface-2">Add</button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Milestones</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y">
              {project.milestones.length === 0 ? (
                <li className="py-3 text-sm text-muted">No milestones yet.</li>
              ) : (
                project.milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <form action={toggleMilestoneAction.bind(null, project.id, m.id)}>
                      <button
                        type="submit"
                        aria-label={m.reachedAt ? "Mark not reached" : "Mark reached"}
                        className={`grid size-5 place-items-center rounded border text-xs ${
                          m.reachedAt ? "border-success bg-success text-white" : ""
                        }`}
                      >
                        {m.reachedAt ? "✓" : ""}
                      </button>
                    </form>
                    <span className={`flex-1 text-sm ${m.reachedAt ? "text-muted line-through" : ""}`}>
                      {m.title}
                    </span>
                    <form action={deleteMilestoneAction.bind(null, project.id, m.id)}>
                      <button type="submit" className="text-xs text-muted hover:text-danger" aria-label="Delete milestone">
                        ✕
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
            <form action={addMilestoneAction.bind(null, project.id)} className="mt-3 flex gap-2">
              <input
                name="title"
                required
                maxLength={160}
                placeholder="Add a milestone…"
                className="h-9 flex-1 rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button className="rounded-md border px-3 text-sm hover:bg-surface-2">Add</button>
            </form>
          </CardContent>
        </Card>
      </div>

      {project.deals.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Linked deals</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {project.deals.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span>{d.title} · {d.contact.name}</span>
                <Badge>{d.stage}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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
