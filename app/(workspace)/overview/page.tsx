import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, Kpi, Kpis, NoSite, QHead } from "@/components/stats/blocks";
import { TrendChart } from "@/components/stats/trend-chart";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const s = await getStatsSnapshot();
  return (
    <>
      <PageHeader title="Overview" description={s.site ? `${s.site.name}${s.site.domain ? ` · ${s.site.domain}` : ""}` : "Traffic, sources and conversions of your website."} />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <Kpis>
            <Kpi label={`Page views · ${s.days} days`} value={s.pageviews} hint="Every page view, including navigation within the site. Measured by the s.js tracker in the visitor's browser." />
            <Kpi label={`Unique visitors · ${s.days} days`} value={s.uniques} hint="Estimated distinct people in the 30-day window. Cookieless: a random first-party id in the browser, no personal data, separate per site." />
            <Kpi label={<>From AI · {s.fromAiPct}%</>} value={s.fromAi} highlight hint="Page views that came from AI assistants (ChatGPT, Perplexity, Gemini, Claude…), recognised by the referrer." />
            <Kpi label={`Conversions · ${s.days} days`} value={s.conversions} highlight hint="Clicks that mean something: phone, directions, Instagram, Facebook, reservation, CTA buttons. Section reaches are counted separately as engagement." />
          </Kpis>

          <QHead step={1} title="How many people, and from where?" sub="Page views day by day. Blue = from AI, grey = everything else." hint="Last 14 days." />
          <Card>
            <TrendChart points={s.trend} />
          </Card>

          <QHead step={2} title="Which pages get the traffic?" sub="Most opened pages, last 30 days." />
          <Card>
            <Bars items={s.pages} muted empty="No data yet. Paste the tracker and open the site." />
          </Card>
        </>
      )}
    </>
  );
}
