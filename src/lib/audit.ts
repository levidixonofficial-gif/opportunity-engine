import "server-only";
import { db } from "@/lib/db";

/**
 * Append-only audit trail for security-relevant + admin events.
 * Never store secrets, tokens, or raw financial amounts in `meta`.
 */
export async function writeAudit(entry: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        meta: entry.meta ? JSON.stringify(entry.meta) : null,
        ip: entry.ip ?? null,
      },
    });
  } catch {
    // auditing must never break the operation it records
  }
}
