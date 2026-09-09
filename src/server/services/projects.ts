import { db } from "@/lib/db";
import { ProjectStatus } from "@/lib/validations/enums";
import { z } from "zod";

export const projectInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).optional(),
  opportunityId: z.string().optional().nullable(),
  status: ProjectStatus.default("idea"),
  goalNote: z.string().trim().max(500).optional(),
  revenueTargetCents: z.number().int().nonnegative().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export async function listProjects(userId: string) {
  const projects = await db.project.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      opportunity: { select: { slug: true, name: true } },
      _count: { select: { tasks: true, deals: true, milestones: true } },
    },
  });
  // attach revenue per project
  const revenue = await db.transaction.groupBy({
    by: ["projectId"],
    where: { userId, type: "revenue", projectId: { not: null } },
    _sum: { amountCents: true },
  });
  const revMap = new Map(revenue.map((r) => [r.projectId, r._sum.amountCents ?? 0]));
  return projects.map((p) => ({ ...p, revenueCents: revMap.get(p.id) ?? 0 }));
}

export async function getProject(userId: string, id: string) {
  return db.project.findFirst({
    where: { id, userId },
    include: {
      opportunity: { select: { slug: true, name: true } },
      tasks: { orderBy: [{ status: "asc" }, { sortOrder: "asc" }] },
      milestones: { orderBy: { sortOrder: "asc" } },
      deals: { include: { contact: { select: { name: true } } } },
      transactions: { orderBy: { occurredOn: "desc" }, take: 20 },
    },
  });
}

export async function createProject(userId: string, input: ProjectInput) {
  const data = projectInputSchema.parse(input);
  return db.project.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      opportunityId: data.opportunityId || null,
      status: data.status,
      goalNote: data.goalNote,
      revenueTargetCents: data.revenueTargetCents ?? null,
      startDate: data.startDate ?? null,
      deadline: data.deadline ?? null,
    },
  });
}

export async function updateProject(userId: string, id: string, input: Partial<ProjectInput>) {
  const owned = await db.project.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Project not found");
  const data = projectInputSchema.partial().parse(input);
  return db.project.update({
    where: { id },
    data: {
      ...("name" in data ? { name: data.name } : {}),
      ...("description" in data ? { description: data.description } : {}),
      ...("opportunityId" in data ? { opportunityId: data.opportunityId || null } : {}),
      ...("status" in data ? { status: data.status } : {}),
      ...("goalNote" in data ? { goalNote: data.goalNote } : {}),
      ...("revenueTargetCents" in data ? { revenueTargetCents: data.revenueTargetCents ?? null } : {}),
      ...("startDate" in data ? { startDate: data.startDate ?? null } : {}),
      ...("deadline" in data ? { deadline: data.deadline ?? null } : {}),
    },
  });
}

export async function setProjectStatus(userId: string, id: string, status: z.infer<typeof ProjectStatus>) {
  ProjectStatus.parse(status);
  const owned = await db.project.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Project not found");
  return db.project.update({ where: { id }, data: { status } });
}

export async function deleteProject(userId: string, id: string) {
  const owned = await db.project.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Project not found");
  await db.project.delete({ where: { id } });
}
