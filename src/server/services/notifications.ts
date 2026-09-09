import { db } from "@/lib/db";
import { NotificationType } from "@/lib/validations/enums";
import type { z } from "zod";

export async function createNotification(input: {
  userId: string;
  type: z.infer<typeof NotificationType>;
  title: string;
  body?: string;
  actionUrl?: string;
}) {
  NotificationType.parse(input.type);
  return db.notification.create({ data: input });
}

export async function listNotifications(userId: string, limit = 20) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}
