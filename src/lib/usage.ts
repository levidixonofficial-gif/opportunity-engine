import "server-only";
import { db } from "@/lib/db";
import { currentPeriodKey } from "@/lib/utils";
import { checkUsage, type Entitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/server/services/billing";

export type MeteredFeature = keyof Entitlements["limits"];

const FEATURE_KEY: Record<string, MeteredFeature> = {
  ai_message: "aiMessagesPerMonth",
  plan_generation: "planGenerationsPerMonth",
  generator_run: "generatorRunsPerMonth",
};

/** Read current usage for a metered feature this month. */
export async function getUsage(userId: string, feature: string): Promise<number> {
  const row = await db.usageCounter.findUnique({
    where: { userId_feature_periodKey: { userId, feature, periodKey: currentPeriodKey() } },
  });
  return row?.count ?? 0;
}

/** Check whether the user may perform `feature` once more this month. */
export async function assertWithinLimit(userId: string, feature: keyof typeof FEATURE_KEY) {
  const plan = await getUserPlan(userId);
  const used = await getUsage(userId, feature);
  const res = checkUsage(plan, FEATURE_KEY[feature], used);
  return { ...res, plan };
}

/** Increment a usage counter (call after a successful metered operation). */
export async function recordUsage(userId: string, feature: string, by = 1) {
  const periodKey = currentPeriodKey();
  await db.usageCounter.upsert({
    where: { userId_feature_periodKey: { userId, feature, periodKey } },
    update: { count: { increment: by } },
    create: { userId, feature, periodKey, count: by },
  });
}
