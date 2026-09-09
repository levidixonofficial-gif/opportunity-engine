"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { sendEmail, feedbackReceivedEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ message: z.string().trim().min(5).max(4000), path: z.string().max(300).optional() });

export async function submitFeedback(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse({
    message: formData.get("message"),
    path: formData.get("path") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: "Please write a few words." };

  const user = await getAuthUser();
  const hdrs = await headers();

  const rlKey = user?.id ?? hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = await rateLimit("feedback", rlKey, { limit: 5, windowMs: 10 * 60_000 });
  if (!rl.success) return { ok: false, error: "You've sent a few messages already — try again later." };

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
    ...feedbackReceivedEmail({
      from: user?.email ?? "anonymous",
      path: parsed.data.path ?? null,
      message: parsed.data.message,
    }),
  });

  return { ok: true };
}
