import { MessageSquareOff } from "lucide-react";
import Link from "next/link";

import {
  RiskBadge,
  RiskFlagChip,
  SentimentBadge,
  StarRating,
  StatusBadge,
} from "@/components/common/badges";
import { EmptyState } from "@/components/common/surfaces";
import { formatRelative, truncate } from "@/lib/format";
import { sourceLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ReviewWithContext } from "@/types/domain";

/**
 * Operations table. Rows are one click away from the detail surface, the whole
 * row is the target, and the link stays keyboard reachable.
 */
export function ReviewsTable({
  reviews,
  rowHref,
  activeReviewId,
  emptyTitle = "No reviews match these filters",
  emptyDescription = "Clear a filter or widen the view. New reviews land here as soon as they are ingested.",
}: {
  reviews: ReviewWithContext[];
  rowHref: (reviewId: string) => string;
  activeReviewId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareOff}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="px-4 py-2 text-xs font-medium text-muted-foreground">
              Review
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Rating
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Status
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Sentiment
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Risk
            </th>
            <th scope="col" className="px-3 py-2 text-xs font-medium text-muted-foreground">
              Drafts
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              Received
            </th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr
              key={review.id}
              className={cn(
                "relative border-b border-border/70 transition-colors last:border-b-0",
                "hover:bg-accent/60 focus-within:bg-accent/60",
                activeReviewId === review.id && "bg-accent",
              )}
            >
              <td className="max-w-md px-4 py-3 align-top">
                <Link
                  href={rowHref(review.id)}
                  scroll={false}
                  className="font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {review.reviewerName ?? "Anonymous"}
                </Link>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {truncate(review.reviewText, 120)}
                </p>
                {review.riskFlags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {review.riskFlags.slice(0, 3).map((flag) => (
                      <RiskFlagChip key={flag.id} flag={flag} />
                    ))}
                    {review.riskFlags.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{review.riskFlags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 align-top">
                <StarRating stars={review.stars} size={12} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {sourceLabels[review.source]}
                </p>
              </td>
              <td className="px-3 py-3 align-top">
                <StatusBadge status={review.status} />
              </td>
              <td className="px-3 py-3 align-top">
                <SentimentBadge sentiment={review.sentiment} />
              </td>
              <td className="px-3 py-3 align-top">
                <RiskBadge score={review.riskScore} />
              </td>
              <td className="px-3 py-3 align-top text-numeric text-muted-foreground">
                {review.drafts.length}
              </td>
              <td className="px-4 py-3 text-right align-top text-xs text-muted-foreground">
                {formatRelative(review.reviewedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
