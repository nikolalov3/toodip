import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, NoSite, QHead } from "@/components/stats/blocks";
import { formatDate } from "@/lib/format";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Boty AI" };

export default async function BotsPage() {
  const s = await getStatsSnapshot();
  const lastByLabel = new Map(s.bots.map((b) => [b.label, b.last]));
  return (
    <>
      <PageHeader title="Boty AI" description="Czy roboty asystentów pobierają Twoją stronę." />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <QHead step={1} title="Czy AI w ogóle czyta moją stronę?" sub="Roboty AI pobierające Twoją stronę i kiedy ostatnio." hint="GPTBot, ClaudeBot, PerplexityBot, Google-Extended… liczone po stronie serwera (middleware). Brak botów = AI nie zbiera jeszcze Twoich treści." />
          <Card>
            <Bars
              items={s.bots}
              empty="Jeszcze brak wizyt botów AI. Sygnał ruszy po wpięciu middleware na stronie klienta."
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
