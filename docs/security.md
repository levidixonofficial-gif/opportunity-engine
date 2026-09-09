# Security

Security is treated as a feature. This documents the model and the Phase-1 status.

## Threat model priorities

1. **Cross-user data access** — one user reading/writing another's projects, tasks,
   leads, revenue, notes, or AI history.
2. **Privilege escalation** — a non-admin reaching admin functions.
3. **Payment status forgery** — a free user obtaining paid entitlements.
4. **Webhook forgery** — spoofed Clerk/Stripe events.
5. **Injection / unvalidated input**.
6. **Secret leakage** — keys in the client bundle, logs, or error reports.

## Controls

| # | Control | Status |
|---|---|---|
| 1 | Identity from server session only; `User.clerkId` unique; no client-supplied ids trusted | ✅ Phase 1 |
| 1 | Service layer scopes every query by `userId`; mutations re-check ownership | ✅ Phase 1 |
| 1 | Postgres Row Level Security on all user-owned tables | ⛏ Phase 1.5 (`prisma/rls/`) |
| 2 | `requireAdmin()` server-side gate on `/admin` and admin APIs | ✅ Phase 1 |
| 3 | Plan resolved from `Subscription` row server-side; `canceled/past_due` → downgraded | ✅ Phase 1 |
| 3 | Stripe webhook is the only writer of `Subscription.plan/status` | ⛏ Phase 6 |
| 4 | Svix signature check (Clerk), Stripe signature check — constant-time | ⛏ Phase 1.5 / 6 (routes return 501 until then) |
| 5 | Zod validation on every server action, route handler, and webhook body | ✅ Phase 1 |
| 5 | Prisma parameterized queries; no string-built SQL except `SELECT 1` health probe | ✅ Phase 1 |
| 6 | `src/lib/env.ts` splits server vs. `NEXT_PUBLIC_*`; secrets never imported client-side | ✅ Phase 1 |
| 6 | `/api/health` returns integration booleans only, never values | ✅ Phase 1 |
| 6 | Sentry `beforeSend` scrubs PII + financial figures | ⛏ Phase 7 |
| — | Rate limiting on auth-sensitive + AI endpoints (Upstash) | ⛏ Phase 7 |
| — | Secure cookies: `httpOnly`, `sameSite=lax`, `secure` in prod | ✅ Phase 1 (dev cookie) |
| — | Security headers / CSP via `next.config.ts` | ⛏ Phase 7 |

## Rules for contributors

- A React component must never import `@/lib/db` or a secret. Go through a service.
- A server action's first two lines are `const user = await requireUser()` and a Zod
  parse of its inputs.
- Before `update`/`delete` by id, confirm `where: { id, userId: user.id }`.
- New env vars go in `src/lib/env.ts` (typed) **and** `.env.example` (documented).
- Never log request bodies, tokens, or `amountCents` values.

## Privacy

- Analytics events (PostHog) exclude free-text fields and revenue/expense amounts.
- Only opportunity/knowledge content and explicitly-flagged user notes are sent to
  Pinecone — never financial rows, contacts, or messages.
