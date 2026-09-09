"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/observability";
import { AppError, LimitReachedError, toUserMessage } from "@/lib/errors";
import { rateLimit, RL } from "@/lib/ratelimit";
import { getUserPlan } from "@/server/services/billing";
import { toggleSaveOpportunity } from "@/server/services/opportunities";
import { generatePlanFromOpportunity } from "@/server/services/plans";

const idSchema = z.string().trim().min(1).max(40);

export async function toggleSaveAction(opportunityId: string) {
  const user = await requireUser();
  await rateLimit("mutation", user.id, RL.mutation);
  const plan = await getUserPlan(user.id);
  const result = await toggleSaveOpportunity(user.id, plan, idSchema.parse(opportunityId));
  revalidatePath("/opportunities");
  revalidatePath("/saved");
  return result;
}

export async function selectOpportunityAction(opportunityId: string) {
  const user = await requireUser();
  const id = idSchema.parse(opportunityId);
  const opp = await db.opportunity.findFirst({ where: { id, status: "published" }, select: { id: true } });
  if (!opp) throw new AppError("That opportunity is not available.");
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

export async function generatePlanAction(
  opportunityId: string,
): Promise<{ planId?: string; error?: string; limited?: boolean }> {
  const user = await requireUser();
  try {
    const plan = await generatePlanFromOpportunity(user.id, idSchema.parse(opportunityId));
    await track(user.id, "plan_generated", {});
    revalidatePath("/plan");
    revalidatePath("/dashboard");
    return { planId: plan.id };
  } catch (e) {
    if (!(e instanceof AppError)) captureException(e, { where: "generatePlanAction" });
    return { error: toUserMessage(e, "Could not generate the plan."), limited: e instanceof LimitReachedError };
  }
}
