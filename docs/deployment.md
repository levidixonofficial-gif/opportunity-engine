# Deployment

## Topology

```
Namecheap (registrar)
   └─ nameservers → Cloudflare (DNS)
        └─ CNAME/A → Vercel (hosting)
             └─ Next.js app  ──→ Supabase (Postgres, Storage)
                              ──→ Clerk, Stripe, Anthropic, Pinecone, Upstash, Resend, PostHog, Sentry
```

Namecheap is **registrar only**. Cloudflare is **DNS only** (no proxy/orange-cloud on
the Vercel records — see `dns.md`). Vercel is the host.

## Environments

| Env | Branch | Database | Notes |
|---|---|---|---|
| Development | local | PGlite (`npm run pg:up`) | `AUTH_MODE=dev` |
| Preview | any PR / `development` | a dedicated Supabase project (or branch) | `AUTH_MODE=clerk` test instance |
| Production | `main` | production Supabase project | live keys |

Never share a database between Preview and Production.

## First-time setup

1. **GitHub**: push repo. Protect `main` (PR + green CI required).
2. **Vercel**: import the repo. `vercel.json` (committed) pins the framework and
   sets `buildCommand` to `npm run vercel-build` =
   `prisma generate && prisma migrate deploy && next build`. `prisma migrate deploy`
   only applies pending migrations — it never resets or drops. Because each Vercel
   environment has its own `DATABASE_URL`, previews migrate their own database, not
   production's. `git.deploymentEnabled.main: true` marks `main` as the production
   branch; PR/preview deploys stay enabled (set other branches to `false` in
   `vercel.json` or the dashboard if you want to disable them).
3. **Env vars** (Vercel → Settings → Environment Variables): set every key from
   `.env.example` for Preview and Production separately. `NEXT_PUBLIC_APP_URL` =
   the environment's own URL.
4. **Supabase**: create project(s), copy the pooled + direct connection strings
   into `DATABASE_URL` / `DIRECT_DATABASE_URL`. Then `npm run db:deploy`
   (= `prisma migrate deploy` — applies the single init migration; never
   `db:push`, never `migrate reset`), `npm run db:seed`, apply
   `psql "$DIRECT_DATABASE_URL" -f prisma/rls/policies.sql`, and verify:
   `npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --exit-code`
   then `npm run verify:rls` (see `docs/database.md`).
5. **Clerk**: create app, set the production domain, configure Google OAuth, add the
   webhook endpoint `https://<domain>/api/webhooks/clerk` and copy the signing secret.
6. **Stripe** (Phase 6): create products/prices, add webhook
   `https://<domain>/api/webhooks/stripe`, copy `whsec_…`.
7. **Resend** (Phase 7): verify the sending domain (records in `dns.md`).
8. **Sentry** (Phase 7): add `SENTRY_AUTH_TOKEN` for source-map upload; set
   environment + release in CI.
9. **DNS**: follow `dns.md`.

## Release checklist (run before declaring a phase done)

- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` succeeds
- [ ] `npm test` green (Phase 1.5+)
- [ ] `npm run verify:rls` green (RLS + cross-user isolation vs real Postgres)
- [ ] migrations applied to Preview via `prisma migrate deploy`; `prisma migrate
      diff --from-config-datasource … --exit-code` shows zero drift; `verify:rls`
      against a disposable copy of the Supabase DB (`PGURL=… VERIFY_RLS_ALLOW_DESTRUCTIVE=1`)
- [ ] `/api/health` returns `ok` with expected integrations
- [ ] responsive check: 375px, 768px, 1280px
- [ ] no secret in the client bundle (`grep` the `.next` output for known prefixes)
