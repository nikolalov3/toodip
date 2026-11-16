import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InsightList } from "@/components/panel/insight-list";
import { TrendLines } from "@/components/panel/trend-lines";
import {
  ASSISTANT_COLOR,
  Delta,
  Eyebrow,
  pct,
  RangeBar,
  SectionHead,
  StatGrid,
  StatTile,
  Surface,
  VerdictChip,
  type MoveVerdict,
} from "@/components/panel/ui";
import { AnalystNoteCard } from "@/components/visibility/analyst-note";
import { ChangesCard } from "@/components/visibility/changes-card";
import { LoadError, MeasurementLine } from "@/components/visibility/frame";
import { PlanCard } from "@/components/visibility/plan-card";
import { buttonVariants } from "@/components/ui/button";
import { periodKind } from "@/lib/periods";
import { movement, rangeLabel, wilson } from "@/lib/stats-math";
import { getUserClient } from "@/lib/supabase/server";
import { latestAnalystNote } from "@/services/analyst";
import { insightsFor } from "@/services/insights";
import { ASSISTANT_NAME } from "@/services/visibility";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "AI Visibility" };

function GettingStarted({ canMeasure }: { canMeasure: boolean }) {
  const steps = [
    {
      title: "Save your question set",
      body: "A proposed list of the questions your customers ask AI assistants. Review, edit, import your own, then save.",
    },
    {
      title: "Run the first measurement",
      body: "Every question is asked with web search on, twice, and the answers are kept as evidence. A few minutes.",
    },
    {
      title: "Read the next report",
      body: "One measurement is a snapshot; two are a trend. Fix what the results point to and the next report shows whether it worked.",
    },
  ];
  return (
    <Surface className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-[15px] font-semibold">Getting started</p>
          <p className="text-[13px] text-muted-foreground">
            {canMeasure ? "Three steps to your first visibility score." : "How a workspace gets its first visibility score."}
          </p>
        </div>
        {canMeasure && (
          <Link href="/visibility/setup" className={buttonVariants({ size: "sm" })}>
            Set up the questions
          </Link>
        )}
      </div>
      <ol className="grid gap-px bg-border sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="bg-card p-5">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[12.5px] font-semibold text-brand">{index + 1}</span>
            <p className="mt-3 text-[14.5px] font-semibold">{step.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Surface>
  );
}

export default async function VisibilitySummaryPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { session, profile, overview, query, canMeasure, isAdmin } = await loadVisibilityPage(searchParams);

  if (overview.error) return <LoadError message={overview.error} />;
  if (!overview.hasData || !overview.current) return <GettingStarted canMeasure={canMeasure} />;

  const current = overview.current;
  const m = overview.metrics;
  const n = overview.categoryRuns;
  const k = overview.categoryOwnMentions;
  const range = wilson(k, n);
  const changes = overview.changes;
  const previous = changes?.comparable ? changes.previous : null;
  const verdict: MoveVerdict = previous ? movement(previous.ownMentions, previous.categoryRuns, k, n) : "first";
  const color = ASSISTANT_COLOR[current.platform];
  const assistant = ASSISTANT_NAME[current.platform];
  const leader = overview.leaderboard.find((row) => !row.isOwn) ?? null;
  const insights = insightsFor({ assistants: [overview] });
  const note = await latestAnalystNote(await getUserClient(), session.tenantId, current.period, current.method.key);

  return (
    <>
      <MeasurementLine overview={overview} profile={profile} />

      <StatGrid>
        <StatTile
          label="Named in answers"
          value={pct(m.brandMentionRate)}
          accent
          hint="Share of answers in this measurement that name you. Questions that name you themselves are left out. The band under the number is the range the true rate plausibly lies in: asked again, the assistant answers a little differently."
          aside={
            <>
              {previous && changes?.scoreDelta !== null && changes?.scoreDelta !== undefined && <Delta value={changes.scoreDelta} />}
              <VerdictChip verdict={verdict} />
            </>
          }
          sub={
            <>
              <span className="text-numeric">{k}</span> of <span className="text-numeric">{n}</span> answers · plausibly {rangeLabel(range)}
            </>
          }
        >
          <RangeBar value={m.brandMentionRate} low={range.low} high={range.high} color={color} className="mt-3" />
        </StatTile>
        <StatTile
          label="Share of voice"
          value={pct(m.shareOfVoice)}
          hint="Your mentions as a share of every venue mention in the answers. Moves when rivals gain or lose, not only when you do."
          aside={previous && changes?.sovDelta !== null && changes?.sovDelta !== undefined ? <Delta value={changes.sovDelta} /> : undefined}
          sub={
            <>
              of <span className="text-numeric">{overview.totalAppearances}</span> venue mentions across <span className="text-numeric">{m.sovBrands}</span> venues
            </>
          }
        />
        <StatTile
          label="Rank"
          value={
            m.sovRank ? (
              <>
                #{m.sovRank}
                <span className="text-[17px] font-medium text-muted-foreground"> of {m.sovBrands}</span>
              </>
            ) : (
              "—"
            )
          }
          hint="Your position among every venue the assistant names for the same questions, by how many answers name each."
          sub={
            leader
              ? m.sovRank === 1
                ? `Next: ${leader.name}, ${pct(leader.share)} of answers`
                : `Leader: ${leader.name}, ${pct(leader.share)} of answers`
              : "No other venue named"
          }
        />
        <StatTile
          label="Own site cited"
          value={<span className={m.citationRate > 0 ? "text-positive" : "text-critical"}>{pct(m.citationRate)}</span>}
          hint="Share of answers citing your website or profiles as a source. Assistants recommend from pages they can quote."
          sub={
            m.citationRate > 0
              ? m.ownCitedSources.slice(0, 2).join(", ")
              : overview.ownSources.length > 0
                ? `Quoted instead: ${overview.ownSources.slice(0, 2).map((s) => s.domain).join(", ")}`
                : "Named from memory, nothing to quote"
          }
        />
      </StatGrid>

      <SectionHead
        title={periodKind(current.period) === "week" ? "What this week's measurement says" : "What this measurement says"}
        sub={`Worked out by rules from the ${n} ${assistant} answers: every comparison is first checked against chance.`}
        action={
          <Link href="/report" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            The full report, all assistants and traffic <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
        className="mt-8"
      />
      <InsightList insights={insights} limit={4} columns={2} />

      {(note || isAdmin) && (
        <div className="mt-3">
          <AnalystNoteCard note={note} canWrite={isAdmin} periodLabel={current.label} seriesId={current.seriesId} />
        </div>
      )}

      <SectionHead
        title="Is it moving?"
        sub="One point per measurement. The band is the range the true value plausibly lies in; a move inside the band is noise."
        hint="Measurements made another way (another assistant, another model, an import) are drawn as thin dashed lines and never compared with the one on this page."
      />
      <div className="flex min-w-0 flex-col gap-3">
        <Surface className="min-w-0 p-5">
          <Eyebrow>Named in answers over time</Eyebrow>
          <div className="mt-3">
            <TrendLines points={overview.timeline} selectedSeriesId={current.seriesId} />
          </div>
        </Surface>
        <div className="min-w-0">
          {changes ? (
            <ChangesCard changes={changes} currentLabel={current.label} currentRuns={current.categoryRuns} method={current.method} />
          ) : (
            <Surface className="h-full p-5">
              <Eyebrow>Since the last measurement</Eyebrow>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                This is the first measurement: {pct(m.brandMentionRate)} in {current.label} is your baseline. The next report draws the comparison here.
              </p>
            </Surface>
          )}
        </div>
      </div>

      <SectionHead
        title="What to do first"
        sub="The moves with the most answers at stake, from this measurement."
        action={
          <Link href={`/visibility/actions${query}`} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            The whole plan and the change log <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      <PlanCard actions={overview.actions.slice(0, 3)} categoryRuns={current.categoryRuns} query={query} compact />
    </>
  );
}
