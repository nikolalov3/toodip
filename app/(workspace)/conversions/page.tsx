import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, NoSite, QHead } from "@/components/stats/blocks";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Conversions" };

export default async function ConversionsPage() {
  const s = await getStatsSnapshot();
  return (
    <>
      <PageHeader title="Conversions" description="What traffic does on the site: phone, directions, reservation." />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <QHead step={1} title="What does traffic do on the site?" sub="Clicks that lead to a visit or a contact." hint="Captured automatically from links (tel:, maps, Instagram, Facebook). Extra ones via the data-toodip attribute or toodip('name')." />
          <Card>
            <Bars items={s.conversionsByKind} pct empty="No conversions yet. We count clicks on phone, maps, Instagram and Facebook." />
          </Card>
          <QHead step={2} title="How far do people get on the page?" sub="Sections the traffic scrolls to. Not counted as conversions." hint="One event per section per page view. Engagement, not conversion." />
          <Card>
            <Bars items={s.engagement} muted empty="The site does not send section events yet. Optional: toodip('see_name') when a section comes into view." />
          </Card>
        </>
      )}
    </>
  );
}
