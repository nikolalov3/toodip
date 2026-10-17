import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, Hint, Kpi, Kpis, QHead } from "@/components/stats/blocks";
import { Donut } from "@/components/stats/donut";
import { ShareLines } from "@/components/stats/share-lines";
import { VisibilitySubNav } from "@/components/visibility/sub-nav";
import { cn } from "@/lib/utils";
import { getShareDetail } from "@/services/visibility-share";

export const metadata: Metadata = { title: "Share of voice" };

const STATUS_STYLE = {
  reliable: "bg-positive-soft text-positive",
  flicker: "bg-caution-soft text-caution",
  absent: "bg-critical-soft text-critical",
  single: "bg-muted text-muted-foreground",
} as const;

const STATUS_LABEL = {
  reliable: "Reliable",
  flicker: "Flickering",
  absent: "Absent",
  single: "Asked once",
} as const;

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rival = typeof params.rival === "string" ? params.rival : undefined;
  const d = await getShareDetail(rival);
  const own = d.brands.find((b) => b.isOwn);
  const h2h = d.headToHead;

  return (
    <>
      <PageHeader
        title="AI Visibility"
        description={
          d.latestLabel
            ? `Share of voice in depth. Latest measurement: ${d.latestLabel}, ${d.latestRuns} answers. ${d.dates.length} measurement${d.dates.length === 1 ? "" : "s"} in total.`
            : "Share of voice in depth."
        }
      />
      <VisibilitySubNav />

      {!d.hasData ? (
        <Card>
          <p className="text-[13px] text-muted-foreground">
            No measurements yet. Run the battery on the Overview tab and this view fills in.
          </p>
        </Card>
      ) : (
        <>
          <Kpis>
            <Kpi label="Your share" value={own ? pct(own.share) : "0%"} highlight hint="Share of answers in the latest measurement that name you." />
            <Kpi label="Your rank" value={own ? `#${d.brands.indexOf(own) + 1}` : "—"} hint={`Among ${d.brands.length} venues the assistants name for the same questions.`} />
            <Kpi label="Avg. position" value={own?.avgPosition ?? "—"} hint="When you are named, how far down the answer: 1 is first." />
            <Kpi label="Reliable questions" value={`${d.stabilitySummary.reliable}/${d.stability.length}`} hint="Questions where every repetition named you on the latest day." />
          </Kpis>

          <QHead step={1} title="How is the share moving?" sub="One line per venue, one point per measurement." hint="Share = answers naming the venue / all category answers in that measurement. A monthly report is one point. Top five rivals of the latest measurement plus you." />
          <Card>
            {d.timeline.length < 2 ? (
              <p className="mb-3 text-[13px] text-muted-foreground">
                One measurement so far. The second one draws the trend.
              </p>
            ) : null}
            <ShareLines points={d.timeline} brands={d.timelineBrands} ownName={own?.name ?? null} />
          </Card>

          <QHead step={2} title="Who gets named?" sub="Latest measurement. Your slice highlighted." />
          <Card>
            <Donut
              slices={d.brands.map((b) => ({ label: b.name, value: b.runs, own: b.isOwn }))}
              center={own ? pct(own.share) : "0%"}
              centerLabel="your share"
              maxSlices={9}
            />
          </Card>

          <QHead step={3} title="Where do I win, where am I missing?" sub="Share per type of customer question. Sorted by your share." hint="Each row is one intent from the battery. Leader = the rival named most often for that intent." />
          <Card className="overflow-hidden p-0">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Question type</th>
                  <th className="px-3 py-2.5 font-medium">Lang</th>
                  <th className="px-3 py-2.5 text-right font-medium">Answers</th>
                  <th className="px-3 py-2.5 text-right font-medium">Your share</th>
                  <th className="px-3 py-2.5 text-right font-medium">Rank</th>
                  <th className="px-4 py-2.5 font-medium">Leader</th>
                </tr>
              </thead>
              <tbody>
                {d.byIntent.map((row) => (
                  <tr key={row.intent} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">{row.intent}</td>
                    <td className="px-3 py-2.5 uppercase text-muted-foreground">{row.language}</td>
                    <td className="text-numeric px-3 py-2.5 text-right text-muted-foreground">{row.runs}</td>
                    <td className={cn("text-numeric px-3 py-2.5 text-right font-semibold", row.ownRuns === 0 ? "text-critical" : "text-foreground")}>
                      {pct(row.ownShare)}
                    </td>
                    <td className="text-numeric px-3 py-2.5 text-right text-muted-foreground">
                      {row.ownRank ? `#${row.ownRank}/${row.brands}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.leader ? `${row.leader.name} · ${pct(row.leader.share)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <QHead step={4} title="Does it differ by assistant and language?" sub="The same questions, split by platform and by the language they were asked in." />
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">By platform</p>
              <Bars
                items={d.byPlatform.map((s) => ({ label: `${s.label}${s.ownRank ? ` · #${s.ownRank}/${s.brands}` : ""}`, value: Math.round(s.ownShare * 100) }))}
                empty="No data."
                suffix={() => <span className="ml-0.5 font-normal text-muted-foreground">%</span>}
              />
            </Card>
            <Card>
              <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">By language</p>
              <Bars
                items={d.byLanguage.map((s) => ({ label: `${s.label}${s.ownRank ? ` · #${s.ownRank}/${s.brands}` : ""}`, value: Math.round(s.ownShare * 100) }))}
                empty="No data."
                suffix={() => <span className="ml-0.5 font-normal text-muted-foreground">%</span>}
              />
            </Card>
          </div>

          <QHead step={5} title="When I am named, where in the answer?" sub={`Latest measurement: ${d.positions.runs} answers.`} hint="Being first in the answer is worth more than being fifth. Absent = the answer did not name you at all." />
          <Card>
            <Bars
              items={[
                { label: "Named first", value: d.positions.first },
                { label: "Named second", value: d.positions.second },
                { label: "Named third", value: d.positions.third },
                { label: "Named later", value: d.positions.later },
                { label: "Absent", value: d.positions.absent },
              ]}
              pct
              empty="No data."
            />
          </Card>

          <QHead step={6} title="Which questions are reliable, which flicker?" sub="Per question, across repetitions in the latest measurement." hint="Reliable = named every time. Flickering = sometimes. Absent = never. Flickering questions are the cheapest wins: the assistant already considers you." />
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2.5 text-[12px]">
              {(["reliable", "flicker", "absent", "single"] as const).map((s) => (
                <span key={s} className={cn("rounded-[3px] px-2 py-0.5 font-medium", STATUS_STYLE[s])}>
                  {STATUS_LABEL[s]} · {d.stabilitySummary[s]}
                </span>
              ))}
            </div>
            <ul className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
              {d.stability.map((row) => (
                <li key={row.text} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 text-[13px]">
                  <span className="truncate" title={row.text}>
                    {row.text}
                    <span className="ml-2 text-[11px] text-muted-foreground">{row.intent}</span>
                  </span>
                  <span className="text-numeric text-muted-foreground">
                    {row.ownRuns}/{row.runs}
                  </span>
                  <span className={cn("rounded-[3px] px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[row.status])}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <QHead step={7} title="Head to head" sub="Pick a rival. Across all measurements: the questions they win, and the sources behind them." />
          <Card>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {d.rivals.map((name) => (
                <Link
                  key={name}
                  href={`/visibility/share?rival=${encodeURIComponent(name)}`}
                  scroll={false}
                  className={cn(
                    "rounded-[4px] border px-2.5 py-1 text-[12.5px] transition-colors",
                    h2h?.rival === name
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {name}
                </Link>
              ))}
            </div>
            {h2h && (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                    {h2h.rival} <span className="text-numeric">· {h2h.rivalRuns}</span> vs you <span className="text-numeric">· {h2h.ownRuns}</span> answers
                    <Hint text="Answers naming each of you, across all measurement days." />
                  </p>
                  <div className="mt-3 flex flex-col gap-4">
                    <div>
                      <p className="mb-1.5 text-[12px] text-critical">They are named, you are not</p>
                      <Bars items={h2h.rivalOnly.map((r) => ({ label: r.intent, value: r.rivalRuns }))} empty="None. Every question they win, you are in too." muted />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] text-caution">Both named</p>
                      <Bars items={h2h.bothPresent.map((r) => ({ label: r.intent, value: r.rivalRuns }))} empty="No shared questions." muted />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] text-positive">You are named, they are not</p>
                      <Bars items={h2h.ownOnly.map((r) => ({ label: r.intent, value: r.ownRuns }))} empty="None yet." />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                    Sources behind {h2h.rival}
                    <Hint text="Domains cited in answers that name the rival. Co-occurrence by answer, not proof the site wrote about them." />
                  </p>
                  <div className="mt-3">
                    <Bars items={h2h.rivalSources.map((s) => ({ label: `${s.domain} · ${s.category}`, value: s.count }))} empty="No citations recorded." muted />
                  </div>
                  <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Sources behind you</p>
                  <div className="mt-3">
                    <Bars items={h2h.ownSources.map((s) => ({ label: `${s.domain} · ${s.category}`, value: s.count }))} empty="No answer naming you has citations yet." />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}
