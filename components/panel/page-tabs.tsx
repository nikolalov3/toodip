"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export interface PageTab {
  href: string;
  label: string;
  /** Matches only the exact path (the first tab of a section). */
  exact?: boolean;
}

/**
 * Tabs under a page title. The chosen assistant and period travel with the
 * reader from tab to tab (the `keep` query parameters), so "Google AI" stays
 * "Google AI" while they look around.
 */
export function PageTabs({ tabs, keep = [], label }: { tabs: PageTab[]; keep?: string[]; label: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const carried = new URLSearchParams();
  for (const key of keep) {
    const value = params.get(key);
    if (value) carried.set(key, value);
  }
  const query = carried.toString();

  return (
    <nav aria-label={label} className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={query ? `${tab.href}?${query}` : tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block border-b-2 px-3 py-2.5 text-[13.5px] transition-colors",
                  "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-brand font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
