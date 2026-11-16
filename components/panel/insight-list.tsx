import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Chip, Surface, TONE } from "@/components/panel/ui";
import { cn } from "@/lib/utils";
import { AREA_LABEL, type Insight } from "@/services/insights";

/**
 * The findings of a report, most important first. Each one is a sentence
 * with its numbers, what stands behind it, and a way to the evidence. The
 * coloured edge says how to read it: a win, a loss, something to watch, or
 * simply where things stand.
 */
export function InsightList({ insights, limit, columns = 1 }: { insights: Insight[]; limit?: number; columns?: 1 | 2 }) {
  const shown = limit ? insights.slice(0, limit) : insights;
  if (shown.length === 0) return null;
  return (
    <ul className={cn("grid gap-3", columns === 2 && "lg:grid-cols-2")}>
      {shown.map((insight) => {
        const tone = TONE[insight.tone];
        return (
          <li key={insight.id}>
            <Surface className="relative h-full overflow-hidden py-4 pl-5 pr-4">
              <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />
              <div className="flex flex-wrap items-center gap-2">
                <Chip className={tone.chip}>{tone.label}</Chip>
                <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{AREA_LABEL[insight.area]}</span>
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-foreground">{insight.title}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{insight.detail}</p>
              {insight.href && (
                <Link href={insight.href} className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
                  See the evidence
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </Surface>
          </li>
        );
      })}
    </ul>
  );
}
