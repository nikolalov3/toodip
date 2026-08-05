import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/common/surfaces";
import { PromptPreview } from "@/components/prompt/prompt-preview";
import { ReviewDetail } from "@/components/reviews/review-detail";
import {
  canApprove,
  canSeeDebugTools,
  requireSession,
} from "@/lib/auth/session";
import { getReviewWorkspace } from "@/services/reviews";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({ params }: PageProps<"/reviews/[id]">) {
  const { id } = await params;
  const session = await requireSession();
  const workspace = await getReviewWorkspace(id);
  if (!workspace) notFound();

  return (
    <>
      <Link
        href="/reviews"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to reviews
      </Link>

      <PageHeader
        title={workspace.review.reviewerName ?? "Anonymous reviewer"}
        description="Full operating view: triage result, every draft, the decision record and the exact prompt behind it."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <ReviewDetail
          review={workspace.review}
          profile={workspace.profile}
          members={workspace.members}
          activity={workspace.activity}
          quality={workspace.quality}
          approvalReasons={workspace.approvalReasons}
          canApprove={canApprove(session.role)}
        />

        {canSeeDebugTools(session.role) && (
          <div className="xl:sticky xl:top-20 xl:self-start">
            <PromptPreview prompt={workspace.prompt} compact />
          </div>
        )}
      </div>
    </>
  );
}
