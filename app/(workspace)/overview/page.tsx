import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, Kpi, Kpis, NoSite, QHead } from "@/components/stats/blocks";
import { TrendChart } from "@/components/stats/trend-chart";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Przegląd" };

export default async function OverviewPage() {
  const s = await getStatsSnapshot();
  return (
    <>
      <PageHeader title="Przegląd" description={s.site ? `${s.site.name}${s.site.domain ? ` · ${s.site.domain}` : ""}` : "Ruch, źródła i konwersje Twojej strony."} />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <Kpis>
            <Kpi label={`Odsłony · ${s.days} dni`} value={s.pageviews} hint="Każde wejście na stronę (page view). Przejścia w obrębie strony też liczone. Mierzone skryptem s.js w przeglądarce odwiedzającego." />
            <Kpi label={`Unikalni · ${s.days} dni`} value={s.uniques} hint="Szacunkowa liczba różnych osób w oknie 30 dni. Cookieless: losowy identyfikator w przeglądarce, bez danych osobowych, osobny dla każdej witryny." />
            <Kpi label={<>Z AI · {s.fromAiPct}%</>} value={s.fromAi} highlight hint="Odsłony, które przyszły z asystentów AI (ChatGPT, Perplexity, Gemini, Claude…). Rozpoznawane po źródle wejścia." />
            <Kpi label={`Konwersje · ${s.days} dni`} value={s.conversions} highlight hint="Kliknięcia, które coś znaczą: telefon, dojazd, Instagram, Facebook, rezerwacja, przyciski CTA. Dojścia do sekcji liczone osobno jako zaangażowanie." />
          </Kpis>

          <QHead step={1} title="Ile ludzi i skąd?" sub="Odsłony dzień po dniu. Niebieskie = z AI, szare = reszta." hint="Odsłony dzień po dniu, ostatnie 14 dni." />
          <Card>
            <TrendChart points={s.trend} />
          </Card>

          <QHead step={2} title="Które strony ogląda ruch?" sub="Najczęściej otwierane podstrony (30 dni)." />
          <Card>
            <Bars items={s.pages} muted empty="Brak danych. Wklej skrypt i wejdź na stronę." />
          </Card>
        </>
      )}
    </>
  );
}
