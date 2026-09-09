"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/server/services/billing";
import { toggleSaveOpportunity } from "@/server/services/opportunities";
import { generatePlanFromOpportunity } from "@/server/services/plans";

const idSchema = z.string().min(1);

export async function toggleSaveAction(opportunityId: string) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const result = await toggleSaveOpportunity(user.id, plan, idSchema.parse(opportunityId));
  revalidatePath("/opportunities");
  revalidatePath("/saved");
  return result;
}

export async function selectOpportunityAction(opportunityId: string) {
  const user = await requireUser();
  const id = idSchema.parse(opportunityId);
  await db.$transaction([
    db.savedOpportunity.updateMany({ where: { userId: user.id, state: "selected" }, data: { state: "saved" } }),
    db.savedOpportunity.upsert({
      where: { userId_opportunityId: { userId: user.id, opportunityId: id } },
      update: { state: "selected" },
      create: { userId: user.id, opportunityId: id, state: "selected" },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/opportunities");
}

export async function generatePlanAction(opportunityId: string) {
  const user = await requireUser();
  const plan = await generatePlanFromOpportunity(user.id, idSchema.parse(opportunityId));
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  return { planId: plan.id };
}
