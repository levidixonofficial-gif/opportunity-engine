# Production readiness

Status of every item as of the pre-production hardening pass. Honest — placeholders
are not marked complete.

Legend: ✅ Complete · ⚠️ Requires production credentials/configuration · ❌ Missing · 🔴 Blocker

---

## SECURITY

| Item | Status | Notes |
|---|---|---|
| Production config gate (refuse insecure dev defaults) | ✅ | `env.ts` `productionConfigProblems()` — blocks `AUTH_MODE=dev`, default `DEV_AUTH_SECRET`, SQLite, localhost `APP_URL` in prod |
| Every server action calls `requireUser()` / `requireAdmin()` | ✅ | audited; verified in `tests/` |
| Every user-owned query scoped by authenticated `userId` | ✅ | service layer; `tests/isolation.test.ts` (18 cases) |
| Relationship-tampering (attach another user's record) blocked | ✅ | deal/invoice/transaction/task/outreach validate every linked id |
| IDs cannot be enumerated to reach another user's row | ✅ | reads return `null`, mutations throw `NotFoundError` (uniform) |
| Admin-only ops unreachable by normal users | ✅ | `requireAdmin()` at the `/admin` layout; `tests/admin.test.ts` |
| Admin self-escalation / last-admin protection | ✅ | can't self-demote; the demote-others path keeps ≥1 admin |
| Zod validation on every action / route / webhook body | ✅ | audited |
| Error messages never leak DB/stack/secret detail | ✅ | `AppError` + `toUserMessage()`; generic fallbacks + `captureException` |
| No secret in the client bundle | ✅ | `env.ts` server-only; only `NEXT_PUBLIC_*` client-side |
| No unsafe HTML | ✅ | one `dangerouslySetInnerHTML` — a static theme script, no interpolation |
| CSV import formula-injection neutralised | ✅ | `sanitizeImportedCell()`; `tests/data-integrity.test.ts` |
| Rate limiting on sensitive/high-cost ops | ✅ | AI chat, generators, plan gen, lead import, sign-in, feedback, search |
| Usage-counter / entitlement bypass closed | ✅ | `consumeUsage()` increments-then-checks atomically + refunds |
| Webhook signature verification | ⚠️ Stripe done; Clerk pending | Stripe: constant-time + idempotent (`WebhookEvent`). Clerk route returns 501 |
| Security headers (HSTS, nosniff, X-Frame-Options, Referrer/Permissions-Policy) | ✅ | `next.config.ts` |
| CSRF | ✅ | Next.js server actions are same-origin POST + action-id gated; webhooks use signatures not cookies |
| Open redirect | ✅ | no user-controlled redirect targets; Stripe URLs built from `NEXT_PUBLIC_APP_URL` |
| Secrets scanned out of git | ✅ | `.env.local` gitignored; `git grep` clean of key prefixes |
| Audit log for admin + security events | ✅ | `AuditLog` + `writeAudit()` |
| Row Level Security (defense-in-depth) | ⚠️ | `prisma/rls/policies.sql` written; enforced only on Postgres — apply after migration |
| Dependency vulnerability scan in CI | ❌ | add `npm audit --production` (or Dependabot) to `ci.yml` |
| Pen test / external review | ❌ | not done |

## DATABASE

| Item | Status | Notes |
|---|---|---|
| Schema is Postgres-compatible | ✅ | no enums, scalar lists, or `@db.` types |
| `contains` search behaves identically dev↔prod | ✅ | `lib/db-helpers.textSearch()` adds `mode:insensitive` on Postgres |
| Migrations | ⚠️ | current migrations are SQLite-flavoured — regenerate for Postgres (`rm -rf prisma/migrations && prisma migrate dev`) per `docs/database.md` |
| Indexes for hot paths | ✅ | userId(+status/date) on every child table; `AuditLog(action)` + `(createdAt)` added; `WebhookEvent` unique |
| Unique constraints | ✅ | `User.clerkId/email`, `Subscription.stripe*`, `SavedOpportunity(userId,opportunityId)`, `Invoice(userId,number)`, `UsageCounter(userId,feature,periodKey)`, `WebhookEvent(provider,eventId)` |
| Foreign keys + cascade rules | ✅ | owned data `Cascade`, optional links `SetNull` (money survives contact deletion) |
| Money handling | ✅ | integer minor units everywhere; amounts validated positive |
| Transaction boundaries | ✅ | `$transaction` for onboarding, profile edit, interaction, task reorder; invoice-paid is a conditional `updateMany` (race-safe) |
| Duplicate / orphan prevention | ✅ | idempotent plan gen + invoice-paid; import dedupes by email; goals recompute from source data |
| Connection pooling | ⚠️ | use the Supabase pooled URL in `DATABASE_URL`, direct in `DIRECT_DATABASE_URL` |
| `pg_trgm` / GIN for large-table text search | ❌ | fine at current scale; add if `Contact`/`Opportunity` grow large |

## AUTHENTICATION

| Item | Status | Notes |
|---|---|---|
| Provider abstraction (Clerk ↔ dev shim) | ✅ | one `getAuthUser()` interface |
| `<ClerkProvider>` conditional mount | ✅ | `components/auth-provider` (passthrough in dev) |
| `clerkMiddleware()` in `proxy.ts` | ❌ | required before `AUTH_MODE=clerk` works end-to-end |
| `<SignIn/>` component mounted | ❌ | `/sign-in` shows the dev form; Clerk UI not wired |
| Clerk webhook (user.created/updated/deleted) | ❌ | route returns 501; lazy provisioning in `getAuthUser()` is the interim |
| Session cookies `httpOnly` + `secure` (prod) + `sameSite` | ✅ | dev cookie; Clerk manages its own |
| Sign-in rate limiting | ✅ | per-IP |

## AUTHORIZATION

| Item | Status | Notes |
|---|---|---|
| Enforced server-side, independent of UI | ✅ | service layer + `requireAdmin` |
| Role model (`user` / `admin`) | ✅ | server-checked |
| Plan/entitlement checks centralised | ✅ | `getUserPlan` → `hasFeature` / `checkUsage` / `consumeUsage` |
| CRM / advanced analytics hard-gated by plan | ⚠️ | currently a soft notice + dev plan switcher so the app is usable pre-Stripe; flip to hard gate when billing is live |

## BILLING

| Item | Status | Notes |
|---|---|---|
| Stripe checkout session | ✅ (code) / ⚠️ (keys) | `createUpgradeCheckout` |
| Billing portal | ✅ (code) / ⚠️ (keys) | `createBillingPortal` |
| Webhook: subscription lifecycle + payment_failed | ✅ (code) / ⚠️ (keys) | idempotent; `Subscription` is the only source of truth |
| Frontend never decides paid status | ✅ | `getUserPlan()` reads the DB row |
| `past_due` / `canceled` → entitlements downgrade | ✅ | `getUserPlan` returns `free` for bad standing |
| Price IDs in env, not hard-coded | ✅ | |
| Live end-to-end test (`stripe listen`) | ❌ | needs keys |
| Tax / invoicing / dunning config | ⚠️ | configure in the Stripe dashboard |

## AI

| Item | Status | Notes |
|---|---|---|
| Provider abstraction + honest fallback | ✅ | Anthropic Messages API; rule-based templates when no key (labelled) |
| Structured outputs validated (Zod) before display/store | ✅ | `lib/ai/generators` |
| Never fabricates businesses/leads/revenue/citations | ✅ | safety preamble + `tests/ai/generators.test.ts` |
| Usage metering + per-plan limits + token caps | ✅ | `consumeUsage`; `maxTokens` capped |
| Per-plan model selection (`AI_MODEL_FAST` / `_DEFAULT`) | ✅ | Premium → default model, others → fast |
| Rate limiting | ✅ | 20/min chat, 12/min generator |
| Prompt-injection hardening for tool use | ⚠️ | no tools/function-calling yet; revisit if added |
| Live test with a real key | ❌ | needs `ANTHROPIC_API_KEY` |

## EMAIL

| Item | Status | Notes |
|---|---|---|
| Interface + Resend adapter | ✅ (code) / ⚠️ (keys) | `lib/email` |
| Console fallback never claims delivery | ✅ | returns `{ delivered: false, reason: "not-configured" }` |
| HTML templates | ❌ | plain-text only today |
| Domain auth records (SPF/DKIM/DMARC) | ⚠️ | documented in `docs/dns.md` |
| Cron digests (weekly progress, task reminders) | ❌ | |
| Unsubscribe / preference links | ⚠️ | `NotificationPreference` exists; link not in the template yet |

## RATE LIMITING

| Item | Status | Notes |
|---|---|---|
| Abstraction (Upstash ↔ in-process) | ✅ | `lib/ratelimit` |
| Applied to AI, generators, plan gen, import, sign-in, feedback, search | ✅ | |
| In-process limiter bounded (no leak) | ✅ | sweeps + caps at 20k keys |
| Cross-instance guarantee | ⚠️ | requires Upstash in production (multi-instance) |

## ANALYTICS

| Item | Status | Notes |
|---|---|---|
| Server capture + PII/financial scrubbing | ✅ | `lib/analytics` |
| Client init consent-gated | ✅ | PostHog starts only after "Accept all" |
| No free-text / amounts in event props | ✅ | sanitiser + caller discipline |
| Funnels / dashboards configured | ⚠️ | build in the PostHog project |

## MONITORING

| Item | Status | Notes |
|---|---|---|
| `captureException` wrapper | ✅ | `lib/observability` — used across service catch blocks |
| Sentry init (DSN-guarded) + `beforeSend` scrub | ✅ (code) / ⚠️ (DSN) | `instrumentation.ts` |
| `error.tsx` / `global-error.tsx` / `not-found.tsx` | ✅ | |
| Source-map upload in CI | ❌ | wire `SENTRY_AUTH_TOKEN` + the Sentry build step |
| Uptime / health monitor | ⚠️ | point a monitor at `/api/health` |
| Alert routing (Slack/pager) | ❌ | configure in Sentry |
| Structured request logging | ⚠️ | Vercel captures stdout; no structured logger yet |

## DEPLOYMENT

| Item | Status | Notes |
|---|---|---|
| CI (typecheck + lint + test + build) | ✅ | `.github/workflows/ci.yml` |
| `postinstall: prisma generate` | ✅ | |
| `next build` succeeds | ✅ | 34 routes |
| Vercel project + env vars per environment | ⚠️ | follow `docs/deployment.md` |
| DNS (Namecheap → Cloudflare → Vercel) | ⚠️ | `docs/dns.md` |
| Preview ≠ production database | ⚠️ | separate Supabase projects |
| Migration step in the deploy pipeline (`prisma migrate deploy`) | ❌ | add to the release job |
| Rollback plan | ⚠️ | Vercel instant rollback for code; DB migrations need care |

## BACKUPS

| Item | Status | Notes |
|---|---|---|
| Database backups | ⚠️ | Supabase automated PITR — enable + verify a restore |
| Backup restore drill | ❌ | |
| Data export for a user (GDPR) | ❌ | no self-serve export yet |
| Account deletion cascade | ⚠️ | `onDelete: Cascade` on `User` covers owned rows; wire the Clerk `user.deleted` webhook to trigger it |

## TESTING

| Item | Status | Notes |
|---|---|---|
| Unit (scoring, entitlements, usage, vector, attribution, env gate) | ✅ | |
| Cross-user isolation (every entity + relationship tampering) | ✅ | `tests/isolation.test.ts` |
| Data integrity (usage bypass, idempotency, CSV safety, goals) | ✅ | `tests/data-integrity.test.ts` |
| API / webhook behaviour | ✅ | `tests/api.test.ts` |
| Input validation / boundary | ✅ | `tests/validation.test.ts` |
| **94 tests** total, serial (shared test DB) | ✅ | |
| Postgres-target CI run | ❌ | run the isolation suite against a Postgres service in CI |
| E2E (Playwright) | ❌ | manual browser QA only |
| Load / soak test | ❌ | |

## ACCESSIBILITY

| Item | Status | Notes |
|---|---|---|
| Semantic HTML, landmarks, skip-to-content | ✅ | |
| Keyboard nav + visible `:focus-visible` everywhere | ✅ | global outline rule |
| Dialog focus trap + Escape + `aria-modal` + labelled/described | ✅ | `useId()` ids |
| Form labels + `role="alert"` errors | ✅ | |
| Button/link semantics, icon-button `aria-label` | ✅ | |
| `prefers-reduced-motion` respected | ✅ | global |
| Table headers `scope="col"` | ✅ | |
| Colour contrast (light + dark) | ✅ | token set designed for ≥4.5:1 body text |
| Mobile touch targets | ✅ | 40px+ controls; bottom nav |
| Full screen-reader / axe audit | ❌ | not run |

## PERFORMANCE

| Item | Status | Notes |
|---|---|---|
| No N+1 in list/detail services | ✅ | audited; `listProjects` = 2 queries, dashboards batched |
| AI page fetches only the latest conversation | ✅ | was loading every message of every thread |
| `moneySummary` per-row scan bounded to 13 months | ✅ | |
| Server components + minimal client JS | ✅ | client islands only where interactive |
| Aggregations use DB `aggregate`/`groupBy` | ✅ | |
| Pagination on unbounded lists | ⚠️ | most lists `take` a cap; no cursor paging yet (fine at current scale) |
| Image optimisation | ✅ | no raster images; SVG icon |
| Opportunity re-scoring cost | ⚠️ | scores all published opps in JS per request — fine at ~10, cache when the library grows |
| Bundle analysis | ⚠️ | `motion` is the largest client dep (used for dialogs/toasts/drawers) |

## MOBILE / PWA

| Item | Status | Notes |
|---|---|---|
| Responsive at 375 / 768 / 1280 | ✅ | verified in browser |
| Intentional mobile nav (drawer + bottom tabs) | ✅ | not a shrunk sidebar |
| `manifest.webmanifest` + theme-color + icon | ✅ | |
| No horizontal overflow; wide content scrolls in-container | ✅ | |
| Offline / service worker | ❌ | manifest only; no SW |
| Installable / Capacitor packaging | ⚠️ | structure supports it; not built |

---

## Remaining blockers (🔴) before a real launch

None that are code blockers. The gating work is **credential + wiring**:

1. **Clerk**: add `clerkMiddleware()` to `proxy.ts`, mount `<SignIn/>`, implement the
   `/api/webhooks/clerk` Svix handler, set `AUTH_MODE=clerk` + keys.
2. **Postgres**: create the Supabase project, switch `DATABASE_PROVIDER`, regenerate
   migrations, run `prisma/rls/policies.sql`, and run the isolation suite against it.
3. **Deploy pipeline**: add `prisma migrate deploy` to the release job.
4. **Backups**: enable Supabase PITR and do one restore drill.

Everything else above is either ✅ or a normal post-launch iteration.
