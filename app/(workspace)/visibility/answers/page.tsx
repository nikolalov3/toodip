import type { Metadata } from "next";

import { Chip, EmptyNote, SectionHead, Surface } from "@/components/panel/ui";
import { AnswerText } from "@/components/visibility/answer-text";
import { LoadError, MeasurementLine, NoMeasurements } from "@/components/visibility/frame";
import { SaysCard } from "@/components/visibility/says-card";
import { cn } from "@/lib/utils";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "Answers · AI Visibility" };

export default async function AnswersPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { overview, profile, canMeasure } = await loadVisibilityPage(searchParams);
  if (overview.error) return <LoadError message={overview.error} />;
  if (!overview.hasData || !overview.current) return <NoMeasurements canMeasure={canMeasure} />;

  const named = overview.recentRuns.filter((run) => run.mentionedOwn).length;

  return (
    <>
      <MeasurementLine overview={overview} profile={profile} />

      <SectionHead
        title="What does the assistant say about you?"
        sub="The sentences that name you, and the words that travel with your name against the words that travel with your strongest rival's."
        hint="Quotes come from this measurement's answers with everything but the assistant's own words removed. Word counts are per answer, across every sentence naming the venue; five letters or more, common words dropped."
        className="mt-0"
      />
      <SaysCard venueName={profile.name} quotes={overview.quotes} descriptors={overview.descriptors} rival={overview.rivalDescriptors} />

      <SectionHead
        title="The answers themselves"
        sub={`${overview.recentRuns.length} of ${overview.recentRunsTotal} answers from this measurement, the ${named} that name you first. Open one to read it as the customer would.`}
        hint="Every number in the panel is counted from these stored answers. Grey chips inside an answer are the sources the assistant cited at that spot."
      />
      {overview.recentRuns.length === 0 ? (
        <EmptyNote>No answers stored for this measurement.</EmptyNote>
      ) : (
        <Surface className="overflow-hidden">
          <ul className="divide-y divide-border/60">
            {overview.recentRuns.map((run) => (
              <li key={run.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-3 hover:bg-muted/40">
                    <Chip className={cn("mt-0.5 shrink-0", run.mentionedOwn ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground")}>
                      {run.mentionedOwn ? "names you" : "absent"}
                    </Chip>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium group-open:text-brand">{run.prompt}</span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                        {run.intent}
                        {run.mentions.length > 0 ? ` · names ${run.mentions.slice(0, 5).join(", ")}${run.mentions.length > 5 ? ` and ${run.mentions.length - 5} more` : ""}` : ""}
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-border/60 bg-muted/25 px-5 py-4">
                    {run.responseText ? <AnswerText text={run.responseText} /> : <p className="text-[13px] text-muted-foreground">No text recorded for this answer.</p>}
                    {run.citations.length > 0 && (
                      <p className="mt-3 border-t border-border/60 pt-3 text-[12.5px] text-muted-foreground">
                        <span className="font-medium text-foreground">Sources cited:</span> {run.citations.join(", ")}
                      </p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <SectionHead title="Every question asked" sub="The whole battery, with how often each question named you in this measurement." />
      <Surface className="overflow-hidden">
        <ul className="max-h-[520px] divide-y divide-border/60 overflow-y-auto">
          {overview.prompts.map((prompt) => (
            <li key={prompt.text} className="flex items-baseline justify-between gap-4 px-5 py-2.5 text-[13.5px]">
              <span className="min-w-0">
                <span className="block">{prompt.text}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {prompt.intent} · {prompt.language.toUpperCase()}
                  {prompt.isBranded && <span className="ml-1.5 text-caution">branded, kept out of every score</span>}
                </span>
              </span>
              <span className={cn("text-numeric shrink-0 text-[12.5px]", prompt.ownMentions > 0 ? "font-semibold text-positive" : "text-muted-foreground")}>
                {prompt.ownMentions}/{prompt.runs} named
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </>
  );
}
