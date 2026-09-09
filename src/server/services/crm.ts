import { db } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { DealStage, InteractionType, VerificationStatus } from "@/lib/validations/enums";
import { recomputeGoalsForMetric } from "@/server/services/goals";

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(200).optional(),
  title: z.string().trim().max(120).optional(),
  source: z.string().trim().max(60).optional(),
  sourceDetail: z.string().trim().max(200).optional(),
  tags: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(4000).optional(),
  stage: DealStage.default("lead"),
  verificationStatus: VerificationStatus.default("unverified"),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

function clean(input: ContactInput) {
  return {
    ...input,
    email: input.email ? input.email : null,
    isCustomer: input.stage === "won",
  };
}

export async function listContacts(userId: string, opts: { stage?: string; q?: string } = {}) {
  const where: Prisma.ContactWhereInput = { userId };
  if (opts.stage) where.stage = opts.stage;
  if (opts.q) {
    where.OR = [
      { name: { contains: opts.q } },
      { company: { contains: opts.q } },
      { email: { contains: opts.q } },
    ];
  }
  return db.contact.findMany({
    where,
    orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { deals: true, interactions: true } } },
  });
}

export async function getContact(userId: string, id: string) {
  return db.contact.findFirst({
    where: { id, userId },
    include: {
      deals: { orderBy: { updatedAt: "desc" } },
      interactions: { orderBy: { occurredAt: "desc" }, take: 50 },
      outreach: { orderBy: { createdAt: "desc" }, take: 20 },
      tasks: { where: { status: "todo" }, orderBy: { dueDate: "asc" } },
      companyRef: true,
    },
  });
}

export async function createContact(userId: string, input: ContactInput) {
  const data = clean(contactInputSchema.parse(input));
  const contact = await db.contact.create({
    data: {
      userId,
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      website: data.website,
      title: data.title,
      source: data.source,
      sourceDetail: data.sourceDetail,
      tags: data.tags,
      notes: data.notes,
      stage: data.stage,
      verificationStatus: data.verificationStatus,
      isCustomer: data.isCustomer,
      nextFollowUpAt: data.nextFollowUpAt ?? null,
    },
  });
  await recomputeGoalsForMetric(userId, ["leads", "customers"]);
  return contact;
}

export async function updateContact(userId: string, id: string, input: Partial<ContactInput>) {
  const owned = await db.contact.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Contact not found");
  const data = contactInputSchema.partial().parse(input);
  const patch: Record<string, unknown> = { ...data };
  if ("email" in data) patch.email = data.email || null;
  if ("stage" in data && data.stage) patch.isCustomer = data.stage === "won";
  if ("nextFollowUpAt" in data) patch.nextFollowUpAt = data.nextFollowUpAt ?? null;
  const contact = await db.contact.update({ where: { id }, data: patch });
  await recomputeGoalsForMetric(userId, ["leads", "customers"]);
  return contact;
}

export async function setContactStage(userId: string, id: string, stage: z.infer<typeof DealStage>) {
  DealStage.parse(stage);
  const owned = await db.contact.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Contact not found");
  const contact = await db.contact.update({
    where: { id },
    data: { stage, isCustomer: stage === "won", lastContactedAt: new Date() },
  });
  await recomputeGoalsForMetric(userId, ["customers"]);
  return contact;
}

export async function deleteContact(userId: string, id: string) {
  const owned = await db.contact.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Contact not found");
  await db.contact.delete({ where: { id } });
  await recomputeGoalsForMetric(userId, ["leads", "customers"]);
}

export async function addInteraction(
  userId: string,
  contactId: string,
  input: { type: z.infer<typeof InteractionType>; body: string; occurredAt?: Date },
) {
  InteractionType.parse(input.type);
  const owned = await db.contact.findFirst({ where: { id: contactId, userId }, select: { id: true } });
  if (!owned) throw new Error("Contact not found");
  const [interaction] = await db.$transaction([
    db.interaction.create({
      data: {
        userId,
        contactId,
        type: input.type,
        body: input.body.slice(0, 4000),
        occurredAt: input.occurredAt ?? new Date(),
      },
    }),
    db.contact.update({ where: { id: contactId }, data: { lastContactedAt: new Date() } }),
  ]);
  await recomputeGoalsForMetric(userId, ["activity"]);
  return interaction;
}

// --- Deals -----------------------------------------------------------------

export const dealInputSchema = z.object({
  contactId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  stage: DealStage.default("lead"),
  valueCents: z.number().int().nonnegative().default(0),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  source: z.string().trim().max(60).optional(),
  projectId: z.string().optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  nextFollowUp: z.coerce.date().optional().nullable(),
});
export type DealInput = z.infer<typeof dealInputSchema>;

export async function listDeals(userId: string) {
  return db.deal.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { contact: { select: { id: true, name: true, company: true } } },
  });
}

export async function createDeal(userId: string, input: DealInput) {
  const data = dealInputSchema.parse(input);
  const contact = await db.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true } });
  if (!contact) throw new Error("Contact not found");
  return db.deal.create({
    data: {
      userId,
      contactId: data.contactId,
      title: data.title,
      stage: data.stage,
      valueCents: data.valueCents,
      probability: data.probability ?? null,
      source: data.source,
      projectId: data.projectId || null,
      expectedCloseDate: data.expectedCloseDate ?? null,
      nextFollowUp: data.nextFollowUp ?? null,
    },
  });
}

export async function setDealStage(userId: string, id: string, stage: z.infer<typeof DealStage>) {
  DealStage.parse(stage);
  const owned = await db.deal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Deal not found");
  return db.deal.update({
    where: { id },
    data: { stage, closedAt: stage === "won" || stage === "lost" ? new Date() : null },
  });
}

export async function updateDeal(userId: string, id: string, input: Partial<DealInput>) {
  const owned = await db.deal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Deal not found");
  const data = dealInputSchema.partial().parse(input);
  return db.deal.update({
    where: { id },
    data: {
      ...data,
      projectId: "projectId" in data ? data.projectId || null : undefined,
    },
  });
}

export async function deleteDeal(userId: string, id: string) {
  const owned = await db.deal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Deal not found");
  await db.deal.delete({ where: { id } });
}

export async function pipelineSummary(userId: string) {
  const deals = await db.deal.groupBy({
    by: ["stage"],
    where: { userId },
    _count: { _all: true },
    _sum: { valueCents: true },
  });
  return deals;
}

export async function dueFollowUps(userId: string) {
  const now = new Date();
  return db.contact.findMany({
    where: { userId, nextFollowUpAt: { lte: now } },
    orderBy: { nextFollowUpAt: "asc" },
    take: 10,
  });
}
