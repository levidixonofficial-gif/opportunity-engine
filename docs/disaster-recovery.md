# Disaster Recovery

What to do when data or the deployment is lost or corrupted. Keep this file
current — it is only useful if the steps actually match reality.

## At a glance

| Scenario | RTO (target) | RPO (target) | Procedure |
|---|---|---|---|
| Bad deploy (app broken, DB fine) | 5 min | 0 | [Rollback the deployment](#1-rollback-a-bad-deployment) |
| Bad migration (schema/data corrupted) | 30 min | ≤ 5 min | [Restore the database](#2-restore-the-database) |
| Accidental data loss (row/table) | 1 hr | ≤ 5 min | [Point-in-time restore](#2-restore-the-database) |
| Supabase project lost | 2 hr | ≤ 24 hr | [Rebuild from backup](#3-rebuild-a-lost-database) |
| Leaked secret | 15 min | n/a | [Rotate secrets](#4-rotate-a-leaked-secret) |

RTO = time to recover. RPO = acceptable data loss window.

## Backups

- **Database (Supabase Postgres).** Enable **Point-in-Time Recovery (PITR)** on the
  production project (Supabase dashboard → Database → Backups). PITR retains WAL for
  the configured window (7 days recommended) plus daily base backups. Without PITR
  you only get daily snapshots (RPO = 24 h).
- **Verify** monthly that a backup exists and is recent (dashboard shows the latest
  restore point). Record the check date below.
- **Schema + seed** are in git: `prisma/migrations/` (SQLite dev) +
  `prisma/postgres-preview.sql` (the generated Postgres schema, CI-checked against
  `schema.prisma`) + `prisma/seed.ts` (idempotent reference data). A database can be
  rebuilt structurally from the repo alone; only user data needs a backup.
- **Code** is in GitHub. **Secrets** live only in Vercel/Supabase/Clerk/etc. env
  settings — there is no secret backup by design; recovery = re-issue (section 4).
- **No PII in logs.** Sentry/PostHog hold operational data only, so they are not
  part of the recovery path.

### Restore drill log

| Date | Performed by | Result | Notes |
|---|---|---|---|
| _pending_ | | | Run one full PITR restore into a scratch project before go-live and record it here. |

## 1. Rollback a bad deployment

App is broken but the database is intact (most common incident).

1. Vercel → project → **Deployments**.
2. Find the last known-good deployment (green, before the bad one).
3. **⋯ → Promote to Production** (instant alias swap — no rebuild).
4. Confirm `/api/health` returns `{ "status": "ok" }` and a real user can sign in.
5. Revert or fix the offending commit on `main`; the next deploy rebuilds forward.

> A rollback does **not** roll back database migrations. If the bad deploy also ran
> a destructive migration, do section 2 as well.

## 2. Restore the database

Corruption, a bad migration, or accidental deletion — and the production project
still exists.

1. **Stop writes.** Pause the Vercel production deployment (Settings → pause) or
   revoke the app's database credentials in Supabase so no new data lands during
   the restore. (There is no in-app maintenance mode today — pausing at the edge is
   the mechanism.)
2. Supabase → Database → **Backups / PITR**.
3. Choose a restore point **just before** the incident.
4. Restore. Supabase restores **in place** for PITR (or into a new project for
   snapshot restore — then repoint `DATABASE_URL`/`DIRECT_DATABASE_URL`).
5. Re-apply anything that lives outside migrations:
   - `psql "$DIRECT_DATABASE_URL" -f prisma/rls/policies.sql`
   - `npm run verify:rls` (against a copy) to confirm RLS still enforces.
6. `npx prisma migrate status` — resolve any divergence (section 2a).
7. Clear maintenance mode. Verify `/api/health`, sign-in, and a scoped read for a
   test user.
8. Post-incident: note the data-loss window (rows written between the restore point
   and the incident) and communicate if it affected users.

### 2a. Migration recovery

A migration failed halfway (`P3009` / `migrate status` shows a failed migration):

- **Never** run `prisma migrate reset` against production (it drops all data).
- If the migration did **not** apply any changes: `prisma migrate resolve
  --rolled-back <name>`, fix the migration SQL, redeploy.
- If it **partially** applied: restore the DB (section 2) to before the migration,
  fix the migration, then `prisma migrate deploy` again.
- The generated Postgres baseline is `prisma/postgres-preview.sql`; CI fails if it
  drifts from `schema.prisma`, so it is always a faithful "what the schema should
  be" reference for hand-repair.

## 3. Rebuild a lost database

The Supabase project itself is gone and no in-place restore is possible.

1. Create a new Supabase project (same region).
2. Set `DATABASE_URL` (pooled) + `DIRECT_DATABASE_URL` (direct) in Vercel.
3. `npx prisma migrate deploy` — creates the schema from `prisma/migrations/`
   (Postgres migration set; see docs/database.md "Switching to Postgres" if the
   repo is still on the SQLite set).
4. `psql "$DIRECT_DATABASE_URL" -f prisma/rls/policies.sql`
5. `npm run db:seed` — reference data (categories, skills, opportunities, flags).
6. Import the most recent user-data backup (`pg_restore` of the latest Supabase
   snapshot download).
7. `npm run verify:rls` against a copy; `/api/health`; smoke test.
8. Rotate the database credentials that were attached to the lost project.

## 4. Rotate a leaked secret

1. Identify the key (prefix tells you the provider — `sk_`, `whsec_`, `pcsk_`, …).
2. In the provider dashboard: **revoke** the old key, **issue** a new one.
3. Update it in Vercel (Production + Preview as applicable) and redeploy.
4. For webhook signing secrets (`CLERK_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`):
   update the endpoint in the provider dashboard and copy the new secret — a
   mismatch causes 401s at `/api/webhooks/*`, not data loss.
5. `DEV_AUTH_SECRET` only matters where `AUTH_MODE=dev` (never production). Rotating
   it invalidates existing dev session cookies — harmless.
6. Check `git log -p` / GitHub for the secret in history; if committed, treat as
   fully compromised and also purge history (`git filter-repo`) + force-push.

## Contacts / dashboards

Fill in before go-live:

- Vercel project: _URL_
- Supabase project + backups page: _URL_
- Status page / incident channel: _URL_
- On-call / owner: _name_
