import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, ErrorCard, Kpi, Kpis, NoSite, QHead } from "@/components/stats/blocks";
import { TrendChart } from "@/components/stats/trend-chart";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const s = await getStatsSnapshot();
  const period = `Last ${s.days} days`;
  const compare = `compared with the ${s.days} days before`;
  return (
    <>
      <PageHeader title="Overview" description={s.site ? `${s.site.name}${s.site.domain ? ` · ${s.site.domain}` : ""}` : "Traffic, sources and conversions of your website."} />
      {s.error && <ErrorCard message={s.error} />}
      {!s.site ? (
        s.error ? null : <NoSite />
      ) : (
        <>
          <Kpis cols={5}>
            <Kpi
              label={`Page views · ${s.days} days`}
              value={s.pageviews}
              delta={s.delta.pageviews}
              deltaLabel={compare}
              hint={`Every page opened on the site in the last ${s.days} days, including moves between pages. The small number is the change against the ${s.days} days before.`}
            />
            <Kpi
              label={`Unique visitors · ${s.days} days`}
              value={s.uniques}
              delta={s.delta.uniques}
              deltaLabel={compare}
              hint={`Distinct people in the last ${s.days} days. Cookieless: a random id kept in the browser, no personal data, separate per site.`}
            />
            <Kpi
              label={<>From AI · {s.fromAiPct}%</>}
              value={s.fromAi}
              highlight
              delta={s.delta.fromAi}
              deltaLabel={compare}
              hint={`Page views in the last ${s.days} days that came from AI assistants (ChatGPT, Perplexity, Gemini, Claude and others), recognised by the referrer.`}
            />
            <Kpi
              label={`Conversions · ${s.days} days`}
              value={s.conversions}
              highlight
              delta={s.delta.conversions}
              deltaLabel={compare}
              hint="Clicks that mean something: phone, directions, Instagram, Facebook, reservation, CTA buttons. Section reaches are counted separately as engagement."
            />
            <Kpi
              label="Conversion rate"
              value={`${s.conversionRate}%`}
              delta={s.delta.conversionRate}
              deltaUnit=" pts"
              deltaLabel={compare}
              sub={`${s.convertingVisitors} of ${s.uniques} visitors`}
              hint={`Visitors who made at least one of those clicks, out of all unique visitors in the last ${s.days} days. The change is in percentage points.`}
            />
          </Kpis>
          {s.truncated && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              A busy site: the oldest days of the comparison period were cut off, so the changes shown are approximate.
            </p>
          )}

          <QHead step={1} title="How many people, and from where?" period={period} sub="Page views day by day. Blue = from AI, grey = everything else." hint={`The same ${s.days} days as the numbers above. Hover or tap a day, or focus the chart and use the arrow keys.`} />
          <Card>
            <TrendChart points={s.trend} />
          </Card>

          <QHead step={2} title="Which pages get the traffic?" period={period} sub="Most opened pages." />
          <Card>
            <Bars items={s.pages} muted empty="No data yet. Paste the tracker and open the site." />
          </Card>
        </>
      )}
    </>
  );
}
