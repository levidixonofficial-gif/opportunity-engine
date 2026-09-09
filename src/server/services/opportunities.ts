import { db } from "@/lib/db";
import { scoreOpportunity, type FitResult, type ScorerOpportunity } from "@/lib/scoring/fit";
import { getScorerProfile } from "@/server/services/profile";
import { entitlementsFor } from "@/lib/entitlements";
import { BudgetBand, TimeBand, type SubscriptionPlan } from "@/lib/validations/enums";
import type { Prisma } from "@prisma/client";

const listInclude = {
  category: true,
  skills: { include: { skill: true } },
  interests: { include: { interest: true } },
} satisfies Prisma.OpportunityInclude;

type OpportunityRow = Prisma.OpportunityGetPayload<{ include: typeof listInclude }>;

export interface OpportunityFilters {
  q?: string;
  categorySlug?: string;
  startupCostBand?: string;
  timeCommitment?: string;
  maxDifficulty?: number;
  isOnline?: boolean;
  isServiceBased?: boolean;
  beginnerFriendly?: boolean;
  sort?: "recommended" | "difficulty_asc" | "newest";
}

function toScorer(o: OpportunityRow): ScorerOpportunity {
  return {
    name: o.name,
    difficulty: o.difficulty,
    learningCurve: o.learningCurve,
    competitionLevel: o.competitionLevel,
    scalability: o.scalability,
    demandScore: o.demandScore,
    startupCostBand: BudgetBand.parse(o.startupCostBand),
    timeCommitment: TimeBand.parse(o.timeCommitment),
    beginnerFriendly: o.beginnerFriendly,
    isServiceBased: o.isServiceBased,
    requiredSkillSlugs: o.skills.filter((s) => s.weight === "required").map((s) => s.skill.slug),
    helpfulSkillSlugs: o.skills.filter((s) => s.weight === "helpful").map((s) => s.skill.slug),
    interestSlugs: o.interests.map((i) => i.interest.slug),
  };
}

export interface ScoredOpportunity {
  opportunity: OpportunityRow;
  fit: FitResult | null;
}

export async function listOpportunities(
  userId: string | null,
  filters: OpportunityFilters = {},
): Promise<ScoredOpportunity[]> {
  const where: Prisma.OpportunityWhereInput = { status: "published" };
  if (filters.categorySlug) where.category = { slug: filters.categorySlug };
  if (filters.startupCostBand) where.startupCostBand = filters.startupCostBand;
  if (filters.timeCommitment) where.timeCommitment = filters.timeCommitment;
  if (typeof filters.maxDifficulty === "number") where.difficulty = { lte: filters.maxDifficulty };
  if (typeof filters.isOnline === "boolean") where.isOnline = filters.isOnline;
  if (typeof filters.isServiceBased === "boolean") where.isServiceBased = filters.isServiceBased;
  if (filters.beginnerFriendly) where.beginnerFriendly = true;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { summary: { contains: filters.q } },
      { description: { contains: filters.q } },
    ];
  }

  const rows = await db.opportunity.findMany({ where, include: listInclude });
  const profile = userId ? await getScorerProfile(userId) : null;

  const scored: ScoredOpportunity[] = rows.map((o) => ({
    opportunity: o,
    fit: profile ? scoreOpportunity(profile, toScorer(o)) : null,
  }));

  switch (filters.sort ?? "recommended") {
    case "difficulty_asc":
      scored.sort((a, b) => a.opportunity.difficulty - b.opportunity.difficulty);
      break;
    case "newest":
      scored.sort((a, b) => b.opportunity.createdAt.getTime() - a.opportunity.createdAt.getTime());
      break;
    default:
      scored.sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1) || b.opportunity.demandScore - a.opportunity.demandScore);
  }

  return scored;
}

export async function getOpportunityBySlug(userId: string | null, slug: string) {
  const o = await db.opportunity.findUnique({
    where: { slug },
    include: {
      ...listInclude,
      tools: true,
      steps: { orderBy: { sortOrder: "asc" } },
      examples: true,
    },
  });
  if (!o) return null;
  const profile = userId ? await getScorerProfile(userId) : null;
  const fit = profile ? scoreOpportunity(profile, toScorer(o)) : null;
  const saved = userId
    ? await db.savedOpportunity.findUnique({ where: { userId_opportunityId: { userId, opportunityId: o.id } } })
    : null;
  return { opportunity: o, fit, saved };
}

export async function recommendationsFor(userId: string, limit = 4): Promise<ScoredOpportunity[]> {
  const all = await listOpportunities(userId, { sort: "recommended" });
  return all.slice(0, limit);
}

/**
 * Recompute + cache fit scores on the user's saved rows (called after onboarding
 * or profile edits). Does not create saves — only refreshes existing ones.
 */
export async function recomputeSavedRecommendations(userId: string) {
  const profile = await getScorerProfile(userId);
  const saves = await db.savedOpportunity.findMany({
    where: { userId },
    include: { opportunity: { include: listInclude } },
  });
  await Promise.all(
    saves.map((s) => {
      const fit = scoreOpportunity(profile, toScorer(s.opportunity));
      return db.savedOpportunity.update({
        where: { id: s.id },
        data: { fitScore: fit.score, fitReasons: JSON.stringify(fit.reasons) },
      });
    }),
  );
}

export interface SaveResult {
  saved: boolean;
  limitReached?: boolean;
}

export async function toggleSaveOpportunity(
  userId: string,
  plan: SubscriptionPlan,
  opportunityId: string,
): Promise<SaveResult> {
  const existing = await db.savedOpportunity.findUnique({
    where: { userId_opportunityId: { userId, opportunityId } },
  });
  if (existing) {
    await db.savedOpportunity.delete({ where: { id: existing.id } });
    return { saved: false };
  }

  const limit = entitlementsFor(plan).limits.savedOpportunities;
  if (limit !== null) {
    const count = await db.savedOpportunity.count({ where: { userId } });
    if (count >= limit) return { saved: false, limitReached: true };
  }

  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    include: listInclude,
  });
  if (!opportunity) return { saved: false };

  const profile = await getScorerProfile(userId);
  const fit = scoreOpportunity(profile, toScorer(opportunity));
  await db.savedOpportunity.create({
    data: {
      userId,
      opportunityId,
      fitScore: fit.score,
      fitReasons: JSON.stringify(fit.reasons),
    },
  });
  return { saved: true };
}

export async function listCategories() {
  return db.opportunityCategory.findMany({ orderBy: { sortOrder: "asc" } });
}
