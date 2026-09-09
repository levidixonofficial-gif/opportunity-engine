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
   Supabase already provides `auth.jwt()`; nothing else to install.
7. Verify RLS + isolation. `npm run verify:rls` runs the full policy check against
   real PostgreSQL 18 (PGlite, in-process, no Docker) — SELECT visibility, INSERT
   `WITH CHECK`, UPDATE/DELETE scoping, locked tables (`User`/`AuditLog`/
   `WebhookEvent`), transitive ownership (`Milestone`, `AiMessage`), and cross-user
   isolation across every owned entity. It also runs in CI (the `postgres` job).
   Against the live Supabase DB, additionally run the Prisma service-layer suite:
   `DATABASE_PROVIDER=postgresql DATABASE_URL=<direct> npx vitest run tests/isolation.test.ts`.

### Keeping `postgres-preview.sql` honest

CI (`postgres` job) regenerates the diff from `schema.prisma` and fails if it no
longer matches `prisma/postgres-preview.sql`, so the preview can never drift from
the schema. Regenerate it after any schema change:

```
sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > /tmp/pg.prisma
npx prisma migrate diff --from-empty --to-schema /tmp/pg.prisma --script > prisma/postgres-preview.sql
# then re-add the header comment block
```

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
| `npm run db:migrate` | create + apply a dev migration |
| `npm run db:deploy` | apply migrations (CI / prod) |
| `npm run db:seed` | idempotent reference-data seed (categories, skills, opportunities, flags) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | drop + re-migrate + re-seed (dev only) |
