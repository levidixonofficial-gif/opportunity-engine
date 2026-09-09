import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Stripe webhook (Phase 6).
 *
 * When wired up this endpoint will verify the signature against
 * STRIPE_WEBHOOK_SECRET and handle: checkout.session.completed,
 * customer.subscription.created/updated/deleted, invoice.payment_failed —
 * writing plan + status onto the Subscription row (the single source of truth
 * the app reads via getUserPlan). The frontend never determines paid status.
 */
export async function POST() {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
