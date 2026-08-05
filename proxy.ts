import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "rra_session";

/**
 * Guarantees a session id on every request so the demo workspace has a stable
 * key. When Supabase auth lands this is where the token refresh goes.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)",
  ],
};
