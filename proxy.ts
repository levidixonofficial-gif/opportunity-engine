import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware` -> `proxy`. This is a lightweight UX gate
 * only: it redirects obviously-unauthenticated requests for app routes to
 * /sign-in based on cookie presence. It is NOT the security boundary — every
 * protected page/layout independently calls requireUser()/requireAdmin(), which
 * verify the session and (in prod) the Clerk token server-side.
 */
const PROTECTED = [/^\/dashboard/, /^\/onboarding/, /^\/opportunities/, /^\/plan/, /^\/projects/, /^\/tasks/, /^\/leads/, /^\/money/, /^\/ai/, /^\/saved/, /^\/analytics/, /^\/settings/, /^\/billing/, /^\/admin/];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((re) => re.test(pathname))) return NextResponse.next();

  const hasSession =
    request.cookies.has("oe_dev_session") ||
    request.cookies.has("__session") || // Clerk
    request.cookies.has("__clerk_db_jwt");

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
