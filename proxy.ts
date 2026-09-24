import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";

/**
 * Convenience only, not the security boundary: every admin page and API
 * route checks the session and role itself. This just sends signed-out
 * visitors to the login page and keeps admin responses out of caches and
 * search engines.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginPage = pathname === "/admin/login";

  if (isAdminPage && !isLoginPage && !request.cookies.get(SESSION_COOKIE)) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  response.headers.set("x-robots-tag", "noindex, nofollow");
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "same-origin");
  response.headers.set("x-frame-options", "DENY");
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
