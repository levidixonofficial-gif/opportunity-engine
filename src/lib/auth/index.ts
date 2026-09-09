import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { User } from "@prisma/client";

/**
 * Auth abstraction. Identity is ALWAYS derived server-side — never from a
 * client-supplied id.
 *
 *  - AUTH_MODE=dev   -> a signed, httpOnly cookie carries a dev user's clerkId.
 *                       Sign-in page at /sign-in lets you create/switch dev users.
 *  - AUTH_MODE=clerk -> resolves the verified Clerk session (auth() from
 *                       @clerk/nextjs/server) and maps its `sub` to our User row.
 *
 * Swapping is purely an env change once @clerk/nextjs is installed (Phase 1.5).
 */

const DEV_COOKIE = "oe_dev_session";

function sign(value: string): string {
  const mac = createHmac("sha256", env.DEV_AUTH_SECRET).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", env.DEV_AUTH_SECRET).update(value).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export async function setDevSession(clerkId: string) {
  const jar = await cookies();
  jar.set(DEV_COOKIE, sign(clerkId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDevSession() {
  const jar = await cookies();
  jar.delete(DEV_COOKIE);
}

/** The externally-issued identity (clerkId + email), or null if signed out. */
async function resolveIdentity(): Promise<{ clerkId: string; email: string; name?: string } | null> {
  if (env.AUTH_MODE === "clerk") {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const u = await currentUser();
    const email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses[0]?.emailAddress;
    if (!email) return null;
    return { clerkId: userId, email, name: [u?.firstName, u?.lastName].filter(Boolean).join(" ") || undefined };
  }

  // dev mode
  const jar = await cookies();
  const clerkId = verify(jar.get(DEV_COOKIE)?.value);
  if (!clerkId) return null;
  const existing = await db.user.findUnique({ where: { clerkId } });
  return { clerkId, email: existing?.email ?? `${clerkId}@dev.local`, name: existing?.name ?? undefined };
}

/** Get (or lazily provision) the internal User row for the current session. */
export async function getAuthUser(): Promise<User | null> {
  const identity = await resolveIdentity();
  if (!identity) return null;

  const user = await db.user.upsert({
    where: { clerkId: identity.clerkId },
    update: { email: identity.email, ...(identity.name ? { name: identity.name } : {}) },
    create: {
      clerkId: identity.clerkId,
      email: identity.email,
      name: identity.name,
      subscription: { create: {} },
      notificationPref: { create: {} },
    },
  });
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
