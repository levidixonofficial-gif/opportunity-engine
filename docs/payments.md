# Payments (Phase 6)

## Provider: Stripe (subscriptions)

Plans: `free`, `pro`, `premium`. Price IDs live in env
(`STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`) — never hard-coded.

## Source of truth

`Subscription` (one per user) mirrors Stripe: `plan`, `status`, `stripeCustomerId`,
`stripeSubscriptionId`, `stripePriceId`, `currentPeriodEnd`, `cancelAtPeriodEnd`.

The app reads entitlements **only** from this row via `getUserPlan()` →
`entitlementsFor()`. The frontend never decides paid status.

## Flows

| Event | Handler action |
|---|---|
| Upgrade click | server action creates a Checkout Session (`mode: subscription`), redirects |
| `checkout.session.completed` | link `stripeCustomerId` to the `User` |
| `customer.subscription.created/updated` | write `plan` (from price id), `status`, `currentPeriodEnd`, `cancelAtPeriodEnd` |
| `customer.subscription.deleted` | set `plan = "free"`, `status = "canceled"` |
| `invoice.payment_failed` | `status = "past_due"` (→ entitlements downgrade) + Resend email + `Notification` |
| Manage billing | server action → Stripe Billing Portal session |

## Webhook security

`/api/webhooks/stripe` verifies `Stripe-Signature` against `STRIPE_WEBHOOK_SECRET`
using the SDK's constructor (constant-time). Unverified → 400, no DB writes. The
route reads the **raw** body (Next.js route handler, no body parsing) for signature
validation.

## Entitlement enforcement

`src/lib/entitlements/index.ts` is the single map of plan → limits + features.
Call sites use `hasFeature(plan, key)` / `checkUsage(plan, limitKey, used)` — never an
inline `plan === "pro"`. Metered usage is tracked in `UsageCounter` per month.

## Degradation

No `STRIPE_SECRET_KEY` → everyone is `free`; `/billing` and `/pricing` state that
billing is not yet live. Webhook route returns 501.
