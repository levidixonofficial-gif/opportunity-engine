"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { integrations } from "@/lib/env";
import { track } from "@/lib/analytics";
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

/** Dev-only plan switch for testing entitlements. No-ops in production / with Stripe. */
export async function devSetPlanAction(plan: string) {
  if (integrations.stripe) return { error: "Stripe is configured — use real checkout." };
  const user = await requireUser();
  await devSetPlan(user.id, SubscriptionPlan.parse(plan));
  revalidatePath("/billing");
  revalidatePath("/", "layout");
  return { ok: true };
}
