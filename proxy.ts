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

const PUBLIC_PATHS = [
  "/sign-in",
  "/auth/confirm",
  "/terms",
  "/pricing",
  "/api/stripe",
  "/api/cron",
  "/sitemap.xml",
  "/robots.txt",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Layouts cannot see the current path. Passing it down lets the workspace
  // layout decide which screens are reachable before setup is finished.
  // The request object itself is forwarded, so cookies refreshed below reach
  // the server components of this same request. Building a response from a
  // copy of the headers would hand them the expired token instead, and a
  // signed-in person would see "no workspace" once an hour.
  request.headers.set(PATHNAME_HEADER, pathname);

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // The root is the public landing page; the page itself sends signed-in
  // visitors on to their dashboard. Locale prefixes cover the translated
  // marketing pages (/pl, /de/pricing, ...).
  const isPublic =
    pathname === "/" ||
    /^\/(pl|de|uk|fr|it)(\/pricing)?$/.test(pathname) ||
    PUBLIC_PATHS.some(
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
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Local verification of the ES256 token against Supabase's JWKS (cached
  // across requests). No round trip to the auth server; an expired token is
  // refreshed here through the cookie adapter, so pages read a fresh one.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ?? null;

  if (!user && !isPublic) {
    const target = request.nextUrl.clone();
    target.pathname = "/sign-in";
    target.search =
      pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(target);
  }

  if (user && pathname === "/sign-in") {
    const target = request.nextUrl.clone();
    target.pathname = "/overview";
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
