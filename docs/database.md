# Database

## Provider strategy

**PostgreSQL everywhere.** (The SQLite dev path was retired on 2026-09-10; it lives
in git history up to `3154fe9`.)

| Environment | PostgreSQL | Connection |
|---|---|---|
| Local dev + CI | PGlite — embedded Postgres 18, no Docker | `npm run pg:up` serves it on `127.0.0.1:55432` over the wire protocol; `.env` points there |
| Test suite | PGlite — in-process | `tests/stubs/db.ts` (aliased over `@/lib/db` by vitest); no server, no port |
| Preview / Production | Supabase | pooled URL in `DATABASE_URL`, direct URL in `DIRECT_DATABASE_URL` |

Prisma 7 keeps the connection URL in `prisma.config.ts` (not the schema) and needs a
**driver adapter**. `src/lib/db.ts` uses `@prisma/adapter-pg` (`max: 1` — the
Supabase transaction-pooler / serverless recommendation). `prisma.config.ts` uses
`DIRECT_DATABASE_URL ?? DATABASE_URL` so `prisma migrate deploy` runs against the
non-pooled connection.

### Local setup

```bash
npm run pg:up          # terminal 1 — leave running (embedded Postgres, data in .pglite/)
npm run db:deploy      # terminal 2 — apply migrations
npm run db:seed
npm run dev
```

`npm run build` and `npm run dev` both need `pg:up` running (as `next dev` always
did with a DB). A build without it still succeeds — DB-backed pages are dynamic and
just log connection errors during prerender.

### Portability constraints

The schema stays engine-neutral (it ran on SQLite until 2026-09-10 and the
constraints are cheap to keep):

- native `enum` types → `String` columns validated by Zod unions in
  `src/lib/validations/enums.ts`
- scalar list fields (`String[]`) → explicit join tables
- engine-specific column types

## Migrations

`prisma/migrations/20260910000000_init/migration.sql` is the single PostgreSQL
init migration. It was generated deterministically from the schema
(`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`);
CI (`postgres` job) fails if it ever stops matching `schema.prisma`, and also
runs `prisma migrate deploy` against a real Postgres and asserts zero drift.

**Authoring a new migration** (no shadow DB with PGlite, so not `migrate dev`):

```bash
npm run pg:up          # if not already running
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_<name>/migration.sql
npm run db:deploy
```

## Connecting Supabase (preview / production)

1. Create the Supabase project(s).
2. Set in `.env.local` (local verification) and in Vercel (Preview + Production):
   ```
   DATABASE_PROVIDER="postgresql"
   DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_DATABASE_URL="postgresql://…pooler.supabase.com:5432/postgres"
   ```
3. `npm run db:deploy` (= `prisma migrate deploy`) — applies the init migration.
   Never `db:push`, never `migrate reset`.
4. `npm run db:seed`.
5. `psql "$DIRECT_DATABASE_URL" -f prisma/rls/policies.sql`. Supabase already
   provides `auth.jwt()`; nothing else to install.
6. Verify the live schema matches the code:
   `npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --exit-code`
   (exit 0 = match).
7. Verify RLS + cross-user isolation. `npm run verify:rls` runs the full policy
   check against real PostgreSQL 18 (in-process PGlite) — SELECT visibility, INSERT
   `WITH CHECK`, UPDATE/DELETE scoping, locked tables (`User`/`AuditLog`/
   `WebhookEvent`), transitive ownership (`Milestone`, `AiMessage`), and per-user
   isolation across `Project` / `Task` / `Contact` / `Transaction` / `Goal` /
   `Deal` / `Milestone` / `AiMessage`. It also runs in CI (`postgres` job).

   To run the exact same checks against the **real** Postgres wire protocol —
   point it at a **disposable** copy of the Supabase database (a branch or a
   scratch project; it drops and recreates the `public` schema, so **never
   production**):
   ```
   PGURL="<direct-url-of-the-copy>" VERIFY_RLS_ALLOW_DESTRUCTIVE=1 npm run verify:rls
   ```
   It refuses to run against `PGURL` without that flag.

## Schema overview

Identity & profile: `User` (mirrors Clerk, keyed by `clerkId`), `Profile`,
`Skill`/`Interest` catalogs with `ProfileSkill`/`ProfileInterest` joins.

Opportunity Engine: `OpportunityCategory`, `Opportunity`, `OpportunitySkill`,
`OpportunityInterest`, `OpportunityTool`, `OpportunityStep`, `OpportunityExample`,
`SavedOpportunity` (with cached `fitScore`/`fitReasons`).

Execution: `Plan` → `Task`; `Project`; `Goal` → `Milestone`.

CRM (deviates from spec's separate Lead/Customer): `Contact` (+ `isCustomer` flag) →
`Deal` (pipeline stage) + `Interaction` (log). Cleaner normalization; documented
deviation.

Money: `Transaction` (`type` revenue|expense, integer `amountCents`, optional
`projectId`/`contactId`).

AI: `AiConversation` → `AiMessage` (with `tokensIn`/`tokensOut`/`model`).

Billing & usage: `Subscription` (mirror of Stripe), `UsageCounter`
(`userId`+`feature`+`periodKey`, unique).

Platform: `Notification`, `NotificationPreference`, `KnowledgeDocument`,
`FeatureFlag` + `FeatureFlagOverride`, `AuditLog`.

## Indexes & constraints

- Every child table is indexed on its owning `userId` (and often `userId,status`).
- `SavedOpportunity`, `UsageCounter`, `FeatureFlagOverride` have composite unique keys.
- All FKs use `onDelete: Cascade` for owned data and `SetNull` for optional links.

## Row Level Security

`prisma/rls/policies.sql` enables RLS on every user-owned table with a policy of
the form:

```sql
alter table "Task" enable row level security;
create policy "Task_owner" on "Task"
  using ("userId" = current_app_user_id())
  with check ("userId" = current_app_user_id());
```

`current_app_user_id()` resolves `auth.jwt()->>'sub'` (the Clerk subject) to the
internal `User.id`. It is **`SECURITY DEFINER`** with a pinned `search_path`: the
`User` table is locked (RLS on, no policy), so an ordinary authenticated
connection cannot read it, and without definer rights every policy would evaluate
against `NULL` and deny all access.

Coverage: all 24 directly-owned tables (`using` + `with check`), `Milestone` and
`AiMessage` (transitive ownership), `ProfileSkill`/`ProfileInterest` (owned via
`Profile`), public read-only reference tables, and `User`/`AuditLog`/`WebhookEvent`
fully locked (RLS on, no policy = service-role only). Verified by `npm run verify:rls`.

The **enforced** boundary is still the service layer (`src/server/services/*`), which
scopes by `userId` derived from the verified session. RLS is defense-in-depth for any
path that uses the Supabase client directly.

## Commands

| Script | Purpose |
|---|---|
| `npm run pg:up` | start the local embedded PGlite Postgres (`127.0.0.1:55432`) |
| `npm run db:deploy` | `prisma migrate deploy` — apply pending migrations (local / CI / prod) |
| `npm run db:seed` | idempotent reference-data seed (categories, skills, opportunities, flags) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:migrate` | `prisma migrate dev` — needs a shadow-DB-capable Postgres; for a new migration prefer the `migrate diff` recipe above |
| `npm run db:reset` | `prisma migrate reset` — drop + re-migrate + re-seed. **Local disposable DB only — never against Supabase.** |
| `npm run verify:rls` | RLS + cross-user isolation check against real Postgres |
