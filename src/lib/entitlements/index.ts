import type { SubscriptionPlan } from "@/lib/validations/enums";

/**
 * Centralized entitlement system. Components and API routes call
 * `entitlementsFor(plan)` / `hasFeature(plan, key)` — never scatter
 * `plan === "pro"` checks through the codebase.
 *
 * The plan is resolved server-side from the Subscription row, which is the
 * mirror of Stripe (synced by webhook in Phase 6). The frontend never decides
 * whether a user has paid.
 */

export type FeatureKey =
  | "unlimited_opportunities"
  | "advanced_ai"
  | "advanced_analytics"
  | "crm"
  | "semantic_search"
  | "export";

export interface Entitlements {
  plan: SubscriptionPlan;
  /** null = unlimited */
  limits: {
    savedOpportunities: number | null;
    aiMessagesPerMonth: number | null;
    planGenerationsPerMonth: number | null;
    generatorRunsPerMonth: number | null;
    projects: number | null;
  };
  features: Record<FeatureKey, boolean>;
}

const PLANS: Record<SubscriptionPlan, Entitlements> = {
  free: {
    plan: "free",
    limits: {
      savedOpportunities: 5,
      aiMessagesPerMonth: 15,
      planGenerationsPerMonth: 1,
      generatorRunsPerMonth: 5,
      projects: 2,
    },
    features: {
      unlimited_opportunities: false,
      advanced_ai: false,
      advanced_analytics: false,
      crm: false,
      semantic_search: false,
      export: false,
    },
  },
  pro: {
    plan: "pro",
    limits: {
      savedOpportunities: null,
      aiMessagesPerMonth: 300,
      planGenerationsPerMonth: 20,
      generatorRunsPerMonth: 100,
      projects: 25,
    },
    features: {
      unlimited_opportunities: true,
      advanced_ai: false,
      advanced_analytics: true,
      crm: true,
      semantic_search: true,
      export: true,
    },
  },
  premium: {
    plan: "premium",
    limits: {
      savedOpportunities: null,
      aiMessagesPerMonth: null,
      planGenerationsPerMonth: null,
      generatorRunsPerMonth: null,
      projects: null,
    },
    features: {
      unlimited_opportunities: true,
      advanced_ai: true,
      advanced_analytics: true,
      crm: true,
      semantic_search: true,
      export: true,
    },
  },
};

export function entitlementsFor(plan: SubscriptionPlan): Entitlements {
  return PLANS[plan] ?? PLANS.free;
}

export function hasFeature(plan: SubscriptionPlan, key: FeatureKey): boolean {
  return entitlementsFor(plan).features[key];
}

export interface UsageCheck {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
}

export function checkUsage(
  plan: SubscriptionPlan,
  key: keyof Entitlements["limits"],
  used: number,
): UsageCheck {
  const limit = entitlementsFor(plan).limits[key];
  if (limit === null) return { allowed: true, limit: null, used, remaining: null };
  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used) };
}

export { PLANS as PLAN_ENTITLEMENTS };
