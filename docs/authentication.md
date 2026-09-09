# Authentication & Authorization

## Provider: Clerk

Clerk owns sign-up, sign-in, sign-out, password recovery, OAuth (email + Google),
sessions, and profile. The app never stores passwords and never runs a competing
auth system.

## Identity mapping

- `User.clerkId` ← the verified session subject (`sub`). **Unique.**
- Identity is always derived server-side. The client never sends a user id that the
  server trusts.
- `src/lib/auth/index.ts` exposes:
  - `getAuthUser()` → `User | null` (lazily provisions the mirrored row)
  - `requireUser()` → `User` (redirects to `/sign-in`)
  - `requireAdmin()` → `User` (redirects to `/dashboard` if `role !== "admin"`)

`resolveIdentity()` has two implementations chosen by `AUTH_MODE`:

| `AUTH_MODE` | Mechanism |
|---|---|
| `clerk` | `auth()` / `currentUser()` from `@clerk/nextjs/server` |
| `dev` | signed (HMAC-SHA256) httpOnly cookie `oe_dev_session`; `/sign-in` mints it |

Swapping is an env change only — no call-site changes.

## Provisioning

- Dev mode: `getAuthUser()` upserts the `User` (+ empty `Subscription` +
  `NotificationPreference`) on first authenticated request.
- Clerk mode: `/api/webhooks/clerk` verifies the Standard-Webhooks / Svix signature
  against `CLERK_WEBHOOK_SECRET` (`verifyWebhook` from `@clerk/nextjs/webhooks`) and
  mirrors `user.created | user.updated | user.deleted` onto the `User` row. It is
  idempotent (`WebhookEvent` unique on `(provider, eventId)` keyed by the `svix-id`
  delivery id), only ever writes Clerk-owned fields (email / name / image — never
  `role` or owned data), and skips rows with no usable email. On a handler error the
  idempotency row is dropped so Clerk's retry re-processes; lazy provisioning in
  `getAuthUser()` remains as a backstop so a missed webhook self-heals.
  Covered by `tests/clerk-webhook.test.ts` (real signature verification, bad
  signature → 401, malformed → 400, valid, redelivery, lifecycle).

### Going live with Clerk

1. Set `AUTH_MODE=clerk`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `CLERK_WEBHOOK_SECRET`.
2. In the Clerk Dashboard, add a webhook endpoint at
   `https://<APP_URL>/api/webhooks/clerk` subscribed to `user.created`,
   `user.updated`, `user.deleted`; copy its signing secret into
   `CLERK_WEBHOOK_SECRET`.
3. `proxy.ts` switches to `clerkMiddleware()` automatically; `/sign-in` renders
   Clerk's `<SignIn/>`. The dev signed-cookie path stays intact for local use.

## Route protection

- **Security boundary:** every protected page/layout calls `requireUser()` /
  `requireAdmin()`; every server action and route handler re-checks.
- **UX only:** `proxy.ts` — in `clerk` mode it runs `clerkMiddleware()` (establishes
  the Clerk request context and redirects unauthenticated requests for protected
  routes); in `dev` mode it is a cookie-presence redirect. Either way it is
  explicitly *not* the security boundary — every protected page independently
  re-verifies via `requireUser()` / `requireAdmin()`.

## Authorization

- Per-user isolation is enforced in `src/server/services/*`: every query is scoped by
  the authenticated `userId`. Mutating actions re-fetch the target `where: { id,
  userId }` before writing (see `plan/actions.ts`).
- Roles: `User.role` is `"user" | "admin"`, checked server-side. Hiding admin nav is
  not a control.
- Plan/entitlement checks: `getUserPlan()` → `entitlementsFor()` / `hasFeature()` /
  `checkUsage()`. Never trust client-reported plan status.
