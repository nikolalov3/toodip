"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Opens a past report of the series on the page. The newest period is the
 * default and needs no parameter; any other one is carried in `?period=`.
 */
export function PeriodPicker({
  periods,
  trigger,
}: {
  periods: Array<{ period: string; label: string; current: boolean }>;
  /** Text of the control when it sits next to a title instead of being the period itself. */
  trigger?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = periods.find((p) => p.current) ?? periods[0];
  if (!current) return null;
  if (periods.length < 2) return trigger ? null : <span className="font-medium text-foreground">{current.label}</span>;

  const hrefFor = (period: string, newest: boolean) => {
    const next = new URLSearchParams(params.toString());
    if (newest) next.delete("period");
    else next.set("period", period);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <details className="group relative inline-block">
      <summary
        className={cn(
          "inline-flex cursor-pointer list-none items-center gap-1 rounded-md hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          trigger ? "border border-border bg-card px-2.5 py-1 text-[13px] font-medium text-muted-foreground shadow-card" : "font-medium text-foreground",
        )}
      >
        {trigger ?? current.label}
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="absolute left-0 top-full z-20 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-raised">
        {periods.map((p, index) => (
          <li key={p.period}>
            <Link
              href={hrefFor(p.period, index === 0)}
              scroll={false}
              className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-accent", p.current && "bg-accent font-medium")}
            >
              {p.label}
              {index === 0 && <span className="text-[11.5px] text-muted-foreground">latest</span>}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
