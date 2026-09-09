"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { captureException } from "@/lib/observability";
import { AppError, toUserMessage } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import {
  setFeatureFlag,
  setUserRole,
  upsertOpportunity,
  adminOpportunitySchema,
} from "@/server/services/admin";

export async function setFeatureFlagAction(key: string, state: string): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    await setFeatureFlag(admin.id, key, state);
  } catch (e) {
    if (!(e instanceof AppError)) captureException(e, { where: "setFeatureFlagAction" });
    return { error: toUserMessage(e, "Could not update the flag.") };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: string): Promise<FormState> {
  const admin = await requireAdmin();
  try {
    await setUserRole(admin.id, userId, role);
  } catch (e) {
    if (!(e instanceof AppError)) captureException(e, { where: "setUserRoleAction" });
    return { error: toUserMessage(e, "Could not change the role.") };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function upsertOpportunityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const id = (formData.get("id") as string) || undefined;
  const raw = Object.fromEntries(formData);
  const parsed = adminOpportunitySchema.safeParse({
    ...raw,
    isOnline: raw.isOnline === "on",
    isServiceBased: raw.isServiceBased === "on",
    beginnerFriendly: raw.beginnerFriendly === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  try {
    const opp = await upsertOpportunity(admin.id, parsed.data, id);
    revalidatePath("/admin/opportunities");
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${opp.slug}`);
    return { ok: true, message: opp.id };
  } catch (e) {
    if (e instanceof Error && /Unique constraint|unique/i.test(e.message)) {
      return { error: "That slug is already taken." };
    }
    if (!(e instanceof AppError)) captureException(e, { where: "upsertOpportunityAction" });
    return { error: toUserMessage(e, "Save failed.") };
  }
}
