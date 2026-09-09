import { db } from "@/lib/db";
import { z } from "zod";
import { OutreachChannel, OutreachKind, OutreachStatus } from "@/lib/validations/enums";
import { integrations } from "@/lib/env";

export const outreachInputSchema = z.object({
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  channel: OutreachChannel.default("email"),
  kind: OutreachKind.default("cold_intro"),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(8000),
});
export type OutreachInput = z.infer<typeof outreachInputSchema>;

export async function listOutreach(userId: string, opts: { status?: string } = {}) {
  return db.outreachMessage.findMany({
    where: { userId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: { updatedAt: "desc" },
    include: { contact: { select: { id: true, name: true } } },
  });
}

export async function createOutreach(userId: string, input: OutreachInput) {
  const data = outreachInputSchema.parse(input);
  if (data.contactId) {
    const c = await db.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true } });
    if (!c) throw new Error("Contact not found");
  }
  return db.outreachMessage.create({
    data: {
      userId,
      contactId: data.contactId || null,
      dealId: data.dealId || null,
      channel: data.channel,
      kind: data.kind,
      subject: data.subject,
      body: data.body,
      status: "draft",
    },
  });
}

export async function updateOutreach(userId: string, id: string, input: Partial<OutreachInput>) {
  const owned = await db.outreachMessage.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Message not found");
  const data = outreachInputSchema.partial().parse(input);
  return db.outreachMessage.update({ where: { id }, data });
}

/**
 * Advance an outreach message's status.
 *
 * "sent" and "delivered" require a real sending integration; with none
 * configured we only allow the user to MANUALLY log that they sent it
 * themselves (status "sent", flagged as self-reported). We never auto-claim
 * delivery. "replied"/"interested"/"booked"/"won"/"lost" are always user-logged
 * outcomes.
 */
export async function setOutreachStatus(
  userId: string,
  id: string,
  status: z.infer<typeof OutreachStatus>,
) {
  OutreachStatus.parse(status);
  const owned = await db.outreachMessage.findFirst({ where: { id, userId } });
  if (!owned) throw new Error("Message not found");

  if (status === "delivered" && !integrations.resend) {
    throw new Error("Automatic delivery tracking needs an email integration. Log it as 'sent' manually instead.");
  }

  return db.outreachMessage.update({
    where: { id },
    data: {
      status,
      sentAt: status === "sent" && !owned.sentAt ? new Date() : owned.sentAt,
      repliedAt: status === "replied" && !owned.repliedAt ? new Date() : owned.repliedAt,
    },
  });
}

export async function deleteOutreach(userId: string, id: string) {
  const owned = await db.outreachMessage.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Message not found");
  await db.outreachMessage.delete({ where: { id } });
}
