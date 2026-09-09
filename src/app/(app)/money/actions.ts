"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import type { FormState } from "@/lib/form";
import { TransactionType } from "@/lib/validations/enums";
import {
  createTransaction,
  deleteTransaction,
  createInvoice,
  markInvoicePaid,
} from "@/server/services/money";

const txForm = z.object({
  type: TransactionType,
  amount: z.string().min(1),
  category: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
  occurredOn: z.string().min(1),
  isEstimated: z.string().optional(),
  projectId: z.string().optional(),
  contactId: z.string().optional(),
});

export async function addTransactionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = txForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };
  const amount = Number(parsed.data.amount.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a positive amount." };

  await createTransaction(user.id, {
    type: parsed.data.type,
    amountCents: Math.round(amount * 100),
    currency: "USD",
    category: parsed.data.category,
    note: parsed.data.note,
    occurredOn: new Date(parsed.data.occurredOn),
    isEstimated: parsed.data.isEstimated === "on",
    isRecurring: false,
    projectId: parsed.data.projectId || null,
    contactId: parsed.data.contactId || null,
  });
  await track(user.id, "revenue_recorded", { type: parsed.data.type, estimated: parsed.data.isEstimated === "on" });
  revalidatePath("/money");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteTransactionAction(id: string) {
  const user = await requireUser();
  await deleteTransaction(user.id, id);
  revalidatePath("/money");
  revalidatePath("/dashboard");
}

const invoiceForm = z.object({
  number: z.string().trim().min(1).max(40),
  amount: z.string().min(1),
  contactId: z.string().optional(),
  projectId: z.string().optional(),
  dueOn: z.string().optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function createInvoiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = invoiceForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };
  const amount = Number(parsed.data.amount.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a positive amount." };
  try {
    await createInvoice(user.id, {
      number: parsed.data.number,
      amountCents: Math.round(amount * 100),
      currency: "USD",
      status: "draft",
      contactId: parsed.data.contactId || null,
      projectId: parsed.data.projectId || null,
      dueOn: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null,
      note: parsed.data.note,
      issuedOn: new Date(),
    });
  } catch {
    return { error: "That invoice number is already used." };
  }
  revalidatePath("/money");
  return { ok: true };
}

export async function markInvoicePaidAction(id: string) {
  const user = await requireUser();
  await markInvoicePaid(user.id, id);
  revalidatePath("/money");
  revalidatePath("/dashboard");
}
