"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { integrations } from "@/lib/env";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/observability";
import { AppError, toUserMessage } from "@/lib/errors";
import { SubscriptionPlan } from "@/lib/validations/enums";
import { createUpgradeCheckout, createBillingPortal, devSetPlan } from "@/server/services/checkout";

export async function startUpgradeAction(plan: string) {
  const user = await requireUser();
  const parsed = z.enum(["pro", "premium"]).parse(plan);
  const { url } = await createUpgradeCheckout(user.id, parsed);
  await track(user.id, "subscription_started", { plan: parsed });
  redirect(url);
}

export async function openBillingPortalAction() {
  const user = await requireUser();
  const { url } = await createBillingPortal(user.id);
  redirect(url);
}

/**
 * DEV-ONLY plan switch for testing entitlements. Triple-gated: this action, the
 * service (devSetPlan), and the UI all refuse when NODE_ENV=production or Stripe
 * is configured.
 */
export async function devSetPlanAction(plan: string): Promise<{ ok?: boolean; error?: string }> {
  if (process.env.NODE_ENV === "production" || integrations.stripe) {
    return { error: "Not available. Use real checkout." };
  }
  const user = await requireUser();
  try {
    await devSetPlan(user.id, SubscriptionPlan.parse(plan));
  } catch (e) {
    if (!(e instanceof AppError)) captureException(e, { where: "devSetPlanAction" });
    return { error: toUserMessage(e, "Could not switch plan.") };
  }
  revalidatePath("/billing");
  revalidatePath("/", "layout");
  return { ok: true };
}
