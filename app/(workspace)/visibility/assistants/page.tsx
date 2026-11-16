import type { Metadata } from "next";
import Link from "next/link";

import { AssistantMatrix } from "@/components/panel/assistant-matrix";
import { InsightList } from "@/components/panel/insight-list";
import {
  ASSISTANT_COLOR,
  AssistantTag,
  Delta,
  EmptyNote,
  MiniBar,
  pct,
  RangeBar,
  SectionHead,
  StatGrid,
  StatTile,
  Surface,
  VerdictChip,
  type MoveVerdict,
} from "@/components/panel/ui";
import { Bars } from "@/components/stats/blocks";
import { LoadError, NoMeasurements } from "@/components/visibility/frame";
import { periodPhrase } from "@/lib/periods";
import { movement, rangeLabel, wilson } from "@/lib/stats-math";
import { cn } from "@/lib/utils";
import { insightsFor } from "@/services/insights";
import { ASSISTANT_NAME, type Platform, type SeriesSummary } from "@/services/visibility";
import { loadVisibilityPage, type PageSearchParams } from "@/services/visibility-page";

export const metadata: Metadata = { title: "Assistants · AI Visibility" };

/** Which surface feeds each assistant, per the citation data. */
const READS: Record<Platform, string> = {
  google_aio: "Builds its answer on Google Search: pages that rank, the Google Business Profile, reviews.",
  perplexity: "Reads Instagram, Facebook, blogs and venue websites.",
  chatgpt: "Reads guides, lists and structured venue pages found by web search.",
  other: "",
};

function verdictOf(series: SeriesSummary | undefined): MoveVerdict {
  if (!series?.previous) return "first";
  return movement(series.previous.ownMentions, series.previous.categoryRuns, series.latest.ownMentions, series.latest.categoryRuns);
}

export default async function AssistantsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const { overview, canMeasure } = await loadVisibilityPage(searchParams);
  if (overview.error) return <LoadError message={overview.error} />;
  if (!overview.hasData || !overview.current) return <NoMeasurements canMeasure={canMeasure} />;

  const current = overview.current;
  const cmp = overview.comparison;
  const seriesById = new Map(overview.series.map((s) => [s.id, s]));
  const insights = insightsFor({ assistants: [overview] }).filter((i) => i.id.startsWith("assistants-") || i.id.startsWith("split-"));
  const insidePlatforms = overview.platforms.filter((p) => p.runs > 0);

  return (
    <>
      {cmp ? (
        <>
          <p className="mb-5 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{cmp.label}</span> · the same {cmp.questions.length} questions asked on each assistant · questions naming you
            directly left out
          </p>

          <StatGrid cols={cmp.columns.length === 2 ? 2 : 3}>
            {cmp.columns.map((col) => {
              const series = seriesById.get(col.seriesId);
              const range = wilson(col.ownMentions, col.categoryRuns);
              const isLatest = series?.latest.period === cmp.period;
              return (
                <StatTile
                  key={col.seriesId}
                  label={<AssistantTag platform={col.platform} name={col.assistant} className="text-[14px] text-foreground" />}
                  value={pct(col.score)}
                  aside={
                    <>
                      {isLatest && series?.delta !== null && series?.delta !== undefined && <Delta value={series.delta} />}
                      {isLatest && <VerdictChip verdict={verdictOf(series)} />}
                    </>
                  }
                  sub={
                    <>
                      named in <span className="text-numeric">{col.ownMentions}</span> of <span className="text-numeric">{col.categoryRuns}</span> answers · plausibly{" "}
                      {rangeLabel(range)}
                      {isLatest && series?.previous ? ` · ${pct(series.previous.score)} ${periodPhrase(series.previous.period)}` : ""}
                    </>
                  }
                >
                  <RangeBar value={col.score} low={range.low} high={range.high} color={ASSISTANT_COLOR[col.platform]} className="mt-3" />
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    {col.label}. {READS[col.platform]}
                  </p>
                  <Link href={`/visibility?series=${col.seriesId}`} className="mt-2 text-[13px] font-medium text-brand hover:underline">
                    Open {col.assistant} in detail
                  </Link>
                </StatTile>
              );
            })}
          </StatGrid>

          {insights.length > 0 && (
            <>
              <SectionHead title="Do they see you differently?" sub="Compared answer for answer, after checking the difference against chance." className="mt-8" />
              <InsightList insights={insights} columns={2} />
            </>
          )}

          <SectionHead
            title="Where does each one name you?"
            sub="Answers naming you out of answers asked, per question type. A flag marks a type only one assistant gives you."
            hint="Each question is asked more than once on each assistant, so a cell like 3/6 means three of six answers named you. The flag appears when a type was asked at least three times on each assistant and the rates are half apart or more."
          />
          <Surface className="overflow-hidden">
            <AssistantMatrix comparison={cmp} rows={cmp.intents.map((row) => ({ name: row.name, cells: row.cells }))} rowLabel="Question type" />
            <details className="border-t border-border">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-muted-foreground hover:text-foreground">
                Question by question ({cmp.questions.length})
              </summary>
              <div className="border-t border-border/60">
                <AssistantMatrix
                  comparison={cmp}
                  rows={cmp.questions.map((row) => ({ name: row.text, note: row.intent, cells: row.cells }))}
                  rowLabel="Question"
                  dense
                />
              </div>
            </details>
          </Surface>

          <div className="grid gap-x-3 lg:grid-cols-2">
            <div>
              <SectionHead title="Who does each one recommend?" sub="Share of answers naming each venue. You first, then the venues named most across the assistants." />
              <Surface className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-[13.5px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Venue</th>
                      {cmp.columns.map((col) => (
                        <th key={col.seriesId} className="px-3 py-3 text-[13px] font-semibold">
                          <AssistantTag platform={col.platform} name={col.assistant} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cmp.brands.map((brand) => (
                      <tr key={brand.name} className={cn("border-b border-border/60 last:border-b-0", brand.isOwn && "bg-brand-soft/50")}>
                        <td className={cn("max-w-[190px] truncate px-4 py-2.5", brand.isOwn ? "font-semibold text-brand" : "font-medium")} title={brand.name}>
                          {brand.name}
                          {brand.isOwn && <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-wide">you</span>}
                        </td>
                        {brand.cells.map((count, index) => {
                          const col = cmp.columns[index];
                          const share = count / Math.max(col.categoryRuns, 1);
                          return (
                            <td key={col.seriesId} className="px-3 py-2.5">
                              <span className="flex items-center gap-2.5">
                                <MiniBar value={share} color={ASSISTANT_COLOR[col.platform]} className="w-14 shrink-0" />
                                <span className={cn("text-numeric", count === 0 ? "text-muted-foreground" : "font-semibold")}>{pct(share)}</span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Surface>
            </div>
            <div>
              <SectionHead title="What does each one read?" sub="Answers citing each source. A source both read works twice; one only a single assistant reads has to be won there." />
              <Surface className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-[13.5px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Source</th>
                      {cmp.columns.map((col) => (
                        <th key={col.seriesId} className="px-3 py-3 text-[13px] font-semibold">
                          <AssistantTag platform={col.platform} name={col.assistant} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cmp.sources.map((source) => {
                      const max = Math.max(...cmp.sources.flatMap((s) => s.cells), 1);
                      return (
                        <tr key={source.domain} className="border-b border-border/60 last:border-b-0">
                          <td className="max-w-[200px] truncate px-4 py-2.5 font-medium" title={`${source.domain} · ${source.category}`}>
                            {source.domain}
                          </td>
                          {source.cells.map((count, index) => {
                            const col = cmp.columns[index];
                            return (
                              <td key={col.seriesId} className="px-3 py-2.5">
                                <span className="flex items-center gap-2.5">
                                  <MiniBar value={count} max={max} color={ASSISTANT_COLOR[col.platform]} className="w-14 shrink-0" />
                                  <span className={cn("text-numeric", count === 0 ? "text-muted-foreground" : "font-semibold")}>{count === 0 ? "never" : count}</span>
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Surface>
            </div>
          </div>
        </>
      ) : insidePlatforms.length > 1 ? (
        <>
          <p className="mb-5 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">{current.label}</span> · {current.method.label} · one measurement covering {insidePlatforms.length} assistants
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insidePlatforms.map((p) => (
              <Surface key={p.platform} className="p-5">
                <AssistantTag platform={p.platform} name={ASSISTANT_NAME[p.platform]} className="text-[14px]" />
                <p className="text-numeric mt-2 text-[30px] font-semibold leading-none tracking-tight">{pct(p.ownMentions / p.runs)}</p>
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  named in {p.ownMentions} of {p.runs} answers
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{READS[p.platform]}</p>
                <div className="mt-4">
                  <Bars items={p.topDomains.slice(0, 4).map((d) => ({ label: d.domain, value: d.count }))} empty="No citations." muted />
                </div>
              </Surface>
            ))}
          </div>
        </>
      ) : (
        <EmptyNote>
          Only <span className="font-medium text-foreground">{ASSISTANT_NAME[current.platform]}</span> was asked {periodPhrase(current.period)}, so there is nothing to put side by
          side for that period. The weekly report asks ChatGPT and Google AI the same questions in the same week; from the first one they are compared here, type by
          type and question by question.
        </EmptyNote>
      )}

      <SectionHead
        title="Every way this venue has been measured"
        sub="One row per series: an assistant asked with one model. Numbers are compared inside a row and never across rows."
        hint="A series is every measurement made the same way. Changing the assistant or the model starts a new series, because two models answer differently even when nothing about the venue changed."
      />
      <Surface className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-4 py-3">Assistant</th>
              <th className="px-3 py-3">Measured with</th>
              <th className="px-3 py-3">Latest</th>
              <th className="px-3 py-3 text-right">Named in answers</th>
              <th className="px-3 py-3 text-right">Measurements</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {overview.series.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-3">
                  <AssistantTag platform={s.platform} name={s.assistant} />
                </td>
                <td className="px-3 py-3 text-muted-foreground">{s.label}</td>
                <td className="px-3 py-3 text-muted-foreground">{s.latest.label}</td>
                <td className="px-3 py-3 text-right">
                  <span className="text-numeric font-semibold">{pct(s.latest.score)}</span>
                  <span className="text-numeric ml-2 text-[12.5px] text-muted-foreground">
                    {s.latest.ownMentions}/{s.latest.categoryRuns}
                  </span>
                </td>
                <td className="text-numeric px-3 py-3 text-right text-muted-foreground">{s.points}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/visibility?series=${s.id}`} className="text-[13px] font-medium text-brand hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </>
  );
}
