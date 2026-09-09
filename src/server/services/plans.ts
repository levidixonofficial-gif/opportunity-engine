import { db } from "@/lib/db";

/**
 * Turn an opportunity's template execution steps into a real Plan + Tasks on the
 * user's dashboard (spec §8). Deterministic — no AI. An AI-authored plan variant
 * arrives in Phase 4 and will set `source: "ai"`.
 */
export async function generatePlanFromOpportunity(userId: string, opportunityId: string) {
  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!opportunity) throw new Error("Opportunity not found");

  const existing = await db.plan.findFirst({
    where: { userId, opportunityId, status: "active" },
  });
  if (existing) return existing;

  return db.plan.create({
    data: {
      userId,
      opportunityId,
      title: `${opportunity.name} — launch plan`,
      summary: opportunity.summary,
      source: "template",
      tasks: {
        create: opportunity.steps.map((s, idx) => ({
          userId,
          title: s.title,
          detail: s.phaseLabel ? `${s.phaseLabel}: ${s.detail}` : s.detail,
          sortOrder: idx,
        })),
      },
    },
  });
}

export async function listPlans(userId: string) {
  return db.plan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: { select: { slug: true, name: true } },
      tasks: { orderBy: { sortOrder: "asc" } },
    },
  });
}
