// Test double for `@/lib/db` (aliased in vitest.config.ts).
//
// Runs a single in-process PGlite — real PostgreSQL 18, no socket, no Docker —
// behind Prisma's PGlite driver adapter, so the DB-backed suites exercise the
// exact Postgres dialect production uses. The real src/lib/db.ts (the pg wire
// adapter for Supabase / local `npm run pg:up`) is untouched.
//
// Cached on globalThis so the instance, its connection and its data are shared
// across every test file (vitest runs one worker with isolate:false).
import { PrismaClient } from "@prisma/client";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PGlite } from "@electric-sql/pglite";

type Cache = { __pglite?: PGlite; __db?: PrismaClient };
const g = globalThis as unknown as Cache;

export const pglite: PGlite = (g.__pglite ??= new PGlite());
export const db: PrismaClient =
  (g.__db ??= new PrismaClient({ adapter: new PrismaPGlite(pglite), log: ["error"] }));
