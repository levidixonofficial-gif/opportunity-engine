"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { captureException } from "@/lib/observability";
import { AppError, toUserMessage } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import { OutreachChannel, OutreachKind, OutreachStatus } from "@/lib/validations/enums";
import {
  createOutreach,
  updateOutreach,
  setOutreachStatus,
  deleteOutreach,
} from "@/server/services/outreach";
import { runAndSaveGenerator } from "@/server/services/ai";

const form = z.object({
  contactId: z.string().optional(),
  channel: OutreachChannel.default("email"),
  kind: OutreachKind.default("cold_intro"),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(8000),
});

export async function createOutreachAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = form.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Write a message body first." };
  await createOutreach(user.id, {
    contactId: parsed.data.contactId || null,
    channel: parsed.data.channel,
    kind: parsed.data.kind,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });
  await track(user.id, "outreach_drafted", { channel: parsed.data.channel, kind: parsed.data.kind });
  revalidatePath("/outreach");
  return { ok: true };
}

export async function updateOutreachAction(id: string, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = form.partial().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the form." };
  await updateOutreach(user.id, id, parsed.data);
  revalidatePath("/outreach");
  return { ok: true };
}

export async function setOutreachStatusAction(id: string, status: z.infer<typeof OutreachStatus>) {
  const user = await requireUser();
  try {
    await setOutreachStatus(user.id, z.string().min(1).parse(id), status);
  } catch (e) {
    if (!(e instanceof AppError)) captureException(e, { where: "setOutreachStatusAction" });
    return { error: toUserMessage(e, "Could not update the message.") };
  }
  revalidatePath("/outreach");
  return { ok: true };
}

export async function deleteOutreachAction(id: string) {
  const user = await requireUser();
  await deleteOutreach(user.id, id);
  revalidatePath("/outreach");
}

export interface DraftResult {
  error?: string;
  subjectLines?: string[];
  message?: string;
  followUps?: { afterDays: number; message: string }[];
  provider?: string;
  disclaimer?: string;
}

/** Generate an outreach draft (AI if configured, else rule-based). */
export async function generateOutreachDraftAction(input: string): Promise<DraftResult> {
  const user = await requireUser();
  const parsed = z.string().trim().min(1).max(2000).safeParse(input);
  if (!parsed.success) return { error: "Add a short brief first." };
  try {
    const res = await runAndSaveGenerator(user.id, "outreach", parsed.data);
    const data = res.data as {
      subjectLines: string[];
      message: string;
      followUps: { afterDays: number; message: string }[];
    };
    return {
      subjectLines: data.subjectLines,
      message: data.message,
      followUps: data.followUps,
      provider: res.provider,
      disclaimer: res.disclaimer,
    };
  } catch (e) {
    if (!(e instanceof AppError)) captureException(e, { where: "generateOutreachDraftAction" });
    return { error: toUserMessage(e, "Could not generate a draft.") };
  }
}
