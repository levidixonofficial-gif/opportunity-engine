"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TaskStatus } from "@/lib/validations/enums";

const schema = z.object({ taskId: z.string().min(1), status: TaskStatus });

export async function setTaskStatusAction(taskId: string, status: z.infer<typeof TaskStatus>) {
  const user = await requireUser();
  const parsed = schema.parse({ taskId, status });

  // Ownership check — never trust the id alone.
  const task = await db.task.findFirst({ where: { id: parsed.taskId, userId: user.id } });
  if (!task) throw new Error("Task not found");

  await db.task.update({
    where: { id: task.id },
    data: {
      status: parsed.status,
      completedAt: parsed.status === "done" ? new Date() : null,
    },
  });

  // Keep a revenue-type goal's task metric roughly in sync for "learn a skill" goals.
  await syncTaskGoal(user.id);

  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

async function syncTaskGoal(userId: string) {
  const goal = await db.goal.findFirst({ where: { userId, metric: "tasks", status: "active" } });
  if (!goal) return;
  const done = await db.task.count({ where: { userId, status: "done" } });
  await db.goal.update({
    where: { id: goal.id },
    data: { currentValue: done, status: done >= goal.targetValue ? "achieved" : "active" },
  });
}
