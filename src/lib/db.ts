import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

/**
 * Prisma 7 requires a driver adapter (the Rust query engine was removed).
 * PostgreSQL everywhere — PGlite over the wire locally (`npm run pg:up`),
 * Supabase in preview/production. The SQLite adapter is retained only for
 * git-history parity and is unreachable with the `postgresql` schema.
 * (Tests swap this whole module for an in-process PGlite — tests/stubs/db.ts.)
 *
 * `max: 1` — one connection per process: the Prisma + Supabase transaction-
 * pooler recommendation for serverless (pgbouncer multiplexes across instances),
 * and it also minimises churn against the local PGlite socket server. Prisma
 * queues concurrent queries at the client layer.
 */
function createPrisma(): PrismaClient {
  const adapter =
    env.DATABASE_PROVIDER === "postgresql"
      ? new PrismaPg({ connectionString: env.DIRECT_DATABASE_URL ?? env.DATABASE_URL, max: 1 })
      : new PrismaBetterSqlite3({ url: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrisma();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
