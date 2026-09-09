import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { captureException } from "@/lib/observability";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Clerk user-lifecycle webhook.
 *
 * Order of checks — a failure at any step must NOT touch local data:
 *  1. AUTH_MODE=clerk + CLERK_WEBHOOK_SECRET present, else 501 (we don't pretend).
 *  2. Standard-Webhooks / Svix signature verified against the secret (401 on fail).
 *  3. Payload shape sanity — needs a Clerk user id + event type (400 if not).
 *  4. Idempotency: (provider, eventId) unique row; a redelivery is a 200 no-op.
 *  5. Apply the change (user.created/updated/deleted). On error the idempotency
 *     row is removed so Clerk's retry can re-run it, and we return 500.
 *
 * In clerk mode Clerk is the source of truth for identity; getAuthUser() still
 * lazily provisions on first request, so a missed webhook self-heals and this
 * endpoint never *has* to run for the app to work — it just keeps the mirror
 * (email / name / image / deletion) current.
 */
export async function POST(req: NextRequest) {
  if (env.AUTH_MODE !== "clerk" || !env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Clerk webhook not configured" }, { status: 501 });
  }

  // The Svix delivery id is stable across retries of the same message — use it
  // as the idempotency key (Clerk payloads carry no top-level event id).
  const deliveryId = req.headers.get("svix-id") ?? undefined;

  let event: WebhookEvent;
  try {
    event = await verifyWebhook(req, { signingSecret: env.CLERK_WEBHOOK_SECRET });
  } catch {
    // Bad signature, missing Svix headers, replay outside tolerance, etc.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const type = event?.type;
  const data = event?.data as { id?: string } | undefined;
  if (!type || !data?.id) {
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }
  const eventId = deliveryId ?? `${type}:${data.id}`;

  // Idempotency guard — unique (provider, eventId).
  try {
    await db.webhookEvent.create({ data: { provider: "clerk", eventId, type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (type) {
      case "user.created":
      case "user.updated": {
        const u = event.data;
        const email =
          u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ??
          u.email_addresses?.[0]?.email_address;
        // No usable email => don't write a broken row; let lazy provisioning
        // handle it on the user's next request.
        if (!email) break;

        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || null;
        const imageUrl = u.image_url || null;

        await db.user.upsert({
          where: { clerkId: u.id },
          // Only mirror fields Clerk owns. Never touch role / owned data here.
          update: { email, name, imageUrl },
          create: {
            clerkId: u.id,
            email,
            name,
            imageUrl,
            subscription: { create: {} },
            notificationPref: { create: {} },
          },
        });
        break;
      }

      case "user.deleted": {
        // Clerk sends { id, deleted: true }. Remove the mirror; owned rows cascade
        // via schema onDelete. A missing row is fine (already gone / never synced).
        const existing = await db.user.findUnique({ where: { clerkId: data.id } });
        if (existing) {
          await db.user.delete({ where: { id: existing.id } });
        }
        break;
      }

      default:
        // Other event types (session.*, email.*, ...) are intentionally ignored.
        break;
    }

    await writeAudit({ action: `clerk.${type}`, targetType: "clerk_event", targetId: eventId });
    return NextResponse.json({ received: true });
  } catch (err) {
    captureException(err, { where: "clerk_webhook", eventType: type });
    // Let Clerk retry: drop the idempotency row so the retry re-processes.
    await db.webhookEvent
      .deleteMany({ where: { provider: "clerk", eventId } })
      .catch(() => undefined);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
