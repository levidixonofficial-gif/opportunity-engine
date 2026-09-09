import { z } from "zod";

/**
 * Single source of truth for every "enum-like" string column in the schema.
 * The DB stores plain strings (SQLite/Postgres portability); these Zod unions
 * are the runtime contract. Import the schema, not a loose string literal.
 */

export const PrimaryGoal = z.enum([
  "first_100",
  "side_income",
  "build_business",
  "replace_income",
  "learn_skill",
  "explore",
]);
export type PrimaryGoal = z.infer<typeof PrimaryGoal>;

export const BudgetBand = z.enum(["lt_50", "50_250", "250_1000", "1000_plus"]);
export type BudgetBand = z.infer<typeof BudgetBand>;

export const TimeBand = z.enum(["30_min", "1_hr", "2_3_hr", "4_plus_hr"]);
export type TimeBand = z.infer<typeof TimeBand>;

export const ExperienceLevel = z.enum(["none", "some", "experienced"]);
export type ExperienceLevel = z.infer<typeof ExperienceLevel>;

export const UserRole = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRole>;

export const OpportunityStatus = z.enum(["draft", "published", "archived"]);
export const SavedState = z.enum(["saved", "comparing", "selected"]);

export const PlanStatus = z.enum(["active", "completed", "archived"]);
export const TaskStatus = z.enum(["todo", "done", "skipped"]);
export const ProjectStatus = z.enum(["idea", "planning", "active", "paused", "completed"]);
export const GoalStatus = z.enum(["active", "achieved", "archived"]);
export const GoalMetric = z.enum(["revenue", "leads", "projects", "tasks", "custom"]);

export const DealStage = z.enum([
  "lead",
  "contacted",
  "interested",
  "negotiating",
  "won",
  "lost",
]);
export const InteractionType = z.enum(["note", "call", "email", "meeting", "outreach"]);
export const TransactionType = z.enum(["revenue", "expense"]);

export const SubscriptionPlan = z.enum(["free", "pro", "premium"]);
export type SubscriptionPlan = z.infer<typeof SubscriptionPlan>;
export const SubscriptionStatus = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);

export const AiConversationKind = z.enum([
  "assistant",
  "offer",
  "outreach",
  "content",
  "idea",
  "digital_product",
  "action_plan",
  "analysis",
]);

export const NotificationType = z.enum([
  "opportunity",
  "task_due",
  "milestone",
  "billing",
  "digest",
  "ai_limit",
  "system",
]);

export const FeatureFlagState = z.enum(["off", "on", "beta", "admin_only"]);

/** Human labels for bands, shared by UI + AI prompts. */
export const BUDGET_LABELS: Record<z.infer<typeof BudgetBand>, string> = {
  lt_50: "Less than $50",
  "50_250": "$50–$250",
  "250_1000": "$250–$1,000",
  "1000_plus": "$1,000+",
};

export const TIME_LABELS: Record<z.infer<typeof TimeBand>, string> = {
  "30_min": "30 minutes/day",
  "1_hr": "1 hour/day",
  "2_3_hr": "2–3 hours/day",
  "4_plus_hr": "4+ hours/day",
};

export const GOAL_LABELS: Record<z.infer<typeof PrimaryGoal>, string> = {
  first_100: "Make my first $100",
  side_income: "Build a side income",
  build_business: "Build a business",
  replace_income: "Replace my current income",
  learn_skill: "Learn a valuable skill",
  explore: "Explore opportunities",
};

/** Ordinal rank of each band, used by the deterministic scorer. */
export const BAND_RANK = { lt_50: 0, "50_250": 1, "250_1000": 2, "1000_plus": 3 } as const;
export const TIME_RANK = { "30_min": 0, "1_hr": 1, "2_3_hr": 2, "4_plus_hr": 3 } as const;
