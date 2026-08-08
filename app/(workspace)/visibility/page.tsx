import { FlaskConical, Radar } from "lucide-react";
import type { Metadata } from "next";

import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/common/surfaces";
import { requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  getVisibilityOverview,
  type IntentSummary,
  type Platform,
} from "@/services/visibility";

export const metadata: Metadata = { title: "Visibility" };

const PLATFORM_LABELS: Record<Platform, string> = {
  chatgpt: "ChatGPT",
  google_aio: "Google AI Overviews",
  perplexity: "Perplexity",
  other: "Other",
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
  await requireSession();
  await requireBusinessProfile();
  const overview = await getVisibilityOverview();

  if (!overview.hasData) {
    return (
      <>
        <PageHeader
          title="Visibility"
          description="How often AI assistants mention this venue for the questions its customers actually ask, and which sources feed those answers."
        />
        <Panel>
          <EmptyState
            icon={Radar}
            title="No measurements yet"
            description="Import a baseline or run the prompt battery. Every run stores the full response, who was mentioned and which domains were cited, so movement is always traceable to evidence."
          />
        </Panel>
      </>
    );
  }

  const categoryRate =
    overview.categoryRuns > 0
      ? Math.round((overview.categoryOwnMentions / overview.categoryRuns) * 100)
      : 0;

  const firstDate = overview.dates[0];
  const lastDate = overview.dates[overview.dates.length - 1];

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
          label="Total runs"
          value={overview.totalRuns}
          hint={`Source: ${overview.sources.join(", ")}`}
        />
        <MetricCard
          label="Interventions logged"
          value={overview.interventions.length}
          hint="Changes we can later tie to movement"
        />
      </div>

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader
          title="Who owns each question"
          description="At small samples only two things are stable: the leaders and the zeros. Treat the middle of each list as noise."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                  Question set
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  This venue
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Runs
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
                        : intent.language.toUpperCase()}
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
                  <td className="px-3 py-3 text-numeric text-muted-foreground">
                    {intent.runs}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {intent.owners.map((owner) => (
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
              <p className="mt-3 text-[11px] font-medium text-muted-foreground">
                Top cited domains
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {platform.topDomains.map((domain) => (
                  <li
                    key={domain.domain}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span className="truncate">{domain.domain}</span>
                    <span className="text-numeric text-muted-foreground">
                      {domain.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Citation map"
            description="The domains AI answers actually lean on. This is the target list for presence work."
          />
          <ul className="divide-y divide-border">
            {overview.topDomains.map((domain) => (
              <li
                key={domain.domain}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="text-sm">{domain.domain}</span>
                <span className="text-numeric text-sm text-muted-foreground">
                  {domain.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
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
      </div>
    </>
  );
}
