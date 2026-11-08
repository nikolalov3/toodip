import { Card } from "@/components/stats/blocks";
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

/**
 * This month's plan, derived from the measurement: every item carries the
 * numbers that produced it and points at the section holding the evidence.
 * Ordered by answers at stake, weighted by how winnable the move is.
 */
export function PlanCard({ actions, categoryRuns }: { actions: ActionItem[]; categoryRuns: number }) {
  return (
    <Card className="flex h-full min-w-0 flex-col p-0">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">This month&apos;s plan</p>
        <p className="text-[12px] text-muted-foreground">from the latest {categoryRuns} answers</p>
      </div>
      {actions.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted-foreground">
          Nothing to chase: every question type names you reliably and your site is cited. Hold the position and measure again.
        </p>
      ) : (
        <ol className="divide-y divide-border/60">
          {actions.map((action, index) => (
            <li key={`${action.kind}-${action.title}`} className="flex gap-3 px-4 py-3">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-[13.5px] font-semibold">{action.title}</p>
                  <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${KIND_CLASS[action.kind]}`}>
                    {KIND_LABEL[action.kind]}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{action.why}</p>
                <p className="mt-1 text-[12px]">
                  <span className="text-numeric text-muted-foreground">{action.affects} answers at stake</span>
                  <a href={action.href} className="ml-3 text-brand hover:underline">
                    Evidence ↓
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-auto border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
        Done one?{" "}
        <a href="#changes" className="text-brand hover:underline">
          Log it
        </a>{" "}
        and the next measurement shows the score before and after.
      </p>
    </Card>
  );
}
