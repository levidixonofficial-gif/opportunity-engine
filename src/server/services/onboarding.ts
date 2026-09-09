import { db } from "@/lib/db";
import { type OnboardingSubmission } from "@/lib/onboarding/questions";
import { GOAL_LABELS } from "@/lib/validations/enums";
import { recomputeSavedRecommendations } from "@/server/services/opportunities";

/**
 * Onboarding → personalization pipeline (spec §36):
 *  1. persist profile answers
 *  2. link skills / interests
 *  3. seed an initial goal
 *  4. warm the deterministic recommendations
 * No AI is called here.
 */
export async function submitOnboarding(userId: string, data: OnboardingSubmission) {
  const [skills, interests] = await Promise.all([
    db.skill.findMany({ where: { slug: { in: data.skillSlugs } }, select: { id: true } }),
    db.interest.findMany({ where: { slug: { in: data.interestSlugs } }, select: { id: true } }),
  ]);

  await db.$transaction(async (tx) => {
    const profile = await tx.profile.upsert({
      where: { userId },
      create: {
        userId,
        primaryGoal: data.primaryGoal,
        budgetBand: data.budgetBand,
        timeBand: data.timeBand,
        experienceLevel: data.experienceLevel,
        onboardingRaw: JSON.stringify(data),
        onboardedAt: new Date(),
      },
      update: {
        primaryGoal: data.primaryGoal,
        budgetBand: data.budgetBand,
        timeBand: data.timeBand,
        experienceLevel: data.experienceLevel,
        onboardingRaw: JSON.stringify(data),
        onboardedAt: new Date(),
      },
    });

    await tx.profileSkill.deleteMany({ where: { profileId: profile.id } });
    await tx.profileInterest.deleteMany({ where: { profileId: profile.id } });
    if (skills.length) {
      await tx.profileSkill.createMany({
        data: skills.map((s) => ({ profileId: profile.id, skillId: s.id })),
      });
    }
    if (interests.length) {
      await tx.profileInterest.createMany({
        data: interests.map((i) => ({ profileId: profile.id, interestId: i.id })),
      });
    }

    const existingGoal = await tx.goal.findFirst({ where: { userId } });
    if (!existingGoal) {
      await tx.goal.create({
        data: {
          userId,
          title: initialGoalTitle(data.primaryGoal),
          metric: data.primaryGoal === "learn_skill" ? "tasks" : "revenue",
          targetValue: initialGoalTarget(data.primaryGoal),
        },
      });
    }
  });

  await recomputeSavedRecommendations(userId);
}

function initialGoalTitle(goal: OnboardingSubmission["primaryGoal"]): string {
  return `${GOAL_LABELS[goal]}`;
}

function initialGoalTarget(goal: OnboardingSubmission["primaryGoal"]): number {
  switch (goal) {
    case "first_100":
      return 10000; // $100 in cents
    case "side_income":
      return 50000;
    case "build_business":
      return 200000;
    case "replace_income":
      return 400000;
    case "learn_skill":
      return 10; // tasks
    default:
      return 10000;
  }
}
