import { env } from "@/lib/env";

/**
 * Wraps the app in <ClerkProvider> only when AUTH_MODE=clerk (and a publishable
 * key is present). In dev mode it is a passthrough, so the dev signed-cookie
 * shim keeps working with zero Clerk config.
 *
 * Remaining Clerk wiring (see docs/authentication.md):
 *   1. set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY + AUTH_MODE=clerk
 *   2. add `clerkMiddleware()` to proxy.ts
 *   3. mount <SignIn/> on /sign-in
 *   4. point the Clerk dashboard webhook at /api/webhooks/clerk
 */
export async function AuthProvider({ children }: { children: React.ReactNode }) {
  if (env.AUTH_MODE !== "clerk" || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{children}</ClerkProvider>;
}
