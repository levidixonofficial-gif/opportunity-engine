import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

/**
 * Creates a fresh SQLite database at prisma/test.db and applies all migrations
 * before the DB-backed suites run.
 */
export default function setup() {
  const dbPath = path.resolve(__dirname, "../prisma/test.db");
  for (const f of [dbPath, `${dbPath}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db", DATABASE_PROVIDER: "sqlite" },
  });
}
