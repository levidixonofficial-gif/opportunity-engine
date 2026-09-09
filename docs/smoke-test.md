# Production smoke test

Run this against the **deployed** environment right after a production cutover or a
risky deploy. It exercises the real integrations end to end and checks that data
actually lands in the production database. Nothing here is destructive beyond
creating one throwaway test account.

Set `BASE=https://<your-domain>` for the curl steps.

## 0. Pre-flight (no login)

- [ ] `curl -s $BASE/api/health` → `{"status":"ok"}` (200). No `integrations` /
      `checks` / secret-shaped keys in the body.
- [ ] `$BASE/` (marketing) renders; no console errors; `view-source` contains **no**
      `sk_`, `whsec_`, `pcsk_`, `rnd_`, service-role, or `DATABASE_URL` strings.
- [ ] Response headers include `strict-transport-security`, `x-frame-options: DENY`,
      `x-content-type-options: nosniff`. `x-powered-by` absent.
- [ ] `$BASE/api/webhooks/clerk` POST with a bogus body → **401** (not 501, not 500,
      not 200).
- [ ] `$BASE/api/webhooks/stripe` POST with a bogus body → **400/401** (not 200).
- [ ] A protected path (`$BASE/dashboard`) while logged out → redirects to `/sign-in`.

## 1. Sign-up (real Clerk)

- [ ] `/sign-in` renders the Clerk `<SignIn/>` widget (not the dev form).
- [ ] Create a brand-new account with a real email you control (e.g. a `+smoke`
      alias). Complete Clerk's email verification.
- [ ] Land on `/onboarding` (new users have no profile yet).
- [ ] **DB check:** a `User` row exists for the new `clerkId` with the right email,
      plus one `Subscription` (plan `free`) and one `NotificationPreference`.
      Confirms either the webhook fired or lazy provisioning ran — both are fine.
- [ ] If the Clerk Dashboard shows the `user.created` webhook delivered: a
      `WebhookEvent` row `(provider="clerk")` exists and the delivery is **200**.

## 2. Core flow (writes → production Postgres)

- [ ] Finish onboarding (goal, budget, time, a skill or two). → redirected to
      `/dashboard` with scored recommendations. `Profile.onboardedAt` set.
- [ ] Open an opportunity → **Make this my focus** → a `SavedOpportunity` row
      appears, scoped to your `userId`.
- [ ] Generate a plan from that opportunity → a `Plan` + several `Task` rows, all
      your `userId`. Re-generating does **not** duplicate (idempotent).
- [ ] Add a money entry (revenue, e.g. $12.34) → `Transaction` row, `amountCents =
      1234`, `type = "revenue"`.
- [ ] Add a CRM contact + a deal → `Contact` + `Deal` rows, your `userId`.
- [ ] Ask the AI assistant one question → a response renders. If `ANTHROPIC_API_KEY`
      is set it is model-generated; otherwise it is the labelled rule-based fallback
      (both acceptable). `AiConversation` + `AiMessage` rows created.
- [ ] ⌘K global search for a term from your project → returns only your rows.

## 3. Isolation (second account)

- [ ] Create a **second** throwaway account. Note its dashboard is empty.
- [ ] Directly request the first account's resource by id, e.g.
      `$BASE/projects/<id-from-account-1>` → **not found / redirect**, never the row.
- [ ] Global search in account 2 never surfaces account 1's data.

## 4. Billing (Stripe — test mode first, then live)

- [ ] `/billing` → **Upgrade** → Stripe Checkout opens with the correct price.
- [ ] Complete payment with a test card (`4242…` in test mode).
- [ ] Return to `/billing`: plan shows **Pro/Premium**. `Subscription.status =
      "active"`, `stripePriceId` set. Stripe Dashboard shows the webhook **200**.
- [ ] Billing portal opens and can schedule a cancel.
- [ ] (Test mode) trigger `invoice.payment_failed` via `stripe trigger` →
      `Subscription.status = "past_due"`, a `Notification` row, and — if Resend is
      live — an email arrives.

## 5. Integrations reachable

- [ ] **Resend:** the payment-failed or a feedback email actually arrives; Resend
      dashboard shows it delivered (not just accepted).
- [ ] **Upstash:** hammer a rate-limited route (>20 rapid AI calls) → HTTP 429. With
      two instances/regions the limit is shared (not per-instance).
- [ ] **Sentry:** trigger a deliberate handled error path → the event appears in
      Sentry with PII/financials scrubbed.
- [ ] **PostHog:** accept the analytics cookie → events flow. Decline → nothing
      sent (check the network tab).
- [ ] **Pinecone** (if provisioned): natural-language opportunity search returns
      `mode: "semantic"`; otherwise `mode: "keyword"` and the UI says so.

## 6. Teardown

- [ ] Delete both throwaway users in the Clerk Dashboard.
- [ ] Confirm the `user.deleted` webhook fired and the mirrored `User` rows (and
      their owned data) are gone from Postgres.
- [ ] Refund/void any test charges in Stripe if you ran live mode.

---

# Mobile / PWA checklist

Run on a real phone against the deployed URL (or DevTools device emulation at
375×812 and 768×1024 as a pre-check).

- [ ] No horizontal scroll on any page. Wide tables/charts scroll **inside** their
      own container.
- [ ] Marketing nav collapses to a working menu; the authenticated app uses the
      bottom tab bar + drawer (not a squeezed desktop sidebar).
- [ ] All interactive targets ≥ ~40px; nothing overlaps the notch / home indicator.
- [ ] Forms: correct mobile keyboards (`type=email`, numeric where relevant); the
      focused field is not hidden behind the keyboard.
- [ ] Dialogs/drawers: open, trap focus, close on Escape and on backdrop tap.
- [ ] `manifest.webmanifest` served; "Add to Home Screen" works; icon + name +
      `theme-color` correct; launched standalone it opens to `/dashboard` (or
      `/sign-in`).
- [ ] Dark mode follows the OS setting and the in-app toggle persists.
- [ ] `prefers-reduced-motion` on → transitions are minimal.
- [ ] Offline: there is **no** service worker today, so offline shows the browser
      error — that is expected, not a regression.
