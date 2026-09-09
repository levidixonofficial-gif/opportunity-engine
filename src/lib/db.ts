import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

/**
 * Prisma 7 requires a driver adapter (the Rust query engine was removed).
 * We pick the adapter from DATABASE_PROVIDER so the same app code runs on
 * local SQLite and on Supabase Postgres with only an env change.
 */
function createPrisma(): PrismaClient {
  const adapter =
    env.DATABASE_PROVIDER === "postgresql"
      ? new PrismaPg({ connectionString: env.DIRECT_DATABASE_URL ?? env.DATABASE_URL })
      : new PrismaBetterSqlite3({ url: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrisma();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
