"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import type { FormState } from "@/lib/form";
import { GoalMetric } from "@/lib/validations/enums";
import { createGoal, updateGoal, setGoalStatus, deleteGoal } from "@/server/services/goals";

const REVENUE_METRICS = new Set(["revenue", "profit"]);

const formSchema = z.object({
  title: z.string().trim().min(2).max(120),
  metric: GoalMetric,
  target: z.string().min(1),
  targetDate: z.string().optional(),
});

export async function createGoalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = formSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };

  const raw = Number(parsed.data.target.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return { error: "Enter a positive target." };
  const targetValue = REVENUE_METRICS.has(parsed.data.metric) ? Math.round(raw * 100) : Math.round(raw);

  await createGoal(user.id, {
    title: parsed.data.title,
    metric: parsed.data.metric,
    targetValue,
    targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
  });
  await track(user.id, "goal_created", { metric: parsed.data.metric });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setGoalStatusAction(id: string, status: "active" | "achieved" | "archived") {
  const user = await requireUser();
  await setGoalStatus(user.id, id, status);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoalAction(id: string) {
  const user = await requireUser();
  await deleteGoal(user.id, id);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function updateGoalTargetAction(id: string, formData: FormData) {
  const user = await requireUser();
  const raw = Number(String(formData.get("target")).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return;
  await updateGoal(user.id, id, { targetValue: Math.round(raw) });
  revalidatePath("/goals");
}
