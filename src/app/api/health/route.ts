import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { integrations } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + integration-configuration probe. No secrets in the response. */
export async function GET() {
  let database = false;
  try {
    await db.$queryRawUnsafe("SELECT 1");
    database = true;
  } catch {
    database = false;
  }

  const body = {
    status: database ? "ok" : "degraded",
    time: new Date().toISOString(),
    checks: { database },
    integrations, // booleans only
  };

  return NextResponse.json(body, { status: database ? 200 : 503 });
}
