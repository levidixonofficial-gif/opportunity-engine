import { db } from "@/lib/db";
import { z } from "zod";
import { TransactionType, InvoiceStatus } from "@/lib/validations/enums";
import { recomputeGoalsForMetric } from "@/server/services/goals";

export const transactionInputSchema = z.object({
  type: TransactionType,
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  category: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
  occurredOn: z.coerce.date(),
  isEstimated: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.enum(["weekly", "monthly", "yearly"]).optional().nullable(),
  projectId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export async function listTransactions(userId: string, opts: { type?: string; limit?: number } = {}) {
  return db.transaction.findMany({
    where: { userId, ...(opts.type ? { type: opts.type } : {}) },
    orderBy: { occurredOn: "desc" },
    take: opts.limit ?? 100,
    include: {
      project: { select: { name: true } },
      contact: { select: { name: true } },
    },
  });
}

export async function createTransaction(userId: string, input: TransactionInput) {
  const data = transactionInputSchema.parse(input);
  if (data.projectId) {
    const p = await db.project.findFirst({ where: { id: data.projectId, userId }, select: { id: true } });
    if (!p) throw new Error("Project not found");
  }
  if (data.contactId) {
    const c = await db.contact.findFirst({ where: { id: data.contactId, userId }, select: { id: true } });
    if (!c) throw new Error("Contact not found");
  }
  const tx = await db.transaction.create({
    data: {
      userId,
      type: data.type,
      amountCents: data.amountCents,
      currency: data.currency,
      category: data.category,
      note: data.note,
      occurredOn: data.occurredOn,
      isEstimated: data.isEstimated,
      isRecurring: data.isRecurring,
      recurrenceInterval: data.recurrenceInterval ?? null,
      projectId: data.projectId || null,
      contactId: data.contactId || null,
    },
  });
  await recomputeGoalsForMetric(userId, ["revenue", "profit"]);
  return tx;
}

export async function deleteTransaction(userId: string, id: string) {
  const owned = await db.transaction.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) throw new Error("Transaction not found");
  await db.transaction.delete({ where: { id } });
  await recomputeGoalsForMetric(userId, ["revenue", "profit"]);
}

export async function moneySummary(userId: string) {
  const [revActual, revEst, expActual, expEst, byMonth, byProject] = await Promise.all([
    db.transaction.aggregate({ where: { userId, type: "revenue", isEstimated: false }, _sum: { amountCents: true } }),
    db.transaction.aggregate({ where: { userId, type: "revenue", isEstimated: true }, _sum: { amountCents: true } }),
    db.transaction.aggregate({ where: { userId, type: "expense", isEstimated: false }, _sum: { amountCents: true } }),
    db.transaction.aggregate({ where: { userId, type: "expense", isEstimated: true }, _sum: { amountCents: true } }),
    db.transaction.findMany({
      where: { userId },
      select: { type: true, amountCents: true, occurredOn: true, isEstimated: true },
      orderBy: { occurredOn: "asc" },
    }),
    db.transaction.groupBy({
      by: ["projectId"],
      where: { userId, type: "revenue", isEstimated: false, projectId: { not: null } },
      _sum: { amountCents: true },
    }),
  ]);

  const revenueActual = revActual._sum.amountCents ?? 0;
  const expenseActual = expActual._sum.amountCents ?? 0;

  // month buckets
  const months = new Map<string, { revenue: number; expense: number }>();
  for (const t of byMonth) {
    if (t.isEstimated) continue;
    const key = `${t.occurredOn.getUTCFullYear()}-${String(t.occurredOn.getUTCMonth() + 1).padStart(2, "0")}`;
    const b = months.get(key) ?? { revenue: 0, expense: 0 };
    if (t.type === "revenue") b.revenue += t.amountCents;
    else b.expense += t.amountCents;
    months.set(key, b);
  }

  return {
    revenueActualCents: revenueActual,
    revenueEstimatedCents: revEst._sum.amountCents ?? 0,
    expenseActualCents: expenseActual,
    expenseEstimatedCents: expEst._sum.amountCents ?? 0,
    profitActualCents: revenueActual - expenseActual,
    byMonth: [...months.entries()].map(([month, v]) => ({ month, ...v, profit: v.revenue - v.expense })),
    byProject: byProject.map((p) => ({ projectId: p.projectId, revenueCents: p._sum.amountCents ?? 0 })),
  };
}

// --- Invoices ------------------------------------------------------------

export const invoiceInputSchema = z.object({
  number: z.string().trim().min(1).max(40),
  contactId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default("USD"),
  status: InvoiceStatus.default("draft"),
  issuedOn: z.coerce.date().optional().nullable(),
  dueOn: z.coerce.date().optional().nullable(),
  note: z.string().trim().max(1000).optional(),
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export async function listInvoices(userId: string) {
  return db.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { contact: { select: { name: true } }, project: { select: { name: true } } },
  });
}

export async function createInvoice(userId: string, input: InvoiceInput) {
  const data = invoiceInputSchema.parse(input);
  return db.invoice.create({
    data: {
      userId,
      number: data.number,
      contactId: data.contactId || null,
      projectId: data.projectId || null,
      amountCents: data.amountCents,
      currency: data.currency,
      status: data.status,
      issuedOn: data.issuedOn ?? null,
      dueOn: data.dueOn ?? null,
      note: data.note,
    },
  });
}

/** Marking an invoice paid creates a matching actual revenue transaction. */
export async function markInvoicePaid(userId: string, id: string) {
  const invoice = await db.invoice.findFirst({ where: { id, userId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "paid") return invoice;

  await db.$transaction([
    db.invoice.update({ where: { id }, data: { status: "paid", paidOn: new Date() } }),
    db.transaction.create({
      data: {
        userId,
        type: "revenue",
        amountCents: invoice.amountCents,
        currency: invoice.currency,
        category: "invoice",
        note: `Invoice ${invoice.number}`,
        occurredOn: new Date(),
        projectId: invoice.projectId,
        contactId: invoice.contactId,
        invoiceId: invoice.id,
      },
    }),
  ]);
  await recomputeGoalsForMetric(userId, ["revenue", "profit"]);
  return db.invoice.findUnique({ where: { id } });
}
