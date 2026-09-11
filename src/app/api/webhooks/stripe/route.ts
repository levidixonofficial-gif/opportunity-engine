import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { env, integrations } from "@/lib/env";
import { stripe, planForPrice, normalizeStatus } from "@/lib/stripe";
import { captureException } from "@/lib/observability";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/server/services/notifications";
import { sendEmail, paymentFailedEmail } from "@/lib/email";
import { track } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Write a verified Stripe Subscription object onto our mirror row, keyed by
 * Stripe customer id. Shared by customer.subscription.created/updated and
 * invoice.payment_succeeded so both stay in sync the same way.
 */
async function syncSubscriptionRow(sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price?.id ?? null;
  return db.subscription.updateMany({
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
}

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
          // The one-time "purchase completed" signal — fires once per checkout,
          // unlike invoice.payment_succeeded which also fires on every renewal.
          await track(userId, "subscription_activated", { plan: session.metadata?.plan ?? null });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscriptionRow(event.data.object);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
        // Not a subscription invoice (e.g. a one-off item) — nothing to sync.
        if (!subscriptionId) break;

        // Only re-sync a row that already exists for this Stripe customer. A
        // payment event alone must never create or activate a subscription
        // record for an account that doesn't already have one.
        const existing = await db.subscription.findFirst({
          where: { stripeCustomerId: invoice.customer as string },
          select: { id: true },
        });
        if (!existing) break;

        // Re-derive status/plan from the authoritative Subscription object
        // rather than assuming "active" from payment success alone — it could
        // still be trialing, or (in a delivery race) already canceled.
        const sub = await stripe().subscriptions.retrieve(subscriptionId);
        await syncSubscriptionRow(sub);
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
