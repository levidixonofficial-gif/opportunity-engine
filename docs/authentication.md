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
- Clerk mode (Phase 1.5): `/api/webhooks/clerk` verifies the Svix signature against
  `CLERK_WEBHOOK_SECRET` and upserts/deletes on `user.created|updated|deleted`.
  Lazy provisioning in `getAuthUser()` remains as a backstop.

## Route protection

- **Security boundary:** every protected page/layout calls `requireUser()` /
  `requireAdmin()`; every server action and route handler re-checks.
- **UX only:** `proxy.ts` redirects cookieless requests for app paths to `/sign-in`.
  It is explicitly *not* the security boundary (it can't verify a token at the edge
  reliably and doesn't try).

## Authorization

- Per-user isolation is enforced in `src/server/services/*`: every query is scoped by
  the authenticated `userId`. Mutating actions re-fetch the target `where: { id,
  userId }` before writing (see `plan/actions.ts`).
- Roles: `User.role` is `"user" | "admin"`, checked server-side. Hiding admin nav is
  not a control.
- Plan/entitlement checks: `getUserPlan()` → `entitlementsFor()` / `hasFeature()` /
  `checkUsage()`. Never trust client-reported plan status.
