"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { navGroupsFor, navItemActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SidebarNav({
  isPlatformAdmin,
  hasBusinessProfile,
  siteModules,
  onNavigate,
}: {
  isPlatformAdmin: boolean;
  hasBusinessProfile: boolean;
  siteModules?: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () => navGroupsFor({ isPlatformAdmin, hasBusinessProfile, siteModules }),
    [isPlatformAdmin, hasBusinessProfile, siteModules],
  );

  return (
    <nav className="flex flex-col gap-6 px-3 py-3" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = navItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "bg-brand-soft font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-brand" : "text-muted-foreground/70 group-hover:text-muted-foreground",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.status === "planned" && (
                      <span className="ml-auto rounded-sm border border-border px-1 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
