import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Clerk user lifecycle webhook (Phase 1.5).
 *
 * When wired up this endpoint will:
 *  1. verify the Svix signature against CLERK_WEBHOOK_SECRET (constant-time),
 *  2. on user.created / user.updated -> upsert the mirrored User row,
 *  3. on user.deleted -> soft-delete / cascade per retention policy.
 *
 * Until AUTH_MODE=clerk the app provisions the User row lazily in getAuthUser(),
 * so this route intentionally returns 501 rather than pretending to process events.
 */
export async function POST() {
  if (env.AUTH_MODE !== "clerk" || !env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Clerk webhook not configured" }, { status: 501 });
  }
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
