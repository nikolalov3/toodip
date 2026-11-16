import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, ErrorCard, Kpi, Kpis, NoSite, QHead, SplitBars, Verdict } from "@/components/stats/blocks";
import { WebsiteTabs } from "@/components/stats/website-tabs";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Conversions" };

/** Both groups need a few visitors before a comparison means anything. */
const MIN_GROUP = 10;

export default async function ConversionsPage() {
  const s = await getStatsSnapshot();
  const period = `Last ${s.days} days`;
  const compare = `compared with the ${s.days} days before`;
  const comparison =
    s.aiVisitors < MIN_GROUP || s.restVisitors < MIN_GROUP
      ? s.aiVisitors === 0
        ? null
        : `Too few visitors from AI (${s.aiVisitors}) to compare the two groups fairly yet.`
      : s.aiConversionRate > s.restConversionRate
        ? `Visitors from AI act more often than the rest: ${s.aiConversionRate}% against ${s.restConversionRate}%.`
        : s.aiConversionRate < s.restConversionRate
          ? `Visitors from AI act less often than the rest so far: ${s.aiConversionRate}% against ${s.restConversionRate}%.`
          : `Visitors from AI and the rest act equally often: ${s.aiConversionRate}%.`;
  return (
    <>
      <PageHeader title="Website" description="What traffic does on the site: phone, directions, reservation, and whether visitors from AI act more often." />
      <WebsiteTabs />
      {s.error && <ErrorCard message={s.error} />}
      {!s.site ? (
        s.error ? null : <NoSite />
      ) : (
        <>
          <Kpis>
            <Kpi
              label="Conversion rate"
              value={`${s.conversionRate}%`}
              delta={s.delta.conversionRate}
              deltaUnit=" pts"
              deltaLabel={compare}
              sub={`${s.convertingVisitors} of ${s.uniques} visitors`}
              hint={`Visitors who clicked phone, directions, Instagram, Facebook, a reservation or a CTA button at least once, out of all unique visitors in the last ${s.days} days. The change is in percentage points.`}
            />
            <Kpi
              label="Visitors from AI who act"
              value={`${s.aiConversionRate}%`}
              highlight
              sub={`${s.aiConverting} of ${s.aiVisitors} visitors from AI`}
              hint={`People who arrived from an AI assistant at least once in the last ${s.days} days, and the share of them who made one of those clicks.`}
            />
            <Kpi
              label="Other visitors who act"
              value={`${s.restConversionRate}%`}
              sub={`${s.restConverting} of ${s.restVisitors} other visitors`}
              hint="Everyone who did not come from an AI assistant: search, social, direct and other links."
            />
            <Kpi
              label={`Conversions · ${s.days} days`}
              value={s.conversions}
              delta={s.delta.conversions}
              deltaLabel={compare}
              hint="Every counted click, including repeat clicks by the same visitor."
            />
          </Kpis>
          {comparison && (
            <Verdict tone={s.aiConversionRate > s.restConversionRate && s.aiVisitors >= MIN_GROUP ? "positive" : "neutral"}>
              {comparison}
            </Verdict>
          )}

          <QHead step={1} title="What does traffic do on the site?" period={period} sub="Clicks that lead to a visit or a contact, split by who clicked." hint="Counted automatically from links: phone numbers, maps, Instagram, Facebook. Extra buttons can be counted too; set up in Install." />
          <Card>
            <SplitBars items={s.conversionsSplit} legend={["from AI", "others"]} empty="No conversions yet. We count clicks on phone, maps, Instagram and Facebook." />
          </Card>

          <QHead step={2} title="How far do people get on the page?" period={period} sub="Sections the traffic scrolls to. Not counted as conversions." hint="One count per section per page view. Shows interest, not a contact." />
          <Card>
            <Bars items={s.engagement} muted empty="The site does not report sections yet. It can; set up in Install." />
          </Card>
        </>
      )}
    </>
  );
}
