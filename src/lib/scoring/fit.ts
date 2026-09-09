import {
  BAND_RANK,
  TIME_RANK,
  type BudgetBand,
  type ExperienceLevel,
  type PrimaryGoal,
  type TimeBand,
} from "@/lib/validations/enums";

/**
 * Deterministic Opportunity Fit Score (spec §6).
 *
 * This runs BEFORE any AI call (spec §36) so recommendations are cheap,
 * reproducible, and explainable. The score is a *recommendation mechanism*,
 * never a guarantee — the UI must present it with reasons, not as a promise
 * of income.
 *
 * Output: integer 0-100 plus an ordered list of plain-language reasons.
 */

export interface ScorerProfile {
  primaryGoal: PrimaryGoal | null;
  budgetBand: BudgetBand | null;
  timeBand: TimeBand | null;
  experienceLevel: ExperienceLevel | null;
  skillSlugs: string[];
  interestSlugs: string[];
}

export interface ScorerOpportunity {
  name: string;
  difficulty: number; // 1-5
  learningCurve: number; // 1-5
  competitionLevel: number; // 1-5
  scalability: number; // 1-5
  demandScore: number; // 1-5
  startupCostBand: BudgetBand;
  timeCommitment: TimeBand;
  beginnerFriendly: boolean;
  isServiceBased: boolean;
  requiredSkillSlugs: string[];
  helpfulSkillSlugs: string[];
  interestSlugs: string[];
  /** Phase 2 fields (optional so older callers/tests still work). */
  geoDependence?: "none" | "local" | "regional";
  repeatRevenuePotential?: number; // 1-5
  salesCycle?: "immediate" | "short" | "medium" | "long";
}

interface Component {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..1
  reason?: string;
}

const EXPERIENCE_RANK: Record<ExperienceLevel, number> = { none: 0, some: 1, experienced: 2 };

function budgetFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  if (!p.budgetBand) return { key: "budget", label: "Budget fit", weight: 18, score: 0.5 };
  const have = BAND_RANK[p.budgetBand];
  const need = BAND_RANK[o.startupCostBand];
  if (have >= need) {
    return {
      key: "budget",
      label: "Budget fit",
      weight: 18,
      score: 1,
      reason: need === 0 ? "Can be started with almost no money" : "Fits within your starting budget",
    };
  }
  const gap = need - have;
  return {
    key: "budget",
    label: "Budget fit",
    weight: 18,
    score: gap === 1 ? 0.45 : 0.15,
    reason: "Typical startup cost is above your current budget",
  };
}

function timeFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  if (!p.timeBand) return { key: "time", label: "Time fit", weight: 16, score: 0.5 };
  const have = TIME_RANK[p.timeBand];
  const need = TIME_RANK[o.timeCommitment];
  if (have >= need) {
    return { key: "time", label: "Time fit", weight: 16, score: 1, reason: "Fits the time you have available" };
  }
  return {
    key: "time",
    label: "Time fit",
    weight: 16,
    score: need - have === 1 ? 0.5 : 0.2,
    reason: "Usually needs more time per day than you have right now",
  };
}

function skillFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  const req = new Set(o.requiredSkillSlugs);
  const help = new Set(o.helpfulSkillSlugs);
  const mine = new Set(p.skillSlugs);
  if (req.size === 0 && help.size === 0) {
    return { key: "skill", label: "Skill fit", weight: 20, score: 0.6, reason: "No specific skills required to begin" };
  }
  const reqMatched = [...req].filter((s) => mine.has(s)).length;
  const helpMatched = [...help].filter((s) => mine.has(s)).length;
  const reqScore = req.size ? reqMatched / req.size : 1;
  const helpScore = help.size ? helpMatched / help.size : 0;
  const score = Math.min(1, reqScore * 0.75 + helpScore * 0.25 + (o.beginnerFriendly ? 0.15 : 0));
  let reason: string | undefined;
  if (reqMatched > 0) reason = `Uses skills you already have (${reqMatched} match${reqMatched > 1 ? "es" : ""})`;
  else if (o.beginnerFriendly) reason = "Beginner-friendly — you can learn as you go";
  else if (req.size) reason = "Needs skills you haven't selected yet";
  return { key: "skill", label: "Skill fit", weight: 20, score, reason };
}

function interestFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  if (p.interestSlugs.length === 0 || o.interestSlugs.length === 0) {
    return { key: "interest", label: "Interest fit", weight: 8, score: 0.5 };
  }
  const mine = new Set(p.interestSlugs);
  const matched = o.interestSlugs.filter((s) => mine.has(s)).length;
  const score = Math.min(1, matched / Math.min(o.interestSlugs.length, 3));
  return {
    key: "interest",
    label: "Interest fit",
    weight: 8,
    score,
    reason: matched > 0 ? "Overlaps with things you said you're interested in" : undefined,
  };
}

function goalAlignment(p: ScorerProfile, o: ScorerOpportunity): Component {
  const weight = 14;
  if (!p.primaryGoal) return { key: "goal", label: "Goal alignment", weight, score: 0.5 };
  let score = 0.5;
  let reason: string | undefined;
  switch (p.primaryGoal) {
    case "first_100":
      score = o.difficulty <= 2 && BAND_RANK[o.startupCostBand] <= 1 ? 1 : o.difficulty <= 3 ? 0.6 : 0.3;
      if (score === 1) reason = "Low friction to a first small win";
      break;
    case "side_income":
      score = TIME_RANK[o.timeCommitment] <= 2 && o.difficulty <= 3 ? 0.9 : 0.5;
      if (score === 0.9) reason = "Workable as a consistent side income";
      break;
    case "build_business":
    case "replace_income":
      score = o.scalability >= 4 ? 1 : o.scalability >= 3 ? 0.65 : 0.35;
      if (score === 1) reason = "Can scale beyond trading hours for dollars";
      break;
    case "learn_skill":
      score = o.learningCurve >= 3 ? 0.9 : 0.6;
      if (score === 0.9) reason = "Builds a transferable, in-demand skill";
      break;
    case "explore":
      score = 0.7;
      break;
  }
  return { key: "goal", label: "Goal alignment", weight, score, reason };
}

function marketConditions(o: ScorerOpportunity): Component {
  // demand up, competition down
  const score = Math.max(0, Math.min(1, (o.demandScore - 1) / 4 * 0.6 + (5 - o.competitionLevel) / 4 * 0.4));
  let reason: string | undefined;
  if (o.demandScore >= 4 && o.competitionLevel <= 3) reason = "Solid demand without extreme saturation";
  else if (o.competitionLevel >= 4) reason = "Market is competitive — differentiation matters";
  return { key: "market", label: "Demand vs. competition", weight: 14, score, reason };
}

function difficultyFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  const weight = 8;
  const exp = p.experienceLevel ? EXPERIENCE_RANK[p.experienceLevel] : 1;
  // beginners want low difficulty; experienced users are unbothered
  const tolerance = 2 + exp; // 2..4
  const score = o.difficulty <= tolerance ? 1 : o.difficulty - tolerance === 1 ? 0.5 : 0.15;
  return {
    key: "difficulty",
    label: "Difficulty fit",
    weight,
    score,
    reason: score < 1 ? "Steeper than typical for your stated experience" : undefined,
  };
}

function scalabilityFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  const weight = 8;
  const wantsScale = p.primaryGoal === "build_business" || p.primaryGoal === "replace_income";
  const wantsSmall = p.primaryGoal === "first_100" || p.primaryGoal === "learn_skill";
  const repeat = o.repeatRevenuePotential ?? 3;
  let score: number;
  let reason: string | undefined;
  if (wantsScale) {
    score = (o.scalability - 1) / 4 * 0.7 + (repeat - 1) / 4 * 0.3;
    if (o.scalability >= 4) reason = "Can grow past trading hours for dollars";
    else if (o.scalability <= 2) reason = "Hard to scale beyond your own hours";
  } else if (wantsSmall) {
    score = 0.7; // scale doesn't matter much for a first win
  } else {
    score = 0.35 + ((o.scalability - 1) / 4) * 0.5 + ((repeat - 1) / 4) * 0.15;
    if (repeat >= 4) reason = "Repeat / recurring revenue is realistic here";
  }
  return { key: "scalability", label: "Scalability fit", weight, score: clamp01(score), reason };
}

function geoFit(p: ScorerProfile, o: ScorerOpportunity): Component {
  const weight = 6;
  const geo = o.geoDependence ?? "none";
  if (geo === "none") {
    return { key: "geo", label: "Location fit", weight, score: 1, reason: undefined };
  }
  // local/regional businesses are fine, but note the constraint for scale-focused goals
  const wantsScale = p.primaryGoal === "build_business" || p.primaryGoal === "replace_income";
  const score = geo === "local" ? (wantsScale ? 0.55 : 0.8) : wantsScale ? 0.7 : 0.85;
  return {
    key: "geo",
    label: "Location fit",
    weight,
    score,
    reason: geo === "local" ? "Tied to a local service area" : "Somewhat location-dependent",
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export interface FitResult {
  score: number; // 0-100
  reasons: string[];
  breakdown: { label: string; contribution: number; max: number }[];
}

export function scoreOpportunity(p: ScorerProfile, o: ScorerOpportunity): FitResult {
  const components: Component[] = [
    skillFit(p, o),
    budgetFit(p, o),
    timeFit(p, o),
    goalAlignment(p, o),
    marketConditions(o),
    difficultyFit(p, o),
    scalabilityFit(p, o),
    geoFit(p, o),
    interestFit(p, o),
  ];

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weighted = components.reduce((s, c) => s + c.score * c.weight, 0);
  const raw = weighted / totalWeight; // 0..1

  // Widen the usable range: a genuinely poor match should land in the 30s-40s,
  // not the 60s. Map [0.2,0.95] -> [0,100], clamped.
  const stretched = (raw - 0.2) / (0.95 - 0.2);
  const score = Math.max(0, Math.min(100, Math.round(stretched * 100)));

  const reasons = components
    .filter((c) => c.reason)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .map((c) => c.reason!)
    .slice(0, 4);

  const breakdown = components
    .sort((a, b) => b.weight - a.weight)
    .map((c) => ({
      label: c.label,
      contribution: Math.round(c.score * c.weight),
      max: c.weight,
    }));

  return { score, reasons, breakdown };
}
