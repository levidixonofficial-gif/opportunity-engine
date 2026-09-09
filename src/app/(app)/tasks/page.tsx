import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { TaskRow } from "../plan/TaskRow";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await db.task.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
  });

  const open = tasks.filter((t) => t.status === "todo");
  const closed = tasks.filter((t) => t.status !== "todo");

  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Tasks</h1>
        <EmptyState
          title="No tasks yet"
          description="Generate a plan from an opportunity, or add tasks to a project."
          action={<Link href="/opportunities" className={buttonVariants({ size: "sm" })}>Explore opportunities</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
      <Card>
        <CardContent className="divide-y pt-2">
          {open.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nothing open. Nice.</p>
          ) : (
            open.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </CardContent>
      </Card>
      {closed.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted">Done &amp; skipped</h2>
          <Card>
            <CardContent className="divide-y pt-2">
              {closed.map((t) => <TaskRow key={t.id} task={t} />)}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
