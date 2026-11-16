import type { Metadata } from "next";

import { Chip, Delta, pct, SectionHead, Surface } from "@/components/panel/ui";
import { LoadError, MeasurementLine, NoMeasurements } from "@/components/visibility/frame";
import { LogChangeForm } from "@/components/visibility/log-change-form";
import { PlanCard } from "@/components/visibility/plan-card";
import { formatDate } from "@/lib/format";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "Actions · AI Visibility" };

const KIND_LABELS: Record<string, string> = {
  record_update: "Google record",
  review_reply: "Review reply",
  site_change: "Website",
  guide_entry: "Guide entry",
  social_post: "Social",
  other: "Other",
};

export default async function ActionsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { overview, profile, query, canMeasure } = await loadVisibilityPage(searchParams);
  if (overview.error) return <LoadError message={overview.error} />;
  if (!overview.hasData || !overview.current) return <NoMeasurements canMeasure={canMeasure} />;

  return (
    <>
      <MeasurementLine overview={overview} profile={profile} />

      <SectionHead
        title="What to do, most answers at stake first"
        sub="Every item is derived from the measurement: the numbers that produced it are next to it, and the evidence is one click away."
        hint="Ordered by the answers a move would touch, weighted by how winnable it is: a question that already names you sometimes is cheaper to win than a type you are absent from."
        className="mt-0"
      />
      <PlanCard actions={overview.actions} categoryRuns={overview.current.categoryRuns} query={query} />

      <SectionHead
        id="changes"
        title="What have you changed, and did it work?"
        sub="Log every fix with its date. The next report puts the score before and after it side by side, measured the same way."
        hint="Before = the last measurement finished before the change. After = the first measurement started after it. Only measurements of the assistant on this page count, so the two numbers are comparable."
      />
      <Surface className="overflow-hidden">
        <div className="border-b border-border">
          <LogChangeForm />
        </div>
        {overview.interventions.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13.5px] text-muted-foreground">Nothing logged yet. The first change you log starts the record.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {overview.interventions.map((item) => {
              const delta = item.before && item.after ? Math.round(item.after.score * 100) - Math.round(item.before.score * 100) : null;
              return (
                <li key={item.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                      <Chip className="bg-muted text-foreground">{KIND_LABELS[item.kind] ?? item.kind}</Chip>
                      <span>{formatDate(`${item.performedOn}T00:00:00.000Z`)}</span>
                    </div>
                    <p className="mt-1.5 text-[14px] leading-relaxed">{item.description}</p>
                  </div>
                  <div className="shrink-0 text-[12.5px] text-muted-foreground sm:text-right">
                    {item.before ? (
                      <p>
                        before <span className="text-numeric font-semibold text-foreground">{pct(item.before.score)}</span> <span className="text-[12px]">({item.before.label})</span>
                      </p>
                    ) : (
                      <p>no comparable measurement before</p>
                    )}
                    {item.after ? (
                      <p className="mt-0.5">
                        after <span className="text-numeric font-semibold text-foreground">{pct(item.after.score)}</span> <span className="text-[12px]">({item.after.label})</span>
                        {delta !== null && <Delta value={delta} className="ml-2" />}
                      </p>
                    ) : (
                      <p className="mt-0.5">not measured since</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Surface>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        A score after a change is one measurement. Whether the difference is more than chance is on the Summary tab, next to the trend.
      </p>
    </>
  );
}
