# Opportunity Engine

An "online income operating system": discover a legitimate way to earn online that
fits your skills, time, and budget → turn it into an actionable plan → track whether
it is actually working.

**No income is ever guaranteed.** All economics are framed as *typical*, *possible*,
or *estimated*.

## Status

**Phase 1 (Foundation) complete.** See [`docs/roadmap.md`](docs/roadmap.md) for what
is real vs. pending. Features not yet built are shown as honest, labelled placeholders
in the app — never faked.

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
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` / `db:reset` | Prisma |

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
