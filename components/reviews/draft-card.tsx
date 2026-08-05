"use client";

import { Check, CircleAlert, PencilLine } from "lucide-react";

import { QualityScore } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { QualityResult } from "@/services/generation/quality";
import type { ReviewDraft } from "@/types/domain";

export function DraftCard({
  draft,
  quality,
  selected,
  busy,
  onSelect,
  onEdit,
}: {
  draft: ReviewDraft;
  quality?: QualityResult;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors",
        selected ? "border-brand/50 ring-1 ring-brand/25" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selected ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">
              <Check className="size-3" />
              Selected
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {draft.editedFromDraftId ? "Human edit" : "Draft"}
            </span>
          )}
          {draft.keywordUsed && (
            <span className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              {draft.keywordUsed}
            </span>
          )}
        </div>
        {quality && <QualityScore score={quality.score} />}
      </div>

      <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed">
        {draft.draftText}
      </p>

      <p className="mt-2.5 text-xs text-muted-foreground">{draft.rationale}</p>

      {quality && quality.issues.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1">
          {quality.issues.map((issue) => (
            <li
              key={issue}
              className="flex items-start gap-1.5 text-xs text-caution"
            >
              <CircleAlert className="mt-0.5 size-3 shrink-0" />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
        <span className="text-[11px] text-muted-foreground">
          {draft.model} · prompt {draft.promptVersion} ·{" "}
          {formatRelative(draft.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={onEdit}
          >
            <PencilLine className="size-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selected ? "outline" : "default"}
            disabled={busy || selected}
            onClick={onSelect}
          >
            {selected ? "In use" : "Use this"}
          </Button>
        </div>
      </div>
    </article>
  );
}
