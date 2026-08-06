import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";
import type { BusinessProfile } from "@/types/domain";

/**
 * Authenticated surfaces read cookies and must never be prerendered. Without
 * this, a build in an environment that has no Supabase configuration tries to
 * render them as static pages and fails, instead of deploying an app that
 * reports the missing configuration at runtime.
 */
export const dynamic = "force-dynamic";


export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  const session = await requireSession();

  // A workspace created a minute ago may not have finished setup yet. The shell
  // still has to render, so the client can get to the wizard.
  let profile: BusinessProfile | null = null;
  try {
    const repo = await getRepository();
    profile = await repo.getBusinessProfile();
  } catch {
    profile = null;
  }

  return (
    <AppShell session={session} profile={profile}>
      {children}
    </AppShell>
  );
}
