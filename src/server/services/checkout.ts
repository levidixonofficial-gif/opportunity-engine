import "server-only";
import { db } from "@/lib/db";
import { integrations, publicEnv } from "@/lib/env";
import { stripe, priceForPlan } from "@/lib/stripe";
import { writeAudit } from "@/lib/audit";
import type { SubscriptionPlan } from "@/lib/validations/enums";

/**
 * Start a Stripe Checkout session for an upgrade. Requires Stripe to be
 * configured. Returns the hosted checkout URL.
 */
export async function createUpgradeCheckout(
  userId: string,
  plan: Exclude<SubscriptionPlan, "free">,
): Promise<{ url: string }> {
  if (!integrations.stripe) throw new Error("Stripe is not configured.");
  const price = priceForPlan(plan);
  if (!price) throw new Error(`No Stripe price configured for the ${plan} plan.`);

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { subscription: true } });

  let customerId = user.subscription?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing?upgraded=1`,
    cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing`,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url };
}

export async function createBillingPortal(userId: string): Promise<{ url: string }> {
  if (!integrations.stripe) throw new Error("Stripe is not configured.");
  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) throw new Error("No billing account yet — upgrade first.");
  const session = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/billing`,
  });
  return { url: session.url };
}

/**
 * DEV-ONLY: directly set a plan so entitlement gating can be exercised without
 * Stripe. Disabled entirely in production and when Stripe IS configured.
 */
export async function devSetPlan(userId: string, plan: SubscriptionPlan) {
  // Read process.env directly: this is a runtime safety gate, not config.
  if (process.env.NODE_ENV === "production" || integrations.stripe) {
    throw new Error("devSetPlan is disabled (production or Stripe configured).");
  }
  await db.subscription.update({
    where: { userId },
    data: { plan, status: "active", stripePriceId: null },
  });
  await writeAudit({ actorId: userId, action: "dev.set_plan", meta: { plan } });
}
