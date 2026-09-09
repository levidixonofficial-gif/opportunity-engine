"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const prefSchema = z.object({
  productUpdates: z.boolean(),
  taskReminders: z.boolean(),
  weeklyDigest: z.boolean(),
  recommendations: z.boolean(),
  billingAlerts: z.boolean(),
});

export async function updateNotificationPrefs(formData: FormData) {
  const user = await requireUser();
  const data = prefSchema.parse({
    productUpdates: formData.get("productUpdates") === "on",
    taskReminders: formData.get("taskReminders") === "on",
    weeklyDigest: formData.get("weeklyDigest") === "on",
    recommendations: formData.get("recommendations") === "on",
    billingAlerts: formData.get("billingAlerts") === "on",
  });
  await db.notificationPreference.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });
  revalidatePath("/settings");
}

export async function resetOnboarding() {
  const user = await requireUser();
  await db.profile.update({ where: { userId: user.id }, data: { onboardedAt: null } });
  revalidatePath("/onboarding");
}

const profileSchema = z.object({
  primaryGoal: z.enum([
    "first_100",
    "side_income",
    "build_business",
    "replace_income",
    "learn_skill",
    "explore",
  ]),
  budgetBand: z.enum(["lt_50", "50_250", "250_1000", "1000_plus"]),
  timeBand: z.enum(["30_min", "1_hr", "2_3_hr", "4_plus_hr"]),
  experienceLevel: z.enum(["none", "some", "experienced"]),
  skillSlugs: z.array(z.string()).max(20),
  interestSlugs: z.array(z.string()).max(20),
});

export async function updateProfile(input: unknown) {
  const user = await requireUser();
  const data = profileSchema.parse(input);

  const [skills, interests, profile] = await Promise.all([
    db.skill.findMany({ where: { slug: { in: data.skillSlugs } }, select: { id: true } }),
    db.interest.findMany({ where: { slug: { in: data.interestSlugs } }, select: { id: true } }),
    db.profile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } }),
  ]);

  await db.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: user.id },
      data: {
        primaryGoal: data.primaryGoal,
        budgetBand: data.budgetBand,
        timeBand: data.timeBand,
        experienceLevel: data.experienceLevel,
      },
    });
    await tx.profileSkill.deleteMany({ where: { profileId: profile.id } });
    await tx.profileInterest.deleteMany({ where: { profileId: profile.id } });
    if (skills.length)
      await tx.profileSkill.createMany({ data: skills.map((s) => ({ profileId: profile.id, skillId: s.id })) });
    if (interests.length)
      await tx.profileInterest.createMany({
        data: interests.map((i) => ({ profileId: profile.id, interestId: i.id })),
      });
  });

  const { recomputeSavedRecommendations } = await import("@/server/services/opportunities");
  await recomputeSavedRecommendations(user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/opportunities");
  return { ok: true };
}
