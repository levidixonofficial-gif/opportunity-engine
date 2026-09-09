import "server-only";
import { env, integrations } from "@/lib/env";

export type { RenderedEmail } from "./templates";
export { paymentFailedEmail, feedbackReceivedEmail } from "./templates";

/**
 * Email interface. Production adapter = Resend; with no key the console adapter
 * logs and reports `accepted: false`.
 *
 * `accepted` means the provider took responsibility for the message (HTTP 2xx +
 * an id) — NOT that it reached the inbox. Actual delivery/bounce is asynchronous
 * and only observable via Resend webhooks/dashboard, so nothing here ever claims
 * "delivered".
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body — always required; HTML-only email is never sent. */
  text: string;
  /** Optional HTML body (see ./templates for the branded layout). */
  html?: string;
  replyTo?: string;
}

export interface EmailResult {
  accepted: boolean;
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
      ...(msg.html ? { html: msg.html } : {}),
      reply_to: msg.replyTo,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { accepted: false, reason: `resend ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}` };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  // 2xx + id => Resend has accepted it for delivery. Not the same as delivered.
  return { accepted: Boolean(data.id), id: data.id, reason: data.id ? undefined : "no id in response" };
}

function consoleSend(msg: EmailMessage): EmailResult {
  console.info(
    `[email:console] (not sent — RESEND not configured)\n  to: ${msg.to}\n  subj: ${msg.subject}\n  ${msg.text.slice(0, 200)}`,
  );
  return { accepted: false, reason: "not-configured" };
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  try {
    return integrations.resend ? await resendSend(msg) : consoleSend(msg);
  } catch (err) {
    return { accepted: false, reason: err instanceof Error ? err.message : "error" };
  }
}
