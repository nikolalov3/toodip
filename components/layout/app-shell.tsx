import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { Session } from "@/lib/auth/session";
import type { BusinessProfile } from "@/types/domain";

export function AppShell({
  session,
  profile,
  children,
}: {
  session: Session;
  profile: BusinessProfile | null;
  children: ReactNode;
}) {
  const location = profile
    ? [profile.district, profile.city].filter(Boolean).join(", ")
    : "Setup not finished";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <LogoMark size={28} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {session.tenantName}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {location}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav
            isPlatformAdmin={session.isPlatformAdmin}
            hasBusinessProfile={Boolean(profile)}
          />
        </div>

        {!profile && (
          <div className="border-t border-sidebar-border px-3 py-3">
            <div className="rounded-md border border-border bg-card px-2.5 py-2">
              <p className="text-[11px] font-medium">
                {session.isPlatformAdmin
                  ? "Operations console"
                  : "Setup not finished"}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {session.isPlatformAdmin
                  ? "This workspace is not a venue, so the review screens are hidden. Open a client workspace to get them back."
                  : "Finish the setup wizard and the review screens appear."}
              </p>
            </div>
          </div>
        )}

        {session.isPlatformAdmin && session.workspaces.length > 1 && (
          <div className="border-t border-sidebar-border px-3 py-3">
            <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
              Operating in
            </p>
            <Link
              href="/clients"
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs transition-colors hover:bg-accent"
            >
              <span className="truncate font-medium">{session.tenantName}</span>
              <span className="shrink-0 text-muted-foreground">switch</span>
            </Link>
          </div>
        )}
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <div className="lg:hidden">
            <MobileNav
              workspaceName={session.tenantName}
              isPlatformAdmin={session.isPlatformAdmin}
              hasBusinessProfile={Boolean(profile)}
            />
          </div>

          <Link href="/dashboard" className="text-sm font-medium lg:hidden">
            {session.tenantName}
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              fullName={session.fullName}
              email={session.email}
              initials={session.initials}
              role={session.role}
              workspaces={session.workspaces}
              activeWorkspaceId={session.tenantId}
              canSwitchWorkspace={session.isPlatformAdmin}
            />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
