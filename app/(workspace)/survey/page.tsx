import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, Kpi, Kpis, QHead } from "@/components/stats/blocks";
import { getSurveySnapshot } from "@/services/survey";

/** TEMPORARY (Belmont only) — see lib/survey-module.ts for how to remove. */

export const metadata: Metadata = { title: "Survey" };

function when(ts: string): string {
  return new Date(ts).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  });
}

export default async function SurveyPage() {
  const s = await getSurveySnapshot();
  if (!s.site || !s.enabled) notFound();

  const top = s.options[0];
  const aiPct = s.answers ? Math.round((s.fromAi / s.answers) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Survey"
        description={`How guests found ${s.site.name}. Answers from the popup on ${s.site.domain ?? "the site"}/visit.`}
      />
      <Kpis>
        <Kpi label={`Answers · ${s.days} days`} value={s.answers} hint="One answer per guest who picked an option in the popup. Skipping is not possible, the page stays locked until an answer is sent." />
        <Kpi label="Top source" value={top ? top.label : "–"} hint="The option picked most often." />
        <Kpi label={<>Via AI assistants · {aiPct}%</>} value={s.fromAi} highlight hint="Guests who said ChatGPT, Gemini or another AI sent them." />
        <Kpi label="Typed under Other" value={s.others.length} hint="Free-text answers, shown below. Stored in the event name, so long answers are cut at about 27 characters." />
      </Kpis>

      <QHead step={1} title="Where did guests hear about us?" sub={`Last ${s.days} days, all answers.`} />
      <Card>
        <Bars items={s.options} pct empty="No answers yet. They appear here as guests scan the QR code." />
      </Card>

      <QHead step={2} title="What did people write under “Other”?" sub="Newest first." />
      <Card>
        {s.others.length === 0 ? (
          <p className="py-2 text-[13px] text-muted-foreground">Nothing typed yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {s.others.map((o, i) => (
              <li key={`${o.ts}-${i}`} className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
                <span className="min-w-0 break-words text-foreground">{o.text}</span>
                <span className="shrink-0 text-[11.5px] text-muted-foreground">
                  {when(o.ts)}
                  {o.lang ? ` · ${o.lang.slice(0, 2).toUpperCase()}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <QHead step={3} title="Which language did they answer in?" sub="Taken from the phone's language." />
      <Card>
        <Bars items={s.languages} muted pct empty="No answers yet." />
      </Card>
    </>
  );
}
