import { ArrowDownRight, ArrowUpRight, Minus, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Hint } from "@/components/stats/hint";
import { cn } from "@/lib/utils";
import type { BarItem, SplitItem } from "@/services/stats";

export { Hint };

/**
 * The building blocks of the analytics modules, in the stats panel's visual
 * language: a question as the section header with a numbered step and a
 * hint, KPI tiles, horizontal bars with a count and share, a card. Plus the
 * small pieces the insight views need: sparklines, weekly bars, split bars,
 * a verdict line and an error card.
 */

export function QHead({
  step,
  title,
  hint,
  sub,
  period,
}: {
  step: number;
  title: string;
  hint?: string;
  sub?: string;
  /** The time frame, shown next to the title ("Last 30 days"). */
  period?: string;
}) {
  return (
    <div className="mt-10 mb-3.5 flex items-start gap-3">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
        {step}
      </span>
      <div>
        <p className="text-[15px] font-semibold leading-tight text-foreground">
          {title}
          {period && <span className="ml-2 text-[12px] font-normal text-muted-foreground">{period}</span>}
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
  delta,
  deltaUnit = "%",
  deltaLabel = "compared with the 30 days before",
  sub,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: string;
  highlight?: boolean;
  /** Change against the previous period. Null: nothing to compare with. */
  delta?: number | null;
  /** Unit after the delta number: "%" for counts, " pts" for a rate. */
  deltaUnit?: string;
  /** What the delta is compared with, for screen readers and the title. */
  deltaLabel?: string;
  /** One short line under the value ("41 of 1203 visitors"). */
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-[4px] border border-border bg-card px-4 py-3.5">
      <p className="text-[12px] text-muted-foreground">
        {label}
        {hint && <Hint text={hint} />}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p
          className={cn(
            "text-numeric text-[28px] font-semibold leading-none tracking-tight",
            highlight ? "text-brand" : "text-foreground",
          )}
        >
          {value}
        </p>
        {delta !== undefined && <Delta value={delta} unit={deltaUnit} label={deltaLabel} />}
      </div>
      {sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Delta({ value, unit, label }: { value: number | null; unit: string; label: string }) {
  const tone =
    value === null || value === 0 ? "text-muted-foreground" : value > 0 ? "text-positive" : "text-critical";
  const Icon = value === null || value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("text-numeric inline-flex items-center gap-0.5 text-[12px] font-medium", tone)} title={label}>
      <Icon className="size-3" aria-hidden />
      {value === null ? (
        <span className="sr-only">No previous period to compare with</span>
      ) : (
        <>
          {value > 0 ? "+" : ""}
          {value}
          {unit}
          <span className="sr-only"> {label}</span>
        </>
      )}
    </span>
  );
}

export function Kpis({ children, cols = 4 }: { children: ReactNode; cols?: 4 | 5 }) {
  return (
    <div className={cn("mt-6 grid grid-cols-2 gap-3", cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
      {children}
    </div>
  );
}

export function Bars({
  items,
  empty,
  pct,
  muted,
  suffix,
  aside,
}: {
  items: BarItem[];
  empty: string;
  /** Show the share next to the count. */
  pct?: boolean;
  /** Grey bars (for "the rest" style lists). */
  muted?: boolean;
  /** Extra text per row, by label. */
  suffix?: (item: BarItem) => ReactNode;
  /** A small element between the label and the bar (a sparkline, say). */
  aside?: (item: BarItem) => ReactNode;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-[13px] text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "grid items-center gap-3 text-[13px]",
            aside ? "grid-cols-[minmax(0,160px)_auto_1fr_auto]" : "grid-cols-[minmax(0,160px)_1fr_auto]",
          )}
        >
          <span className="truncate text-foreground" title={item.label}>
            {item.label}
          </span>
          {aside && <span className="inline-flex items-center">{aside(item)}</span>}
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

/** Bars where every row is two parts: the first in the brand colour, the rest in grey. */
export function SplitBars({
  items,
  legend,
  empty,
}: {
  items: SplitItem[];
  /** Names of the two parts, in order: [brand, grey]. */
  legend: [string, string];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-[13px] text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.ai + i.rest));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const total = item.ai + item.rest;
        return (
          <div key={item.label} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3 text-[13px]">
            <span className="truncate text-foreground" title={item.label}>
              {item.label}
            </span>
            <span className="h-[6px] overflow-hidden rounded-[2px] bg-muted">
              <span className="flex h-full" style={{ width: `${Math.round((total / max) * 100)}%` }}>
                <i className="block h-full bg-brand" style={{ width: `${total ? (item.ai / total) * 100 : 0}%` }} />
                <i className="block h-full flex-1 bg-chart-5" />
              </span>
            </span>
            <b className="text-numeric min-w-[56px] text-right font-semibold">
              {total}
              <span className="ml-1 font-medium text-muted-foreground">
                · {legend[0]} {item.ai}
              </span>
            </b>
          </div>
        );
      })}
      <div className="mt-1 flex gap-4 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[2px] bg-brand" /> {legend[0]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[2px] bg-chart-5" /> {legend[1]}
        </span>
      </div>
    </div>
  );
}

/** A small line of values, oldest first. Renders on the server; no interaction. */
export function Sparkline({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const W = 96;
  const H = 24;
  const pad = 2;
  const n = values.length;
  const max = Math.max(1, ...values);
  const x = (i: number) => (n <= 1 ? W / 2 : pad + ((W - 2 * pad) * i) / (n - 1));
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = n > 1 ? `${line} L${x(n - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z` : "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className={cn("shrink-0", className)}>
      {area && <path d={area} fill="var(--brand-soft)" />}
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A small row of bars, oldest first. Empty periods are drawn as a hairline. */
export function MiniBars({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const W = 96;
  const H = 24;
  const gap = 3;
  const n = Math.max(1, values.length);
  const bw = (W - gap * (n - 1)) / n;
  const max = Math.max(1, ...values);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label} className={cn("shrink-0", className)}>
      {values.map((v, i) => {
        const h = v ? Math.max(2, (v / max) * H) : 1;
        return (
          <rect
            key={i}
            x={(i * (bw + gap)).toFixed(1)}
            y={(H - h).toFixed(1)}
            width={bw.toFixed(1)}
            height={h.toFixed(1)}
            rx={1}
            fill={v ? "var(--brand)" : "var(--border)"}
          />
        );
      })}
    </svg>
  );
}

/** One sentence that says what the numbers mean, under a card's data. */
export function Verdict({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "caution";
}) {
  return (
    <p
      className={cn(
        "mt-4 border-l-2 pl-3 text-[13px] leading-relaxed text-foreground",
        tone === "positive" ? "border-positive" : tone === "caution" ? "border-caution" : "border-border",
      )}
    >
      {children}
    </p>
  );
}

/** Shown when a query failed, instead of pretending the site had no traffic. */
export function ErrorCard({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-2.5 rounded-[4px] border border-critical/30 bg-critical-soft px-4 py-3 text-[13px]"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden />
      <div>
        <p className="font-semibold text-critical">The latest numbers did not load</p>
        <p className="mt-0.5 text-foreground">{message} Reload the page in a moment. If it keeps happening, write to us.</p>
      </div>
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
