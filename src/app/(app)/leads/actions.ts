"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import type { FormState } from "@/lib/form";
import { DealStage, InteractionType } from "@/lib/validations/enums";
import {
  createContact,
  updateContact,
  setContactStage,
  deleteContact,
  addInteraction,
  createDeal,
  setDealStage,
} from "@/server/services/crm";
import { importLeads, parseCsv } from "@/server/services/leads";
import { createTask } from "@/server/services/tasks";

const contactForm = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(200).optional(),
  title: z.string().trim().max(120).optional(),
  source: z.string().trim().max(60).optional(),
  stage: DealStage.default("lead"),
  notes: z.string().trim().max(4000).optional(),
});

export async function createContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };
  const email = parsed.data.email && z.string().email().safeParse(parsed.data.email).success ? parsed.data.email : "";
  const c = await createContact(user.id, {
    name: parsed.data.name,
    company: parsed.data.company,
    email,
    phone: parsed.data.phone,
    website: parsed.data.website,
    title: parsed.data.title,
    source: parsed.data.source,
    stage: parsed.data.stage,
    notes: parsed.data.notes,
    verificationStatus: "unverified",
  });
  await track(user.id, "lead_created", { stage: c.stage });
  revalidatePath("/leads");
  return { ok: true, message: c.id };
}

export async function updateContactAction(id: string, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = contactForm.partial().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };
  await updateContact(user.id, id, parsed.data);
  revalidatePath(`/leads/${id}`);
  revalidatePath("/leads");
  return { ok: true };
}

export async function setContactStageAction(id: string, stage: z.infer<typeof DealStage>) {
  const user = await requireUser();
  await setContactStage(user.id, id, stage);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteContactAction(id: string) {
  const user = await requireUser();
  await deleteContact(user.id, id);
  revalidatePath("/leads");
  redirect("/leads");
}

export async function addInteractionAction(contactId: string, formData: FormData) {
  const user = await requireUser();
  const type = InteractionType.parse(formData.get("type") ?? "note");
  const body = z.string().trim().min(1).max(4000).parse(formData.get("body"));
  await addInteraction(user.id, contactId, { type, body });
  revalidatePath(`/leads/${contactId}`);
}

export async function scheduleFollowUpAction(contactId: string, formData: FormData) {
  const user = await requireUser();
  const when = z.string().min(1).parse(formData.get("date"));
  const note = String(formData.get("note") ?? "").slice(0, 200);
  const date = new Date(when);
  await updateContact(user.id, contactId, { nextFollowUpAt: date });
  await createTask(user.id, {
    title: note || "Follow up",
    contactId,
    priority: "high",
    dueDate: date,
  });
  revalidatePath(`/leads/${contactId}`);
  revalidatePath("/tasks");
}

export async function addDealAction(contactId: string, formData: FormData) {
  const user = await requireUser();
  const title = z.string().trim().min(1).max(160).parse(formData.get("title"));
  const value = Number(String(formData.get("value") ?? "0").replace(/[^0-9.]/g, ""));
  await createDeal(user.id, {
    contactId,
    title,
    stage: "lead",
    valueCents: Number.isFinite(value) ? Math.round(value * 100) : 0,
  });
  revalidatePath(`/leads/${contactId}`);
  revalidatePath("/leads");
}

export async function setDealStageAction(dealId: string, contactId: string, stage: z.infer<typeof DealStage>) {
  const user = await requireUser();
  await setDealStage(user.id, dealId, stage);
  revalidatePath(`/leads/${contactId}`);
  revalidatePath("/leads");
}

export async function importLeadsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const { rateLimit, RL } = await import("@/lib/ratelimit");
  const rl = await rateLimit("import", user.id, RL.import);
  if (!rl.success) return { error: "Too many imports in a short time — wait a minute." };
  const csv = String(formData.get("csv") ?? "");
  const sourceUrl = String(formData.get("sourceUrl") ?? "").slice(0, 300) || undefined;
  const { rows, error } = parseCsv(csv);
  if (error) return { error };

  const mapped = rows
    .map((r) => ({
      name: r.name || r["full name"] || r.contact || "",
      email: r.email || "",
      company: r.company || r.organization || "",
      phone: r.phone || "",
      website: r.website || r.url || "",
      title: r.title || r.role || "",
    }))
    .filter((r) => r.name.trim().length > 0);

  if (mapped.length === 0) return { error: "No rows with a 'name' column were found." };

  try {
    const result = await importLeads(user.id, {
      source: "csv",
      sourceUrl,
      rows: mapped,
    });
    revalidatePath("/leads");
    return { ok: true, message: `Imported ${result.imported}, skipped ${result.skipped} duplicates.` };
  } catch {
    return { error: "Import failed. Check the format and try again." };
  }
}
