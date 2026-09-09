import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOpportunityBySlug } from "@/server/services/opportunities";
import { BUDGET_LABELS, TIME_LABELS } from "@/lib/validations/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Progress } from "@/components/ui/misc";
import { SaveButton } from "../SaveButton";
import { PlanActions } from "./PlanActions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const o = await db.opportunity.findUnique({ where: { slug }, select: { name: true } });
  return { title: o?.name ?? "Opportunity" };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const result = await getOpportunityBySlug(user.id, slug);
  if (!result) notFound();

  const { opportunity: o, fit, saved } = result;
  const existingPlan = await db.plan.findFirst({
    where: { userId: user.id, opportunityId: o.id, status: "active" },
    select: { id: true },
  });

  const scales: [string, number][] = [
    ["Difficulty", o.difficulty],
    ["Learning curve", o.learningCurve],
    ["Competition", o.competitionLevel],
    ["Scalability", o.scalability],
    ["Current demand", o.demandScore],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3">
        <Badge>{o.category.label}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{o.name}</h1>
        <p className="text-muted">{o.summary}</p>
        <div className="flex flex-wrap gap-2">
          <SaveButton opportunityId={o.id} initialSaved={!!saved} size="md" />
          <PlanActions opportunityId={o.id} hasPlan={!!existingPlan} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>{o.description}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Fact label="Estimated startup cost" value={BUDGET_LABELS[o.startupCostBand as keyof typeof BUDGET_LABELS]} />
                <Fact label="Typical time requirement" value={TIME_LABELS[o.timeCommitment as keyof typeof TIME_LABELS]} />
                <Fact label="Format" value={o.isOnline ? "Online" : "Local / in-person"} />
                <Fact label="Type" value={o.isServiceBased ? "Service" : "Product"} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Step-by-step execution plan</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {o.steps.map((s) => (
                  <li key={s.id} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                      {s.phaseLabel ?? "Step"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-sm text-muted">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Economics</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Prose label="Typical business model" value={o.revenueModel} />
              <Prose label="Possible monetization" value={o.monetizationNotes} />
              <Prose label="Risk considerations" value={o.riskNotes} />
              <Prose label="Factors that influence profitability" value={o.profitFactors} />
              <p className="rounded-md bg-surface-2 p-3 text-xs text-muted">
                These are descriptions of how businesses in this space typically work. Opportunity
                Engine does not predict or guarantee any income.
              </p>
            </CardContent>
          </Card>

          {o.examples.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Example business models</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {o.examples.map((e) => (
                  <div key={e.id}>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-muted">{e.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {fit && (
            <Card>
              <CardHeader><CardTitle>Your fit score</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-accent">{fit.score}<span className="text-base text-muted">/100</span></p>
                {fit.reasons.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted">
                    {fit.reasons.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 space-y-2">
                  {fit.breakdown.map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs text-muted">
                        <span>{b.label}</span>
                        <span>{b.contribution}/{b.max}</span>
                      </div>
                      <Progress value={(b.contribution / b.max) * 100} className="mt-1 h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>At a glance</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {scales.map(([label, v]) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted">
                    <span>{label}</span>
                    <span>{v}/5</span>
                  </div>
                  <Progress value={(v / 5) * 100} className="mt-1 h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          {o.tools.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recommended tools</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {o.tools.map((t) => (
                  <div key={t.id}>
                    <p className="font-medium">{t.name}</p>
                    {t.note && <p className="text-xs text-muted">{t.note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Prose({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted">{value}</p>
    </div>
  );
}
