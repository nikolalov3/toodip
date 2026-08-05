import Link from "next/link";
import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { Session } from "@/lib/auth/session";
import { demoStoreDriver } from "@/lib/demo/store";
import { repositoryMode } from "@/lib/repositories";
import type { BusinessProfile, Tenant } from "@/types/domain";

export function AppShell({
  session,
  tenant,
  profile,
  children,
}: {
  session: Session;
  tenant: Tenant;
  profile: BusinessProfile;
  children: ReactNode;
}) {
  const mode = repositoryMode();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            RR
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {tenant.name}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {profile.district ? `${profile.district}, ` : ""}
              {profile.city}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="rounded-md border border-border bg-card px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="size-1.5 rounded-full bg-caution" aria-hidden />
              {mode === "demo" ? "Demo data" : "Live data"}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {mode === "demo"
                ? demoStoreDriver === "file"
                  ? "Seeded workspace stored on disk. Reset it from the user menu."
                  : "Seeded workspace held in memory. It resets when the server restarts."
                : "Connected to Supabase."}
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <div className="lg:hidden">
            <MobileNav workspaceName={tenant.name} />
          </div>

          <Link
            href="/dashboard"
            className="text-sm font-medium lg:hidden"
          >
            {tenant.name}
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              fullName={session.fullName}
              email={session.email}
              initials={session.initials}
              role={session.role}
              userKey={session.userKey}
            />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
