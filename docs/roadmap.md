# Phased roadmap

Status legend: ✅ done · 🔩 partial · ⛏ not started

## Phase 1 — Foundation  ✅ (this build)

- ✅ Next.js 16 + TS strict + Tailwind v4 + `components/ui` primitives + `motion`
- ✅ Prisma 7 schema (35 models), provider-portable, migrated (SQLite dev)
- ✅ Idempotent seed: 8 categories, 14 skills, 10 interests, 10 opportunities, 6 flags
- ✅ Auth abstraction (dev signed-cookie shim; Clerk-ready) + `requireUser/Admin`
- ✅ Env validation (`src/lib/env.ts`) + `.env.example`
- ✅ Entitlements map + `getUserPlan()` (server-side)
- ✅ Deterministic Opportunity Fit Score (weighted, reasons, breakdown) — verified
- ✅ Onboarding → personalization pipeline (no AI), initial goal, warmed recs
- ✅ App shell (sidebar + mobile bottom nav), responsive
- ✅ Dashboard (today's actions, progress stats, goals, recommendations, quick actions)
- ✅ Opportunities: list + filters + search + fit scores; detail with plan/economics/breakdown
- ✅ Save / compare / "make this my focus"
- ✅ Plan generation from opportunity template → real Tasks; task complete/skip
- ✅ Tasks, Saved, Settings (notification prefs, redo onboarding) — real
- ✅ Admin (server-gated): counts, flags, recent signups
- ✅ `/api/health`; webhook route stubs return 501 (honest)
- ✅ `proxy.ts` UX gate; docs set; build + lint + typecheck clean

### Phase 1.5 — hardening (next)
- ⛏ Install + wire Clerk provider; `/api/webhooks/clerk` with Svix verification
- ⛏ `prisma/rls/policies.sql` + a Postgres preview DB + two-user isolation test
- ⛏ Vitest: scorer unit tests, service authorization tests, webhook signature tests
- ⛏ `postinstall: prisma generate`; CI (typecheck/lint/build/test)
- ⛏ Error boundaries + `loading.tsx` / `not-found.tsx` per segment

## Phase 2 — Opportunity Engine depth  🔩
- Compare view (side-by-side), category landing pages, public `/opportunities`
- Admin CRUD for opportunities/categories/skills (no code changes to add content)
- Recommendation reactivity to activity (viewed/saved/skipped signals)
- Expand library to 40+ opportunities

## Phase 3 — Execution  🔩
- Projects (full CRUD, status board, revenue vs. target)
- Task editing/reordering/adding; plan editing
- Goals + milestones UI; streak tracking

## Phase 4 — AI
- Assistant (grounded), generators (offer/outreach/content/idea/digital-product/action-plan)
- Pinecone semantic search + keyword fallback
- Usage metering, token caps, per-plan model selection, usage dashboards

## Phase 5 — Money + CRM
- Transactions CRUD; revenue/expense/profit; by-opportunity / by-project
- Contacts, Deals pipeline (drag), Interactions
- Personal analytics dashboard

## Phase 6 — Monetization
- Stripe checkout + billing portal + webhook sync
- Entitlement gates across the app; upgrade prompts at limits

## Phase 7 — Infrastructure
- Resend transactional email + templates + cron digests
- PostHog events + funnels
- Sentry (server + client) with scrubbing
- Upstash rate limiting + caching + job queue
- Security headers/CSP; Cloudflare + Vercel production cutover

## Acceptance criteria (spec §55) — tracked

Auth ✅ · onboarding ✅ · persistence ✅ · RLS ⛏ · opportunities ✅ · search 🔩(keyword) ·
recommendations ✅ · plans ✅ · tasks ✅ · projects ⛏ · AI ⛏ · vector ⛏ · Stripe ⛏ ·
webhooks ⛏ · email ⛏ · analytics ⛏ · Sentry ⛏ · Redis ⛏ · admin ✅ · mobile ✅ ·
prod deploy ⛏ · env documented ✅ · no secrets committed ✅ · error handling 🔩 · docs ✅
