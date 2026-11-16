"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ASSISTANT_COLOR } from "@/components/panel/ui";
import { cn } from "@/lib/utils";
import type { SeriesSummary } from "@/services/visibility";

/**
 * Which assistant the page describes. One series at a time, because numbers
 * measured on different assistants (or with different models) are never
 * added up; the switcher is how the reader moves between them. Series still
 * being measured come first, older ones (an import, a baseline) sit behind
 * "Earlier measurements".
 */
export function SeriesSwitcher({ series, defaultId }: { series: SeriesSummary[]; defaultId: string | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("series") ?? defaultId;
  if (series.length < 2) return null;

  const hrefFor = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("series", id);
    // A period belongs to the series it was picked in.
    next.delete("period");
    next.delete("rival");
    return `${pathname}?${next.toString()}`;
  };
  const live = series.filter((s) => s.live);
  const earlier = series.filter((s) => !s.live);
  const pill = (s: SeriesSummary) => {
    const active = s.id === selected;
    return (
      <Link
        key={s.id}
        href={hrefFor(s.id)}
        scroll={false}
        aria-current={active ? "true" : undefined}
        title={`${s.label} · ${s.latest.label}`}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active
            ? "border-foreground/15 bg-card font-semibold text-foreground shadow-card"
            : "border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground",
        )}
      >
        <i aria-hidden className="inline-block size-2 rounded-full" style={{ background: ASSISTANT_COLOR[s.platform] }} />
        <span>{s.assistant}</span>
        <span className="text-numeric font-medium text-muted-foreground">{Math.round(s.latest.score * 100)}%</span>
      </Link>
    );
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[12.5px] text-muted-foreground">Assistant</span>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted/70 p-1">
        {(live.length > 0 ? live : series.slice(0, 1)).map(pill)}
      </div>
      {earlier.length > 0 && (
        <details className="group relative">
          <summary
            className={cn(
              "cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-[12.5px] text-muted-foreground hover:text-foreground",
              earlier.some((s) => s.id === selected) && "font-semibold text-foreground",
            )}
          >
            Earlier measurements ({earlier.length})
          </summary>
          <ul className="absolute left-0 top-full z-20 mt-1 w-[min(360px,calc(100vw-48px))] rounded-xl border border-border bg-popover p-1.5 shadow-raised">
            {earlier.map((s) => (
              <li key={s.id}>
                <Link
                  href={hrefFor(s.id)}
                  scroll={false}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[13px] hover:bg-accent",
                    s.id === selected && "bg-accent font-medium",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <i aria-hidden className="inline-block size-2 shrink-0 rounded-full" style={{ background: ASSISTANT_COLOR[s.platform] }} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">
                    {s.latest.label} · {Math.round(s.latest.score * 100)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
