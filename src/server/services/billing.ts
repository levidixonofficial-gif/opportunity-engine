import { db } from "@/lib/db";
import { SubscriptionPlan } from "@/lib/validations/enums";
import { entitlementsFor, type Entitlements } from "@/lib/entitlements";

/**
 * Resolve the user's plan SERVER-SIDE from the Subscription row (the mirror of
 * Stripe). Never accept a plan from the client. In Phase 6 a Stripe webhook
 * keeps `subscription.plan` / `.status` in sync; here we just read it.
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const sub = await db.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });
  if (!sub) return "free";
  const parsed = SubscriptionPlan.safeParse(sub.plan);
  if (!parsed.success) return "free";
  // Downgrade entitlements if the subscription is not in good standing.
  if (["canceled", "past_due", "incomplete"].includes(sub.status)) return "free";
  return parsed.data;
}

export async function getUserEntitlements(userId: string): Promise<Entitlements> {
  return entitlementsFor(await getUserPlan(userId));
}
