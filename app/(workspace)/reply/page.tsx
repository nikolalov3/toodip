import type { Metadata } from "next";

import { PageHeader, Panel, PanelHeader } from "@/components/common/surfaces";
import { ReplyChat } from "@/components/reply/reply-chat";
import { ReplyHistory } from "@/components/reply/reply-history";
import { requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { listReviews } from "@/services/reviews";

export const metadata: Metadata = { title: "Reply" };

/**
 * The primary way to work with reviews: paste one, copy the reply, mark it as
 * pasted in Google. The Reviews screen stays around as the archive and the
 * queue keeps the approvals.
 */
export default async function ReplyPage() {
  await requireSession();
  // Venue screens need a business profile. The platform workspace has none.
  await requireBusinessProfile();

  const recent = (await listReviews({ hasDrafts: "yes", sort: "newest" })).slice(
    0,
    20,
  );

  return (
    <>
      <PageHeader
        title="Reply"
        description="Paste a review, get a reply, copy it into Google. Triage, quality checks and the approval gate all run underneath."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="flex min-h-[70vh] flex-col overflow-hidden lg:h-[calc(100vh-12rem)]">
          <ReplyChat />
        </Panel>

        <Panel className="overflow-hidden lg:h-[calc(100vh-12rem)] lg:overflow-y-auto">
          <PanelHeader
            title="Recent replies"
            description="The last 20 reviews with a generated reply, with their current status."
          />
          <ReplyHistory reviews={recent} />
        </Panel>
      </div>
    </>
  );
}
