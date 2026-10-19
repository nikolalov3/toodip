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
    <nav className="flex flex-col gap-7 px-3 py-3" aria-label="Main">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2.5 pb-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
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
                      "group relative flex items-center gap-2.5 rounded-[4px] px-2.5 py-[7px] text-[13.5px] transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "bg-sidebar-accent font-medium text-foreground before:absolute before:inset-y-[7px] before:left-0 before:w-[2px] before:rounded-full before:bg-brand"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[15px] shrink-0 transition-colors",
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
