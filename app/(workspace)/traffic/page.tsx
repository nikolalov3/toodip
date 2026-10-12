import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, NoSite, QHead } from "@/components/stats/blocks";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "AI Traffic" };

export default async function TrafficPage() {
  const s = await getStatsSnapshot();
  return (
    <>
      <PageHeader title="AI Traffic" description="Which assistants actually send people to your site." />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <QHead step={1} title="Which assistant refers me?" sub="Visits from AI, by assistant." hint="Visits from AI split by assistant (ChatGPT, Perplexity, Gemini, Claude…)." />
          <Card>
            <Bars items={s.assistants} empty="Zero so far. When ChatGPT, Perplexity or Gemini start referring, they show up here." />
          </Card>
          <QHead step={2} title="Where does traffic come from at all?" sub="All traffic by channel." hint="AI, search engines, social, direct and other, recognised by the referrer." />
          <Card>
            <Bars items={s.channels} pct empty="No data." />
          </Card>
        </>
      )}
    </>
  );
}
