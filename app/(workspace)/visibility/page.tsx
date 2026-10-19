import { ArrowDownRight, ArrowUpRight, Lock, Minus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader, Panel } from "@/components/common/surfaces";
import { Bars, Card, Hint, Kpi, Kpis, QHead } from "@/components/stats/blocks";
import { Donut } from "@/components/stats/donut";
import { buttonVariants } from "@/components/ui/button";
import { MeasurePanel, type BatteryPrompt } from "@/components/visibility/measure-panel";
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
import {
  getVisibilityOverview,
  type IntentSummary,
  type Platform,
  type PlatformSummary,
  type SourceCategory,
} from "@/services/visibility";

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
  chatgpt: "GPT",
  google_aio: "AIO",
  perplexity: "PPLX",
  other: "?",
};

/** Which surface feeds each platform, per the citation data. */
const PLATFORM_PRESCRIPTIONS: Record<Platform, string> = {
  google_aio:
    "Cites the Google record almost exclusively. Absent here means the Business Profile is underdocumented: attributes, photos, Q&A, review replies.",
  perplexity:
    "Cites Instagram, Facebook, blogs and venue websites. Absent here means no social activity and nothing on the venue's own site worth citing.",
  chatgpt:
    "Cites guides, lists and structured venue pages found by web search. Absent here means the venue is missing from guides and has no structured facts (menu, hours, district) on its own site.",
  other: "",
};

/** The prescription, rewritten as the one thing to go do. */
const PLATFORM_ACTIONS: Record<Platform, string> = {
  google_aio:
    "Complete your Google Business Profile: fill in attributes, add fresh photos, answer the Q&A section and reply to reviews.",
  perplexity:
    "Post regularly on Instagram and Facebook, and put content worth citing on your own website.",
  chatgpt:
    "Put structured facts on your own site (menu with prices, hours, district, FAQ) and get listed in city guides and traveler lists.",
  other: "",
};

const STATUS_STYLES: Record<IntentSummary["status"], string> = {
  none: "bg-critical-soft text-critical",
  flicker: "bg-caution-soft text-caution",
  present: "bg-positive-soft text-positive",
};

const STATUS_LABELS: Record<IntentSummary["status"], string> = {
  none: "Absent",
  flicker: "Flickering",
  present: "Present",
};

const STATUS_ORDER: Record<IntentSummary["status"], number> = { none: 0, flicker: 1, present: 2 };

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

const CATEGORY_COLOR: Record<SourceCategory, string> = {
  Google: "#34d399",
  Social: "#a78bfa",
  "Guides & blogs": "#3b82f6",
  "Travel aggregators": "#fbbf24",
  Reddit: "#fb7185",
  "Other & venue sites": "#6b7280",
};

/** "0%" must mean zero; a tiny nonzero share reads as "<1%" instead. */
function pct(rate: number): string {
  if (rate > 0 && rate < 0.005) return "<1%";
  return `${Math.round(rate * 100)}%`;
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

  if (!canRead) {
    return (
      <>
        <PageHeader title="AI Visibility" description="Whether AI assistants recommend your venue when customers ask, and what to fix so they do." />
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

  if (!overview.hasData) {
    return (
      <>
        <PageHeader title="AI Visibility" description="Whether AI assistants recommend your venue when customers ask, and what to fix so they do." />
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

  // ── Headline numbers: latest measurement day, delta vs the previous one ───
  const last = overview.timeline[overview.timeline.length - 1];
  const prev = overview.timeline.length > 1 ? overview.timeline[overview.timeline.length - 2] : undefined;
  const score = last ? Math.round(last.score * 100) : 0;
  const delta = prev ? score - Math.round(prev.score * 100) : null;
  const current = overview.current!;

  const rankedPlatforms = overview.platforms
    .filter((p) => p.runs > 0)
    .sort((a, b) => a.ownMentions / a.runs - b.ownMentions / b.runs);
  const weakest: PlatformSummary | undefined = rankedPlatforms[0];
  const platformsUsed = overview.platforms.filter((p) => p.runs > 0).map((p) => PLATFORM_LABELS[p.platform]);

  const sortedIntents = [...overview.intents].sort(
    (a, b) =>
      Number(a.isBranded) - Number(b.isBranded) ||
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name),
  );

  const domains = overview.domains;
  const byCategory = new Map<SourceCategory, number>();
  for (const d of domains) byCategory.set(d.category, (byCategory.get(d.category) ?? 0) + d.total);
  const ownCited = overview.metrics.ownCitedSources.length > 0;
  const ownRank = overview.metrics.sovRank;

  return (
    <>
      <PageHeader
        title="AI Visibility"
        description="Whether AI assistants recommend your venue when customers ask, and what to fix so they do."
      />
      <VisibilitySubNav />

      {/* Context line, like the stats panel: engine · date · questions · category */}
      <p className="text-[13px] text-muted-foreground">
        {platformsUsed.join(", ")} · {current.label} ·{" "}
        <span className="text-numeric">{current.categoryRuns}</span> answers ·{" "}
        <span className="font-medium text-foreground">{profile.category}</span>
        {profile.district || profile.city ? ` in ${[profile.district, profile.city].filter(Boolean).join(", ")}` : ""}
      </p>

      <Kpis>
        <Kpi
          label="AI share of voice"
          value={pct(overview.metrics.shareOfVoice)}
          highlight
          hint="Your slice of all venue mentions across the answers. Moves when rivals gain or lose, not only when you do."
        />
        <Kpi
          label={
            <>
              Recommended
              {delta !== null && (
                <span
                  className={cn(
                    "ml-2 inline-flex items-center gap-0.5 text-[11px] font-medium",
                    delta > 0 ? "text-positive" : delta < 0 ? "text-critical" : "text-muted-foreground",
                  )}
                >
                  {delta > 0 ? <ArrowUpRight className="size-3" /> : delta < 0 ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
                  {delta > 0 ? "+" : ""}
                  {delta} pts
                </span>
              )}
            </>
          }
          value={`${score}%`}
          hint="Share of answers in the latest measurement that name you. A monthly report counts as one measurement. Questions naming you directly are excluded."
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
          hint="Your position among every venue the assistants name for the same questions."
        />
        <Kpi
          label="Your site cited"
          value={<span className={ownCited ? "text-positive" : "text-critical"}>{ownCited ? "Yes" : "No"}</span>}
          hint={
            ownCited
              ? `Cited in ${pct(overview.metrics.citationRate)} of answers: ${overview.metrics.ownCitedSources.slice(0, 3).join(", ")}`
              : "No answer cites your website or profiles as a source. The assistants describe you from other people's pages."
          }
        />
      </Kpis>

      {/* Next step and trend side by side */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recommended next step</p>
          {weakest ? (
            <>
              <p className="mt-2 text-[14px] font-semibold">
                Weakest platform: {PLATFORM_LABELS[weakest.platform]} · named in {weakest.ownMentions} of {weakest.runs} answers
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{PLATFORM_ACTIONS[weakest.platform]}</p>
              <a href="#plan" className="mt-3 inline-block text-[12.5px] text-brand hover:underline">
                See the full plan ↓
              </a>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">Run a measurement to get a recommendation.</p>
          )}
        </Card>
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Score over time
            <Hint text="Share of answers naming you, one point per measurement day." />
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

      <QHead step={1} title="Who is taking my spot?" sub="Share of AI recommendations. Your venue highlighted." hint="Venues the assistants name for the same customer questions. Share = answers naming the venue / all answers. This is your real competition in AI, not necessarily the one on Google." />
      <Card>
        <Donut
          slices={overview.leaderboard.map((row) => ({ label: row.name, value: row.runsMentioned, own: row.isOwn, note: pct(row.share) }))}
          center={pct(overview.metrics.shareOfVoice)}
          centerLabel="your share"
          maxSlices={9}
        />
        <div className="mt-4 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
          <Link href="/visibility/share" className="text-brand hover:underline">
            Share of voice in depth →
          </Link>{" "}
          trend per rival, per question type, per platform, head to head.
        </div>
      </Card>

      <QHead step={2} title="What are the AIs reading?" sub="The sources behind the answers, and whether yours is among them." hint="If your domain is not here, the assistants have nothing of yours to recommend you with. The count on the right is how many answers citing that site also named you: co-occurrence, not proof the site wrote about you." />
      <Card>
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
          <div className="min-w-0 flex-1">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-medium">Domain</th>
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 pr-2 font-medium"> </th>
                  <th className="py-2 text-right font-medium">Cited</th>
                  <th className="py-2 pl-3 text-right font-medium">Names you</th>
                </tr>
              </thead>
              <tbody>
                {domains.slice(0, 10).map((d) => {
                  const max = domains[0]?.total ?? 1;
                  const isOwn = overview.metrics.ownCitedSources.some((s) => s.includes(d.domain));
                  return (
                    <tr key={d.domain} className={cn("border-b border-border/60 last:border-b-0", isOwn && "text-brand")}>
                      <td className="max-w-[180px] truncate py-2 font-medium" title={d.domain}>
                        {d.domain}
                        {isOwn && <span className="ml-1.5 text-[10px] uppercase tracking-wide">you</span>}
                      </td>
                      <td className="py-2">
                        <span className="whitespace-nowrap rounded-[3px] px-1.5 py-0.5 text-[11px]" style={{ background: `${CATEGORY_COLOR[d.category]}22`, color: CATEGORY_COLOR[d.category] }} title={d.category}>
                          {CATEGORY_SHORT[d.category]}
                        </span>
                      </td>
                      <td className="w-[28%] py-2 pr-2">
                        <span className="block h-[5px] overflow-hidden rounded-[2px] bg-muted">
                          <i className="block h-full rounded-[2px]" style={{ width: `${Math.round((d.total / max) * 100)}%`, background: CATEGORY_COLOR[d.category] }} />
                        </span>
                      </td>
                      <td className="text-numeric py-2 text-right font-semibold">{d.total}</td>
                      <td className={cn("text-numeric py-2 pl-3 text-right", d.runsWithOwnMention > 0 ? "text-positive" : "text-muted-foreground")}>
                        {d.runsWithOwnMention > 0 ? `${d.runsWithOwnMention}×` : "never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <QHead step={3} title="Where exactly am I missing?" sub="Each row is one type of customer question, with your status per platform." hint="Absent = never named for this type. Flickering = sometimes (we ask each question twice for exactly this reason). Present = reliably named. Flickering rows are the cheapest wins." />
      <Card className="overflow-hidden p-0">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Question type</th>
              <th className="px-3 py-2.5 text-right font-medium">Answers</th>
              <th className="px-3 py-2.5 text-right font-medium">Named</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Who owns it</th>
            </tr>
          </thead>
          <tbody>
            {sortedIntents.map((intent) => (
              <tr key={intent.name} className={cn("border-b border-border/60 last:border-b-0", intent.isBranded && "text-muted-foreground")}>
                <td className="px-4 py-2.5 font-medium">
                  {intent.name}
                  <span className="ml-2 text-[11px] uppercase text-muted-foreground">{intent.language}</span>
                  {intent.isBranded && <span className="ml-2 rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">branded</span>}
                </td>
                <td className="text-numeric px-3 py-2.5 text-right text-muted-foreground">{intent.runs}</td>
                <td className="text-numeric px-3 py-2.5 text-right">{intent.ownMentions}</td>
                <td className="px-3 py-2.5">
                  <span className={cn("rounded-[3px] px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[intent.status])}>{STATUS_LABELS[intent.status]}</span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {intent.owners.slice(0, 3).map((o) => `${o.name} ${pct(o.share)}`).join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <QHead step={4} title="How does each assistant see me?" sub="Named rate per platform and what that platform reads." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.platforms
            .filter((p) => p.runs > 0)
            .map((p) => (
              <Card key={p.platform}>
                <p className="text-[13px] font-semibold">{PLATFORM_LABELS[p.platform]}</p>
                <p className="text-numeric mt-1 text-[24px] font-semibold tracking-tight">{pct(p.ownMentions / p.runs)}</p>
                <p className="text-[12px] text-muted-foreground">named in {p.ownMentions} of {p.runs} answers</p>
                <div className="mt-3">
                  <Bars items={p.topDomains.slice(0, 4).map((d) => ({ label: d.domain, value: d.count }))} empty="No citations." muted />
                </div>
              </Card>
            ))}
      </div>

      <section id="plan" className="scroll-mt-6">
        <QHead step={5} title="What do I do about it?" sub="Each assistant reads a different part of the internet, so each one has its own fix. Start with the weakest." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rankedPlatforms.map((p, index) => (
            <Card key={p.platform} className={cn(index === 0 && "border-brand/50")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-semibold">{PLATFORM_LABELS[p.platform]}</p>
                {index === 0 && <span className="rounded-[3px] bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">Start here</span>}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                named in {p.ownMentions} of {p.runs} answers ({pct(p.ownMentions / p.runs)})
              </p>
              <p className="mt-3 text-[13px] leading-relaxed">{PLATFORM_ACTIONS[p.platform]}</p>
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">Why: {PLATFORM_PRESCRIPTIONS[p.platform]}</p>
            </Card>
          ))}
        </div>
      </section>

      <QHead step={6} title="Is AI sending people to the site?" sub="Visits from assistants, from the traffic module." hint="Needs the tracker on the venue's website (Install). Counts visits whose referrer is an AI assistant." />
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

      <QHead step={7} title="What have I changed so far?" sub="Every fix logged with its date, so score movement can be traced back to what you did." />
      <Card className="p-0">
        {overview.interventions.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {overview.interventions.map((i) => (
              <li key={i.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span className="rounded-[3px] border border-border px-1.5 py-0.5">{KIND_LABELS[i.kind] ?? i.kind}</span>
                  <span>{formatDate(`${i.performedOn}T00:00:00.000Z`)}</span>
                </div>
                <p className="mt-1 text-[13px]">{i.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <details className="mt-8">
        <summary className="cursor-pointer text-[13px] font-medium text-muted-foreground hover:text-foreground">
          Measurement details: every question asked and every raw AI answer
        </summary>
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
              <p className="text-[12px] text-muted-foreground">The evidence itself. Answers that named you float to the top.</p>
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
