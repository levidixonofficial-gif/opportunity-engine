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
| Development | local | SQLite | `AUTH_MODE=dev` |
| Preview | any PR / `development` | a dedicated Supabase project (or branch) | `AUTH_MODE=clerk` test instance |
| Production | `main` | production Supabase project | live keys |

Never share a database between Preview and Production.

## First-time setup

1. **GitHub**: push repo. Protect `main` (PR + green CI required).
2. **Vercel**: import the repo. Framework preset = Next.js. Build command
   `npm run build`, install `npm install`. Add a **post-install**? no — instead add
   `prisma generate` via `postinstall` script (added in Phase 1.5) and run
   `npm run db:deploy` in a Vercel "Build" step or a release GitHub Action.
3. **Env vars** (Vercel → Settings → Environment Variables): set every key from
   `.env.example` for Preview and Production separately. `NEXT_PUBLIC_APP_URL` =
   the environment's own URL.
4. **Supabase**: create project(s), copy pooled + direct connection strings, run
   `npm run db:deploy` and `npm run db:seed`, apply `prisma/rls/policies.sql`.
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
- [ ] migrations applied to Preview, RLS verified with a two-user isolation test
- [ ] `/api/health` returns `ok` with expected integrations
- [ ] responsive check: 375px, 768px, 1280px
- [ ] no secret in the client bundle (`grep` the `.next` output for known prefixes)
