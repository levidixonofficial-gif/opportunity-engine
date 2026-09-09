"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/lib/form";
import {
  setFeatureFlag,
  setUserRole,
  upsertOpportunity,
  adminOpportunitySchema,
} from "@/server/services/admin";

export async function setFeatureFlagAction(key: string, state: string) {
  const admin = await requireAdmin();
  await setFeatureFlag(admin.id, key, state);
  revalidatePath("/admin");
}

export async function setUserRoleAction(userId: string, role: string) {
  const admin = await requireAdmin();
  try {
    await setUserRole(admin.id, userId, role);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed" };
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
  // checkboxes: present => "on"
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
    if (e instanceof Error && e.message.includes("Unique")) return { error: "That slug is already taken." };
    return { error: "Save failed." };
  }
}
