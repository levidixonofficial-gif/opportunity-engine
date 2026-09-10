# Environment & configuration

Every variable is declared and validated in [`src/lib/env.ts`](../src/lib/env.ts).
Server code imports `env`; client code only ever sees `NEXT_PUBLIC_*` values
(via `publicEnv` or a direct `process.env.NEXT_PUBLIC_*` read).

- **`.env`** — committed, safe dev defaults only. No secrets.
- **`.env.local`** — gitignored. Real keys go here.
- **`.env.example`** — the annotated template; keep it in sync with `env.ts`.

Missing a **required** var throws at boot with a readable list. In **production**
the app additionally refuses to start if any of these hold (see
`productionConfigProblems()`):

| Condition | Why it's blocked |
|---|---|
| `AUTH_MODE !== "clerk"` | the dev signed-cookie shim lets anyone sign in as anyone |
| `AUTH_MODE=clerk` without `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk can't verify sessions |
| `DEV_AUTH_SECRET` still the checked-in default | forgeable dev sessions |
| `DATABASE_PROVIDER !== "postgresql"` | only PostgreSQL is supported |
| `NEXT_PUBLIC_APP_URL` contains `localhost` | Stripe redirects / emails would point at localhost |

(The check is skipped during `next build`, where `NODE_ENV=production` but the
build machine legitimately has dev values; it runs when the server process starts.)

## Reference

Legend: **R** required · **P** required in production only · **O** optional (feature degrades) · **B** build-time only

| Variable | Scope | Class | Used by | Notes |
|---|---|---|---|---|
| `NODE_ENV` | server | R | everything | `development` \| `test` \| `production` (default `development`) |
| `DATABASE_PROVIDER` | server | R | `lib/db`, `lib/db-helpers` | Must be `postgresql`. Drives the Prisma driver adapter + case-insensitive search. |
| `DATABASE_URL` | server | R | `lib/db`, `prisma.config.ts` | Pooled connection string in prod; PGlite URL locally (`npm run pg:up`). |
| `DIRECT_DATABASE_URL` | server | P | `lib/db`, `prisma.config.ts` | Non-pooled URL — `prisma migrate deploy` and the app both prefer it over `DATABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | O | — (reserved) | Phase 1.5 Supabase Storage / RLS-admin. Not read today. |
| `AUTH_MODE` | server | R | `lib/auth`, `components/auth-provider` | `dev` \| `clerk`. Must be `clerk` in production. |
| `DEV_AUTH_SECRET` | server | R | `lib/auth` (dev mode) | HMAC key for the dev session cookie. Must be changed from the default. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client | P | `components/auth-provider` | Required with `AUTH_MODE=clerk`. |
| `CLERK_SECRET_KEY` | server | P | `lib/auth` (`auth()`) | Required with `AUTH_MODE=clerk`. |
| `CLERK_WEBHOOK_SECRET` | server | O | `/api/webhooks/clerk` | Svix signing secret. Route returns 501 until set. |
| `STRIPE_SECRET_KEY` | server | O | `lib/stripe`, `checkout`, webhook | Enables checkout + billing portal. Absent → everyone `free`. |
| `STRIPE_WEBHOOK_SECRET` | server | O | `/api/webhooks/stripe` | Signature verification. Route returns 501 until set. |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_PREMIUM` | server | O | `lib/stripe` | `price_…` ids. Checkout errors clearly if the plan's price is missing. |
| `ANTHROPIC_API_KEY` | server | O | `lib/ai` | Absent → assistant returns a data summary, generators use templates (labelled). |
| `AI_MODEL_DEFAULT` | server | O | `server/services/ai` | Model for Premium (`advanced_ai`) plans. Default `claude-sonnet-5`. |
| `AI_MODEL_FAST` | server | O | `server/services/ai` | Model for Free/Pro plans. Default `claude-haiku-4-5-20251001`. |
| `PINECONE_API_KEY` + `PINECONE_INDEX_NAME` | server | O | `lib/vector` | Both needed. Absent → keyword search (labelled "keyword"). |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | server | O | `lib/ratelimit` | Both needed. Absent → in-process limiter (single instance, self-capping). |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | server | O | `lib/email` | Both needed. Absent → email logged to console, never claimed delivered. |
| `NEXT_PUBLIC_POSTHOG_KEY` | client | O | `components/analytics-provider`, `lib/analytics` | Client init only after analytics-cookie consent. |
| `NEXT_PUBLIC_POSTHOG_HOST` | client | O | same | Default `https://us.i.posthog.com`. |
| `SENTRY_DSN` | server | O | `instrumentation.ts`, `lib/observability` | Absent → `console.error` only. |
| `NEXT_PUBLIC_SENTRY_DSN` | client | O | (client boundary reporting) | Absent → no client reporting. |
| `SENTRY_AUTH_TOKEN` | build | B | CI source-map upload | Not read at runtime. |
| `NEXT_PUBLIC_APP_URL` | client | R | Stripe redirects, emails, canonical URLs | Must be the real https origin in production. |

## Where each integration turns on

`src/lib/env.ts` exports an `integrations` object — booleans derived from the vars
above (`integrations.stripe`, `.anthropic`, `.pinecone`, `.redis`, `.resend`,
`.sentry`, `.posthog`, `.clerk`). Admins can see this at `/admin`.

## Secrets hygiene

- `.env.local`, `.env.*.local`, `.env.production` are gitignored.
- `git grep` is clean of `sk_live`, `sk_test_…`, `whsec_…`, private keys.
- No server secret is imported by a `"use client"` module (`env.ts` is server-only
  in practice; the only client env reads are `NEXT_PUBLIC_*`).
- `/api/health` returns `{ status, time }` only — no config disclosure.
