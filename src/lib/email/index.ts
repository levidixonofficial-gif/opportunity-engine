import "server-only";
import { env, integrations } from "@/lib/env";

/**
 * Email interface. Production adapter = Resend. With no key configured the
 * console adapter LOGS the message (dev-visible) and returns
 * `{ delivered: false, reason: "not-configured" }` — it never claims delivery.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body. HTML templates are layered on in Phase 7. */
  text: string;
  replyTo?: string;
}

export interface EmailResult {
  delivered: boolean;
  id?: string;
  reason?: string;
}

async function resendSend(msg: EmailMessage): Promise<EmailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      reply_to: msg.replyTo,
    }),
  });
  if (!res.ok) {
    return { delivered: false, reason: `resend ${res.status}` };
  }
  const data = (await res.json()) as { id?: string };
  return { delivered: true, id: data.id };
}

function consoleSend(msg: EmailMessage): EmailResult {
  console.info(
    `[email:console] (not delivered — RESEND not configured)\n  to: ${msg.to}\n  subj: ${msg.subject}\n  ${msg.text.slice(0, 200)}`,
  );
  return { delivered: false, reason: "not-configured" };
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  try {
    return integrations.resend ? await resendSend(msg) : consoleSend(msg);
  } catch (err) {
    return { delivered: false, reason: err instanceof Error ? err.message : "error" };
  }
}
