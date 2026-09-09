import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { consumeUsage } from "@/lib/usage";

/**
 * Turn an opportunity's template execution steps into a real Plan + Tasks on the
 * user's dashboard (spec §8). Deterministic — no AI.
 *
 * Enforces the plan_generation entitlement (atomic consume/refund) so a free
 * user cannot bypass the monthly cap by hammering the action. Reusing an
 * existing active plan for the same opportunity does NOT consume quota.
 */
export async function generatePlanFromOpportunity(userId: string, opportunityId: string) {
  const opportunity = await db.opportunity.findFirst({
    where: { id: opportunityId, status: "published" },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  if (!opportunity) throw new NotFoundError("That opportunity");

  const existing = await db.plan.findFirst({
    where: { userId, opportunityId, status: "active" },
  });
  if (existing) return existing;

  const usage = await consumeUsage(userId, "plan_generation");
  try {
    return await db.plan.create({
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
  } catch (err) {
    await usage.release(false); // refund the quota unit — the plan wasn't created
    throw err;
  }
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
