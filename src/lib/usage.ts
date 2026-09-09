import "server-only";
import { db } from "@/lib/db";
import { currentPeriodKey } from "@/lib/utils";
import { checkUsage, entitlementsFor, type Entitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/server/services/billing";
import { LimitReachedError } from "@/lib/errors";

export type MeteredFeature = keyof Entitlements["limits"];

const FEATURE_KEY: Record<string, MeteredFeature> = {
  ai_message: "aiMessagesPerMonth",
  plan_generation: "planGenerationsPerMonth",
  generator_run: "generatorRunsPerMonth",
};

const LABEL: Record<string, string> = {
  ai_message: "AI messages",
  plan_generation: "plan generations",
  generator_run: "generator runs",
};

/** Read current usage for a metered feature this month. */
export async function getUsage(userId: string, feature: string): Promise<number> {
  const row = await db.usageCounter.findUnique({
    where: { userId_feature_periodKey: { userId, feature, periodKey: currentPeriodKey() } },
  });
  return row?.count ?? 0;
}

/** Non-mutating check — for rendering "N left" hints. Never use this to gate a write. */
export async function assertWithinLimit(userId: string, feature: keyof typeof FEATURE_KEY) {
  const plan = await getUserPlan(userId);
  const used = await getUsage(userId, feature);
  const res = checkUsage(plan, FEATURE_KEY[feature], used);
  return { ...res, plan };
}

/** Increment a usage counter by `by` and return the NEW count (atomic upsert). */
export async function recordUsage(userId: string, feature: string, by = 1): Promise<number> {
  const periodKey = currentPeriodKey();
  const row = await db.usageCounter.upsert({
    where: { userId_feature_periodKey: { userId, feature, periodKey } },
    update: { count: { increment: by } },
    create: { userId, feature, periodKey, count: by },
  });
  return row.count;
}

/** Decrement a counter (used to refund quota when the metered operation fails). */
export async function refundUsage(userId: string, feature: string, by = 1): Promise<void> {
  const periodKey = currentPeriodKey();
  await db.usageCounter
    .update({
      where: { userId_feature_periodKey: { userId, feature, periodKey } },
      data: { count: { decrement: by } },
    })
    .catch(() => undefined);
}

/**
 * Atomically consume one unit of a metered feature.
 *
 * Increments FIRST, then checks — closing the check-then-act race that would
 * otherwise let concurrent requests exceed a monthly cap. If the new count is
 * over the plan's limit it refunds the unit and throws LimitReachedError.
 *
 * Returns a `release(success)` you MUST call: `release(false)` refunds the unit
 * if the underlying operation ended up not happening.
 */
export async function consumeUsage(
  userId: string,
  feature: keyof typeof FEATURE_KEY,
): Promise<{ release: (success: boolean) => Promise<void>; remaining: number | null }> {
  const plan = await getUserPlan(userId);
  const limit = entitlementsFor(plan).limits[FEATURE_KEY[feature]];

  const newCount = await recordUsage(userId, feature);

  if (limit !== null && newCount > limit) {
    await refundUsage(userId, feature);
    throw new LimitReachedError(
      `You've used all ${limit} ${LABEL[feature] ?? feature} on the ${plan} plan this month. Upgrade for more.`,
    );
  }

  return {
    remaining: limit === null ? null : Math.max(0, limit - newCount),
    release: async (success: boolean) => {
      if (!success) await refundUsage(userId, feature);
    },
  };
}
