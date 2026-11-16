import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Hint } from "@/components/stats/hint";
import { cn } from "@/lib/utils";
import type { InsightTone } from "@/services/insights";
import type { Platform } from "@/services/visibility";

/**
 * The panel's surface language: white cards on a soft ground, one radius,
 * one shadow, generous type. Everything a page is built from lives here so
 * the modules read as one product.
 */

export const ASSISTANT_COLOR: Record<Platform, string> = {
  chatgpt: "var(--assistant-chatgpt)",
  google_aio: "var(--assistant-google)",
  perplexity: "var(--assistant-perplexity)",
  other: "var(--assistant-other)",
};

export const TONE: Record<InsightTone, { label: string; chip: string; bar: string; text: string }> = {
  good: { label: "Win", chip: "bg-positive-soft text-positive", bar: "bg-positive", text: "text-positive" },
  bad: { label: "Loss", chip: "bg-critical-soft text-critical", bar: "bg-critical", text: "text-critical" },
  watch: { label: "Watch", chip: "bg-caution-soft text-caution", bar: "bg-caution", text: "text-caution" },
  neutral: { label: "Steady", chip: "bg-muted text-muted-foreground", bar: "bg-border", text: "text-muted-foreground" },
};

/** "0%" must mean zero; a tiny nonzero share reads as "<1%" instead. */
export function pct(rate: number): string {
  if (rate > 0 && rate < 0.005) return "<1%";
  return `${Math.round(rate * 100)}%`;
}

export function Surface({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn("rounded-xl border border-border/80 bg-card shadow-card", className)}>
      {children}
    </div>
  );
}

/** A section of a page: what the block answers, in the owner's words. */
export function SectionHead({
  title,
  sub,
  hint,
  action,
  id,
  className,
}: {
  title: string;
  sub?: ReactNode;
  hint?: string;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div id={id} className={cn("mt-10 mb-3.5 flex scroll-mt-20 flex-wrap items-end justify-between gap-x-6 gap-y-2", className)}>
      <div className="min-w-0 max-w-3xl">
        <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
          {title}
          {hint && <Hint text={hint} />}
        </h2>
        {sub && <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="shrink-0 text-[13px]">{action}</div>}
    </div>
  );
}

/** The small caps label that sits on top of a card. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)}>{children}</p>;
}

export function Chip({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium", className)}>
      {children}
    </span>
  );
}

/** A coloured dot and the assistant's name: the same pairing on every page. */
export function AssistantTag({ platform, name, className }: { platform: Platform; name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", className)}>
      <i aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: ASSISTANT_COLOR[platform] }} />
      {name}
    </span>
  );
}

/** A change in percentage points with its direction. */
export function Delta({ value, unit = " pts", className }: { value: number; unit?: string; className?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "text-numeric inline-flex items-center gap-0.5 text-[12.5px] font-medium",
        value > 0 ? "text-positive" : value < 0 ? "text-critical" : "text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {value > 0 ? "+" : ""}
      {value}
      {unit}
    </span>
  );
}

export type MoveVerdict = "up" | "down" | "noise" | "first";

const VERDICT: Record<MoveVerdict, { label: string; chip: string; title: string }> = {
  up: { label: "Real rise", chip: "bg-positive-soft text-positive", title: "More than chance between two measurements explains." },
  down: { label: "Real fall", chip: "bg-critical-soft text-critical", title: "More than chance between two measurements explains." },
  noise: { label: "Within noise", chip: "bg-muted text-muted-foreground", title: "Two measurements of an unchanged venue differ this much by chance." },
  first: { label: "First measurement", chip: "bg-muted text-muted-foreground", title: "Nothing made the same way to compare with yet." },
};

/** Whether a movement is real, said in two words. */
export function VerdictChip({ verdict }: { verdict: MoveVerdict }) {
  const v = VERDICT[verdict];
  return (
    <Chip className={v.chip} title={v.title}>
      {v.label}
    </Chip>
  );
}

/**
 * A rate with the range it plausibly lies in: the dot is the measured value,
 * the band is where the true value could be given the sample. Wide band,
 * small sample.
 */
export function RangeBar({
  value,
  low,
  high,
  color = "var(--brand)",
  className,
}: {
  value: number;
  low: number;
  high: number;
  color?: string;
  className?: string;
}) {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return (
    <span
      role="img"
      aria-label={`${pct(value)}, plausibly between ${pct(low)} and ${pct(high)}`}
      className={cn("relative block h-2 w-full rounded-full bg-muted", className)}
    >
      <span
        className="absolute inset-y-0 rounded-full opacity-30"
        style={{ left: `${clamp(low) * 100}%`, width: `${(clamp(high) - clamp(low)) * 100}%`, background: color }}
      />
      <span
        className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
        style={{ left: `${clamp(value) * 100}%`, background: color }}
      />
    </span>
  );
}

/** One headline number. */
export function StatTile({
  label,
  value,
  hint,
  sub,
  aside,
  accent,
  className,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: string;
  /** One line under the value. */
  sub?: ReactNode;
  /** Sits next to the value: a delta, a verdict. */
  aside?: ReactNode;
  /** Brand coloured value: the number the page is about. */
  accent?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Surface className={cn("flex flex-col px-4 py-4", className)}>
      <p className="text-[12.5px] font-medium text-muted-foreground">
        {label}
        {hint && <Hint text={hint} />}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p className={cn("text-numeric text-[30px] font-semibold leading-none tracking-tight", accent ? "text-brand" : "text-foreground")}>{value}</p>
        {aside}
      </div>
      {sub && <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">{sub}</p>}
      {children}
    </Surface>
  );
}

export function StatGrid({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2",
        cols === 4 ? "xl:grid-cols-4" : cols === 3 ? "lg:grid-cols-3" : "",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A quiet message in place of content that does not exist yet. */
export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Surface className={cn("px-5 py-6", className)}>
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">{children}</p>
    </Surface>
  );
}

/** A thin bar for a share inside a table cell. */
export function MiniBar({ value, max = 1, color = "var(--brand)", className }: { value: number; max?: number; color?: string; className?: string }) {
  return (
    <span className={cn("block h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <i className="block h-full rounded-full" style={{ width: `${Math.round((value / Math.max(max, 1e-9)) * 100)}%`, background: color }} />
    </span>
  );
}
