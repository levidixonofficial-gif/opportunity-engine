import "server-only";
import { publicEnv } from "@/lib/env";

/**
 * Minimal, dependency-free HTML email layout. Inline styles only (email clients
 * strip <style>), a single accent, generous fallbacks. Every template also
 * returns a plain-text form — we never send HTML-only.
 */

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

interface Block {
  heading: string;
  /** Paragraphs (plain strings; rendered/escaped as <p>). */
  paragraphs: string[];
  cta?: { label: string; href: string };
  footnote?: string;
}

function layout({ heading, paragraphs, cta, footnote }: Block): string {
  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#334155">${escape(p)}</p>`)
    .join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escape(cta.href)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escape(cta.label)}</a></p>`
    : "";
  const foot = footnote
    ? `<p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5">${escape(footnote)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px">
    <tr><td style="padding:28px 32px">
      <p style="margin:0 0 20px;font-weight:700;color:#0f172a;font-size:16px">Opportunity Engine</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${escape(heading)}</h1>
      ${body}${button}${foot}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#94a3b8;text-align:center">
    ${escape(appUrl)} · No income is ever guaranteed.
  </p>
</body></html>`;
}

function textForm({ heading, paragraphs, cta, footnote }: Block): string {
  const lines = [heading, "", ...paragraphs];
  if (cta) lines.push("", `${cta.label}: ${cta.href}`);
  if (footnote) lines.push("", footnote);
  return lines.join("\n");
}

export function paymentFailedEmail(): RenderedEmail {
  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const block: Block = {
    heading: "Your payment didn't go through",
    paragraphs: [
      "We couldn't process your latest Opportunity Engine payment, so your plan is now marked past due.",
      "Update your card and we'll retry automatically — your Pro features stay active in the meantime for a short grace period.",
    ],
    cta: { label: "Update payment method", href: `${appUrl}/billing` },
    footnote: "If you meant to cancel, you can ignore this email.",
  };
  return { subject: "Your Opportunity Engine payment failed", text: textForm(block), html: layout(block) };
}

export function feedbackReceivedEmail(input: { from: string; path: string | null; message: string }): RenderedEmail {
  const block: Block = {
    heading: "New feedback",
    paragraphs: [`From: ${input.from}`, `Path: ${input.path ?? "-"}`, "", input.message],
  };
  return { subject: "New Opportunity Engine feedback", text: textForm(block), html: layout(block) };
}
