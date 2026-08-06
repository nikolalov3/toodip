import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";
import { PATHNAME_HEADER } from "@/proxy";
import type { BusinessProfile } from "@/types/domain";

/**
 * Authenticated surfaces read cookies and must never be prerendered. Without
 * this, a build in an environment that has no Supabase configuration tries to
 * render them as static pages and fails, instead of deploying an app that
 * reports the missing configuration at runtime.
 */
export const dynamic = "force-dynamic";

/**
 * Screens that work without a business profile.
 *
 * Everything else is about a venue, so it needs one. The platform workspace
 * never has a profile and never should: it is an operations console, not a
 * business, which is why a platform admin lands on the client list instead.
 */
const WORKS_WITHOUT_PROFILE = ["/clients", "/account", "/team", "/billing"];

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  let profile: BusinessProfile | null = null;
  try {
    const repo = await getRepository();
    profile = await repo.getBusinessProfile();
  } catch {
    profile = null;
  }

  if (!profile) {
    const headerList = await headers();
    const pathname = headerList.get(PATHNAME_HEADER) ?? "";
    const reachable = WORKS_WITHOUT_PROFILE.some((path) =>
      pathname.startsWith(path),
    );
    if (!reachable) {
      redirect(session.isPlatformAdmin ? "/clients" : "/onboarding");
    }
  }

  return (
    <AppShell session={session} profile={profile}>
      {children}
    </AppShell>
  );
}
