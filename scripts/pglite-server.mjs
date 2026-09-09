/**
 * Local embedded PostgreSQL for development + CI (no Docker needed).
 *
 * Boots PGlite (real Postgres 18, compiled to WASM) and exposes it on the
 * Postgres wire protocol so Prisma / node-postgres connect with a normal
 * `postgresql://` URL. Data is persisted under .pglite/ unless PGLITE_EPHEMERAL=1.
 *
 *   node scripts/pglite-server.mjs            # persistent, port 55432
 *   PGLITE_PORT=5599 PGLITE_EPHEMERAL=1 node scripts/pglite-server.mjs
 *
 * This is a DEVELOPMENT/TEST convenience only. Production uses Supabase Postgres
 * (see docs/database.md + docs/deployment.md).
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync } from "node:fs";

const port = Number(process.env.PGLITE_PORT || 55432);
const ephemeral = process.env.PGLITE_EPHEMERAL === "1";
const dataDir = ephemeral ? undefined : ".pglite";
if (dataDir) mkdirSync(dataDir, { recursive: true });

const db = new PGlite(dataDir);
await db.waitReady;

const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`[pglite] PostgreSQL on 127.0.0.1:${port} (${ephemeral ? "ephemeral" : dataDir})`);

const shutdown = async () => {
  await server.stop().catch(() => {});
  await db.close().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
