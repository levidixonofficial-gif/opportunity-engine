import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { env, integrations } from "@/lib/env";
import { stripe, planForPrice, normalizeStatus } from "@/lib/stripe";
import { captureException } from "@/lib/observability";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/server/services/notifications";
import { sendEmail, paymentFailedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature against STRIPE_WEBHOOK_SECRET, then
 * writes plan + status onto the Subscription row — the single source of truth
 * the app reads. The browser never determines paid status.
 *
 * Idempotent: every processed event id is recorded in WebhookEvent with a unique
 * (provider, eventId), so Stripe's at-least-once redelivery is a no-op.
 * Error responses are deliberately generic — internals are logged, not returned.
 */
export async function POST(req: Request) {
  if (!integrations.stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency guard.
  try {
    await db.webhookEvent.create({
      data: { provider: "stripe", eventId: event.id, type: event.type },
    });
  } catch {
    // Unique violation => already processed.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const userId = (session.metadata?.userId ?? session.client_reference_id) as string | undefined;
        if (userId) {
          await db.subscription.updateMany({ where: { userId }, data: { stripeCustomerId: customerId } });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items.data[0]?.price?.id ?? null;
        await db.subscription.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            plan: planForPrice(priceId),
            status: normalizeStatus(sub.status),
            currentPeriodEnd: sub.items.data[0]?.current_period_end
              ? new Date(sub.items.data[0].current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db.subscription.updateMany({
          where: { stripeCustomerId: sub.customer as string },
          data: { plan: "free", status: "canceled", stripeSubscriptionId: null, stripePriceId: null },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const rows = await db.subscription.findMany({
          where: { stripeCustomerId: invoice.customer as string },
          include: { user: true },
        });
        for (const row of rows) {
          await db.subscription.update({ where: { id: row.id }, data: { status: "past_due" } });
          await createNotification({
            userId: row.userId,
            type: "billing",
            title: "Payment failed",
            body: "Update your card to keep your plan active.",
            actionUrl: "/billing",
          });
          await sendEmail({ to: row.user.email, ...paymentFailedEmail() });
        }
        break;
      }
    }

    await writeAudit({ action: `stripe.${event.type}`, targetType: "stripe_event", targetId: event.id });
    return NextResponse.json({ received: true });
  } catch (err) {
    captureException(err, { where: "stripe_webhook", eventType: event.type });
    // Remove the idempotency row so Stripe's retry can re-attempt this event.
    await db.webhookEvent.deleteMany({ where: { provider: "stripe", eventId: event.id } }).catch(() => undefined);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
