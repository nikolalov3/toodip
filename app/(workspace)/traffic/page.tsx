import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, NoSite, QHead } from "@/components/stats/blocks";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Ruch z AI" };

export default async function TrafficPage() {
  const s = await getStatsSnapshot();
  return (
    <>
      <PageHeader title="Ruch z AI" description="Kto realnie przysyła Ci ludzi z asystentów AI." />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <QHead step={1} title="Który asystent mnie odsyła?" sub="Wejścia z AI wg asystenta." hint="Rozbicie wejść z AI według asystenta (ChatGPT, Perplexity, Gemini, Claude…)." />
          <Card>
            <Bars items={s.assistants} empty="Jeszcze zero. Gdy ChatGPT, Perplexity lub Gemini zaczną odsyłać, pojawią się tu." />
          </Card>
          <QHead step={2} title="Skąd w ogóle biorą się wejścia?" sub="Cały ruch wg kanału." hint="Podział całego ruchu na kanały: AI, wyszukiwarki, social, bezpośrednie i inne. Rozpoznawane po źródle wejścia." />
          <Card>
            <Bars items={s.channels} pct empty="Brak danych." />
          </Card>
        </>
      )}
    </>
  );
}
