import { CheckCheck } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, MetricCard, PageHeader, Panel } from "@/components/common/surfaces";
import { ReviewDetail } from "@/components/reviews/review-detail";
import { ReviewDrawer } from "@/components/reviews/review-drawer";
import { ReviewsTable } from "@/components/reviews/reviews-table";
import { canApprove, requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { formatRelative } from "@/lib/format";
import { setHref, type RawSearchParams } from "@/lib/review-filters";
import { riskLevelFromScore } from "@/lib/risk";
import { getReviewWorkspace, listReviews } from "@/services/reviews";

export const metadata: Metadata = { title: "Approval queue" };

export default async function QueuePage({ searchParams }: PageProps<"/queue">) {
  const params = (await searchParams) as RawSearchParams;
  const session = await requireSession();
  // Venue screens need a business profile. The platform workspace has none.
  await requireBusinessProfile();

  const all = await listReviews({ sort: "risk" });
  const queue = all.filter(
    (review) =>
      review.status === "pending_approval" ||
      (review.requiresApproval &&
        ["new", "draft_generated", "rejected"].includes(review.status)),
  );

  const highRisk = queue.filter(
    (review) => riskLevelFromScore(review.riskScore) === "high",
  ).length;
  const oldest = queue.reduce<string | null>(
    (acc, review) =>
      !acc || review.reviewedAt < acc ? review.reviewedAt : acc,
    null,
  );

  const activeId = typeof params.review === "string" ? params.review : null;
  const workspace = activeId ? await getReviewWorkspace(activeId) : null;

  return (
    <>
      <PageHeader
        title="Approval queue"
        description="Everything the workspace policy says a person has to sign off. Nothing here reaches the public without a decision."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Waiting for a decision" value={queue.length} />
        <MetricCard
          label="High risk"
          value={highRisk}
          hint="Hygiene, legal, refunds, named staff"
        />
        <MetricCard
          label="Oldest in queue"
          value={oldest ? formatRelative(oldest) : "None"}
          hint="Review date, not the time it entered the queue"
        />
      </div>

      <Panel className="mt-4 overflow-hidden">
        {queue.length === 0 ? (
          <EmptyState
            icon={CheckCheck}
            title="The queue is empty"
            description="Reviews under the auto approval threshold, or carrying any risk flag, arrive here automatically. Adjust the thresholds in brand settings."
          />
        ) : (
          <ReviewsTable
            reviews={queue}
            rowHref={(reviewId) => setHref("/queue", params, "review", reviewId)}
            activeReviewId={activeId ?? undefined}
          />
        )}
      </Panel>

      {workspace && (
        <ReviewDrawer
          closeHref={setHref("/queue", params, "review", null)}
          title={`${workspace.review.reviewerName ?? "Anonymous"} · ${workspace.review.stars} stars`}
          description="Decide, edit or send it back."
        >
          <ReviewDetail
            review={workspace.review}
            profile={workspace.profile}
            members={workspace.members}
            activity={workspace.activity}
            quality={workspace.quality}
            approvalReasons={workspace.approvalReasons}
            canApprove={canApprove(session.role)}
            showPageLink
          />
        </ReviewDrawer>
      )}
    </>
  );
}
