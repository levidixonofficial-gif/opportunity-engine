"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listNotifications, markAllRead, markRead } from "@/server/services/notifications";

export async function fetchNotifications() {
  const user = await requireUser();
  return listNotifications(user.id, 15);
}

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await markRead(user.id, id);
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/");
}
