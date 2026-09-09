# Phased roadmap & status

Legend: ✅ done & verified · 🔩 partial · ⛏ not started

## Phase 1 — Foundation ✅
Next.js 16 + TS strict + Tailwind v4 + `components/ui`; Prisma 7 (SQLite dev /
Postgres prod, driver adapters); auth abstraction (dev signed-cookie shim /
Clerk-ready); env validation; entitlements map; deterministic Opportunity Fit
Score; onboarding → personalization pipeline; app shell; dashboard; opportunities
list/detail; save/compare/focus; template plan → tasks; admin; `/api/health`.

## Phase 1.5 — Security & testing ✅
- ✅ Vitest harness (`tests/`), throwaway `prisma/test.db`, `resetDb`/`makeUser`
- ✅ 43 tests: scorer (bounds/determinism/monotonicity/ranking), entitlements,
  generators (schema-valid, no guarantee phrasing), attribution (UTM allow-list),
  **cross-user isolation** across projects/goals/CRM/money/outreach/tasks, goal
  recompute, Stripe helpers + webhook-refusal
- ✅ `.github/workflows/ci.yml` (typecheck + lint + test + build)
- ✅ `prisma/rls/policies.sql` — RLS for every user-owned table (defense-in-depth)
- ✅ Task service extracted for testability; `getAuthUser` fast-path
- 🔩 Clerk provider wiring + `/api/webhooks/clerk` Svix verification — abstraction
  done, `@clerk/nextjs` installed, provider not yet mounted (docs/authentication.md)
- ⛏ Postgres preview DB + running the RLS isolation test against Postgres in CI
- ⛏ Per-segment `error.tsx` / `loading.tsx` (global handling + skeletons exist)

## Phase 2 — Opportunity Engine depth ✅
- ✅ Opportunity model + all 10 seeds filled: target customer, ongoing cost, geo
  dependence, repeat-revenue potential, sales cycle, prerequisites, failure modes
- ✅ Scoring v2: scalability-fit + location-fit components, goal-aware, stretched
  range (weak match → 30s–40s)
- ✅ Detail page surfaces every field
- 🔩 Admin CRUD for opportunities/categories/skills (read-only admin exists)
- ⛏ Compare view; public `/opportunities`; recommendation reactivity to activity;
  library expansion past 10

## Phase 3 — Projects + Goals ✅
- ✅ Projects: list by status, create dialog, detail (revenue vs. target, tasks,
  milestones, linked deals), status transitions, delete-with-confirm
- ✅ Goals (`/goals`): 8 metrics, auto-recompute from real data, achieved state,
  archive/delete
- ✅ Milestones (project- or goal-scoped)
- ✅ Tasks page + add/complete/skip/reorder service; dashboard widgets

## Phase 4 — AI ✅ (with honest local fallback)
- ✅ `lib/ai`: Anthropic Messages API adapter, `chatJson`, `AiNotConfiguredError`
- ✅ `lib/ai/generators`: 7 generators, Zod-validated, **deterministic rule-based
  builder** when no key / on validation failure; safety preamble
- ✅ `server/services/ai`: grounded assistant (profile/goals/tasks/revenue context,
  no raw financial rows), honest rule-based mode, usage metering
- ✅ `/ai` UI: assistant chat, generator grid + typed result renderers, provider
  badges, limits surfaced
- ⛏ Pinecone semantic search (interface + keyword fallback planned; `vectorStore`
  not yet implemented — see docs/vector-search.md)
- ⛏ Action-plan generator writing `Plan`/`Task` rows (generator returns the plan;
  wiring to tasks pending)

## Phase 5 — Money + CRM ✅
- ✅ Money: transactions (actual vs. projected separated), monthly chart, by-project,
  invoices with "mark paid" → real revenue transaction
- ✅ CRM: contacts, pipeline board + list, contact detail (activity, deals,
  follow-up → real task, outreach), CSV import (BYO-list, dedupe, unverified),
  pipeline value summary
- ✅ Outreach: composer + draft generation, status flow that cannot reach
  "delivered" by hand, per-message outcome tracking, copy button
- ✅ Lead-gen architecture: `LeadImportBatch`, source + timestamp + verification
  status; no scraping, no fabricated contacts
- ⛏ Companies UI (model exists); deal detail page; reminders beyond follow-up tasks

## Phase 6 — Monetization ✅ (architecture; needs keys to run live)
- ✅ Stripe client, checkout session, billing portal, price↔plan map
- ✅ Webhook with signature verification + full lifecycle handling
- ✅ `/billing` with usage/limits, upgrade buttons, dev plan switcher
- ✅ Centralized entitlements enforced via `getUserPlan` + `hasFeature`/`checkUsage`
- 🔩 Entitlement *enforcement* at feature entry points: AI + saves + generators
  enforce limits; CRM/analytics show a soft notice rather than hard-blocking
- ⛏ Live verification (needs `STRIPE_*` env + `stripe listen`)

## Phase 7 — Infrastructure 🔩
- ✅ `lib/email` (Resend adapter + console fallback), `lib/analytics` (PostHog
  server capture + scrubbing), `lib/audit`
- ✅ Cookie consent gate; analytics only fire with consent + key
- ⛏ Resend templates + cron digests; PostHog client init; Sentry
  (`instrumentation.ts`); Upstash rate-limiting/caching; Cloudflare + Vercel cutover
- ⛏ `postinstall: prisma generate`

## Global UI/UX ✅
Theme system (pre-paint script, 3-way toggle, full token set) · Toaster ·
accessible Dialog + ConfirmDialog · CopyButton · BackToTop · ScrollProgress · FAQ ·
CookieBanner · floating ContactButton → Feedback · GlobalSearch (⌘K) ·
NotificationBell · intentional mobile drawer + bottom tabs (app + marketing) ·
skip-to-content · print stylesheet · prefers-reduced-motion · PWA manifest ·
focus-visible everywhere · form success (toast) + error states · empty states.

## Acceptance criteria (spec §55)
auth ✅ · onboarding ✅ · persistence ✅ · RLS 🔩(SQL written, not enforced on SQLite) ·
opportunities ✅ · search ✅(traditional + global; semantic ⛏) · recommendations ✅ ·
plans ✅ · tasks ✅ · projects ✅ · AI ✅(local + real path) · vector ⛏ · Stripe ✅(arch) ·
webhooks ✅ · emails 🔩(interface + fallback) · analytics 🔩(interface) · Sentry ⛏ ·
Redis ⛏ · admin ✅ · mobile ✅ · prod deploy ⛏ · env documented ✅ · no secrets ✅ ·
error handling 🔩 · docs ✅
