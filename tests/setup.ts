// Deterministic env for tests — set BEFORE any src/ module is imported.
import { readFileSync } from "node:fs";
import path from "node:path";
import { pglite } from "./stubs/db";

const e = process.env as Record<string, string | undefined>;
e.NODE_ENV = "test";
e.AUTH_MODE = "dev";
e.DEV_AUTH_SECRET = "test-secret";
// DB-backed suites use the in-process PGlite in tests/stubs/db.ts (aliased over
// @/lib/db). This URL only satisfies env.ts validation; nothing ever dials it.
e.DATABASE_PROVIDER = "postgresql";
e.DATABASE_URL = "postgresql://pglite@in-process/test";
e.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
// Ensure no optional integrations are considered configured.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.PINECONE_API_KEY;

// Apply the single init migration to the fresh PGlite (idempotent — safe if this
// setup file ever runs more than once).
const migration = readFileSync(
  path.resolve(__dirname, "../prisma/migrations/20260910000000_init/migration.sql"),
  "utf8",
);
await pglite.exec("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
await pglite.exec(migration);
