import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and keeps unauthenticated
 * traffic off the workspace.
 *
 * The refresh has to happen here rather than in a page, because server
 * components cannot set cookies, and an expired token would otherwise only be
 * noticed halfway through rendering.
 */

export const PATHNAME_HEADER = "x-toodip-pathname";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/api/stripe"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Layouts cannot see the current path. Passing it down lets the workspace
  // layout decide which screens are reachable before setup is finished.
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, pathname);

  let response = NextResponse.next({ request: { headers } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // A deployment missing its configuration fails closed. Letting requests
  // through to blow up deeper in the stack is how an unguarded screen ends up
  // in front of someone.
  if (!url || !anonKey) {
    if (isPublic) return response;
    const target = request.nextUrl.clone();
    target.pathname = "/sign-in";
    target.search = "";
    return NextResponse.redirect(target);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request: { headers } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const target = request.nextUrl.clone();
    target.pathname = "/sign-in";
    target.search =
      pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(target);
  }

  if (user && pathname === "/sign-in") {
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)",
  ],
};
