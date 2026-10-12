import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, NoSite, QHead } from "@/components/stats/blocks";
import { formatDate } from "@/lib/format";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "AI Bots" };

export default async function BotsPage() {
  const s = await getStatsSnapshot();
  const lastByLabel = new Map(s.bots.map((b) => [b.label, b.last]));
  return (
    <>
      <PageHeader title="AI Bots" description="Whether the assistants' crawlers fetch your site." />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <QHead step={1} title="Does AI read my site at all?" sub="AI crawlers fetching your site, and when they last did." hint="GPTBot, ClaudeBot, PerplexityBot, Google-Extended… counted server-side (middleware). No bots = AI is not collecting your content yet." />
          <Card>
            <Bars
              items={s.bots}
              empty="No AI bot visits yet. The signal starts once the middleware is installed on the site."
              suffix={(item) => {
                const last = lastByLabel.get(item.label);
                return last ? <span className="ml-1 font-normal text-muted-foreground">· {formatDate(last)}</span> : null;
              }}
            />
          </Card>
        </>
      )}
    </>
  );
}
