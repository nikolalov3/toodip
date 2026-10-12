import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, NoSite, QHead } from "@/components/stats/blocks";
import { getStatsSnapshot } from "@/services/stats";

export const metadata: Metadata = { title: "Konwersje" };

export default async function ConversionsPage() {
  const s = await getStatsSnapshot();
  return (
    <>
      <PageHeader title="Konwersje" description="Co ruch robi na stronie: telefon, dojazd, rezerwacja." />
      {!s.site ? (
        <NoSite />
      ) : (
        <>
          <QHead step={1} title="Co robi ruch na stronie?" sub="Kliknięcia, które prowadzą do wizyty albo kontaktu." hint="Skrypt łapie je automatycznie z linków (tel:, mapy, Instagram, Facebook). Dodatkowe można oznaczyć atrybutem data-toodip lub wywołać toodip('nazwa')." />
          <Card>
            <Bars items={s.conversionsByKind} pct empty="Brak jeszcze konwersji. Liczymy klik w telefon, mapy, IG i Facebooka." />
          </Card>
          <QHead step={2} title="Dokąd ludzie dochodzą na stronie?" sub="Sekcje, do których ruch przewija. Nie liczą się jako konwersje." hint="Jedno zdarzenie na sekcję na odsłonę. To zaangażowanie, nie konwersja." />
          <Card>
            <Bars items={s.engagement} muted empty="Strona nie wysyła jeszcze zdarzeń sekcji. Opcjonalne: toodip('see_nazwa') przy dojściu do sekcji." />
          </Card>
        </>
      )}
    </>
  );
}
