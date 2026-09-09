import { env } from "@/lib/env";

/**
 * `contains` behaviour differs by engine:
 *   - SQLite:   LIKE is case-INSENSITIVE for ASCII by default
 *   - Postgres: LIKE is case-SENSITIVE; you must pass `mode: "insensitive"`
 *
 * Passing `mode` to SQLite makes Prisma throw, so this helper is provider-aware.
 * Use it for every user-facing text search so behaviour is identical in dev and
 * production.
 */
export function textSearch(value: string): { contains: string; mode?: "insensitive" } {
  return env.DATABASE_PROVIDER === "postgresql"
    ? { contains: value, mode: "insensitive" }
    : { contains: value };
}

/**
 * Neutralise spreadsheet formula injection in an imported cell value.
 * Cells beginning with = + - @ (or a leading tab/CR) are treated as formulas by
 * Excel / Sheets / LibreOffice. We prefix them with an apostrophe so they are
 * stored (and later re-exported) as inert text. See OWASP "CSV Injection".
 */
export function sanitizeImportedCell(value: string): string {
  const v = value.trim();
  if (v && /^[=+\-@\t\r]/.test(v)) return `'${v}`;
  return v;
}
