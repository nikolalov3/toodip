import { Terminal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  RiskBadge,
  StarRating,
  StatusBadge,
} from "@/components/common/badges";
import {
  EmptyState,
  Field,
  PageHeader,
  Panel,
  PanelHeader,
} from "@/components/common/surfaces";
import { PromptPreview } from "@/components/prompt/prompt-preview";
import { requireSession } from "@/lib/auth/session";
import { requireBusinessProfile } from "@/lib/auth/workspace";
import { truncate } from "@/lib/format";
import { PROMPT_VERSION } from "@/prompts/system";
import { listGenerationProviders, getGenerationProvider } from "@/services/generation";
import { getReviewWorkspace, listReviews } from "@/services/reviews";

export const metadata: Metadata = { title: "Prompt studio" };

export default async function PromptStudioPage({
  searchParams,
}: PageProps<"/prompt-studio">) {
  await requireSession();
  // Venue screens need a business profile. The platform workspace has none.
  await requireBusinessProfile();
  const params = await searchParams;
  const reviews = await listReviews({ sort: "risk" });

  const selectedId =
    typeof params.review === "string" ? params.review : reviews[0]?.id;
  const workspace = selectedId ? await getReviewWorkspace(selectedId) : null;

  const provider = getGenerationProvider();
  const providers = listGenerationProviders();

  return (
    <>
      <PageHeader
        title="Prompt studio"
        description="The exact instruction stack behind every draft. Three layers, versioned, assembled per review."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Panel className="px-4 py-3">
          <Field label="Prompt version">{PROMPT_VERSION}</Field>
        </Panel>
        <Panel className="px-4 py-3">
          <Field label="Active engine">{provider.label}</Field>
        </Panel>
        <Panel className="px-4 py-3">
          <Field label="Mode">
            {provider.offline ? "Offline, no API call" : "Remote model"}
          </Field>
        </Panel>
        <Panel className="px-4 py-3">
          <Field label="Registered engines">
            {providers.map((item) => item.id).join(", ")}
          </Field>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Pick a review"
            description="Highest risk first, since those are the prompts worth checking."
          />
          <ul className="max-h-[560px] divide-y divide-border overflow-y-auto">
            {reviews.map((review) => (
              <li
                key={review.id}
                className={
                  review.id === selectedId
                    ? "relative bg-accent px-3 py-2.5"
                    : "relative px-3 py-2.5 hover:bg-accent/50"
                }
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/prompt-studio?review=${review.id}`}
                    scroll={false}
                    className="text-xs font-medium after:absolute after:inset-0"
                  >
                    {review.reviewerName ?? "Anonymous"}
                  </Link>
                  <StarRating stars={review.stars} size={11} />
                  <RiskBadge score={review.riskScore} showScore={false} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {truncate(review.reviewText, 70)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        {workspace ? (
          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader
                title="Structured inputs"
                description="What the builder received before assembling the layers."
              />
              <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
                <Field label="Review">{workspace.review.id}</Field>
                <Field label="Status">
                  <StatusBadge status={workspace.review.status} />
                </Field>
                <Field label="Risk flags">
                  {workspace.prompt.meta.riskFlagTypes.length
                    ? workspace.prompt.meta.riskFlagTypes.join(", ")
                    : "none"}
                </Field>
                <Field label="Approx tokens">
                  {workspace.prompt.meta.approxTokens}
                </Field>
                <Field label="Active keywords">
                  {workspace.keywords.filter((item) => item.active).length}
                </Field>
                <Field label="Banned phrases">
                  {workspace.profile.bannedPhrases.length}
                </Field>
                <Field label="Drafts requested">
                  {workspace.prompt.meta.draftCount}
                </Field>
                <Field label="Reply language">
                  {workspace.review.language.toUpperCase()}
                </Field>
              </dl>
            </Panel>

            <PromptPreview prompt={workspace.prompt} />

            <Panel>
              <PanelHeader
                title="Token usage"
                description="Populated by the provider. The offline engine reports none, which is the point of running it during development."
              />
              <dl className="grid grid-cols-3 gap-4 p-4">
                <Field label="Prompt tokens">
                  {provider.offline ? "not applicable" : "reported per call"}
                </Field>
                <Field label="Completion tokens">
                  {provider.offline ? "not applicable" : "reported per call"}
                </Field>
                <Field label="Estimated prompt size">
                  {workspace.prompt.meta.approxTokens}
                </Field>
              </dl>
            </Panel>
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={Terminal}
              title="No reviews to inspect"
              description="Add a review and its assembled prompt shows up here, layer by layer."
            />
          </Panel>
        )}
      </div>
    </>
  );
}
