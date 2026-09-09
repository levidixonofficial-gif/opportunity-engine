# Database

## Provider strategy

| Environment | Provider | URL |
|---|---|---|
| Local dev | SQLite | `file:./prisma/dev.db` |
| Preview / Production | PostgreSQL (Supabase) | pooled connection string in `DATABASE_URL`, direct in `DIRECT_DATABASE_URL` |

Prisma 7 keeps the connection URL in `prisma.config.ts` (not the schema) and needs a
**driver adapter**. `src/lib/db.ts` picks the adapter from `DATABASE_PROVIDER`:
`@prisma/adapter-pg` for Postgres, `@prisma/adapter-better-sqlite3` for SQLite.

### Portability constraints

The schema runs on both engines, so it avoids:

- native `enum` types → `String` columns validated by Zod unions in
  `src/lib/validations/enums.ts`
- scalar list fields (`String[]`) → explicit join tables
- engine-specific column types

## Switching to Postgres

The committed migrations are SQLite-flavoured and are **not** applied on Postgres —
they are regenerated. [`prisma/postgres-preview.sql`](../prisma/postgres-preview.sql)
is a generated preview of exactly what the first Postgres migration will create
(run `prisma migrate diff` with the provider flipped), so there are no surprises.

1. Create a Supabase project.
2. In `.env.local`:
   ```
   DATABASE_PROVIDER="postgresql"
   DATABASE_URL="postgresql://…pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_DATABASE_URL="postgresql://…pooler.supabase.com:5432/postgres"
   ```
3. In `prisma/schema.prisma` set `datasource db { provider = "postgresql" }`.
4. `rm -rf prisma/migrations` then `npm run db:migrate -- --name init` to regenerate
   migrations for Postgres. Diff the result against `postgres-preview.sql`.
5. `npm run db:seed`.
6. Apply RLS policies: `psql "$DIRECT_DATABASE_URL" -f prisma/rls/policies.sql`.
7. Verify: run the isolation suite against the new DB
   (`DATABASE_URL=<postgres> npx vitest run tests/isolation.test.ts` — point
   `tests/setup.ts`/`global-setup` at it, or set the env inline).

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

## Row Level Security (production)

`prisma/rls/policies.sql` (added in Phase 1.5) enables RLS on every user-owned table
with a policy of the form:

```sql
alter table "Task" enable row level security;
create policy task_owner on "Task"
  using ("userId" = (select id from "User" where "clerkId" = auth.jwt()->>'sub'));
```

The **enforced** boundary is still the service layer (`src/server/services/*`), which
scopes by `userId` derived from the verified session. RLS is defense-in-depth for any
path that uses the Supabase client directly.

## Commands

| Script | Purpose |
|---|---|
| `npm run db:migrate` | create + apply a dev migration |
| `npm run db:deploy` | apply migrations (CI / prod) |
| `npm run db:seed` | idempotent reference-data seed (categories, skills, opportunities, flags) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | drop + re-migrate + re-seed (dev only) |
