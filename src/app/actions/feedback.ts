"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";

const schema = z.object({ message: z.string().trim().min(5).max(4000), path: z.string().max(300).optional() });

export async function submitFeedback(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse({
    message: formData.get("message"),
    path: formData.get("path") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Please write a few words." };

  const user = await getAuthUser();
  const hdrs = await headers();

  await db.feedback.create({
    data: {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      message: parsed.data.message,
      path: parsed.data.path,
      userAgent: hdrs.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  // Best-effort notify support; honest about delivery.
  await sendEmail({
    to: env.RESEND_FROM_EMAIL ?? "support@localhost",
    subject: "New Opportunity Engine feedback",
    text: `From: ${user?.email ?? "anonymous"}\nPath: ${parsed.data.path ?? "-"}\n\n${parsed.data.message}`,
  });

  return { ok: true };
}
