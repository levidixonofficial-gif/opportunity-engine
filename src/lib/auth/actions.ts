"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit, RL } from "@/lib/ratelimit";
import { clearDevSession, setDevSession } from "@/lib/auth";

const devSignInSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(80).optional(),
  asAdmin: z.boolean().default(false),
});

/**
 * DEV-ONLY sign-in. Creates or reuses a User keyed by a synthetic clerkId and
 * drops a signed session cookie. Disabled entirely when AUTH_MODE=clerk.
 */
export async function devSignIn(formData: FormData) {
  if (env.AUTH_MODE !== "dev") throw new Error("Dev sign-in is disabled (AUTH_MODE is not 'dev').");

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = await rateLimit("auth", ip, RL.auth);
  if (!rl.success) throw new Error("Too many attempts. Wait a minute and try again.");

  const parsed = devSignInSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    asAdmin: formData.get("asAdmin") === "on",
  });
  if (!parsed.success) throw new Error("Enter a valid email.");

  const { email, name, asAdmin } = parsed.data;
  const clerkId = `dev_${email.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

  const user = await db.user.upsert({
    where: { clerkId },
    update: { email, ...(name ? { name } : {}), ...(asAdmin ? { role: "admin" } : {}) },
    create: {
      clerkId,
      email,
      name,
      role: asAdmin ? "admin" : "user",
      subscription: { create: {} },
      notificationPref: { create: {} },
    },
  });

  await setDevSession(user.clerkId);

  const onboarded = await db.profile.findUnique({ where: { userId: user.id }, select: { onboardedAt: true } });
  redirect(onboarded?.onboardedAt ? "/dashboard" : "/onboarding");
}

export async function signOut() {
  if (env.AUTH_MODE === "clerk") {
    // Clerk's <SignOutButton>/clerkClient handles this in the UI; placeholder for parity.
  }
  await clearDevSession();
  redirect("/");
}
