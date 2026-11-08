import { ArrowDownRight, ArrowUpRight, Lock, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel } from "@/components/common/surfaces";
import { Bars, Card, Hint, Kpi, Kpis, QHead } from "@/components/stats/blocks";
import { Donut } from "@/components/stats/donut";
import { buttonVariants } from "@/components/ui/button";
import { ChangesCard } from "@/components/visibility/changes-card";
import { IntentRows } from "@/components/visibility/intent-rows";
import { LogChangeForm } from "@/components/visibility/log-change-form";
import { MeasurePanel, type BatteryPrompt } from "@/components/visibility/measure-panel";
import { PlanCard } from "@/components/visibility/plan-card";
import { SaysCard } from "@/components/visibility/says-card";
import { ScoreTrend } from "@/components/visibility/score-trend";
import { VisibilitySubNav } from "@/components/visibility/sub-nav";
import { canEditSettings, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { getUserClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getBillingSnapshot } from "@/services/billing";
import {
  batteryGenerationConfigured,
  measurementConfigured,
  suggestPromptBattery,
} from "@/services/measurement";
import { getStatsSnapshot } from "@/services/stats";
import { getVisibilityOverview, type Platform, type SourceCategory } from "@/services/visibility";

export const metadata: Metadata = { title: "AI Visibility" };

/** Measurement runs live inside server actions invoked from this route. */
export const maxDuration = 60;

const PLATFORM_LABELS: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  google_aio: "Google AI Overviews",
  perplexity: "Perplexity",
  other: "Other",
};

const PLATFORM_SHORT: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  google_aio: "Google AI",
  perplexity: "Perplexity",
  other: "Other",
};

/** Which surface feeds each platform, per the citation data. */
const PLATFORM_READS: Record<Platform, string> = {
  google_aio: "Reads the Google record almost exclusively: attributes, photos, Q&A, review replies.",
  perplexity: "Reads Instagram, Facebook, blogs and venue websites.",
  chatgpt: "Reads guides, lists and structured venue pages found by web search.",
  other: "",
};

/** What to do about a source that backs rivals but never the venue. */
const GAP_ACTIONS: Record<SourceCategory, string> = {
  Google: "Complete the Google Business Profile: attributes, photos, Q&A, review replies.",
  Social: "Post about this on Instagram or Facebook; the assistants read public profiles.",
  "Guides & blogs": "Pitch a listing or a mention to this guide; it is already in the answers.",
  "Travel aggregators": "Claim and complete the listing on this site.",
  Reddit: "Join the thread openly as the owner, or ask regulars to recommend you there.",
  "Other & venue sites": "Check whether this site lists venues; a page about you here is read next time.",
};

const KIND_LABELS: Record<string, string> = {
  record_update: "Google record",
  review_reply: "Review reply",
  site_change: "Website",
  guide_entry: "Guide entry",
  social_post: "Social",
  other: "Other",
};

const CATEGORY_SHORT: Record<SourceCategory, string> = {
  Google: "Google",
  Social: "Social",
  "Guides & blogs": "Guides",
  "Travel aggregators": "Travel",
  Reddit: "Reddit",
  "Other & venue sites": "Venue sites",
};

/** Chart palette tokens, see app/globals.css. */
const CATEGORY_COLOR: Record<SourceCategory, string> = {
  Google: "var(--chart-2)",
  Social: "var(--chart-4)",
  "Guides & blogs": "var(--chart-1)",
  "Travel aggregators": "var(--chart-3)",
  Reddit: "var(--chart-5)",
  "Other & venue sites": "var(--muted-foreground)",
};

/** "0%" must mean zero; a tiny nonzero share reads as "<1%" instead. */
function pct(rate: number): string {
  if (rate > 0 && rate < 0.005) return "<1%";
  return `${Math.round(rate * 100)}%`;
}

function DeltaBadge({ value, vs }: { value: number; vs: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "ml-2 inline-flex items-center gap-0.5 text-[11px] font-medium",
        value > 0 ? "text-positive" : value < 0 ? "text-critical" : "text-muted-foreground",
      )}
      title={`Compared with ${vs}, measured the same way`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {value > 0 ? "+" : ""}
      {value} pts
    </span>
  );
}

function GettingStarted({ canMeasure }: { canMeasure: boolean }) {
  const steps = [
    {
      title: "Save your question set",
      body: "A proposed list of questions your customers ask AI assistants. Review, edit, import your own, then save.",
    },
    {
      title: "Run the first measurement",
      body: "Every question is asked with web search on, twice, and the answers are kept as evidence. A few minutes.",
    },
    {
      title: "Come back in a week",
      body: "Fix what the results point to, measure again, and watch the score move. One measurement is a snapshot; two are a trend.",
    },
  ];
  return (
    <Card className="p-0">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[13px] font-semibold">Getting started</p>
        <p className="text-[12px] text-muted-foreground">
          {canMeasure ? "Three steps to your first visibility score." : "How a workspace gets its first visibility score."}
        </p>
      </div>
      <ol className="grid gap-px bg-border sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="bg-card p-4">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {index + 1}
            </span>
            <p className="mt-2.5 text-[13.5px] font-medium">{step.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default async function VisibilityPage() {
  const session = await requireSession();
  // The profile guard and the data queries start together; the guard only
  // decides whether to redirect, it does not feed the queries.
  const profilePromise = requireBusinessProfile();

  // One wave of queries: plan, measurements, traffic and the saved battery
  // all at once, instead of one after another.
  const supabase = await getUserClient();
  const [profile, billing, overview, traffic, promptRows, used] = await Promise.all([
    profilePromise,
    getBillingSnapshot(),
    getVisibilityOverview(),
    getStatsSnapshot(),
    supabase
      .from("visibility_prompts")
      .select("id, text, language, active, intents(name, is_branded)")
      .eq("tenant_id", session.tenantId)
      .eq("active", true),
    supabase.rpc("visibility_runs_used", { p_tenant: session.tenantId }),
  ]);
  const planDef = PLANS[billing.effectivePlan];
  const canRead = planDef.monthlyRuns > 0 || billing.effectivePlan === "pro";
  const canMeasure = planDef.monthlyRuns > 0;

  const header = (
    <PageHeader title="AI Visibility" description="Whether AI assistants recommend your venue when customers ask, and what to fix so they do." />
  );

  if (!canRead) {
    return (
      <>
        {header}
        <Panel>
          <EmptyState
            icon={Lock}
            title="Part of the Visibility plan"
            description="Measure whether ChatGPT, Google AI Overviews and Perplexity recommend this venue, see which sources they cite, and track the score as you fix things."
          />
          <div className="flex justify-center pb-6">
            <Link href="/billing" className={buttonVariants({ size: "sm" })}>
              See plans
            </Link>
          </div>
        </Panel>
      </>
    );
  }

  // The measurement panel needs the saved battery, grouped by intent.
  const isAdmin = canEditSettings(session.role) && canMeasure;
  let batteryPrompts: BatteryPrompt[] = [];
  let runsUsed = 0;
  if (isAdmin) {
    batteryPrompts = ((promptRows.data ?? []) as unknown as Array<{
      id: string;
      text: string;
      language: string | null;
      intents: { name: string; is_branded: boolean } | null;
    }>).map((row) => ({
      id: row.id,
      text: row.text,
      language: row.language ?? "en",
      intent: row.intents?.name ?? "unknown",
      isBranded: row.intents?.is_branded ?? false,
    }));
    runsUsed = typeof used.data === "number" ? used.data : 0;
  }

  const measurePanel = isAdmin ? (
    <MeasurePanel
      prompts={batteryPrompts}
      suggestions={suggestPromptBattery({
        name: profile.name,
        category: profile.category,
        city: profile.city,
        district: profile.district,
        languages: profile.languages,
      })}
      hasKey={measurementConfigured()}
      canGenerate={batteryGenerationConfigured()}
      runsUsed={runsUsed}
      runsLimit={planDef.monthlyRuns}
    />
  ) : !canMeasure && canEditSettings(session.role) ? (
    <div className="flex items-center justify-between gap-3 rounded-[4px] border border-brand/30 bg-brand-soft px-4 py-3">
      <p className="text-xs">
        <span className="font-medium">Dashboard is read only on Pro.</span> Running measurements is part of the Visibility plan.
      </p>
      <Link href="/billing" className={buttonVariants({ size: "sm", variant: "outline" })}>
        Upgrade
      </Link>
    </div>
  ) : null;

  if (overview.error) {
    return (
      <>
        {header}
        <VisibilitySubNav />
        <Card className="border-critical/40">
          <p className="text-[13px] font-semibold text-critical">The measurements could not be loaded.</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            This is a read error, not an empty workspace: your data is still there. Reload the page; if it keeps failing, write to support with this message:{" "}
            <span className="font-mono">{overview.error}</span>
          </p>
        </Card>
      </>
    );
  }

  if (!overview.hasData) {
    return (
      <>
        {header}
        <VisibilitySubNav />
        <div className="flex flex-col gap-4">
          <GettingStarted canMeasure={canMeasure} />
          {measurePanel ?? (
            <Card>
              <p className="text-[13px] text-muted-foreground">
                No measurements yet. Once the first one runs, this page shows your score, who the assistants recommend instead, and what to fix.
              </p>
            </Card>
          )}
        </div>
      </>
    );
  }

  // ── Headline numbers: latest measurement, delta vs the previous one made the same way ──
  const current = overview.current!;
  const score = Math.round(overview.metrics.brandMentionRate * 100);
  const changes = overview.changes;
  const comparable = changes?.comparable ? changes : null;
  const platformsUsed = overview.platforms.filter((p) => p.runs > 0);
  const platformNames = platformsUsed.map((p) => PLATFORM_LABELS[p.platform]);

  const domains = overview.domains;
  const byCategory = new Map<SourceCategory, number>();
  for (const d of domains) byCategory.set(d.category, (byCategory.get(d.category) ?? 0) + d.total);
  const ownRank = overview.metrics.sovRank;
  const attributed = overview.attributable > 0;
  const ownSourceSet = new Set(attributed ? overview.ownSources.map((s) => s.domain) : overview.metrics.ownCitedSources);
  const gapAction = (g: (typeof overview.gapSources)[number]) =>
    g.ownerRival
      ? `This is ${g.ownerRival}'s own website, read when they are recommended. Your site needs the same facts: menu with prices, hours, district, FAQ.`
      : GAP_ACTIONS[g.category];
  const brandedCount = overview.prompts.filter((p) => p.isBranded).length;

  return (
    <>
      {header}
      <VisibilitySubNav />

      {/* Context line: platform · method · period · sample · category */}
      <p className="text-[13px] text-muted-foreground">
        {platformNames.join(", ")} · {current.method.label} · ×{current.method.reps} per question · {current.label} ·{" "}
        <span className="text-numeric">{current.categoryRuns}</span> answers ·{" "}
        <span className="font-medium text-foreground">{profile.category}</span>
        {profile.district || profile.city ? ` in ${[profile.district, profile.city].filter(Boolean).join(", ")}` : ""}
      </p>

      <Kpis>
        <Kpi
          label={
            <>
              Named in answers
              {comparable && comparable.scoreDelta !== null && <DeltaBadge value={comparable.scoreDelta} vs={comparable.previous!.label} />}
            </>
          }
          value={`${score}%`}
          highlight
          hint="Share of answers in the latest measurement that name you. Questions naming you directly are excluded. The change is against the previous measurement made the same way."
        />
        <Kpi
          label={
            <>
              Share of voice
              {comparable && comparable.sovDelta !== null && <DeltaBadge value={comparable.sovDelta} vs={comparable.previous!.label} />}
            </>
          }
          value={pct(overview.metrics.shareOfVoice)}
          hint="Your mentions as a share of every venue mention in the answers. Moves when rivals gain or lose, not only when you do."
        />
        <Kpi
          label="Rank"
          value={
            ownRank ? (
              <>
                #{ownRank}
                <span className="text-[16px] font-medium text-muted-foreground">/{overview.metrics.sovBrands}</span>
              </>
            ) : (
              "—"
            )
          }
          hint="Your position among every venue the assistants name for the same questions, by how many answers name each."
        />
        <Kpi
          label="Own site cited"
          value={<span className={overview.metrics.citationRate > 0 ? "text-positive" : "text-critical"}>{pct(overview.metrics.citationRate)}</span>}
          hint={
            overview.metrics.citationRate > 0
              ? `Share of answers citing your website or profiles as a source: ${overview.metrics.ownCitedSources.slice(0, 3).join(", ")}. Assistants recommend from pages they can quote.`
              : "No answer cites your website or profiles as a source. The assistants describe you from other people's pages."
          }
        />
      </Kpis>

      {changes && (
        <div className="mt-3">
          <ChangesCard changes={changes} currentLabel={current.label} currentRuns={current.categoryRuns} method={current.method} />
        </div>
      )}

      {/* The plan and the trend side by side: what to do, and whether it has been working */}
      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[1.15fr_1fr]">
        <PlanCard actions={overview.actions} categoryRuns={current.categoryRuns} />
        <Card className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Named in answers over time
            <Hint text="Share of answers naming you, one point per measurement. Measurements made with a different model are drawn as a separate dashed line and never compared with the current one." />
          </p>
          {overview.timeline.length > 1 ? (
            <div className="mt-2">
              <ScoreTrend timeline={overview.timeline} />
            </div>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              One measurement so far: {score}% in {current.label} is your baseline. The next measurement draws the trend here.
            </p>
          )}
        </Card>
      </div>

      {measurePanel && <div className="mt-10">{measurePanel}</div>}

      <section id="types" className="scroll-mt-6">
        <QHead
          step={1}
          title="Where do I stand, question type by question type?"
          sub="Most worth winning first. Open a row for the customers' actual questions, who owns the type and what the assistants read when they name the leader."
          hint="Absent = never named for this type. Flickering = named in fewer than a quarter of the answers (every question is asked more than once for exactly this reason). Present = named in at least a quarter. Bars compare your share with the leading rival's."
        />
        <Card className="p-0">
          <IntentRows intents={overview.intents} />
        </Card>
      </section>

      <section id="says" className="scroll-mt-6">
        <QHead
          step={2}
          title="What do the assistants say about me?"
          sub="The sentences that name you, and the words that travel with your name against the words that travel with your strongest rival's."
          hint="Quotes come from the latest answers with everything but the assistant's own words removed. Word counts are per answer, across every sentence naming the venue; five letters or more, common words dropped."
        />
        <SaysCard venueName={profile.name} quotes={overview.quotes} descriptors={overview.descriptors} rival={overview.rivalDescriptors} />
      </section>

      <QHead
        step={3}
        title="Who is taking my spot?"
        sub="Share of voice: each venue's slice of all mentions in the latest measurement. Your slice highlighted."
        hint="Every venue the assistants name for the same customer questions, one count per answer. The percentage is that venue's share of all mentions, so the slices add up to 100%. This is your real competition in AI, not necessarily the one on Google."
      />
      <Card>
        <Donut
          slices={overview.leaderboard.map((row) => ({
            label: row.name,
            value: row.runsMentioned,
            own: row.isOwn,
            note: `${pct(row.sovShare)} · ${row.runsMentioned} ${row.runsMentioned === 1 ? "answer" : "answers"}`,
          }))}
          center={pct(overview.metrics.shareOfVoice)}
          centerLabel="your share of voice"
          maxSlices={9}
        />
        <div className="mt-4 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
          <Link href="/visibility/share" className="text-brand hover:underline">
            Share of voice in depth →
          </Link>{" "}
          trend per rival, per question type, per platform, head to head.
        </div>
      </Card>

      <section id="sources" className="scroll-mt-6">
        <QHead
          step={4}
          title="What are the AIs reading?"
          sub="The sources behind the answers, which of them back your mentions, and which only ever back your rivals."
          hint={
            attributed
              ? "Category questions only. Cited = answers citing the domain anywhere. Backs you = answers where the domain is the footnote at the very item that names you: the source the assistant used for you, not a site that merely appears in the same answer."
              : "Category questions only. Cited = answers citing the domain anywhere. Alongside you = answers citing the domain that also name you: co-occurrence, because the answer texts of this measurement are not stored."
          }
        />
        <Card>
          <p className="mb-4 text-[13px]">
            {attributed ? (
              overview.ownSources.length > 0 ? (
                <>
                  <span className="font-medium">Behind your mentions:</span>{" "}
                  {overview.ownSources.slice(0, 5).map((s) => `${s.domain} (${s.count})`).join(", ")}
                  {overview.ownSources.length > 5 ? ` and ${overview.ownSources.length - 5} more` : ""}.{" "}
                  <span className="text-muted-foreground">
                    Footnotes at the items naming you, across {overview.attributable} answers.
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">No footnote sits at an item naming you: the assistants name you from memory, with nothing to quote.</span>
              )
            ) : (
              <span className="text-muted-foreground">Answer texts are not stored for this measurement, so sources can only be matched per answer, not per item.</span>
            )}
          </p>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="shrink-0">
              <Donut
                slices={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label: CATEGORY_SHORT[label], value }))}
                center={String(overview.totalCitations)}
                centerLabel="citations"
                maxSlices={6}
                size={150}
                className="md:flex-col md:items-start"
              />
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-medium">Domain</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium"> </th>
                    <th className="py-2 text-right font-medium">Cited</th>
                    <th className="py-2 pl-3 text-right font-medium">{attributed ? "Backs you" : "Alongside you"}</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.slice(0, 10).map((d) => {
                    const max = domains[0]?.total ?? 1;
                    const isOwn = ownSourceSet.has(d.domain);
                    const backs = attributed ? (d.backsYou ?? 0) : d.runsWithOwnMention;
                    return (
                      <tr key={d.domain} className={cn("border-b border-border/60 last:border-b-0", isOwn && "text-brand")}>
                        <td className="max-w-[180px] truncate py-2 font-medium" title={d.domain}>
                          {d.domain}
                          {isOwn && <span className="ml-1.5 text-[10px] uppercase tracking-wide">you</span>}
                        </td>
                        <td className="py-2">
                          <span
                            className="whitespace-nowrap rounded-[3px] px-1.5 py-0.5 text-[11px]"
                            style={{ background: `color-mix(in oklab, ${CATEGORY_COLOR[d.category]} 15%, transparent)`, color: CATEGORY_COLOR[d.category] }}
                            title={d.category}
                          >
                            {CATEGORY_SHORT[d.category]}
                          </span>
                        </td>
                        <td className="w-[28%] py-2 pr-2">
                          <span className="block h-[5px] overflow-hidden rounded-[2px] bg-muted">
                            <i className="block h-full rounded-[2px]" style={{ width: `${Math.round((d.total / max) * 100)}%`, background: CATEGORY_COLOR[d.category] }} />
                          </span>
                        </td>
                        <td className="text-numeric py-2 text-right font-semibold">{d.total}</td>
                        <td className={cn("text-numeric py-2 pl-3 text-right", backs > 0 ? "text-positive" : "text-muted-foreground")}>
                          {backs > 0 ? `${backs}×` : "never"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <div id="gaps" className="scroll-mt-6">
          <Card className="mt-3 p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold">Sources behind your rivals that never back you</p>
              <p className="text-[12px] text-muted-foreground">
                {attributed
                  ? "Cited at a rival's item in at least two answers and never at yours. A guide here is a page the assistants already trust; a rival's own site shows what gets quoted."
                  : "Cited in at least two answers that recommend someone else and in no answer that names you."}
              </p>
            </div>
            {overview.gapSources.length === 0 ? (
              <p className="px-4 py-5 text-[13px] text-muted-foreground">
                Every source cited more than once also backs an answer that names you. Nothing to chase here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Answers</th>
                      <th className="px-3 py-2 font-medium">Backs</th>
                      <th className="px-4 py-2 font-medium">What to do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.gapSources.map((g) => (
                      <tr key={g.domain} className="border-b border-border/60 align-top last:border-b-0">
                        <td className="px-4 py-2.5 font-medium">{g.domain}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{g.ownerRival ? "Rival's site" : CATEGORY_SHORT[g.category]}</td>
                        <td className="text-numeric px-3 py-2.5 text-right">{g.count}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{g.rivals.join(", ")}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{gapAction(g)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </section>

      {platformsUsed.length > 1 && (
        <>
          <QHead step={5} title="How does each assistant see me?" sub="Named rate per platform and what that platform reads." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {platformsUsed.map((p) => (
              <Card key={p.platform}>
                <p className="text-[13px] font-semibold">{PLATFORM_LABELS[p.platform]}</p>
                <p className="text-numeric mt-1 text-[24px] font-semibold tracking-tight">{pct(p.ownMentions / p.runs)}</p>
                <p className="text-[12px] text-muted-foreground">named in {p.ownMentions} of {p.runs} answers</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{PLATFORM_READS[p.platform]}</p>
                <div className="mt-3">
                  <Bars items={p.topDomains.slice(0, 4).map((d) => ({ label: d.domain, value: d.count }))} empty="No citations." muted />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <QHead
        step={platformsUsed.length > 1 ? 6 : 5}
        title="Is AI sending people to the site?"
        sub="Visits from assistants, from the traffic module."
        hint="Needs the tracker on the venue's website (Install). Counts visits whose referrer is an AI assistant."
      />
      <Card>
        {traffic.site ? (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p>
              <span className="text-numeric text-[24px] font-semibold tracking-tight">{traffic.fromAi}</span>
              <span className="ml-2 text-[13px] text-muted-foreground">visits from AI in {traffic.days} days · {traffic.fromAiPct}% of {traffic.pageviews}</span>
            </p>
            <Link href="/traffic" className="text-[12.5px] text-brand hover:underline">
              AI traffic →
            </Link>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No traffic site linked yet. <Link href="/install" className="text-brand hover:underline">Install the tracker</Link> and referral visits from AI show up here.
          </p>
        )}
      </Card>

      <section id="changes" className="scroll-mt-6">
        <QHead
          step={platformsUsed.length > 1 ? 7 : 6}
          title="What have I changed, and did it work?"
          sub="Every fix logged with its date, next to the score before and after it, measured the same way."
          hint="Before = the last measurement finished before the change. After = the first measurement started after it. Only measurements made with the current method count, so the two numbers are comparable."
        />
        <Card className="p-0">
          <div className="border-b border-border">
            <LogChangeForm />
          </div>
          {overview.interventions.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {overview.interventions.map((i) => {
                const delta = i.before && i.after ? Math.round(i.after.score * 100) - Math.round(i.before.score * 100) : null;
                return (
                  <li key={i.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <span className="rounded-[3px] border border-border px-1.5 py-0.5">{KIND_LABELS[i.kind] ?? i.kind}</span>
                        <span>{formatDate(`${i.performedOn}T00:00:00.000Z`)}</span>
                      </div>
                      <p className="mt-1 text-[13px]">{i.description}</p>
                    </div>
                    <div className="shrink-0 text-[12px] text-muted-foreground sm:text-right">
                      {i.before ? (
                        <p>
                          before <span className="text-numeric text-foreground">{pct(i.before.score)}</span> <span className="text-[11px]">({i.before.label})</span>
                        </p>
                      ) : (
                        <p>no comparable measurement before</p>
                      )}
                      {i.after ? (
                        <p>
                          after <span className="text-numeric text-foreground">{pct(i.after.score)}</span> <span className="text-[11px]">({i.after.label})</span>
                          {delta !== null && (
                            <span className={cn("ml-1.5 font-medium", delta > 0 ? "text-positive" : delta < 0 ? "text-critical" : "text-muted-foreground")}>
                              {delta > 0 ? "+" : ""}
                              {delta} pts
                            </span>
                          )}
                        </p>
                      ) : (
                        <p>not measured since</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <details className="mt-8">
        <summary className="cursor-pointer text-[13px] font-medium text-muted-foreground hover:text-foreground">
          How this was measured, every question asked and the raw AI answers
        </summary>
        <Card className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Method</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[160px_1fr]">
            <dt className="text-muted-foreground">Assistant</dt>
            <dd>{platformNames.join(", ")}</dd>
            <dt className="text-muted-foreground">Model and search</dt>
            <dd>{current.method.label}</dd>
            <dt className="text-muted-foreground">When</dt>
            <dd>
              {current.start === current.end ? formatDate(`${current.start}T00:00:00.000Z`) : `${formatDate(`${current.start}T00:00:00.000Z`)} to ${formatDate(`${current.end}T00:00:00.000Z`)}`}
            </dd>
            <dt className="text-muted-foreground">Questions</dt>
            <dd>
              {overview.prompts.length} questions × {current.method.reps} repetitions = {current.runs} answers
              {brandedCount > 0 ? `; ${brandedCount} branded ${brandedCount === 1 ? "question" : "questions"} (naming you) kept out of every score` : ""}
            </dd>
            <dt className="text-muted-foreground">A mention is</dt>
            <dd>Your name in the assistant&apos;s own words. A link to your site or a footnote is a source, counted separately, never a mention.</dd>
            <dt className="text-muted-foreground">A source backs a venue when</dt>
            <dd>Its footnote sits at the list item naming that venue. A site cited elsewhere in the same answer does not count for you.</dd>
            <dt className="text-muted-foreground">Comparisons</dt>
            <dd>Only against measurements made with the same model and search. Other methods are shown as separate lines and never produce a delta.</dd>
          </dl>
        </Card>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card className="p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold">Questions asked</p>
              <p className="text-[12px] text-muted-foreground">Every question in the battery, where it ran and whether you came up.</p>
            </div>
            <ul className="max-h-[480px] divide-y divide-border/60 overflow-y-auto">
              {overview.prompts.map((prompt) => (
                <li key={prompt.text} className="px-4 py-2.5">
                  <p className="text-[13px]">{prompt.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span>{prompt.intent}</span>
                    <span>·</span>
                    <span>{prompt.platforms.map((p) => PLATFORM_SHORT[p]).join(", ")}</span>
                    <span>·</span>
                    <span className={cn("text-numeric", prompt.ownMentions > 0 && "font-medium text-positive")}>
                      {prompt.ownMentions}/{prompt.runs} named
                    </span>
                    {prompt.isBranded && <span className="text-caution">branded</span>}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold">Raw answers</p>
              <p className="text-[12px] text-muted-foreground">
                The evidence itself: {overview.recentRuns.length} of {overview.recentRunsTotal} answers from the latest measurement, those naming you first.
              </p>
            </div>
            <ul className="max-h-[480px] divide-y divide-border/60 overflow-y-auto">
              {overview.recentRuns.map((run) => (
                <li key={run.id} className="px-4 py-2.5">
                  <details>
                    <summary className="cursor-pointer text-[13px] marker:text-muted-foreground">
                      <span className={cn("mr-2 inline-block rounded-[3px] px-1.5 py-0.5 text-[11px]", run.mentionedOwn ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground")}>
                        {run.mentionedOwn ? "named" : "absent"}
                      </span>
                      {run.prompt}
                      <span className="ml-2 text-[12px] text-muted-foreground">{PLATFORM_SHORT[run.platform]}</span>
                    </summary>
                    <div className="mt-2 rounded-[4px] border border-border bg-muted/40 p-3">
                      {run.mentions.length > 0 && (
                        <p className="mb-2 text-[12px] text-muted-foreground">Venues named: {run.mentions.join(", ")}</p>
                      )}
                      <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{run.responseText ?? "(no text recorded)"}</p>
                      {run.citations.length > 0 && (
                        <p className="mt-2 text-[12px] text-muted-foreground">Sources: {run.citations.slice(0, 8).join(", ")}</p>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </details>
    </>
  );
}
