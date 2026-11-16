import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/surfaces";
import { Card, ErrorCard, MiniBars, NoSite, QHead, Verdict } from "@/components/stats/blocks";
import { WebsiteTabs } from "@/components/stats/website-tabs";
import { formatDate } from "@/lib/format";
import { getStatsSnapshot, KEY_BOTS, type BotActivity } from "@/services/stats";

export const metadata: Metadata = { title: "AI crawlers" };

function findBot(activity: BotActivity[], name: string): BotActivity | undefined {
  const needle = name.toLowerCase();
  return activity.find((b) => b.bot.toLowerCase().includes(needle));
}

export default async function BotsPage() {
  const s = await getStatsSnapshot();
  const period = `Last ${s.days} days`;
  const verdicts = KEY_BOTS.map(({ bot, assistant }) => {
    const seen = findBot(s.botActivity, bot);
    if (seen && seen.total > 0) return null;
    if (seen?.last) {
      return `${bot} was last here on ${formatDate(seen.last)}: ${assistant} is working from an older copy of your site.`;
    }
    return `${bot} has not visited in ${s.days} days: ${assistant} cannot read your menu or hours.`;
  }).filter((line): line is string => line !== null);
  return (
    <>
      <PageHeader title="Website" description="Whether the assistants' crawlers fetch your site: an assistant can only quote pages its crawler has read." />
      <WebsiteTabs />
      {s.error && <ErrorCard message={s.error} />}
      {!s.site ? (
        s.error ? null : <NoSite />
      ) : (
        <>
          <QHead
            step={1}
            title="Does AI read my site at all?"
            period={period}
            sub={`The assistants' crawlers that fetched your pages, week by week for ${s.botWeeks} weeks, and what they read.`}
            hint="Each assistant has its own crawler: GPTBot feeds ChatGPT, PerplexityBot feeds Perplexity, ClaudeBot feeds Claude, Google-Extended feeds Gemini. A crawler that never comes means that assistant has nothing fresh of yours to work with."
          />
          <Card>
            {s.botActivity.length === 0 ? (
              <p className="py-2 text-[13px] text-muted-foreground">
                No AI crawler has fetched the site in the last {s.botWeeks} weeks. Crawler visits are counted on your
                server, not in the browser; the setup is under{" "}
                <Link href="/install" className="text-brand underline-offset-2 hover:underline">
                  Install
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="mb-2 flex justify-between gap-4 text-[12px] text-muted-foreground">
                  <span>Crawler, with fetches per week</span>
                  <span>Fetches in {s.days} days</span>
                </p>
                <ul className="divide-y divide-border">
                  {s.botActivity.map((b) => (
                    <li key={b.bot} className="py-3 first:pt-0 last:pb-0 text-[13px]">
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={b.bot}>
                          {b.bot}
                        </span>
                        <MiniBars values={b.weeks} label={`${b.bot}: fetches per week, last ${s.botWeeks} weeks`} />
                        <b className="text-numeric min-w-[40px] text-right font-semibold">{b.total}</b>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {b.last ? `Last fetch ${formatDate(b.last)}` : "Last fetch unknown"}
                        {b.paths.length > 0 && ` · reads ${b.paths.map((p) => `${p.label} (${p.value})`).join(", ")}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <QHead step={2} title="What does that mean for me?" period={period} sub="One line per assistant whose crawler is missing." />
          <Card>
            {verdicts.length === 0 ? (
              <Verdict tone="positive">Every main crawler has fetched the site in the last {s.days} days. The assistants have a fresh copy to work with.</Verdict>
            ) : (
              verdicts.map((line) => (
                <Verdict key={line} tone="caution">
                  {line}
                </Verdict>
              ))
            )}
            <p className="mt-4 text-[13px] text-muted-foreground">
              Crawlers only show up here once your server reports them. The setup is under{" "}
              <Link href="/install" className="text-brand underline-offset-2 hover:underline">
                Install
              </Link>
              .
            </p>
          </Card>
        </>
      )}
    </>
  );
}
