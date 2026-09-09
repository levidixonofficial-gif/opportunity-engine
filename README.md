# Opportunity Engine

An "online income operating system": discover a legitimate way to earn online that
fits your skills, time, and budget → turn it into an actionable plan → track whether
it is actually working.

**No income is ever guaranteed.** All economics are framed as *typical*, *possible*,
or *estimated*.

## Status

**Phases 1–6 implemented; Phase 7 infra partial.** See [`docs/roadmap.md`](docs/roadmap.md)
for the exact state of every feature. What works today, end to end:

- Auth (dev shim), onboarding → personalized, scored recommendations
- Opportunities: browse / filter / search / save / compare / "make this my focus"
- Plans (opportunity template → real tasks), Tasks, Projects (+ milestones), Goals
  (8 metrics, auto-tracked from your data)
- CRM: contacts, pipeline board, activity log, follow-ups → tasks, CSV import
- Money: revenue / expense / profit, projected vs. actual, invoices, monthly chart
- Outreach: composer + draft generation, honest status tracking
- AI: grounded assistant + 7 generators (rule-based fallback with no key — labelled)
- Billing: Stripe checkout + webhook architecture; entitlements + usage limits
- Global: dark/light theme, ⌘K search, notifications, cookie consent, mobile nav,
  back-to-top, FAQ, copy buttons, confirm dialogs, print styles, a11y

Anything requiring a production credential (Clerk, Stripe, Anthropic, Pinecone,
Resend, PostHog, Sentry, Upstash) has its integration built and degrades honestly
without the key — it is never faked. 43 tests, CI, RLS policies included.

## Stack

Next.js 16 (App Router, RSC) · React 19 · TypeScript (strict) · Tailwind v4 ·
Prisma 7 (SQLite dev / Postgres-Supabase prod) · Clerk auth (dev shim included) ·
Stripe · Anthropic Claude · Pinecone · Upstash · Resend · PostHog · Sentry ·
Vercel / Cloudflare / Namecheap.

## Quick start

```bash
npm install
cp .env.example .env.local        # optional; committed .env has working dev defaults
npm run db:migrate                # create the local SQLite db
npm run db:seed                   # reference data (opportunities, skills, ...)
npm run dev                       # http://localhost:3000
```

Then open <http://localhost:3000/sign-in>. In dev mode, enter any email to create a
test account (tick "admin" for `/admin`). Complete onboarding to reach the dashboard.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` / `db:reset` | Prisma |

Full verification (what CI runs): `npm run typecheck && npm run lint && npm test && npm run build`

## Layout

```
src/app/(marketing)   public site           src/lib/            framework-agnostic core
src/app/(auth)        sign-in                 env.ts, db.ts, auth/, entitlements/,
src/app/onboarding    personalization intake  scoring/, onboarding/, validations/
src/app/(app)         authenticated dashboard
src/app/admin         server-gated admin     src/server/services/  authorization boundary
src/app/api           health + webhooks       (all queries scoped by userId)
prisma/               schema, migrations, seed
docs/                 architecture, database, auth, payments, ai, security, deployment, dns, ...
```

## Docs

Start with [`docs/architecture.md`](docs/architecture.md). Also:
[database](docs/database.md) ·
[authentication](docs/authentication.md) ·
[security](docs/security.md) ·
[payments](docs/payments.md) ·
[ai](docs/ai.md) ·
[vector-search](docs/vector-search.md) ·
[email](docs/email.md) ·
[analytics](docs/analytics.md) ·
[error-monitoring](docs/error-monitoring.md) ·
[deployment](docs/deployment.md) ·
[dns](docs/dns.md) ·
[roadmap](docs/roadmap.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Non-negotiables: identity from the server
session only, every query scoped by `userId`, Zod on every input, no secrets in the
client, no faked functionality.
