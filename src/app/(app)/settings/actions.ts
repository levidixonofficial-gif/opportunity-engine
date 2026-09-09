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
