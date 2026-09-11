import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { env } from "@/lib/env";

/**
 * Next.js 16 renamed `middleware` -> `proxy`.
 *
 * AUTH_MODE=clerk  -> real `clerkMiddleware()` runs: it establishes the Clerk
 *                     request context (so `auth()` works in RSC/route handlers)
 *                     and redirects unauthenticated requests for protected routes
 *                     to the sign-in page.
 * AUTH_MODE=dev    -> a lightweight cookie-presence gate (the dev signed-cookie
 *                     shim). No Clerk config required.
 *
 * Either way this is a first-pass UX gate, NOT the security boundary: every
 * protected page/layout independently calls requireUser()/requireAdmin(), which
 * verify identity server-side.
 */
const PROTECTED = [
  /^\/dashboard/, /^\/onboarding/, /^\/opportunities/, /^\/plan/, /^\/projects/,
  /^\/tasks/, /^\/leads/, /^\/money/, /^\/ai/, /^\/saved/, /^\/analytics/,
  /^\/settings/, /^\/billing/, /^\/admin/,
];

const isProtectedRoute = createRouteMatcher(PROTECTED);

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect({ unauthenticatedUrl: new URL("/sign-in", request.url).toString() });
  }
});

function devProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((re) => re.test(pathname))) return NextResponse.next();

  const hasSession =
    request.cookies.has("oe_dev_session") ||
    request.cookies.has("__session") ||
    request.cookies.has("__clerk_db_jwt");

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (env.AUTH_MODE === "clerk") return clerkProxy(request, event);
  return devProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
