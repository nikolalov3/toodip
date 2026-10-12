import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { BarItem } from "@/services/stats";

/**
 * The building blocks of the analytics modules, in the stats panel's visual
 * language: a question as the section header with a numbered step and a
 * hint, KPI tiles, horizontal bars with a count and share, a card.
 */

export function Hint({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      className="ml-1 inline-flex size-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground"
    >
      ?
    </span>
  );
}

export function QHead({
  step,
  title,
  hint,
  sub,
}: {
  step: number;
  title: string;
  hint?: string;
  sub?: string;
}) {
  return (
    <div className="mt-7 mb-3 flex items-start gap-3 first:mt-0">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
        {step}
      </span>
      <div>
        <p className="text-[15px] font-semibold leading-tight text-foreground">
          {title}
          {hint && <Hint text={hint} />}
        </p>
        {sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[4px] border border-border bg-card p-4", className)}>
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-[4px] border border-border bg-card px-4 py-3.5">
      <p className="text-[12px] text-muted-foreground">
        {label}
        {hint && <Hint text={hint} />}
      </p>
      <p
        className={cn(
          "text-numeric mt-1 text-[28px] font-semibold leading-none tracking-tight",
          highlight ? "text-brand" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function Kpis({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function Bars({
  items,
  empty,
  pct,
  muted,
  suffix,
}: {
  items: BarItem[];
  empty: string;
  /** Show the share next to the count. */
  pct?: boolean;
  /** Grey bars (for "the rest" style lists). */
  muted?: boolean;
  /** Extra text per row, by label. */
  suffix?: (item: BarItem) => ReactNode;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-[13px] text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3 text-[13px]">
          <span className="truncate text-foreground" title={item.label}>
            {item.label}
          </span>
          <span className="h-[6px] overflow-hidden rounded-[2px] bg-muted">
            <i
              className={cn("block h-full rounded-[2px]", muted ? "bg-chart-5" : "bg-brand")}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </span>
          <b className="text-numeric min-w-[56px] text-right font-semibold">
            {item.value}
            {pct && (
              <span className="ml-1 font-medium text-muted-foreground">
                · {Math.round((item.value / total) * 100)}%
              </span>
            )}
            {suffix?.(item)}
          </b>
        </div>
      ))}
    </div>
  );
}

export function NoSite() {
  return (
    <Card>
      <p className="text-[13px] text-muted-foreground">
        No website is linked to this workspace yet. Add its address under Install, paste the
        tracker, and data appears with the first visits.
      </p>
    </Card>
  );
}
