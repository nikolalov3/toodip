import {
  ArrowDownRight,
  ArrowUpRight,
  FlaskConical,
  Lock,
  Minus,
  Radar,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/common/surfaces";
import { buttonVariants } from "@/components/ui/button";
import {
  MeasurePanel,
  type BatteryPrompt,
} from "@/components/visibility/measure-panel";
import { ScoreTrend } from "@/components/visibility/score-trend";
import { canEditSettings, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { PLANS } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { getUserClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  measurementConfigured,
  suggestPromptBattery,
} from "@/services/measurement";
import { getBillingSnapshot } from "@/services/billing";
import {
  getVisibilityOverview,
  type IntentSummary,
  type Platform,
  type PlatformSummary,
} from "@/services/visibility";

export const metadata: Metadata = { title: "Visibility" };

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
    "Cites English-language guides and lists indexed by Bing. Absent here means the venue is missing from tourist guides, Wanderlog lists and Bing's index.",
  other: "",
};

/** The prescription, rewritten as the one thing to go do. */
const PLATFORM_ACTIONS: Record<Platform, string> = {
  google_aio:
    "Complete your Google Business Profile: fill in attributes, add fresh photos, answer the Q&A section and reply to reviews.",
  perplexity:
    "Post regularly on Instagram and Facebook, and put content worth citing on your own website.",
  chatgpt:
    "Get listed in English-language city guides and traveler lists (Wanderlog, food guides) so Bing indexes you.",
  other: "",
};

const STATUS_STYLES: Record<IntentSummary["status"], string> = {
  none: "border-critical/30 bg-critical-soft text-critical",
  flicker: "border-caution/30 bg-caution-soft text-caution",
  present: "border-positive/30 bg-positive-soft text-positive",
};

const STATUS_LABELS: Record<IntentSummary["status"], string> = {
  none: "Absent",
  flicker: "Flickering",
  present: "Present",
};

const STATUS_ORDER: Record<IntentSummary["status"], number> = {
  none: 0,
  flicker: 1,
  present: 2,
};

const KIND_LABELS: Record<string, string> = {
  record_update: "Google record",
  review_reply: "Review reply",
  site_change: "Website",
  guide_entry: "Guide entry",
  social_post: "Social",
  other: "Other",
};

/**
 * Numbered section shell. The page reads as a list of the owner's own
 * questions, each answered by one block, so every heading is a question and
 * every blurb says in one sentence what the block is for.
 */
function Section({
  step,
  question,
  blurb,
  id,
  children,
}: {
  step: number;
  question: string;
  blurb: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-8 scroll-mt-6">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{question}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function OnboardingSteps({ canMeasure }: { canMeasure: boolean }) {
  const steps: Array<{ title: string; body: string }> = [
    {
      title: "Save your question set",
      body: "Below is a proposed list of questions your customers ask AI assistants. Review it and save the ones that fit.",
    },
    {
      title: "Run the first measurement",
      body: "One click asks every question several times and records whether the AI mentions your venue. Takes a few minutes.",
    },
    {
      title: "Come back in a week",
      body: "Fix what the results point to, measure again, and watch the score move. One measurement is a snapshot; two are a trend.",
    },
  ];
  return (
    <Panel>
      <PanelHeader
        title="Getting started"
        description={
          canMeasure
            ? "Three steps to your first visibility score."
            : "How a workspace gets its first visibility score."
        }
      />
      <ol className="grid gap-px bg-border sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="bg-card p-4">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {index + 1}
            </span>
            <p className="mt-2.5 text-sm font-medium">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export default async function VisibilityPage() {
  const session = await requireSession();
  const profile = await requireBusinessProfile();

  // The module is what the Visibility plans sell. Below Pro the page is a
  // pitch, not a dashboard; Pro reads the dashboard but cannot run
  // measurements. Agency workspaces see everything.
  const billing = await getBillingSnapshot();
  const planDef = PLANS[billing.effectivePlan];
  const canRead = planDef.monthlyRuns > 0 || billing.effectivePlan === "pro";
  const canMeasure = planDef.monthlyRuns > 0;

  if (!canRead) {
    return (
      <>
        <PageHeader
          title="Visibility"
          description="See how often AI assistants like ChatGPT recommend your venue, and what to fix so they do."
        />
        <Panel>
          <EmptyState
            icon={Lock}
            title="Part of the Visibility plans"
            description="Measure whether ChatGPT, Google AI Overviews and Perplexity recommend this venue, see which sources they cite, and track the score as you fix things. Available on the Visibility and Unlimited plans; the Pro plan includes the read-only dashboard."
          />
          <div className="flex justify-center pb-6">
            <Link href="/billing" className={buttonVariants({ size: "sm" })}>
              See plans on the Billing page
            </Link>
          </div>
        </Panel>
      </>
    );
  }

  const overview = await getVisibilityOverview();

  // The measurement panel needs the saved battery, grouped by intent.
  const isAdmin = canEditSettings(session.role) && canMeasure;
  let batteryPrompts: BatteryPrompt[] = [];
  if (isAdmin) {
    const supabase = await getUserClient();
    const promptRows = await supabase
      .from("visibility_prompts")
      .select("id, text, active, intents(name, is_branded)")
      .eq("tenant_id", session.tenantId)
      .eq("active", true);
    batteryPrompts = ((promptRows.data ?? []) as unknown as Array<{
      id: string;
      text: string;
      intents: { name: string; is_branded: boolean } | null;
    }>).map((row) => ({
      id: row.id,
      text: row.text,
      intent: row.intents?.name ?? "unknown",
      isBranded: row.intents?.is_branded ?? false,
    }));
  }

  const measurePanel = isAdmin ? (
    <MeasurePanel
      prompts={batteryPrompts}
      suggestions={suggestPromptBattery({
        category: profile.category,
        city: profile.city,
        district: profile.district,
      })}
      hasKey={measurementConfigured()}
    />
  ) : !canMeasure && canEditSettings(session.role) ? (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3">
      <p className="text-xs">
        <span className="font-medium">Dashboard is read only on Pro.</span>{" "}
        Running your own measurements from the panel is part of the Visibility
        plan.
      </p>
      <Link
        href="/billing"
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Upgrade
      </Link>
    </div>
  ) : null;

  if (!overview.hasData) {
    return (
      <>
        <PageHeader
          title="Visibility"
          description="See how often AI assistants like ChatGPT recommend your venue, and what to fix so they do."
        />
        <div className="flex flex-col gap-4">
          <OnboardingSteps canMeasure={canMeasure} />
          {measurePanel ?? (
            <Panel>
              <EmptyState
                icon={Radar}
                title="No measurements yet"
                description="Once the first measurement runs, this page shows your visibility score, who AI assistants recommend instead, and what to fix."
              />
            </Panel>
          )}
        </div>
      </>
    );
  }

  // ── Hero numbers: last measurement day, delta vs the day before ────────────
  const last = overview.timeline[overview.timeline.length - 1];
  const prev =
    overview.timeline.length > 1
      ? overview.timeline[overview.timeline.length - 2]
      : undefined;
  const score = last ? Math.round(last.score * 100) : 0;
  const delta = prev ? score - Math.round(prev.score * 100) : null;

  // The next step comes straight from the platform diagnosis: the platform
  // with the lowest mention rate names the surface to go fix.
  const rankedPlatforms = overview.platforms
    .filter((platform) => platform.runs > 0)
    .sort(
      (a, b) => a.ownMentions / a.runs - b.ownMentions / b.runs,
    );
  const weakest: PlatformSummary | undefined = rankedPlatforms[0];

  const sortedIntents = [...overview.intents].sort(
    (a, b) =>
      Number(a.isBranded) - Number(b.isBranded) ||
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.name.localeCompare(b.name),
  );

  const firstDate = overview.dates[0];
  const lastDate = overview.dates[overview.dates.length - 1];
  const maxLeaderShare = Math.max(...overview.leaderboard.map((row) => row.share), 0.01);
  const topDomains = overview.domains.slice(0, 8);
  const maxDomainTotal = Math.max(...topDomains.map((row) => row.total), 1);

  return (
    <>
      <PageHeader
        title="Visibility"
        description={`How often AI assistants recommend ${profile.name} when customers ask, measured ${
          firstDate === lastDate
            ? `on ${formatDate(`${firstDate}T00:00:00.000Z`)}`
            : `between ${formatDate(`${firstDate}T00:00:00.000Z`)} and ${formatDate(`${lastDate}T00:00:00.000Z`)}`
        }.`}
      />

      {/* ── The one number, in plain words, with the one thing to do next ──── */}
      <Panel className="overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="p-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              AI visibility score
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="text-6xl font-semibold tracking-tight text-numeric">
                {score}
                <span className="text-3xl text-muted-foreground">%</span>
              </span>
              {delta !== null ? (
                <span
                  className={cn(
                    "mb-1.5 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
                    delta > 0
                      ? "border-positive/30 bg-positive-soft text-positive"
                      : delta < 0
                        ? "border-critical/30 bg-critical-soft text-critical"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {delta > 0 ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : delta < 0 ? (
                    <ArrowDownRight className="size-3.5" />
                  ) : (
                    <Minus className="size-3.5" />
                  )}
                  {delta > 0 ? `+${delta}` : delta} pts since{" "}
                  {formatDate(`${prev!.date}T00:00:00.000Z`)}
                </span>
              ) : (
                <span className="mb-1.5 inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  First measurement — this is your baseline
                </span>
              )}
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {last ? (
                <>
                  AI assistants mentioned{" "}
                  <span className="font-medium text-foreground">
                    {profile.name}
                  </span>{" "}
                  in {last.ownMentions} of {last.runs} customer questions asked
                  on {formatDate(`${last.date}T00:00:00.000Z`)}.
                </>
              ) : (
                <>
                  AI assistants mentioned {profile.name} in{" "}
                  {overview.categoryOwnMentions} of {overview.categoryRuns}{" "}
                  customer questions.
                </>
              )}{" "}
              Questions that name the venue directly are counted separately and
              never inflate this number.
            </p>
          </div>
          {weakest && (
            <div className="border-t border-border bg-muted/40 p-6 lg:border-t-0 lg:border-l">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Recommended next step
              </p>
              <p className="mt-2 text-sm font-medium">
                Weakest platform: {PLATFORM_LABELS[weakest.platform]} —
                mentioned in {weakest.ownMentions} of {weakest.runs} answers
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {PLATFORM_ACTIONS[weakest.platform]}
              </p>
              <Link
                href="#playbook"
                className="mt-3 inline-block text-xs font-medium text-brand hover:underline"
              >
                See the full plan below ↓
              </Link>
            </div>
          )}
        </div>
      </Panel>

      {measurePanel && <div className="mt-4">{measurePanel}</div>}

      <Section
        step={1}
        question="Am I visible?"
        blurb="Your score after each measurement. Fix things, measure again, and this line should climb."
      >
        {overview.timeline.length > 1 ? (
          <Panel>
            <ScoreTrend timeline={overview.timeline} />
          </Panel>
        ) : (
          <Panel>
            <p className="px-4 py-6 text-sm text-muted-foreground">
              One measurement so far — the {score}% above is your starting
              point. Run the battery again in about a week and a trend line
              will appear here.
            </p>
          </Panel>
        )}
      </Section>

      <Section
        step={2}
        question="Who is taking my spot?"
        blurb="The venues AI assistants name for the same customer questions. This is your real competition."
      >
        <Panel>
          <ul className="flex flex-col gap-1 p-4">
            {overview.leaderboard.map((row, index) => (
              <li
                key={row.name}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                  row.isOwn && "bg-brand-soft",
                )}
              >
                <span className="w-5 text-right text-numeric text-xs text-muted-foreground">
                  {index + 1}.
                </span>
                <span
                  className={cn(
                    "w-44 truncate",
                    row.isOwn && "font-semibold text-brand",
                  )}
                  title={row.name}
                >
                  {row.name}
                  {row.isOwn && " (you)"}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      row.isOwn ? "bg-brand" : "bg-chart-5",
                    )}
                    style={{ width: `${(row.share / maxLeaderShare) * 100}%` }}
                  />
                </span>
                <span className="w-24 text-right text-numeric text-xs text-muted-foreground">
                  {Math.round(row.share * 100)}% of answers
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </Section>

      <Section
        step={3}
        question="Where exactly am I missing?"
        blurb="Each row is one type of customer question. Absent means AI never mentions you there; Flickering means sometimes; Present means reliably."
      >
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                    Customer question type
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    Your venue
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                    Who AI names instead
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedIntents.map((intent) => (
                  <tr
                    key={intent.name}
                    className="border-b border-border/70 align-top last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{intent.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {intent.isBranded
                          ? "People asking about you by name — not counted in the score"
                          : `Asked ${intent.runs} times in ${intent.language.toUpperCase()}`}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[intent.status],
                        )}
                      >
                        {STATUS_LABELS[intent.status]}
                        <span className="text-numeric opacity-70">
                          {intent.ownMentions}/{intent.runs}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {intent.owners.slice(0, 4).map((owner) => (
                          <span
                            key={owner.name}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-xs"
                          >
                            {owner.name}
                            <span className="text-numeric text-muted-foreground">
                              {Math.round(owner.share * 100)}%
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Section>

      <Section
        step={4}
        question="What are the AIs reading?"
        blurb="The websites AI answers are built from. If you are not on these, AI has nothing to recommend you with."
      >
        <Panel className="overflow-hidden">
          <ul className="flex flex-col gap-1 p-4">
            {topDomains.map((domain) => (
              <li key={domain.domain} className="flex items-center gap-3 text-sm">
                <span className="w-44 truncate font-medium" title={domain.domain}>
                  {domain.domain}
                </span>
                <span className="w-32 shrink-0 text-xs text-muted-foreground">
                  {domain.category}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-chart-5"
                    style={{ width: `${(domain.total / maxDomainTotal) * 100}%` }}
                  />
                </span>
                <span className="w-28 text-right text-xs">
                  {domain.runsWithOwnMention > 0 ? (
                    <span className="text-positive">
                      mentions you {domain.runsWithOwnMention}×
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      never mentions you
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <details className="border-t border-border">
            <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              Full source table by platform
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-t border-border text-left">
                    <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Domain
                    </th>
                    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      ChatGPT
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      Google AIO
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      Perplexity
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                      Total
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      With this venue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.domains.map((domain) => (
                    <tr
                      key={domain.domain}
                      className="border-b border-border/70 last:border-b-0"
                    >
                      <td className="max-w-56 truncate px-4 py-2 font-medium">
                        {domain.domain}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {domain.category}
                      </td>
                      <td className="px-3 py-2 text-right text-numeric text-muted-foreground">
                        {domain.byPlatform.chatgpt || ""}
                      </td>
                      <td className="px-3 py-2 text-right text-numeric text-muted-foreground">
                        {domain.byPlatform.google_aio || ""}
                      </td>
                      <td className="px-3 py-2 text-right text-numeric text-muted-foreground">
                        {domain.byPlatform.perplexity || ""}
                      </td>
                      <td className="px-3 py-2 text-right text-numeric font-medium">
                        {domain.total}
                      </td>
                      <td className="px-4 py-2 text-right text-numeric">
                        {domain.runsWithOwnMention > 0 ? (
                          <span className="text-positive">
                            {domain.runsWithOwnMention}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>
      </Section>

      <Section
        step={5}
        id="playbook"
        question="What do I do about it?"
        blurb="Each AI assistant reads a different part of the internet, so each one has its own fix. Start with the weakest."
      >
        <Panel>
          <div className="grid gap-px bg-border lg:grid-cols-3">
            {rankedPlatforms.map((platform, index) => {
              const rate =
                platform.runs > 0
                  ? Math.round((platform.ownMentions / platform.runs) * 100)
                  : 0;
              return (
                <div key={platform.platform} className="bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {PLATFORM_LABELS[platform.platform]}
                    </h3>
                    {index === 0 && (
                      <span className="rounded-md border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand">
                        Start here
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Mentions you in {platform.ownMentions} of {platform.runs}{" "}
                    answers ({rate}%)
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">
                    {PLATFORM_ACTIONS[platform.platform]}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Why: {PLATFORM_PRESCRIPTIONS[platform.platform]}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      </Section>

      <Section
        step={6}
        question="What have I changed so far?"
        blurb="Every fix gets logged with its date, so score movement can be traced back to what you actually did."
      >
        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <FlaskConical className="size-3.5 text-brand" />
                Change log
              </span>
            }
          />
          {overview.interventions.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              Nothing logged yet. Publishing a review reply records itself here
              automatically.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {overview.interventions.map((intervention) => (
                <li key={intervention.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {KIND_LABELS[intervention.kind] ?? intervention.kind}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(`${intervention.performedOn}T00:00:00.000Z`)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{intervention.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Section>

      {/* ── Evidence for the curious; everything above is derived from this ── */}
      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Measurement details — every question asked and every raw AI answer
        </summary>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <Panel className="overflow-hidden">
            <PanelHeader
              title="Questions asked"
              description="Every question in the battery, with where it ran and whether this venue came up."
            />
            <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {overview.prompts.map((prompt) => (
                <li key={prompt.text} className="px-4 py-2.5">
                  <p className="text-sm">{prompt.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{prompt.intent}</span>
                    <span>·</span>
                    <span>
                      {prompt.platforms.map((p) => PLATFORM_SHORT[p]).join(", ")}
                    </span>
                    <span>·</span>
                    <span
                      className={cn(
                        "text-numeric",
                        prompt.ownMentions > 0 ? "font-medium text-positive" : "",
                      )}
                    >
                      {prompt.ownMentions}/{prompt.runs} mentioned
                    </span>
                    {prompt.isBranded && (
                      <span className="text-caution">branded</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="overflow-hidden">
            <PanelHeader
              title="Raw answers"
              description="The evidence itself. Answers that named this venue float to the top."
            />
            <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
              {overview.recentRuns.map((run) => (
                <li key={run.id} className="px-4 py-2.5">
                  <details>
                    <summary className="cursor-pointer text-sm marker:text-muted-foreground">
                      <span
                        className={cn(
                          "mr-2 inline-block rounded-md border px-1.5 py-0.5 text-[11px]",
                          run.mentionedOwn
                            ? "border-positive/30 bg-positive-soft text-positive"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {run.mentionedOwn ? "mentioned" : "absent"}
                      </span>
                      {run.prompt}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {PLATFORM_SHORT[run.platform]}
                      </span>
                    </summary>
                    <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
                      {run.mentions.length > 0 && (
                        <p className="mb-2 text-xs text-muted-foreground">
                          Mentions: {run.mentions.join(", ")}
                        </p>
                      )}
                      {run.citations.length > 0 && (
                        <p className="mb-2 text-xs text-muted-foreground">
                          Cites: {run.citations.join(", ")}
                        </p>
                      )}
                      <p className="whitespace-pre-line text-xs leading-relaxed">
                        {run.responseText ?? "No response text stored."}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </details>
    </>
  );
}
