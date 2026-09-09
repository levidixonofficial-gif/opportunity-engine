import { env } from "@/lib/env";

/**
 * Wraps the app in <ClerkProvider> only when AUTH_MODE=clerk (and a publishable
 * key is present). In dev mode it is a passthrough, so the dev signed-cookie
 * shim keeps working with zero Clerk config.
 *
 * Clerk wiring is complete in code: `clerkMiddleware()` in proxy.ts, `<SignIn/>`
 * on /sign-in, and the /api/webhooks/clerk lifecycle handler. To go live, set
 * AUTH_MODE=clerk + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY +
 * CLERK_WEBHOOK_SECRET, and point a Clerk Dashboard webhook (user.created,
 * user.updated, user.deleted) at /api/webhooks/clerk. See docs/authentication.md.
 */
export async function AuthProvider({ children }: { children: React.ReactNode }) {
  if (env.AUTH_MODE !== "clerk" || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{children}</ClerkProvider>;
}
