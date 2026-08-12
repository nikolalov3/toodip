import { History } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/common/badges";
import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/surfaces";
import { formatRelative } from "@/lib/format";
import type { ReviewWithContext } from "@/types/domain";

function truncate(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Latest reply per review, straight from the database. Server rendered. */
export function ReplyHistory({ reviews }: { reviews: ReviewWithContext[] }) {
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No replies yet"
        description="Replies you generate in the chat land here with their status."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {reviews.map((review) => {
        const reply =
          review.publishedReply ??
          review.selectedDraft?.draftText ??
          review.drafts[0]?.draftText ??
          null;
        return (
          <li key={review.id} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={review.status} />
              <span className="text-[11px] text-muted-foreground">
                {formatRelative(review.reviewedAt)}
              </span>
              <div className="ml-auto flex items-center gap-1">
                {reply && review.status !== "pending_approval" && (
                  <CopyButton value={reply} size="icon-sm" label="Copy reply" />
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {truncate(review.reviewText)}
            </p>
            {reply && (
              <p className="mt-1.5 border-l-2 border-border pl-2.5 text-xs leading-relaxed">
                {truncate(reply, 200)}
              </p>
            )}
            <Link
              href={`/reviews?review=${review.id}`}
              className="mt-1.5 inline-block text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Open in Reviews
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
