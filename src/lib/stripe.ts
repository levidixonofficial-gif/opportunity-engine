import "server-only";
import Stripe from "stripe";
import { env, integrations } from "@/lib/env";
import type { SubscriptionPlan } from "@/lib/validations/enums";

/** Lazily-constructed Stripe client. Null when STRIPE_SECRET_KEY is absent. */
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!integrations.stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  if (!_stripe) _stripe = new Stripe(env.STRIPE_SECRET_KEY as string);
  return _stripe;
}

/** Map a Stripe Price ID -> our internal plan. */
export function planForPrice(priceId: string | null | undefined): SubscriptionPlan {
  if (!priceId) return "free";
  if (priceId === env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId === env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

export function priceForPlan(plan: SubscriptionPlan): string | null {
  if (plan === "pro") return env.STRIPE_PRICE_PRO ?? null;
  if (plan === "premium") return env.STRIPE_PRICE_PREMIUM ?? null;
  return null;
}

/** Normalize a Stripe subscription status to what we store. */
export function normalizeStatus(s: string): string {
  const allowed = ["active", "trialing", "past_due", "canceled", "incomplete"];
  return allowed.includes(s) ? s : s === "incomplete_expired" ? "canceled" : "incomplete";
}
