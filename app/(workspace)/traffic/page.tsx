import type { Metadata } from "next";

import { PageHeader } from "@/components/common/surfaces";
import { Bars, Card, ErrorCard, NoSite, QHead, Sparkline, Verdict } from "@/components/stats/blocks";
import { getStatsSnapshot, KNOWN_ASSISTANTS } from "@/services/stats";

export const metadata: Metadata = { title: "AI Traffic" };

/** "ChatGPT", "ChatGPT and Gemini", "ChatGPT, Gemini and Claude". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default async function TrafficPage() {
  const s = await getStatsSnapshot();
  const period = `Last ${s.days} days`;
  const trends = new Map(s.assistantTrends.map((t) => [t.label, t.points]));
  const sending = s.assistants.filter((a) => a.value > 0).map((a) => a.label);
  const silent = KNOWN_ASSISTANTS.filter((name) => !sending.includes(name));
  const verdict =
    sending.length === 0
      ? null
      : silent.length === 0
        ? "Every assistant we recognise has sent at least one visitor."
        : `${listNames(sending)} ${sending.length === 1 ? "sends" : "send"} visitors; ${listNames(silent)} ${silent.length === 1 ? "does" : "do"} not yet.`;
  return (
    <>
      <PageHeader title="AI Traffic" description="Which assistants actually send people to your site." />
      {s.error && <ErrorCard message={s.error} />}
      {!s.site ? (
        s.error ? null : <NoSite />
      ) : (
        <>
          <QHead step={1} title="Which assistant refers me?" period={period} sub="Visits from AI, by assistant, with the day-by-day line." hint="A visit counts for an assistant when the visitor arrived from it (ChatGPT, Perplexity, Gemini, Claude, Copilot and a few smaller ones). The line is that assistant's visits per day." />
          <Card>
            <Bars
              items={s.assistants}
              empty="Zero so far. When ChatGPT, Perplexity or Gemini start referring, they show up here."
              aside={(item) => (
                <Sparkline values={trends.get(item.label) ?? []} label={`${item.label}: visits per day, last ${s.days} days`} />
              )}
            />
            {verdict && <Verdict tone={silent.length === 0 ? "positive" : "caution"}>{verdict}</Verdict>}
          </Card>

          <QHead step={2} title="Which pages do assistants send people to?" period={period} sub="The page a visitor from AI landed on, by visits." hint="An assistant links to one page and the visitor arrives there. If the page with your menu or hours is not on this list, the assistants are not pointing people to it." />
          <Card>
            <Bars items={s.aiLanding} empty="No visits from AI yet, so no landing pages." />
          </Card>

          <QHead step={3} title="Where does traffic come from at all?" period={period} sub="All page views by channel." hint="AI, search engines, social, direct and other, recognised by the referrer. Direct = typed in or opened from a bookmark. Other = a link from a site we do not classify." />
          <Card>
            <Bars items={s.channels} pct empty="No data." />
          </Card>
        </>
      )}
    </>
  );
}
