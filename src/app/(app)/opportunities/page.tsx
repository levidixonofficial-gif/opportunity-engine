import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listOpportunities, listCategories } from "@/server/services/opportunities";
import { BUDGET_LABELS, TIME_LABELS } from "@/lib/validations/enums";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Filters } from "./Filters";
import { SaveButton } from "./SaveButton";
import { NaturalSearch } from "./NaturalSearch";

export const metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const [scored, categories, savedRows] = await Promise.all([
    listOpportunities(user.id, {
      q: sp.q,
      categorySlug: sp.category,
      startupCostBand: sp.cost,
      timeCommitment: sp.time,
      beginnerFriendly: sp.beginner === "1",
      sort: (sp.sort as "recommended" | "difficulty_asc" | "newest") ?? "recommended",
    }),
    listCategories(),
    db.savedOpportunity.findMany({ where: { userId: user.id }, select: { opportunityId: true } }),
  ]);
  const savedIds = new Set(savedRows.map((s) => s.opportunityId));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <p className="text-sm text-muted">
          Ranked by fit with your profile. Scores are a guide, not a promise of income.
        </p>
      </div>

      <NaturalSearch />

      <Filters categories={categories} />

      {scored.length === 0 ? (
        <EmptyState
          title="No opportunities match those filters"
          description="Try widening your budget or time range, or clearing the search."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scored.map(({ opportunity: o, fit }) => (
            <Card key={o.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge>{o.category.label}</Badge>
                    <Link href={`/opportunities/${o.slug}`} className="mt-2 block font-semibold hover:underline">
                      {o.name}
                    </Link>
                  </div>
                  {fit && (
                    <div className="text-right">
                      <p className="text-lg font-semibold text-accent">{fit.score}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted">fit</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted">{o.summary}</p>
                <div className="flex flex-wrap gap-1.5 text-xs text-muted">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5">{BUDGET_LABELS[o.startupCostBand as keyof typeof BUDGET_LABELS]}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5">{TIME_LABELS[o.timeCommitment as keyof typeof TIME_LABELS]}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5">Difficulty {o.difficulty}/5</span>
                  {o.beginnerFriendly && <span className="rounded bg-success/10 px-1.5 py-0.5 text-success">Beginner-friendly</span>}
                </div>
                {fit && fit.reasons.length > 0 && (
                  <p className="text-xs text-muted">Why: {fit.reasons.slice(0, 2).join(" · ")}</p>
                )}
                <SaveButton opportunityId={o.id} initialSaved={savedIds.has(o.id)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
