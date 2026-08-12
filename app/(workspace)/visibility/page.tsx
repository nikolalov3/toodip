import { FlaskConical, Radar } from "lucide-react";
import type { Metadata } from "next";

import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/common/surfaces";
import {
  MeasurePanel,
  type BatteryPrompt,
} from "@/components/visibility/measure-panel";
import { ScoreTrend } from "@/components/visibility/score-trend";
import { canEditSettings, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { formatDate } from "@/lib/format";
import { getUserClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  measurementConfigured,
  suggestPromptBattery,
} from "@/services/measurement";
import {
  getVisibilityOverview,
  type IntentSummary,
  type Platform,
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

const KIND_LABELS: Record<string, string> = {
  record_update: "Google record",
  review_reply: "Review reply",
  site_change: "Website",
  guide_entry: "Guide entry",
  social_post: "Social",
  other: "Other",
};

export default async function VisibilityPage() {
  const session = await requireSession();
  const profile = await requireBusinessProfile();
  const overview = await getVisibilityOverview();

  // The measurement panel needs the saved battery, grouped by intent.
  const isAdmin = canEditSettings(session.role);
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
  ) : null;

  if (!overview.hasData) {
    return (
      <>
        <PageHeader
          title="Visibility"
          description="How often AI assistants mention this venue for the questions its customers actually ask, and which sources feed those answers."
        />
        <div className="flex flex-col gap-4">
          {measurePanel}
          <Panel>
            <EmptyState
              icon={Radar}
              title="No measurements yet"
              description="Run the prompt battery above, or import a baseline. Every run stores the full response, who was mentioned and which domains were cited, so movement is always traceable to evidence."
            />
          </Panel>
        </div>
      </>
    );
  }

  const categoryRate =
    overview.categoryRuns > 0
      ? Math.round((overview.categoryOwnMentions / overview.categoryRuns) * 100)
      : 0;

  const firstDate = overview.dates[0];
  const lastDate = overview.dates[overview.dates.length - 1];
  const maxLeaderShare = Math.max(...overview.leaderboard.map((row) => row.share), 0.01);

  return (
    <>
      <PageHeader
        title="Visibility"
        description={`Measured ${
          firstDate === lastDate
            ? `on ${formatDate(`${firstDate}T00:00:00.000Z`)}`
            : `between ${formatDate(`${firstDate}T00:00:00.000Z`)} and ${formatDate(`${lastDate}T00:00:00.000Z`)}`
        }. Branded questions are counted separately and never inflate the category numbers.`}
      />

      {measurePanel && <div className="mb-4">{measurePanel}</div>}

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard
          label="Category mentions"
          value={`${overview.categoryOwnMentions}/${overview.categoryRuns}`}
          hint="Answers naming this venue, branded questions excluded"
        />
        <MetricCard
          label="Category rate"
          value={`${categoryRate}%`}
          hint="The honest headline number"
        />
        <MetricCard
          label="Runs / citations"
          value={`${overview.totalRuns} / ${overview.totalCitations}`}
          hint={`Source: ${overview.sources.join(", ")}`}
        />
        <MetricCard
          label="Interventions logged"
          value={overview.interventions.length}
          hint="Changes we can later tie to movement"
        />
      </div>

      {overview.timeline.length > 1 && (
        <Panel className="mt-4">
          <PanelHeader
            title="Score over time"
            description="Category visibility per measurement day. This is the line the interventions are supposed to move."
          />
          <ScoreTrend timeline={overview.timeline} />
        </Panel>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Share of voice"
            description="How often each venue is named across all category answers. The market, not just this venue."
          />
          <ul className="flex flex-col gap-1 p-3">
            {overview.leaderboard.map((row, index) => (
              <li key={row.name} className="flex items-center gap-2.5 text-xs">
                <span className="w-5 text-right text-numeric text-muted-foreground">
                  {index + 1}.
                </span>
                <span
                  className={cn(
                    "w-40 truncate",
                    row.isOwn && "font-semibold text-brand",
                  )}
                  title={row.name}
                >
                  {row.name}
                  {row.isOwn && " (this venue)"}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      row.isOwn ? "bg-brand" : "bg-chart-5",
                    )}
                    style={{ width: `${(row.share / maxLeaderShare) * 100}%` }}
                  />
                </span>
                <span className="w-16 text-right text-numeric text-muted-foreground">
                  {row.runsMentioned} · {Math.round(row.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="overflow-hidden lg:col-span-3">
          <PanelHeader
            title="Who owns each question"
            description="At small samples only two things are stable: the leaders and the zeros. Treat the middle of each list as noise."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                    Question set
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    This venue
                  </th>
                  <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                    Current owners
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.intents.map((intent) => (
                  <tr
                    key={intent.name}
                    className="border-b border-border/70 align-top last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{intent.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {intent.isBranded
                          ? "Branded, excluded from category rate"
                          : `${intent.language.toUpperCase()} · ${intent.runs} runs`}
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
      </div>

      <Panel className="mt-4">
        <PanelHeader
          title="Platform diagnosis"
          description="Each assistant eats from a different surface, so absence on a platform names the surface to fix."
        />
        <div className="grid gap-px bg-border lg:grid-cols-3">
          {overview.platforms.map((platform) => (
            <div key={platform.platform} className="bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {PLATFORM_LABELS[platform.platform]}
                </h3>
                <span className="text-numeric text-sm">
                  {platform.ownMentions}/{platform.runs}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {PLATFORM_PRESCRIPTIONS[platform.platform]}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader
          title="Sources"
          description="Which domains AI answers lean on, split by platform. The last column shows how often a domain was cited in an answer that also named this venue."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                  Domain
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  GPT
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  AIO
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  PPLX
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
                      <span className="text-positive">{domain.runsWithOwnMention}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Prompts"
            description="Every question in the battery, with where it ran and whether this venue came up."
          />
          <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
            {overview.prompts.map((prompt) => (
              <li key={prompt.text} className="px-4 py-2.5">
                <p className="text-sm">{prompt.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{prompt.intent}</span>
                  <span>·</span>
                  <span>{prompt.platforms.map((p) => PLATFORM_SHORT[p]).join(", ")}</span>
                  <span>·</span>
                  <span
                    className={cn(
                      "text-numeric",
                      prompt.ownMentions > 0 ? "font-medium text-positive" : "",
                    )}
                  >
                    {prompt.ownMentions}/{prompt.runs} mentioned
                  </span>
                  {prompt.isBranded && <span className="text-caution">branded</span>}
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

      <Panel className="mt-4">
        <PanelHeader
          title={
            <span className="flex items-center gap-1.5">
              <FlaskConical className="size-3.5 text-brand" />
              Interventions
            </span>
          }
          description="Every change made on a surface, with its date. Movement without a matching intervention is weather, not progress."
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
    </>
  );
}
