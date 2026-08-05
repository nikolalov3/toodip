import type { Metadata } from "next";

import { Panel, PageHeader } from "@/components/common/surfaces";
import { AddReviewDialog } from "@/components/reviews/add-review-dialog";
import { ReviewFilterBar } from "@/components/reviews/filter-bar";
import { ReviewDetail } from "@/components/reviews/review-detail";
import { ReviewDrawer } from "@/components/reviews/review-drawer";
import { ReviewsTable } from "@/components/reviews/reviews-table";
import { canApprove, requireSession } from "@/lib/auth/session";
import {
  parseReviewFilters,
  setHref,
  type RawSearchParams,
} from "@/lib/review-filters";
import { getReviewWorkspace, listReviews } from "@/services/reviews";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage({
  searchParams,
}: PageProps<"/reviews">) {
  const params = (await searchParams) as RawSearchParams;
  const session = await requireSession();

  const filters = parseReviewFilters(params);
  const reviews = await listReviews(filters);

  const activeId = typeof params.review === "string" ? params.review : null;
  const workspace = activeId ? await getReviewWorkspace(activeId) : null;

  const rowHref = (reviewId: string) =>
    setHref("/reviews", params, "review", reviewId);
  const closeHref = setHref("/reviews", params, "review", null);

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Every review the workspace has ingested, with its triage result and reply state."
        actions={<AddReviewDialog />}
      />

      <div className="flex flex-col gap-4">
        <ReviewFilterBar
          basePath="/reviews"
          params={params}
          total={reviews.length}
        />

        <Panel className="overflow-hidden">
          <ReviewsTable
            reviews={reviews}
            rowHref={rowHref}
            activeReviewId={activeId ?? undefined}
          />
        </Panel>
      </div>

      {workspace && (
        <ReviewDrawer
          closeHref={closeHref}
          title={`${workspace.review.reviewerName ?? "Anonymous"} · ${workspace.review.stars} stars`}
          description="Triage, drafts, decision and audit trail."
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
