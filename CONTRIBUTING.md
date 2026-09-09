# Contributing

## Branches

`main` (production) ← PRs only, green CI required.
`development` (integration) · `feature/*` · `fix/*`.

## Before you push

```bash
npm run typecheck && npm run lint && npm run build
npm test            # once tests land (Phase 1.5)
```

## Non-negotiable rules

1. **Identity** comes from `getAuthUser()` / `requireUser()` — never from a
   client-supplied id.
2. **Authorization** lives in `src/server/services/*`. Components call services, not
   Prisma. Every query is scoped by the authenticated `userId`. `update`/`delete` by
   id must filter `where: { id, userId }`.
3. **Validation**: every server action, route handler, and webhook body is parsed
   with a Zod schema as its first step.
4. **Entitlements**: gate paid features with `hasFeature()` / `checkUsage()`. No
   inline `plan === "pro"`.
5. **Secrets**: add to `src/lib/env.ts` (typed) and `.env.example` (documented). A
   client component must never import `@/lib/db` or a server env value.
6. **No fake functionality** (spec §52). Unbuilt features use `<PhaseStub>` or return
   HTTP 501 — never a hard-coded "successful" result.
7. **"Enum" strings**: the source of truth is `src/lib/validations/enums.ts`. Add a
   value there, not as a loose string literal.
8. **Money** is integer minor units (`amountCents`). Never floats.
9. **Copy**: "potential / possible / typical / estimated" — never a promised amount.

## Commits

Conventional-ish: `type(scope): summary`. Keep changes reviewable; one concern per PR.

## Adding an opportunity

Edit `prisma/seed.ts` (`OPPS`) and run `npm run db:seed` — it is idempotent (upsert by
slug). Admin CRUD for this arrives in Phase 2.
