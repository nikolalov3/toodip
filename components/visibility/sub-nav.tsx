"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/visibility", label: "Overview" },
  { href: "/visibility/share", label: "Share of voice" },
];

/** Tabs under the AI Visibility title: the headline view and the deep dive. */
export function VisibilitySubNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex gap-1 border-b border-border" aria-label="Visibility views">
      {TABS.map((tab) => {
        const active = tab.href === "/visibility" ? pathname === "/visibility" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors",
              active
                ? "border-brand font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
