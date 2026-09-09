import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public liveness probe. Deliberately minimal — it does NOT report which
 * integrations are configured (that is visible to admins in /admin).
 */
export async function GET() {
  let database = false;
  try {
    await db.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  return NextResponse.json(
    { status: database ? "ok" : "degraded", time: new Date().toISOString() },
    { status: database ? 200 : 503 },
  );
}
