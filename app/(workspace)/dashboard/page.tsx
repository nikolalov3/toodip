import {
  ArrowUpRight,
  Clock,
  Inbox,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  RiskBadge,
  SentimentBadge,
  StarRating,
  StatusBadge,
} from "@/components/common/badges";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/common/surfaces";
import {
  SentimentDistribution,
  StarDistribution,
} from "@/components/dashboard/distributions";
import { AddReviewDialog } from "@/components/reviews/add-review-dialog";
import { requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { formatHours, formatPercent, formatRelative, truncate } from "@/lib/format";
import { activityLabels } from "@/lib/labels";
import { navGroups } from "@/lib/nav";
import { getDashboardData } from "@/services/metrics";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  // Venue screens need a business profile. The platform workspace has none.
  await requireBusinessProfile();
  const { metrics, activity, profile, queue, highRisk, recentDrafts } =
    await getDashboardData();

  const plannedModules = navGroups
    .find((group) => group.label === "Platform")
    ?.items.filter((item) => item.status === "planned") ?? [];

  return (
    <>
      <PageHeader
        title={`Good to see you, ${session.fullName.split(" ")[0]}`}
        description={`${profile.name}, ${profile.district ? `${profile.district}, ` : ""}${profile.city}. Here is what the workspace is holding right now.`}
        actions={<AddReviewDialog />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Reviews processed"
          value={`${metrics.processedReviews}/${metrics.totalReviews}`}
          hint="Approved, published, rejected or archived"
        />
        <MetricCard
          label="Pending approvals"
          value={metrics.pendingApprovals}
          hint={
            metrics.pendingApprovals > 0 ? (
              <Link href="/queue" className="text-brand hover:underline">
                Open the queue
              </Link>
            ) : (
              "Queue is clear"
            )
          }
        />
        <MetricCard
          label="Response rate"
          value={formatPercent(metrics.responseRate)}
          hint="Reviews with a published reply"
        />
        <MetricCard
          label="Average response time"
          value={formatHours(metrics.averageResponseHours)}
          hint="From review date to published reply"
        />
        <MetricCard
          label="Average rating"
          value={metrics.averageRating.toFixed(2)}
          hint={`${metrics.highRiskCount} high risk open`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Needs a decision"
            description="Ordered by risk. These do not publish without a human."
            action={
              <Link
                href="/queue"
                className="text-xs font-medium text-brand hover:underline"
              >
                Open queue
              </Link>
            }
          />
          {queue.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing waiting"
              description="Every review that needs a human has been handled. New ones appear here the moment they are ingested."
            />
          ) : (
            <ul className="divide-y divide-border">
              {queue.map((review) => (
                <li key={review.id} className="relative px-4 py-3 hover:bg-accent/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/reviews/${review.id}`}
                      className="text-sm font-medium after:absolute after:inset-0"
                    >
                      {review.reviewerName ?? "Anonymous"}
                    </Link>
                    <StarRating stars={review.stars} size={12} />
                    <StatusBadge status={review.status} />
                    <RiskBadge score={review.riskScore} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatRelative(review.reviewedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {truncate(review.reviewText, 130)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title="Sentiment" description="Across all ingested reviews" />
            <SentimentDistribution
              split={metrics.sentimentSplit}
              total={metrics.totalReviews}
            />
          </Panel>

          <Panel>
            <PanelHeader title="Ratings" description="Where the volume sits" />
            <StarDistribution
              split={metrics.starSplit}
              total={metrics.totalReviews}
            />
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-critical" />
                High risk
              </span>
            }
            description="Handle these before anything else"
          />
          {highRisk.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No high risk reviews"
              description="Hygiene, legal and refund cases surface here automatically."
            />
          ) : (
            <ul className="divide-y divide-border">
              {highRisk.map((review) => (
                <li key={review.id} className="relative px-4 py-3 hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/reviews/${review.id}`}
                      className="text-sm font-medium after:absolute after:inset-0"
                    >
                      {review.reviewerName ?? "Anonymous"}
                    </Link>
                    <RiskBadge score={review.riskScore} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {review.riskFlags
                      .map((flag) => flag.flagType.replace(/_/g, " "))
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-brand" />
                Recent drafts
              </span>
            }
            description="Latest generated replies"
          />
          {recentDrafts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No drafts yet"
              description="Generate a reply from any review and it shows up here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recentDrafts.map((review) => (
                <li key={review.id} className="relative px-4 py-3 hover:bg-accent/50">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/reviews/${review.id}`}
                      className="text-xs font-medium after:absolute after:inset-0"
                    >
                      {review.reviewerName ?? "Anonymous"}
                    </Link>
                    <SentimentBadge sentiment={review.sentiment} />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {truncate(review.drafts[0].draftText, 120)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                Activity
              </span>
            }
            description="Who did what"
            action={
              <Link
                href="/activity"
                className="text-xs font-medium text-brand hover:underline"
              >
                All activity
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {activity.map((entry) => (
              <li key={entry.id} className="px-4 py-2.5">
                <p className="text-xs">
                  <span className="font-medium">{entry.actorName}</span>{" "}
                  <span className="text-muted-foreground">
                    {activityLabels[entry.action]}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatRelative(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHeader
          title="Coming to this workspace"
          description="Review replies are the first module. These are next, on the same tenant and the same brand profile."
        />
        <ul className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
          {plannedModules.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative bg-card p-4 hover:bg-accent/40">
                <span className="flex size-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <Link
                  href={item.href}
                  className="mt-2.5 flex items-center gap-1 text-sm font-medium after:absolute after:inset-0"
                >
                  {item.label}
                  <ArrowUpRight className="size-3 text-muted-foreground" />
                </Link>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
