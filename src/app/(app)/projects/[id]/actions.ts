"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTask } from "@/server/services/tasks";

export async function addProjectTaskAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  const title = z.string().trim().min(1).max(200).parse(formData.get("title"));
  const dueRaw = formData.get("dueDate");
  await createTask(user.id, {
    title,
    projectId,
    priority: "normal",
    dueDate: dueRaw ? new Date(String(dueRaw)) : null,
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function addMilestoneAction(projectId: string, formData: FormData) {
  const user = await requireUser();
  const owned = await db.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
  if (!owned) throw new Error("Project not found");
  const title = z.string().trim().min(1).max(160).parse(formData.get("title"));
  const count = await db.milestone.count({ where: { projectId } });
  await db.milestone.create({ data: { projectId, title, sortOrder: count } });
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleMilestoneAction(projectId: string, milestoneId: string) {
  const user = await requireUser();
  const m = await db.milestone.findFirst({
    where: { id: milestoneId, project: { userId: user.id } },
  });
  if (!m) throw new Error("Milestone not found");
  await db.milestone.update({
    where: { id: milestoneId },
    data: { reachedAt: m.reachedAt ? null : new Date() },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMilestoneAction(projectId: string, milestoneId: string) {
  const user = await requireUser();
  const m = await db.milestone.findFirst({
    where: { id: milestoneId, project: { userId: user.id } },
    select: { id: true },
  });
  if (!m) throw new Error("Milestone not found");
  await db.milestone.delete({ where: { id: milestoneId } });
  revalidatePath(`/projects/${projectId}`);
}
