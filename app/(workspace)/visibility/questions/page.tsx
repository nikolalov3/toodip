import type { Metadata } from "next";

import { Chip, Eyebrow, pct, SectionHead, StatGrid, StatTile, Surface } from "@/components/panel/ui";
import { LoadError, MeasurementLine, NoMeasurements } from "@/components/visibility/frame";
import { IntentRows } from "@/components/visibility/intent-rows";
import { cn } from "@/lib/utils";
import type { QuestionStatus } from "@/services/visibility";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "Questions · AI Visibility" };

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

export default async function QuestionsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { overview, profile, canMeasure } = await loadVisibilityPage(searchParams);
  if (overview.error) return <LoadError message={overview.error} />;
  if (!overview.hasData || !overview.current) return <NoMeasurements canMeasure={canMeasure} />;

  const types = overview.intents.filter((i) => !i.isBranded);
  const questions = types.flatMap((i) => i.questions.map((q) => ({ ...q, intent: i.name })));
  const count = (status: QuestionStatus) => questions.filter((q) => q.status === status).length;
  const present = types.filter((i) => i.status === "present").length;
  const flickerTypes = types.filter((i) => i.status === "flicker").length;
  const absentTypes = types.filter((i) => i.status === "none").length;
  const changes = overview.changes?.comparable ? overview.changes : null;
  const branded = overview.intents.filter((i) => i.isBranded);

  return (
    <>
      <MeasurementLine overview={overview} profile={profile} />

      <StatGrid>
        <StatTile
          label="Question types you are present in"
          value={
            <>
              {present}
              <span className="text-[17px] font-medium text-muted-foreground"> of {types.length}</span>
            </>
          }
          accent
          hint="A question type groups the questions that ask for the same thing. Present = named in at least a quarter of that type's answers."
          sub={`${flickerTypes} flickering, ${absentTypes} absent`}
        />
        <StatTile
          label="Reliable questions"
          value={count("reliable")}
          hint="Questions where every repetition named you."
          sub={`of ${questions.length} questions asked`}
        />
        <StatTile
          label="Flickering questions"
          value={<span className={count("flicker") > 0 ? "text-caution" : undefined}>{count("flicker")}</span>}
          hint="Named in some repetitions and not in others. The assistant already considers you there: these are the cheapest answers to win."
          sub="named only some of the time"
        />
        <StatTile
          label="Absent questions"
          value={<span className={count("absent") > 0 ? "text-critical" : undefined}>{count("absent")}</span>}
          hint="Asked more than once and never named you."
          sub="never named"
        />
      </StatGrid>

      {changes && (changes.questionsWon.length > 0 || changes.questionsLost.length > 0 || changes.intents.length > 0) && (
        <>
          <SectionHead title={`What moved since ${changes.previous!.label}`} sub="Questions that flipped between named and absent, and question types that changed status." className="mt-8" />
          <div className="grid gap-3 lg:grid-cols-2">
            <Surface className="p-5">
              <Eyebrow className="text-positive">Won · {changes.questionsWon.length}</Eyebrow>
              {changes.questionsWon.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-muted-foreground">No question started naming you.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {changes.questionsWon.map((row) => (
                    <li key={row.text} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span className="min-w-0">
                        {row.text} <span className="text-[12px] text-muted-foreground">· {row.intent}</span>
                      </span>
                      <span className="text-numeric shrink-0 text-[12.5px] text-muted-foreground">
                        {row.before} → {row.after} of {row.runs}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
            <Surface className="p-5">
              <Eyebrow className="text-critical">Lost · {changes.questionsLost.length}</Eyebrow>
              {changes.questionsLost.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-muted-foreground">No question stopped naming you.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {changes.questionsLost.map((row) => (
                    <li key={row.text} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span className="min-w-0">
                        {row.text} <span className="text-[12px] text-muted-foreground">· {row.intent}</span>
                      </span>
                      <span className="text-numeric shrink-0 text-[12.5px] text-muted-foreground">
                        {row.before} → {row.after} of {row.runs}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            A single question is asked only {overview.current.method.reps} times, so one flip can be chance. A question that stays won or lost in the next report is a
            finding.
          </p>
        </>
      )}

      <SectionHead
        title="Where do you stand, question type by question type?"
        sub={
          overview.demandApplied
            ? "Most worth winning first, weighted by how often people ask Google the same things. Open a row for the customers' actual questions, who owns the type and what the assistant reads when it names the leader."
            : "Most worth winning first. Open a row for the customers' actual questions, who owns the type and what the assistant reads when it names the leader."
        }
        hint="Absent = never named for this type. Flickering = named in fewer than a quarter of the answers. Present = named in at least a quarter. Bars compare your share with the leading rival's."
      />
      <Surface className="overflow-hidden">
        <IntentRows intents={types} />
      </Surface>

      <SectionHead title="Every question, with your result" sub="Sorted from the questions that name you most reliably to the ones that never do." />
      <Surface className="overflow-hidden">
        <ul className="max-h-[560px] divide-y divide-border/60 overflow-y-auto">
          {[...questions]
            .sort((a, b) => b.own / b.runs - a.own / a.runs || a.text.localeCompare(b.text))
            .map((q) => (
              <li key={q.text} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 text-[13.5px]">
                <span className="min-w-0">
                  <span className="block truncate" title={q.text}>
                    {q.text}
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    {q.intent} · {q.language.toUpperCase()}
                  </span>
                </span>
                <span className="text-numeric text-[12.5px] text-muted-foreground">
                  {q.own}/{q.runs} · {pct(q.own / Math.max(q.runs, 1))}
                </span>
                <Chip className={cn(Q_STYLE[q.status])}>{Q_LABEL[q.status]}</Chip>
              </li>
            ))}
        </ul>
      </Surface>

      {branded.length > 0 && (
        <>
          <SectionHead
            title="Questions that name you"
            sub="Asked to see what the assistant says about you by name. They are kept out of every score: being named when the question names you says nothing about being recommended."
          />
          <Surface className="overflow-hidden">
            <IntentRows intents={branded} />
          </Surface>
        </>
      )}
    </>
  );
}
