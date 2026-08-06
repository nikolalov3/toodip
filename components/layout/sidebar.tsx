"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { navGroupsFor } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SidebarNav({
  isPlatformAdmin,
  hasBusinessProfile,
  onNavigate,
}: {
  isPlatformAdmin: boolean;
  hasBusinessProfile: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = useMemo(
    () => navGroupsFor({ isPlatformAdmin, hasBusinessProfile }),
    [isPlatformAdmin, hasBusinessProfile],
  );

  return (
    <nav className="flex flex-col gap-6 px-3 py-4" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-brand" : "text-muted-foreground",
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
