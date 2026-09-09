"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import type { FormState } from "@/lib/form";
import { ProjectStatus } from "@/lib/validations/enums";
import {
  createProject,
  updateProject,
  setProjectStatus,
  deleteProject,
  projectInputSchema,
} from "@/server/services/projects";
import { createNotification } from "@/server/services/notifications";

const formSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).optional(),
  opportunityId: z.string().optional(),
  status: ProjectStatus.default("idea"),
  revenueTarget: z.string().optional(),
  deadline: z.string().optional(),
});

function dollarsToCents(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export async function createProjectAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = formSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form and try again." };

  const project = await createProject(user.id, {
    ...projectInputSchema.partial().parse({}),
    name: parsed.data.name,
    description: parsed.data.description,
    opportunityId: parsed.data.opportunityId || null,
    status: parsed.data.status,
    revenueTargetCents: dollarsToCents(parsed.data.revenueTarget),
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
  });

  await track(user.id, "project_created", { status: project.status });
  await createNotification({
    userId: user.id,
    type: "system",
    title: "Project created",
    body: project.name,
    actionUrl: `/projects/${project.id}`,
  });
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(id: string, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = formSchema.partial().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };
  await updateProject(user.id, id, {
    name: parsed.data.name,
    description: parsed.data.description,
    opportunityId: parsed.data.opportunityId || null,
    status: parsed.data.status,
    revenueTargetCents: dollarsToCents(parsed.data.revenueTarget),
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  return { ok: true };
}

export async function setProjectStatusAction(id: string, status: z.infer<typeof ProjectStatus>) {
  const user = await requireUser();
  await setProjectStatus(user.id, id, status);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(id: string) {
  const user = await requireUser();
  await deleteProject(user.id, id);
  revalidatePath("/projects");
  redirect("/projects");
}
