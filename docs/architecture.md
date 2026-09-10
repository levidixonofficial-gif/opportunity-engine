# Architecture

## 1. What this is

Opportunity Engine is a SaaS that helps people go:

> "I want to make money online" → "Here is a realistic opportunity for me" → "Here is
> what to do next" → "Here are the tools" → "Here is whether it is actually working."

It never promises income. Every economic figure is framed as *typical*, *possible*, or
*estimated*.

## 2. The product loop

`DISCOVER → EVALUATE → CHOOSE → PLAN → EXECUTE → TRACK → IMPROVE → SCALE`

Every feature maps onto a stage:

| Stage | Feature |
|---|---|
| Discover | Opportunity library, search, filters, semantic search (Phase 4) |
| Evaluate | Deterministic **Fit Score** + AI idea analysis (Phase 4) |
| Choose | Save / compare / "make this my focus" |
| Plan | Template → Plan → Tasks; AI action-plan generator (Phase 4) |
| Execute | Tasks, Projects, AI generators (offer/outreach/content) |
| Track | Money tracking, CRM, personal analytics |
| Improve / Scale | Goals, analytics, recommendations that react to activity |

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC) + React 19 + TypeScript (strict) | `proxy.ts` (renamed from `middleware.ts`) |
| Styling | Tailwind CSS v4 + hand-rolled `components/ui` primitives + `motion` | design tokens in `globals.css`, `prefers-reduced-motion` respected |
| Forms | React Hook Form + Zod; Zod also validates server actions & route handlers | |
| DB | PostgreSQL everywhere — PGlite locally (`npm run pg:up`), Supabase in prod | Prisma 7 with a driver adapter; schema stays engine-neutral |
| ORM | Prisma 7 (`@prisma/adapter-pg`, `max: 1`) | connection URL lives in `prisma.config.ts` (`DIRECT_DATABASE_URL ?? DATABASE_URL`); tests swap in an in-process PGlite adapter |
| Auth | Clerk (`AUTH_MODE=clerk`) with a local signed-cookie shim (`AUTH_MODE=dev`) | one `getAuthUser()` interface |
| Payments | Stripe (Phase 6) | plan mirrored onto `Subscription`, synced by webhook |
| AI | Anthropic Claude (Phase 4) | usage metered per plan |
| Vector | Pinecone (Phase 4) | behind a `vectorStore` interface; keyword fallback |
| Cache / rate-limit | Upstash Redis (Phase 7) | behind `cache` / `rateLimit` interfaces; in-memory fallback |
| Email | Resend (Phase 7) | behind an `email` interface; console fallback |
| Analytics | PostHog (Phase 7) | no-op without a key |
| Errors | Sentry (Phase 7) | no-op without a DSN |
| Hosting | Vercel; DNS on Cloudflare; registrar Namecheap | see `deployment.md`, `dns.md` |

## 4. Layering

```
app/(marketing)      public site (RSC) — landing, pricing, how-it-works, legal
app/(auth)           sign-in (dev shim UI / Clerk mount point)
app/onboarding       personalization intake
app/(app)/*          authenticated dashboard: dashboard, opportunities, plan,
                     projects, goals, tasks, leads, outreach, money, ai, saved,
                     analytics, settings, billing
app/admin            server-gated admin
app/actions/*        cross-cutting server actions (search, notifications, feedback)
app/api/*            route handlers: health + webhooks (Clerk, Stripe)

src/lib/*            framework-agnostic building blocks
  env.ts            zod-validated env + `integrations` capability flags
  form.ts           shared FormState for useActionState / ActionDialog
  auth/             identity resolution (dev shim | Clerk) + dev sign-in action
  db.ts             Prisma singleton w/ provider-selected adapter
  entitlements/     plan → limits/features map + hasFeature()/checkUsage()
  usage.ts          UsageCounter helpers: assertWithinLimit / recordUsage
  scoring/fit.ts    deterministic Opportunity Fit Score (pure, tested)
  onboarding/       question config + submission schema
  validations/      Zod unions — the single source of truth for "enum" strings
  attribution.ts    first-touch UTM parse/validate (allow-list)
  audit.ts          append-only AuditLog writer
  stripe.ts         lazy Stripe client + price↔plan map
  ai/               provider abstraction, generators (+ rule-based), prompts
  email/            Resend adapter + console fallback (never claims delivery)
  analytics/        PostHog server capture + PII/financial scrubbing

src/server/services/*   the ENFORCED authorization boundary.
  Every function takes an authenticated userId and scopes all queries by it.
  profile, onboarding, opportunities, dashboard, plans, tasks, projects, goals,
  crm, money, outreach, leads, search, notifications, billing, checkout, ai,
  analytics.

src/components/*     design system: ui/ primitives + theme/, app-nav, global-search,
  notification-bell, cookie-banner, contact-button, attribution-capture, phase-stub
```

Rules:

- Components never call Prisma directly — they call a service.
- Services never trust an id from the client; the caller passes `user.id` from the
  server session.
- Subscription/plan checks go through `entitlements` + `server/services/billing.ts`,
  never inline `plan === "pro"`.

## 5. Graceful degradation (spec §52 — no fake functionality)

Each optional integration sits behind an interface with a real fallback that is
**honest about being a fallback**:

| Integration missing | Behaviour |
|---|---|
| Anthropic key | AI features return a clear "AI is not configured" error — never a canned "AI" answer |
| Pinecone | semantic search falls back to Postgres `ILIKE` keyword search, labelled as such |
| Upstash | rate-limiting + cache use an in-process Map (single instance only) |
| Resend | emails are logged to the server console |
| PostHog / Sentry | calls become no-ops |
| Stripe | everyone is on the `free` plan; upgrade UI explains billing is not yet live |
| Clerk (`AUTH_MODE=dev`) | signed-cookie dev sessions; `/sign-in` creates test users |

`GET /api/health` reports which integrations are configured (booleans only).

## 6. Data flow: onboarding → personalized dashboard (spec §36)

1. `submitOnboardingAction` validates with `onboardingSubmissionSchema`.
2. `submitOnboarding(userId, data)`:
   - upserts `Profile` (+ raw JSON snapshot),
   - replaces `ProfileSkill` / `ProfileInterest`,
   - seeds one initial `Goal`,
   - calls `recomputeSavedRecommendations`.
3. No AI is called. Ranking uses the deterministic scorer only.
4. Dashboard reads `getDashboardData(userId)` — one batched query set.

## 7. Opportunity Fit Score

Pure function `scoreOpportunity(profile, opportunity) → { score 0-100, reasons[], breakdown[] }`.
Weighted components: skill fit (20), budget fit (18), time fit (16), goal alignment
(14), demand-vs-competition (14), difficulty fit (10), interest fit (8). Presented
with reasons and a breakdown bar — **never** as a guaranteed outcome. See
`src/lib/scoring/fit.ts`.

## 8. Security model

See `security.md`. Summary: identity from the server session only; per-user data
isolation enforced in the service layer *and* (in prod) Postgres RLS; Zod on every
input; webhook signature verification; secrets server-only; admin gated server-side.
