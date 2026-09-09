import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listProjects } from "@/server/services/projects";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState, Progress } from "@/components/ui/misc";
import { NewProjectButton } from "./ProjectDialog";
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_TONE } from "./constants";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, opportunities] = await Promise.all([
    listProjects(user.id),
    db.opportunity.findMany({ where: { status: "published" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const byStatus = new Map(PROJECT_STATUS_OPTIONS.map((s) => [s.value, [] as typeof projects]));
  for (const p of projects) byStatus.get(p.status)?.push(p);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Projects" description="Each project turns an opportunity into tracked work with tasks, milestones, and revenue.">
        <NewProjectButton opportunities={opportunities} />
      </PageHeader>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Start one from scratch, or open an opportunity and generate its plan first."
          action={<NewProjectButton opportunities={opportunities} />}
        />
      ) : (
        <div className="space-y-8">
          {PROJECT_STATUS_OPTIONS.map((s) => {
            const items = byStatus.get(s.value) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={s.value}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
                  {s.label}
                  <span className="rounded bg-surface-2 px-1.5 text-xs">{items.length}</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((p) => {
                    const pct = p.revenueTargetCents
                      ? Math.min(100, (p.revenueCents / p.revenueTargetCents) * 100)
                      : null;
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`}>
                        <Card className="h-full transition-colors hover:border-border-strong">
                          <CardContent className="space-y-3 pt-5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">{p.name}</p>
                              <Badge tone={PROJECT_STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Badge>
                            </div>
                            {p.opportunity && (
                              <p className="text-xs text-muted">{p.opportunity.name}</p>
                            )}
                            <div className="flex gap-3 text-xs text-muted">
                              <span>{p._count.tasks} tasks</span>
                              <span>{p._count.deals} deals</span>
                              <span>{formatCurrency(p.revenueCents)} revenue</span>
                            </div>
                            {pct !== null && (
                              <div>
                                <div className="flex justify-between text-xs text-muted">
                                  <span>Revenue vs. target</span>
                                  <span>
                                    {formatCurrency(p.revenueCents)} / {formatCurrency(p.revenueTargetCents!)}
                                  </span>
                                </div>
                                <Progress value={pct} className="mt-1" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
