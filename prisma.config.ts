import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "@prisma/config";

// Prisma 7 no longer auto-loads .env for the CLI/config layer.
loadEnv({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Migrations run against the DIRECT (non-pooled) connection. On Supabase the
    // pooled URL (pgbouncer, :6543) can't hold the advisory locks Prisma Migrate
    // needs; DIRECT_DATABASE_URL is the :5432 URL. Unset locally -> falls back to
    // DATABASE_URL (same PGlite instance), so `npm run db:deploy` works either way.
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
