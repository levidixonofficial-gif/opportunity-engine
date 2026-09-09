import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { env, integrations } from "@/lib/env";
import { stripe, planForPrice, normalizeStatus } from "@/lib/stripe";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/server/services/notifications";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature against STRIPE_WEBHOOK_SECRET, then
 * writes plan + status onto the Subscription row — the single source of truth
 * the app reads. The browser never determines paid status.
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
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const userId = (session.metadata?.userId ?? session.client_reference_id) as string | undefined;
        if (userId) {
          await db.subscription.updateMany({
            where: { userId },
            data: { stripeCustomerId: customerId },
          });
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
          await sendEmail({
            to: row.user.email,
            subject: "Your Opportunity Engine payment failed",
            text: "We couldn't process your latest payment. Update your card at /billing to keep Pro features.",
          });
        }
        break;
      }
    }

    await writeAudit({ action: `stripe.${event.type}`, targetType: "stripe_event", targetId: event.id });
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler error" },
      { status: 500 },
    );
  }
}
