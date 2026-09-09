import { db } from "@/lib/db";
import { z } from "zod";
import { TaskStatus, TaskPriority } from "@/lib/validations/enums";
import { NotFoundError } from "@/lib/errors";
import { recomputeGoalsForMetric } from "@/server/services/goals";

export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(2000).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  priority: TaskPriority.default("normal"),
  projectId: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});
/** Accepts the pre-parse shape (fields with schema defaults are optional). */
export type TaskInput = z.input<typeof taskInputSchema>;

async function assertOwnedTask(userId: string, id: string) {
  const t = await db.task.findFirst({ where: { id, userId } });
  if (!t) throw new NotFoundError("That task");
  return t;
}

export async function createTask(userId: string, input: TaskInput) {
  const data = taskInputSchema.parse(input);
  // Validate every linked parent belongs to the same user (relationship tampering).
  if (data.projectId) {
    const p = await db.project.findFirst({ where: { id: data.projectId, userId }, select: { id: true } });
    if (!p) throw new NotFoundError("That project");
  }
  if (data.contactId) {
    const c = await db.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true } });
    if (!c) throw new NotFoundError("That contact");
  }
  if (data.planId) {
    const pl = await db.plan.findFirst({ where: { id: data.planId, userId }, select: { id: true } });
    if (!pl) throw new NotFoundError("That plan");
  }
  const maxOrder = await db.task.aggregate({
    where: { userId, projectId: data.projectId ?? null },
    _max: { sortOrder: true },
  });
  return db.task.create({
    data: {
      userId,
      title: data.title,
      detail: data.detail,
      dueDate: data.dueDate ?? null,
      priority: data.priority,
      projectId: data.projectId || null,
      planId: data.planId || null,
      contactId: data.contactId || null,
      source: data.contactId ? "followup" : "manual",
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function updateTask(userId: string, id: string, input: Partial<TaskInput>) {
  await assertOwnedTask(userId, id);
  const data = taskInputSchema.partial().parse(input);
  return db.task.update({
    where: { id },
    data: {
      ...("title" in data ? { title: data.title } : {}),
      ...("detail" in data ? { detail: data.detail } : {}),
      ...("dueDate" in data ? { dueDate: data.dueDate ?? null } : {}),
      ...("priority" in data ? { priority: data.priority } : {}),
    },
  });
}

export async function setTaskStatusFor(
  userId: string,
  id: string,
  status: z.infer<typeof TaskStatus>,
) {
  TaskStatus.parse(status);
  await assertOwnedTask(userId, id);
  const task = await db.task.update({
    where: { id },
    data: { status, completedAt: status === "done" ? new Date() : null },
  });
  await recomputeGoalsForMetric(userId, ["tasks"]);
  return task;
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  const owned = await db.task.findMany({
    where: { id: { in: orderedIds }, userId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((t) => t.id));
  await db.$transaction(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, idx) => db.task.update({ where: { id }, data: { sortOrder: idx } })),
  );
}

export async function deleteTask(userId: string, id: string) {
  await assertOwnedTask(userId, id);
  await db.task.delete({ where: { id } });
}

export async function listTasks(userId: string) {
  return db.task.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
    include: { project: { select: { id: true, name: true } } },
  });
}
