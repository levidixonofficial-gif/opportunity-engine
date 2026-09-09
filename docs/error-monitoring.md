# Error monitoring (Phase 7)

## Provider: Sentry

`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (runtime), `SENTRY_AUTH_TOKEN` (build-time
source-map upload only). No DSN → the SDK is not initialized.

## Coverage

- Server: route handlers, server actions, service layer, webhook processing.
- Client: React error boundaries + unhandled rejections.
- Instrumentation via `instrumentation.ts` (server) and
  `instrumentation-client.ts` (browser) — Next.js 16 conventions.

## Context & scrubbing

Attached: environment, release SHA, route, user id (opaque), plan.
`beforeSend` removes: emails, names, note/message bodies, `amountCents`, any
`Authorization`/cookie headers, Stripe/Clerk tokens.

## Config

- `tracesSampleRate`: 1.0 in preview, 0.1 in production.
- Releases tagged with the Git SHA; source maps uploaded in CI then deleted from the
  deployed bundle.
- Alert rules: new issue → Slack; webhook-processing error → page.
