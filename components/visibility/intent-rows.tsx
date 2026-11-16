import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { IntentStatus, IntentSummary, QuestionStatus } from "@/services/visibility";

const STATUS_STYLE: Record<IntentStatus, string> = {
  none: "bg-critical-soft text-critical",
  flicker: "bg-caution-soft text-caution",
  present: "bg-positive-soft text-positive",
};

const STATUS_LABEL: Record<IntentStatus, string> = { none: "Absent", flicker: "Flickering", present: "Present" };

const Q_STYLE: Record<QuestionStatus, string> = {
  reliable: "bg-positive-soft text-positive",
  flicker: "bg-caution-soft text-caution",
  absent: "bg-critical-soft text-critical",
  single: "bg-muted text-muted-foreground",
};

const Q_LABEL: Record<QuestionStatus, string> = {
  reliable: "Reliable",
  flicker: "Flickering",
  absent: "Absent",
  single: "Asked once",
};

function pct(rate: number): string {
  if (rate > 0 && rate < 0.005) return "<1%";
  return `${Math.round(rate * 100)}%`;
}

/**
 * One expandable row per question type, ordered by what is most worth
 * winning. Closed: status, your result against the leader. Open: the actual
 * customer questions with your result on each, who owns the type, and what
 * the assistants read when they name the leader. No JavaScript: details and
 * summary do the work, so it renders on the server and prints.
 */
export function IntentRows({ intents }: { intents: IntentSummary[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {intents.map((intent) => {
        const ownShare = intent.ownMentions / Math.max(intent.runs, 1);
        const leaderShare = intent.leader?.share ?? 0;
        const max = Math.max(ownShare, leaderShare, 0.01);
        return (
          <li key={intent.name} className={cn(intent.isBranded && "text-muted-foreground")}>
            <details className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px] hover:bg-muted/40 sm:grid-cols-[88px_minmax(0,1.2fr)_minmax(120px,1fr)_minmax(0,1fr)_16px]">
                <span className={cn("rounded-md px-2 py-0.5 text-center text-[11px] font-medium", STATUS_STYLE[intent.status])}>
                  {STATUS_LABEL[intent.status]}
                </span>
                <span className="min-w-0 font-medium">
                  <span className="truncate">{intent.name}</span>
                  <span className="ml-2 text-[11px] uppercase text-muted-foreground">{intent.language}</span>
                  {intent.isBranded && <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">branded</span>}
                  <span className="ml-2 text-[12px] text-muted-foreground">
                    {intent.questions.length} {intent.questions.length === 1 ? "question" : "questions"} · {intent.runs} answers
                  </span>
                </span>
                <span className="hidden flex-col gap-1 sm:flex" aria-label={`You ${pct(ownShare)}, leader ${pct(leaderShare)}`}>
                  <span className="flex items-center gap-2 text-[11px]">
                    <span className="w-10 shrink-0 text-muted-foreground">you</span>
                    <span className="h-[5px] flex-1 overflow-hidden rounded-[2px] bg-muted">
                      <i className="block h-full rounded-[2px] bg-brand" style={{ width: `${Math.round((ownShare / max) * 100)}%` }} />
                    </span>
                    <span className="text-numeric w-9 text-right">{pct(ownShare)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="w-10 shrink-0 truncate" title={intent.leader?.name}>
                      {intent.leader ? "leader" : "no rival"}
                    </span>
                    <span className="h-[5px] flex-1 overflow-hidden rounded-[2px] bg-muted">
                      <i className="block h-full rounded-[2px] bg-chart-5" style={{ width: `${Math.round((leaderShare / max) * 100)}%` }} />
                    </span>
                    <span className="text-numeric w-9 text-right">{intent.leader ? pct(leaderShare) : "—"}</span>
                  </span>
                </span>
                <span className="col-span-2 truncate text-[12.5px] text-muted-foreground sm:col-span-1">
                  {intent.leader ? (
                    <>
                      leads: <span className="text-foreground">{intent.leader.name}</span>
                    </>
                  ) : (
                    "no rival dominates"
                  )}
                  <span className="sm:hidden"> · you {intent.ownMentions}/{intent.runs}</span>
                </span>
                <ChevronDown className="hidden size-4 text-muted-foreground transition-transform group-open:rotate-180 sm:block" aria-hidden="true" />
              </summary>
              <div className="grid gap-4 border-t border-border/60 bg-muted/20 px-4 py-3 md:grid-cols-[1.3fr_1fr]">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">The questions, with your result</p>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {intent.questions.map((q) => (
                      <li key={q.text} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-[13px]">
                        <span className="truncate" title={q.text}>
                          {q.text}
                        </span>
                        <span className="text-numeric text-[12px] text-muted-foreground">
                          {q.own}/{q.runs}
                        </span>
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-medium", Q_STYLE[q.status])}>{Q_LABEL[q.status]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Who owns it</p>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      {intent.owners.length === 0
                        ? "No venue named."
                        : intent.owners.map((o) => `${o.isOwn ? "you" : o.name} ${pct(o.share)}`).join(" · ")}
                    </p>
                  </div>
                  {intent.leader && (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Read when naming {intent.leader.name}</p>
                      <p className="mt-1 text-[12.5px] text-muted-foreground">
                        {intent.leader.sources.length === 0
                          ? "No source cited at their item: named from memory."
                          : intent.leader.sources.map((s) => `${s.domain} (${s.count})`).join(" · ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
