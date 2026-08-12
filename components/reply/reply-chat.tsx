"use client";

import {
  Check,
  CheckCheck,
  Copy,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  chatMarkPastedAction,
  chatRegenerateAction,
  chatReplyAction,
  type ChatReplyResult,
} from "@/app/actions/reply-chat";
import { SentimentBadge } from "@/components/common/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { riskFlagLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { RiskFlagType, Sentiment } from "@/types/domain";

interface ReplyEntry {
  reviewId: string;
  draftId: string;
  replyText: string;
  sentiment: Sentiment | null;
  requiresApproval: boolean;
  riskFlags: RiskFlagType[];
  provider: string;
  copied: boolean;
  published: boolean;
}

type ChatItem =
  | { kind: "review"; id: string; text: string }
  | { kind: "reply"; id: string; entry: ReplyEntry };

let nextId = 0;
const uid = () => `chat-${nextId++}`;

/**
 * The conversational way to answer a review: paste, read, copy, done. No
 * stars, no reviewer name; the classifier works those out and the rating is
 * stored as an inferred guess. Flagged reviews render sealed and route to the
 * approval queue instead of offering a copy button.
 */
export function ReplyChat() {
  const router = useRouter();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [items, pending]);

  const applyResult = (result: ChatReplyResult, replaceId?: string) => {
    if (!result.ok || !result.reviewId || !result.draftId) {
      toast.error(result.message ?? "Something went wrong.");
      return;
    }
    const entry: ReplyEntry = {
      reviewId: result.reviewId,
      draftId: result.draftId,
      replyText: result.replyText ?? "",
      sentiment: result.sentiment ?? null,
      requiresApproval: Boolean(result.requiresApproval),
      riskFlags: result.riskFlags ?? [],
      provider: result.provider ?? "",
      copied: false,
      published: false,
    };
    setItems((prev) =>
      replaceId
        ? prev.map((item) =>
            item.id === replaceId && item.kind === "reply"
              ? { ...item, entry }
              : item,
          )
        : [...prev, { kind: "reply", id: uid(), entry }],
    );
    router.refresh();
  };

  const send = () => {
    const text = input.trim();
    if (text.length < 10 || pending) return;
    setItems((prev) => [...prev, { kind: "review", id: uid(), text }]);
    setInput("");
    startTransition(async () => {
      applyResult(await chatReplyAction(text));
    });
  };

  const regenerate = (item: ChatItem & { kind: "reply" }) => {
    if (pending) return;
    startTransition(async () => {
      applyResult(await chatRegenerateAction(item.entry.reviewId), item.id);
    });
  };

  const copy = async (item: ChatItem & { kind: "reply" }) => {
    try {
      await navigator.clipboard.writeText(item.entry.replyText);
      toast.success("Copied to clipboard.");
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id && it.kind === "reply"
            ? { ...it, entry: { ...it.entry, copied: true } }
            : it,
        ),
      );
    } catch {
      toast.error("The browser blocked clipboard access.");
    }
  };

  const markPasted = (item: ChatItem & { kind: "reply" }) => {
    if (pending) return;
    startTransition(async () => {
      const result = await chatMarkPastedAction(item.entry.reviewId);
      if (!result.ok) {
        toast.error(result.message ?? "Could not mark as published.");
        return;
      }
      toast.success(result.message ?? "Marked as published.");
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id && it.kind === "reply"
            ? { ...it, entry: { ...it.entry, published: true } }
            : it,
        ),
      );
      router.refresh();
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {items.length === 0 && !pending && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageSquareText className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Paste a review to get a reply</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              No stars, no names. The classifier reads the sentiment, the
              engine writes the reply, you copy it into Google.
            </p>
          </div>
        )}

        {items.map((item) =>
          item.kind === "review" ? (
            <div key={item.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap">
                {item.text}
              </div>
            </div>
          ) : (
            <ReplyBubble
              key={item.id}
              entry={item.entry}
              pending={pending}
              onRegenerate={() => regenerate(item)}
              onCopy={() => copy(item)}
              onMarkPasted={() => markPasted(item)}
            />
          ),
        )}

        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Working on it…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Paste the review here…"
            rows={3}
            className="min-h-16 resize-none"
            disabled={pending}
          />
          <Button
            type="button"
            onClick={send}
            disabled={pending || input.trim().length < 10}
            aria-label="Generate reply"
          >
            <Send className="size-3.5" data-icon="inline-start" />
            Reply
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Cmd/Ctrl + Enter to send. Each review is saved and triaged like any
          other.
        </p>
      </div>
    </div>
  );
}

function ReplyBubble({
  entry,
  pending,
  onRegenerate,
  onCopy,
  onMarkPasted,
}: {
  entry: ReplyEntry;
  pending: boolean;
  onRegenerate: () => void;
  onCopy: () => void;
  onMarkPasted: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[85%] rounded-lg rounded-bl-sm border bg-card",
          entry.requiresApproval ? "border-caution/40" : "border-border",
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3.5 py-2">
          <SentimentBadge sentiment={entry.sentiment} />
          {entry.riskFlags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center rounded-md border border-caution/30 bg-caution-soft px-1.5 py-0.5 text-xs font-medium text-caution"
            >
              {riskFlagLabels[flag]}
            </span>
          ))}
          {entry.provider && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              {entry.provider}
            </span>
          )}
        </div>

        <p className="px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {entry.replyText}
        </p>

        {entry.requiresApproval ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-caution/30 bg-caution-soft px-3.5 py-2.5">
            <ShieldAlert className="size-4 text-caution" />
            <span className="text-xs font-semibold text-caution">
              Requires approval before it can be used
            </span>
            <Link
              href={`/queue?review=${entry.reviewId}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "ml-auto",
              )}
            >
              Open in approval queue
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3.5 py-2">
            {entry.published ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive">
                <CheckCheck className="size-3.5" /> Published on Google
              </span>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCopy}
                  disabled={pending}
                >
                  {entry.copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {entry.copied ? "Copied" : "Copy reply"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={pending}
                >
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </Button>
                {entry.copied && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={onMarkPasted}
                    disabled={pending}
                  >
                    <CheckCheck className="size-3.5" />
                    Mark as pasted in Google
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
