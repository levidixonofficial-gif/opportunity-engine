import { db } from "@/lib/db";
import type { ScorerProfile } from "@/lib/scoring/fit";
import {
  BudgetBand,
  ExperienceLevel,
  PrimaryGoal,
  TimeBand,
} from "@/lib/validations/enums";

function safeParse<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, v: unknown): T | null {
  const r = schema.safeParse(v);
  return r.success ? (r.data as T) : null;
}

/** Build the input the deterministic scorer needs for a given user. */
export async function getScorerProfile(userId: string): Promise<ScorerProfile> {
  const profile = await db.profile.findUnique({
    where: { userId },
    include: {
      skills: { include: { skill: true } },
      interests: { include: { interest: true } },
    },
  });

  return {
    primaryGoal: safeParse<PrimaryGoal>(PrimaryGoal, profile?.primaryGoal),
    budgetBand: safeParse<BudgetBand>(BudgetBand, profile?.budgetBand),
    timeBand: safeParse<TimeBand>(TimeBand, profile?.timeBand),
    experienceLevel: safeParse<ExperienceLevel>(ExperienceLevel, profile?.experienceLevel),
    skillSlugs: profile?.skills.map((s) => s.skill.slug) ?? [],
    interestSlugs: profile?.interests.map((i) => i.interest.slug) ?? [],
  };
}

export async function isOnboarded(userId: string): Promise<boolean> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { onboardedAt: true } });
  return !!profile?.onboardedAt;
}
