import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Chip, Surface } from "@/components/panel/ui";
import type { ActionItem, ActionKind } from "@/services/visibility";

const KIND_LABEL: Record<ActionKind, string> = {
  flicker: "Cheap win",
  lost: "Recover",
  guide: "Get listed",
  intent: "Win the type",
  rival_site: "Match a rival",
  citation: "Your site",
};

const KIND_CLASS: Record<ActionKind, string> = {
  flicker: "bg-positive-soft text-positive",
  lost: "bg-critical-soft text-critical",
  guide: "bg-brand-soft text-brand",
  intent: "bg-caution-soft text-caution",
  rival_site: "bg-muted text-muted-foreground",
  citation: "bg-muted text-muted-foreground",
};

/** A link into another AI Visibility view that keeps the assistant on the page. */
function evidenceHref(href: string, query: string): string {
  const [path, hash] = href.split("#");
  return `${path}${query}${hash ? `#${hash}` : ""}`;
}

/**
 * The plan, derived from the measurement: every item carries the numbers
 * that produced it and a way to the view holding the evidence. Ordered by
 * answers at stake, weighted by how winnable the move is.
 */
export function PlanCard({
  actions,
  categoryRuns,
  query = "",
  compact,
}: {
  actions: ActionItem[];
  categoryRuns: number;
  /** `?series=…` to carry into the evidence links. */
  query?: string;
  /** Without the header and the footer, for a summary. */
  compact?: boolean;
}) {
  return (
    <Surface className="flex min-w-0 flex-col overflow-hidden">
      {!compact && (
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-3.5">
          <p className="text-[15px] font-semibold">The plan</p>
          <p className="text-[12.5px] text-muted-foreground">from the latest {categoryRuns} answers, most at stake first</p>
        </div>
      )}
      {actions.length === 0 ? (
        <p className="px-5 py-5 text-[13.5px] text-muted-foreground">
          Nothing to chase: every question type names you reliably and your site is cited. Hold the position and read the next report.
        </p>
      ) : (
        <ol className="divide-y divide-border/70">
          {actions.map((action, index) => (
            <li key={`${action.kind}-${action.title}`} className="flex gap-3.5 px-5 py-4">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12.5px] font-semibold text-brand">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <p className="text-[14.5px] font-semibold leading-snug">{action.title}</p>
                  <Chip className={KIND_CLASS[action.kind]}>{KIND_LABEL[action.kind]}</Chip>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{action.why}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                  <span className="text-numeric text-muted-foreground">{action.affects} answers at stake</span>
                  <Link href={evidenceHref(action.href, query)} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                    Evidence <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {!compact && (
        <p className="mt-auto border-t border-border px-5 py-3 text-[12.5px] text-muted-foreground">
          Done one? Log it below and the next report shows the score before and after it.
        </p>
      )}
    </Surface>
  );
}
