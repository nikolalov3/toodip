import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Surface } from "@/components/panel/ui";
import { cn } from "@/lib/utils";
import type { ChangeSummary, IntentStatus, MethodMeta } from "@/services/visibility";

const STATUS_LABEL: Record<IntentStatus, string> = { none: "Absent", flicker: "Flickering", present: "Present" };
const STATUS_CLASS: Record<IntentStatus, string> = {
  none: "text-critical",
  flicker: "text-caution",
  present: "text-positive",
};

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function Delta({ value, suffix = " pts" }: { value: number; suffix?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[12px] font-medium",
        value > 0 ? "text-positive" : value < 0 ? "text-critical" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function Column({ title, children, empty }: { title: string; children: React.ReactNode[]; empty: string }) {
  const items = children.filter(Boolean);
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-1.5 flex min-w-0 flex-col gap-1 text-[13px]">{items}</ul>
      )}
    </div>
  );
}

/**
 * What moved since the previous measurement made the same way. Everything on
 * the card compares like with like: when the previous measurement used another
 * model, the card says so and shows no delta at all.
 */
export function ChangesCard({
  changes,
  currentLabel,
  currentRuns,
  method,
}: {
  changes: ChangeSummary;
  currentLabel: string;
  currentRuns: number;
  method: MethodMeta;
}) {
  if (!changes.comparable) {
    return (
      <Surface className="h-full p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Since the last measurement</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          {changes.otherMethodPrevious
            ? `The previous measurement (${changes.otherMethodPrevious.label}) was made with ${changes.otherMethodPrevious.method}, this one with ${method.label}. Numbers from different methods are not compared. The next measurement made this way draws the comparison here.`
            : "No earlier measurement made the same way yet. The next one draws the comparison here."}
        </p>
      </Surface>
    );
  }

  const prev = changes.previous!;
  const more = (n: number, shown: number) =>
    n > shown ? (
      <li key="more" className="text-[12px] text-muted-foreground">
        and {n - shown} more
      </li>
    ) : null;
  const SHOW = 4;

  const quiet =
    changes.intents.length === 0 &&
    changes.brands.filter((b) => !b.isOwn).length === 0 &&
    changes.questionsWon.length === 0 &&
    changes.questionsLost.length === 0 &&
    changes.newSources.length === 0 &&
    changes.goneSources.length === 0;

  return (
    <Surface className="h-full p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Since {prev.label}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {method.label}, ×{method.reps} per question · {prev.categoryRuns} → {currentRuns} answers · now {currentLabel}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border px-3 py-2.5">
          <p className="text-[12px] text-muted-foreground">Named in answers</p>
          <p className="text-numeric mt-0.5 text-[20px] font-semibold leading-none tracking-tight">
            {pct(changes.scoreBefore ?? 0)} <span className="text-muted-foreground">→</span>{" "}
            {pct((changes.scoreBefore ?? 0) + (changes.scoreDelta ?? 0) / 100)}
            <span className="ml-2 align-middle">
              <Delta value={changes.scoreDelta ?? 0} />
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2.5">
          <p className="text-[12px] text-muted-foreground">Share of voice</p>
          <p className="text-numeric mt-0.5 text-[20px] font-semibold leading-none tracking-tight">
            {pct(changes.sovBefore ?? 0)} <span className="text-muted-foreground">→</span>{" "}
            {pct((changes.sovBefore ?? 0) + (changes.sovDelta ?? 0) / 100)}
            <span className="ml-2 align-middle">
              <Delta value={changes.sovDelta ?? 0} />
            </span>
          </p>
        </div>
      </div>

      {quiet ? (
        <p className="mt-4 text-[13px] text-muted-foreground">
          No movement beyond the noise between two repetitions: the same question types, rivals and sources as last time.
        </p>
      ) : (
        <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-3">
          <Column title="Question types that moved" empty="Every question type kept its status.">
            {[
              ...changes.intents.slice(0, SHOW).map((row) => (
                <li key={row.name} className="flex min-w-0 items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate" title={row.name}>
                    {row.name}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[12px]">
                    <span className={STATUS_CLASS[row.before]}>{STATUS_LABEL[row.before]}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className={STATUS_CLASS[row.after]}>{STATUS_LABEL[row.after]}</span>
                  </span>
                </li>
              )),
              more(changes.intents.length, SHOW),
            ]}
          </Column>

          <Column title="Rivals moving" empty="No rival moved more than a tenth of the answers.">
            {[
              ...changes.brands
                .filter((b) => !b.isOwn)
                .slice(0, SHOW)
                .map((row) => (
                  <li key={row.name} className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate" title={row.name}>
                      {row.name}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-numeric text-[12px] text-muted-foreground">
                      {pct(row.before)} → {pct(row.after)} <Delta value={Math.round(row.delta * 100)} suffix="" />
                    </span>
                  </li>
                )),
              more(changes.brands.filter((b) => !b.isOwn).length, SHOW),
            ]}
          </Column>

          <Column title="Questions won and lost" empty="No question flipped between named and absent.">
            {[
              ...changes.questionsWon.slice(0, SHOW).map((row) => (
                <li key={`w-${row.text}`} className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 text-[11px] font-medium uppercase text-positive">won</span>
                  <span className="min-w-0 truncate" title={row.text}>
                    {row.text}
                  </span>
                  <span className="ml-auto shrink-0 text-numeric text-[12px] text-muted-foreground">
                    {row.before}→{row.after}/{row.runs}
                  </span>
                </li>
              )),
              ...changes.questionsLost.slice(0, SHOW).map((row) => (
                <li key={`l-${row.text}`} className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 text-[11px] font-medium uppercase text-critical">lost</span>
                  <span className="min-w-0 truncate" title={row.text}>
                    {row.text}
                  </span>
                  <span className="ml-auto shrink-0 text-numeric text-[12px] text-muted-foreground">
                    {row.before}→{row.after}/{row.runs}
                  </span>
                </li>
              )),
              more(changes.questionsWon.length + changes.questionsLost.length, SHOW * 2),
            ]}
          </Column>
        </div>
      )}

      {(changes.backingBefore.length > 0 || changes.backingAfter.length > 0) && (
        <p className="mt-4 text-[13px]">
          <span className="font-medium">Behind your mentions:</span>{" "}
          <span className="text-muted-foreground">
            {changes.backingBefore.length > 0 ? changes.backingBefore.map((s) => `${s.domain} (${s.count})`).join(", ") : "nothing cited at your items"}
          </span>{" "}
          <span className="text-muted-foreground">→</span>{" "}
          {changes.backingAfter.length > 0 ? changes.backingAfter.map((s) => `${s.domain} (${s.count})`).join(", ") : "nothing cited at your items"}
          <span className="ml-1.5 text-[12px] text-muted-foreground">(footnotes at the items naming you, then and now)</span>
        </p>
      )}

      {(changes.newSources.length > 0 || changes.goneSources.length > 0) && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {changes.newSources.length > 0 && (
            <>
              <span className="font-medium text-foreground">New sources the assistants read:</span>{" "}
              {changes.newSources.map((s) => `${s.domain} (${s.count})`).join(", ")}.{" "}
            </>
          )}
          {changes.goneSources.length > 0 && (
            <>
              <span className="font-medium text-foreground">No longer cited:</span>{" "}
              {changes.goneSources.map((s) => `${s.domain} (${s.count})`).join(", ")}.
            </>
          )}
        </p>
      )}
    </Surface>
  );
}
