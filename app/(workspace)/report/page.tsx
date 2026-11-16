import { ArrowRight, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, Panel } from "@/components/common/surfaces";
import { AssistantMatrix } from "@/components/panel/assistant-matrix";
import { InsightList } from "@/components/panel/insight-list";
import { PeriodPicker } from "@/components/panel/period-picker";
import {
  ASSISTANT_COLOR,
  AssistantTag,
  Chip,
  Delta,
  Eyebrow,
  pct,
  RangeBar,
  SectionHead,
  StatTile,
  Surface,
  TONE,
  VerdictChip,
  type MoveVerdict,
} from "@/components/panel/ui";
import { Bars } from "@/components/stats/blocks";
import { buttonVariants } from "@/components/ui/button";
import { AnalystNoteCard } from "@/components/visibility/analyst-note";
import { LoadError, ProgressStrip } from "@/components/visibility/frame";
import { PlanCard } from "@/components/visibility/plan-card";
import { canEditSettings, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { periodKind, periodPhrase, periodStart } from "@/lib/periods";
import { countMovement, movement, rangeLabel, wilson } from "@/lib/stats-math";
import { getUserClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { latestAnalystNote } from "@/services/analyst";
import { getBillingSnapshot } from "@/services/billing";
import { insightsFor, verdictOf } from "@/services/insights";
import { getStatsSnapshot, loadWeekTraffic, type WeekTraffic } from "@/services/stats";
import { ASSISTANT_NAME, getReportOverviews, type VisibilityOverview } from "@/services/visibility";

export const metadata: Metadata = { title: "Report" };

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** One assistant's headline number, with its range and whether it really moved. */
function AssistantTile({ overview }: { overview: VisibilityOverview }) {
  const current = overview.current!;
  const n = overview.categoryRuns;
  const k = overview.categoryOwnMentions;
  const range = wilson(k, n);
  const previous = overview.changes?.comparable ? overview.changes.previous : null;
  const verdict: MoveVerdict = previous ? movement(previous.ownMentions, previous.categoryRuns, k, n) : "first";
  const delta = overview.changes?.scoreDelta;
  return (
    <StatTile
      label={<AssistantTag platform={current.platform} name={ASSISTANT_NAME[current.platform]} className="text-[14px] text-foreground" />}
      value={pct(overview.metrics.brandMentionRate)}
      aside={
        <>
          {previous && delta !== null && delta !== undefined && <Delta value={delta} />}
          <VerdictChip verdict={verdict} />
        </>
      }
      sub={
        <>
          named in <span className="text-numeric">{k}</span> of <span className="text-numeric">{n}</span> answers · plausibly {rangeLabel(range)}
          {previous ? ` · ${pct(overview.changes?.scoreBefore ?? 0)} ${periodPhrase(previous.period)}` : ""}
        </>
      }
    >
      <RangeBar value={overview.metrics.brandMentionRate} low={range.low} high={range.high} color={ASSISTANT_COLOR[current.platform]} className="mt-3" />
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        {overview.metrics.sovRank ? `Rank #${overview.metrics.sovRank} of ${overview.metrics.sovBrands} venues` : "Not ranked yet"} · own site cited in{" "}
        {pct(overview.metrics.citationRate)}
        {overview.setAside && (
          <span title="Answers given from memory, without a search. Stored as evidence, kept out of every number, and asked again with a search.">
            {" "}
            · {overview.setAside.answers} more from memory, not counted
          </span>
        )}
      </p>
      <Link href={`/visibility?series=${current.seriesId}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
        Open in AI Visibility <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </StatTile>
  );
}

/** A count from the site's week next to the week before, with the same verdict language. */
function CountTile({ label, now, before, sub, href, linkLabel }: { label: string; now: number; before: number; sub: string; href: string; linkLabel: string }) {
  const verdict = countMovement(before, now);
  return (
    <StatTile
      label={label}
      value={now}
      aside={
        <>
          <Delta value={now - before} unit="" />
          <VerdictChip verdict={verdict} />
        </>
      }
      sub={sub}
    >
      <Link href={href} className="mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-medium text-brand hover:underline">
        {linkLabel} <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </StatTile>
  );
}

function WeekDetail({ week }: { week: WeekTraffic }) {
  const now = week.current;
  const before = week.previous;
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Surface className="p-5">
        <Eyebrow>Visits by assistant</Eyebrow>
        <div className="mt-3">
          <Bars items={now.byAssistant} empty="No assistant sent a visitor this week." />
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {now.aiVisits} of {now.pageviews} page views came from an assistant; {before.aiVisits} of {before.pageviews} the week before.
        </p>
      </Surface>
      <Surface className="p-5">
        <Eyebrow>Where the assistants sent people</Eyebrow>
        <div className="mt-3">
          <Bars items={now.aiLanding} empty="No landing pages yet." muted />
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">The pages an assistant links are the pages it quotes.</p>
      </Surface>
      <Surface className="p-5">
        <Eyebrow>AI crawlers</Eyebrow>
        <div className="mt-3">
          <Bars items={now.bots.slice(0, 5)} empty="No AI crawler fetched the site this week." muted />
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {now.botHits} fetches this week, {before.botHits} the week before. An assistant can only quote pages its crawler has read.
        </p>
      </Surface>
    </div>
  );
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = typeof params.period === "string" ? params.period : null;
  const session = await requireSession();
  const [profile, billing] = await Promise.all([requireBusinessProfile(), getBillingSnapshot()]);
  const plan = PLANS[billing.effectivePlan];

  if (plan.monthlyRuns <= 0 && billing.effectivePlan !== "pro") {
    return (
      <>
        <h1 className="pb-6 text-[26px] font-semibold tracking-tight">Report</h1>
        <Panel>
          <EmptyState
            icon={Lock}
            title="Part of the Visibility plan"
            description="A report on whether ChatGPT and Google AI recommend this venue, what changed since the last one, and what to do about it."
          />
          <div className="flex justify-center pb-6">
            <Link href="/billing" className={buttonVariants({ size: "sm" })}>
              See plans
            </Link>
          </div>
        </Panel>
      </>
    );
  }

  const overviews = await getReportOverviews(requested);
  const primary = overviews[0];
  if (primary.error) {
    return (
      <>
        <h1 className="pb-6 text-[26px] font-semibold tracking-tight">Report</h1>
        <LoadError message={primary.error} />
      </>
    );
  }
  if (!primary.hasData || !primary.current) {
    return (
      <>
        <h1 className="pb-2 text-[26px] font-semibold tracking-tight">Report</h1>
        <p className="pb-6 text-[14.5px] text-muted-foreground">What the assistants say about {profile.name}, what changed, and what to do about it.</p>
        {primary.inProgress && <ProgressStrip progress={primary.inProgress} />}
        <Surface className="px-5 py-6">
          <p className="text-[15px] font-semibold">No report yet</p>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            The first report appears here as soon as the first measurement finishes. It needs a set of questions your customers ask AI assistants.
          </p>
          <Link href="/visibility/setup" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
            Set up the questions
          </Link>
        </Surface>
      </>
    );
  }

  const current = primary.current;
  const weekly = periodKind(current.period) === "week";
  const supabase = await getUserClient();
  const [week, month, note] = await Promise.all([
    weekly ? loadWeekTraffic(supabase, session.tenantId, periodStart(current.period)) : null,
    weekly ? null : getStatsSnapshot(),
    latestAnalystNote(supabase, session.tenantId, current.period, current.method.key),
  ]);
  const insights = insightsFor({ assistants: overviews, week });
  const verdict = verdictOf(insights);
  const assistants = overviews.map((o) => ASSISTANT_NAME[o.current!.platform]);
  const measured = current.start === current.end ? formatDate(`${current.end}T00:00:00.000Z`) : `${day(current.start)} to ${formatDate(`${current.end}T00:00:00.000Z`)}`;
  const cmp = primary.comparison;
  const isAdmin = canEditSettings(session.role);
  const hasWeek = Boolean(week?.site && !week.error);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="min-w-0">
          <Eyebrow>{weekly ? "Weekly report" : periodKind(current.period) === "month" ? "Monthly report" : "Measurement"}</Eyebrow>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{current.label}</h1>
            <Suspense fallback={null}>
              <PeriodPicker periods={primary.periods} trigger="Other reports" />
            </Suspense>
          </div>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">
            {profile.name} · {listNames(assistants)} asked {measured}
            {hasWeek ? ` · website traffic ${day(week!.current.from)} to ${day(week!.current.to)}` : ""}
          </p>
        </div>
        <Link href="/reports" className={buttonVariants({ size: "sm", variant: "outline" })}>
          Report history
        </Link>
      </div>

      {primary.inProgress && <ProgressStrip progress={primary.inProgress} />}

      {verdict && (
        <Surface className="relative overflow-hidden py-5 pl-6 pr-5">
          <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", TONE[verdict.tone].bar)} />
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>The report in two sentences</Eyebrow>
            <Chip className={TONE[verdict.tone].chip}>{TONE[verdict.tone].label}</Chip>
          </div>
          <p className="mt-2 max-w-4xl text-[21px] font-semibold leading-snug tracking-tight text-foreground">{verdict.headline}</p>
          {verdict.also && <p className="mt-1.5 max-w-4xl text-[16px] leading-relaxed text-muted-foreground">{verdict.also}</p>}
        </Surface>
      )}

      <div className={cn("mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2", overviews.length + (hasWeek ? 2 : month?.site ? 1 : 0) >= 4 && "xl:grid-cols-4")}>
        {overviews.map((o) => (
          <AssistantTile key={o.current!.seriesId} overview={o} />
        ))}
        {hasWeek && (
          <>
            <CountTile
              label="Visits from AI assistants"
              now={week!.current.aiVisits}
              before={week!.previous.aiVisits}
              sub={`${day(week!.current.from)} to ${day(week!.current.to)} · ${week!.previous.aiVisits} the week before${week!.current.byAssistant.length ? ` · ${week!.current.byAssistant.slice(0, 3).map((a) => `${a.label} ${a.value}`).join(", ")}` : ""}`}
              href="/traffic"
              linkLabel="Traffic from AI"
            />
            <CountTile
              label="AI crawler fetches"
              now={week!.current.botHits}
              before={week!.previous.botHits}
              sub={`${week!.previous.botHits} the week before${week!.current.bots.length ? ` · ${week!.current.bots.slice(0, 3).map((b) => `${b.label} ${b.value}`).join(", ")}` : ""}`}
              href="/bots"
              linkLabel="AI crawlers"
            />
          </>
        )}
        {!weekly && month?.site && (
          <StatTile
            label={`Visits from AI assistants · ${month.days} days`}
            value={month.fromAi}
            aside={month.delta.fromAi !== null ? <Delta value={month.delta.fromAi} unit="%" /> : undefined}
            sub={`${month.fromAiPct}% of ${month.pageviews} page views`}
          >
            <Link href="/traffic" className="mt-auto inline-flex items-center gap-1 pt-3 text-[13px] font-medium text-brand hover:underline">
              Traffic from AI <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </StatTile>
        )}
      </div>

      <SectionHead
        title="What changed, and what it means"
        sub="Findings worked out by rules from the stored answers and the site's traffic, most important first. A movement is only called a rise or a fall when it is more than chance."
        hint="Each comparison is tested before it is worded: two measurements of an unchanged venue differ by chance, and a difference inside that range is reported as noise, not as news."
      />
      <InsightList insights={insights} limit={8} columns={2} />
      {insights.length > 8 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13.5px] font-medium text-muted-foreground hover:text-foreground">
            {insights.length - 8} more finding{insights.length - 8 === 1 ? "" : "s"}
          </summary>
          <div className="mt-3">
            <InsightList insights={insights.slice(8)} columns={2} />
          </div>
        </details>
      )}

      {(note || isAdmin) && (
        <div className="mt-3">
          <AnalystNoteCard note={note} canWrite={isAdmin} periodLabel={current.label} seriesId={current.seriesId} />
        </div>
      )}

      {cmp && (
        <>
          <SectionHead
            title="The assistants, side by side"
            sub="The same questions asked on each. Answers naming you out of answers asked, per question type."
            action={
              <Link href="/visibility/assistants" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                Question by question, who each recommends, what each reads <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <Surface className="overflow-hidden">
            <AssistantMatrix comparison={cmp} rows={cmp.intents.map((row) => ({ name: row.name, cells: row.cells }))} rowLabel="Question type" />
          </Surface>
        </>
      )}

      {hasWeek && (
        <>
          <SectionHead
            title="The website that week"
            sub={`${day(week!.current.from)} to ${day(week!.current.to)}: ${week!.current.pageviews} page views by ${week!.current.visitors} visitors (${week!.previous.pageviews} by ${week!.previous.visitors} the week before), ${week!.current.conversions} ${week!.current.conversions === 1 ? "conversion" : "conversions"}.`}
            action={
              <Link href="/overview" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
                Website module <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <WeekDetail week={week!} />
        </>
      )}
      {weekly && week && !week.site && !week.error && (
        <>
          <SectionHead title="The website that week" sub="No website is linked to this workspace yet, so the report has no traffic to read." />
          <Surface className="px-5 py-4 text-[13.5px] text-muted-foreground">
            <Link href="/install" className="font-medium text-brand hover:underline">
              Install the tracker
            </Link>{" "}
            and the next report shows the visits assistants send and the pages their crawlers read.
          </Surface>
        </>
      )}

      <SectionHead
        title="What to do first"
        sub={`The moves with the most answers at stake, from the ${ASSISTANT_NAME[current.platform]} answers.`}
        action={
          <Link href="/visibility/actions" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
            The whole plan <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      <PlanCard actions={primary.actions.slice(0, 3)} categoryRuns={current.categoryRuns} compact />

      <p className="mt-8 max-w-3xl text-[12.5px] leading-relaxed text-muted-foreground">
        How to read this: every question is asked {current.method.reps} times on each assistant, with web search on, and the answers are stored. Numbers from different
        assistants are shown side by side and never added up. The range next to a score is where the true value plausibly lies given the sample.{" "}
        <Link href="/visibility/setup" className="text-brand hover:underline">
          The full method
        </Link>
        .
      </p>
    </>
  );
}
