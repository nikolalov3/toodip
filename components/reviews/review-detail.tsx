"use client";

import {
  Archive,
  CheckCheck,
  ExternalLink,
  Info,
  MessageSquarePlus,
  RefreshCw,
  Send,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  approveAction,
  archiveAction,
  generateRepliesAction,
  publishAction,
  reclassifyAction,
  rejectAction,
  saveDraftEditAction,
  selectDraftAction,
  type ActionResult,
} from "@/app/actions/reviews";
import { CopyButton } from "@/components/common/copy-button";
import {
  RiskBadge,
  RiskFlagChip,
  SentimentBadge,
  StarRating,
  StatusBadge,
} from "@/components/common/badges";
import { EmptyState, Field, Panel, PanelHeader } from "@/components/common/surfaces";
import { DraftCard } from "@/components/reviews/draft-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatRelative } from "@/lib/format";
import { activityLabels, riskFlagGuidance, sourceLabels } from "@/lib/labels";
import type { QualityResult } from "@/services/generation/quality";
import type {
  ActivityLog,
  BusinessProfile,
  ReviewWithContext,
} from "@/types/domain";
import type { MemberWithProfile } from "@/types/repository";

export interface ReviewDetailProps {
  review: ReviewWithContext;
  profile: BusinessProfile;
  members: MemberWithProfile[];
  activity: ActivityLog[];
  quality: Record<string, QualityResult>;
  approvalReasons: string[];
  canApprove: boolean;
  showPageLink?: boolean;
}

export function ReviewDetail({
  review,
  profile,
  members,
  activity,
  quality,
  approvalReasons,
  canApprove,
  showPageLink = false,
}: ReviewDetailProps) {
  const [pending, startTransition] = useTransition();
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });

  const assignee = members.find((member) => member.userId === review.assignedTo);
  const published = review.status === "published";
  const editorSentences = editorText
    .split(/[.!?]+/)
    .filter((part) => part.trim().length > 2).length;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">
                {review.reviewerName ?? "Anonymous reviewer"}
              </h2>
              <StarRating stars={review.stars} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {sourceLabels[review.source]} · {formatDateTime(review.reviewedAt)} ·{" "}
              {review.language.toUpperCase()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={review.status} />
            <SentimentBadge sentiment={review.sentiment} />
            <RiskBadge score={review.riskScore} />
          </div>
        </div>

        <blockquote className="border-b border-border px-4 py-4 text-sm leading-relaxed">
          {review.reviewText}
        </blockquote>

        <dl className="grid grid-cols-2 gap-4 px-4 py-3 sm:grid-cols-4">
          <Field label="Assigned to">
            {assignee ? assignee.fullName : "Nobody yet"}
          </Field>
          <Field label="Approval">
            {review.requiresApproval ? "Human required" : "Policy allows auto"}
          </Field>
          <Field label="Drafts">{review.drafts.length}</Field>
          <Field label="Last update">{formatRelative(review.updatedAt)}</Field>
        </dl>

        {showPageLink && (
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href={`/reviews/${review.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            >
              Open the full review page
              <ExternalLink className="size-3" />
            </Link>
          </div>
        )}
      </Panel>

      {review.riskFlags.length > 0 && (
        <Panel className="border-critical/30">
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-critical" />
                Handling rules
              </span>
            }
            description="Applied to the prompt and enforced on the approval gate."
          />
          <ul className="divide-y divide-border">
            {review.riskFlags.map((flag) => (
              <li key={flag.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskFlagChip flag={flag} />
                  <span className="text-xs text-muted-foreground">
                    {flag.severity} severity
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {riskFlagGuidance[flag.flagType]}
                </p>
                {flag.evidence && (
                  <p className="mt-1.5 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                    {flag.evidence}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {approvalReasons.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            {approvalReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Drafts"
          description={
            published
              ? "This reply is live. Drafts are kept for the audit trail."
              : "Pick one, edit it if needed, then approve."
          }
          action={
            !published && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      generateRepliesAction(review.id, {
                        regenerate: review.drafts.length > 0,
                      }),
                    )
                  }
                >
                  {review.drafts.length > 0 ? (
                    <RefreshCw className="size-3.5" />
                  ) : (
                    <MessageSquarePlus className="size-3.5" />
                  )}
                  {review.drafts.length > 0 ? "Regenerate" : "Generate replies"}
                </Button>
              </div>
            )
          }
        />

        {review.drafts.length === 0 ? (
          <EmptyState
            icon={MessageSquarePlus}
            title="No drafts yet"
            description="Generation uses this venue's tone, banned phrases and keyword bank, plus the handling rules for any risk flag on this review."
            action={
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => generateRepliesAction(review.id))}
              >
                Generate replies
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5 p-3">
            {review.drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                quality={quality[draft.id]}
                selected={draft.selected}
                busy={pending || published}
                onSelect={() =>
                  run(() => selectDraftAction(review.id, draft.id))
                }
                onEdit={() => {
                  setEditingDraftId(draft.id);
                  setEditorText(draft.draftText);
                }}
              />
            ))}
          </div>
        )}

        {editingDraftId && (
          <div className="border-t border-border p-3">
            <label
              htmlFor="draft-editor"
              className="text-xs font-medium text-muted-foreground"
            >
              Edit before approving
            </label>
            <Textarea
              id="draft-editor"
              value={editorText}
              onChange={(event) => setEditorText(event.target.value)}
              rows={5}
              className="mt-1.5 text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {editorText.length} characters · {editorSentences} sentences ·
                target is two to three
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingDraftId(null)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      const result = await saveDraftEditAction(
                        review.id,
                        editingDraftId,
                        editorText,
                      );
                      if (result.ok) setEditingDraftId(null);
                      return result;
                    })
                  }
                >
                  Save as new draft
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      {published && review.publishedReply && (
        <Panel>
          <PanelHeader
            title="Published reply"
            description={
              review.publishedAt
                ? `Live since ${formatDateTime(review.publishedAt)}`
                : undefined
            }
            action={<CopyButton value={review.publishedReply} label="Copy" />}
          />
          <p className="whitespace-pre-line px-4 py-3 text-sm leading-relaxed">
            {review.publishedReply}
          </p>
        </Panel>
      )}

      {!published && review.selectedDraft && (
        <Panel>
          <PanelHeader
            title="Put it live"
            description="Google connection is not approved yet, so the last hop is manual. Two clicks, no retyping."
          />
          <ol className="divide-y divide-border text-sm">
            <li className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground">
                1
              </span>
              <span className="flex-1">Copy the approved reply</span>
              <CopyButton
                value={review.selectedDraft.draftText}
                label="Copy reply"
              />
            </li>
            <li className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground">
                2
              </span>
              <span className="flex-1">
                Open the venue on Google and paste it under this review
              </span>
              {profile.googleReviewUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  render={
                    <a
                      href={profile.googleReviewUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    />
                  }
                >
                  <ExternalLink className="size-3.5" />
                  Open Google
                </Button>
              ) : (
                <Link
                  href="/brand"
                  className="text-xs text-brand hover:underline"
                >
                  Add the link in brand settings
                </Link>
              )}
            </li>
            <li className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-muted-foreground">
                3
              </span>
              <span className="flex-1">
                Mark it published here, so the metrics and the audit trail match
                reality
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || review.status !== "approved"}
                onClick={() => run(() => publishAction(review.id))}
              >
                <Send className="size-3.5" />
                Mark as published
              </Button>
            </li>
          </ol>
        </Panel>
      )}

      {!published && (
        <Panel>
          <PanelHeader
            title="Decision"
            description={
              canApprove
                ? "Approving records who signed it off and when."
                : "Your role can draft and edit. A workspace admin approves."
            }
          />
          <div className="flex flex-wrap items-center gap-2 p-3">
            <Button
              type="button"
              size="sm"
              disabled={pending || !canApprove || !review.selectedDraft}
              onClick={() => run(() => approveAction(review.id))}
            >
              <CheckCheck className="size-3.5" />
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !canApprove || !review.selectedDraft}
              onClick={() =>
                run(() => approveAction(review.id, { publish: true }))
              }
            >
              <Send className="size-3.5" />
              Approve and publish
            </Button>
            {review.status === "approved" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => publishAction(review.id))}
              >
                <Send className="size-3.5" />
                Mark as published
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending || !canApprove}
              onClick={() => setRejectOpen((open) => !open)}
            >
              <Undo2 className="size-3.5" />
              Send back
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => reclassifyAction(review.id))}
            >
              <RefreshCw className="size-3.5" />
              Reclassify
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto text-muted-foreground"
              disabled={pending}
              onClick={() => run(() => archiveAction(review.id))}
            >
              <Archive className="size-3.5" />
              Archive
            </Button>
          </div>

          {!review.selectedDraft && review.drafts.length > 0 && (
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              Select a draft before approving.
            </p>
          )}

          {rejectOpen && (
            <div className="border-t border-border p-3">
              <label
                htmlFor="reject-notes"
                className="text-xs font-medium text-muted-foreground"
              >
                What should change?
              </label>
              <Textarea
                id="reject-notes"
                rows={3}
                value={rejectNotes}
                onChange={(event) => setRejectNotes(event.target.value)}
                placeholder="Too formal, and it does not mention the cold latte."
                className="mt-1.5 text-sm"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      const result = await rejectAction(review.id, rejectNotes);
                      if (result.ok) {
                        setRejectOpen(false);
                        setRejectNotes("");
                      }
                      return result;
                    })
                  }
                >
                  Send back for a rewrite
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title="Audit trail"
          description="Everything that happened to this review, in order."
        />
        {activity.length === 0 && review.approvals.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            Nothing recorded yet.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {review.approvals.map((approval) => (
              <li key={approval.id} className="px-4 py-2.5">
                <p className="text-xs">
                  <span className="font-medium">
                    {approval.decision === "approved" ? "Approved" : "Rejected"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {formatRelative(approval.createdAt)}
                  </span>
                </p>
                {approval.notes && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approval.notes}
                  </p>
                )}
              </li>
            ))}
            {activity.map((entry) => (
              <li key={entry.id} className="px-4 py-2.5">
                <p className="text-xs">
                  <span className="font-medium">{entry.actorName}</span>{" "}
                  <span className="text-muted-foreground">
                    {activityLabels[entry.action]} ·{" "}
                    {formatRelative(entry.createdAt)}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <p className="px-1 text-[11px] text-muted-foreground">
        Escalation contact for this venue: {profile.escalationEmail ?? "not set"}
        {profile.escalationPhone ? ` · ${profile.escalationPhone}` : ""}
      </p>
    </div>
  );
}
