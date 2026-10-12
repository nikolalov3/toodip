import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Card, QHead } from "@/components/stats/blocks";
import { CopyBlock } from "@/components/stats/copy-block";
import { LinkSiteForm } from "@/components/stats/link-site-form";
import { getStatsSite } from "@/services/stats";

export const metadata: Metadata = { title: "Instalacja" };

export default async function InstallPage() {
  const site = await getStatsSite();
  const snippet = site
    ? `<script defer src="https://stats.toodip.com/s.js" data-id="${site.id}"></script>`
    : "";
  return (
    <>
      <PageHeader title="Instalacja" description="Kod do wklejenia na stronę." />
      {!site ? (
        <>
          <QHead step={1} title="Jaką stronę mierzymy?" sub="Podaj adres. Jeśli strona była już w stats, jej dane zostaną podpięte." />
          <Card>
            <LinkSiteForm />
          </Card>
        </>
      ) : (
        <>
          <QHead step={1} title="Skrypt na stronę" sub="Wklej tuż przed </head> na stronie." hint="Liczy ludzi i konwersje. Boty AI wymagają dodatkowo middleware, dokładamy osobno." />
          <Card>
            <CopyBlock text={snippet} />
          </Card>
          <QHead step={2} title="Własne zdarzenia (opcjonalnie)" sub="Przycisk z atrybutem data-toodip albo wywołanie z kodu." />
          <Card>
            <CopyBlock text={`<a href="/rezerwacja" data-toodip="rezerwacja">Zarezerwuj stolik</a>\n\n<script>window.toodip && window.toodip('rezerwacja');</script>`} />
            <p className="mt-3 text-[13px] text-muted-foreground">
              Nazwy zaczynające się od <code>see_</code> trafiają do zaangażowania (dojście do sekcji), nie do konwersji.
            </p>
          </Card>
        </>
      )}
    </>
  );
}
