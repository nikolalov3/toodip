import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

/**
 * Authenticated surfaces read cookies and must never be prerendered. Without
 * this, a build in an environment that has no Supabase configuration tries to
 * render them as static pages and fails, instead of deploying an app that
 * reports the missing configuration at runtime.
 */
export const dynamic = "force-dynamic";


export default async function RootPage() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/sign-in");
}
