import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionSecret } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session !== sessionSecret()) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Brand assets and the tab icon are public: the login page shows them, and
// next/image fetches them server-side without the session cookie.
export const config = {
  matcher: ["/((?!_next/static|_next/image|assets/|icon.svg|favicon.ico).*)"],
};
