"use client";

import { useState } from "react";

import { CopyButton } from "@/components/common/copy-button";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { cn } from "@/lib/utils";
import type { AssembledPrompt } from "@/prompts/builder";

type LayerId = "system" | "tenant" | "runtime" | "messages";

const LAYERS: Array<{ id: LayerId; label: string; hint: string }> = [
  {
    id: "system",
    label: "System",
    hint: "Universal reply rules. Identical for every tenant.",
  },
  {
    id: "tenant",
    label: "Brand",
    hint: "This venue: voice, banned phrases, keyword bank, escalation policy.",
  },
  {
    id: "runtime",
    label: "Runtime",
    hint: "The review itself, its risk flags and the output request.",
  },
  {
    id: "messages",
    label: "Payload",
    hint: "Exactly what a chat completions call would receive.",
  },
];

export function PromptPreview({
  prompt,
  compact = false,
}: {
  prompt: AssembledPrompt;
  compact?: boolean;
}) {
  const [layer, setLayer] = useState<LayerId>(compact ? "runtime" : "system");

  const content =
    layer === "messages"
      ? JSON.stringify(prompt.messages, null, 2)
      : layer === "system"
        ? [prompt.system, prompt.riskAddendum].filter(Boolean).join("\n\n")
        : layer === "tenant"
          ? prompt.tenant
          : prompt.runtime;

  return (
    <Panel>
      <PanelHeader
        title="Assembled prompt"
        description={`Version ${prompt.version} · about ${prompt.meta.approxTokens} tokens · ${prompt.meta.draftCount} draft${prompt.meta.draftCount > 1 ? "s" : ""} requested`}
        action={<CopyButton value={content} label="Copy layer" />}
      />

      <div
        className="flex flex-wrap gap-1 border-b border-border px-3 py-2"
        role="tablist"
        aria-label="Prompt layers"
      >
        {LAYERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={layer === item.id}
            title={item.hint}
            onClick={() => setLayer(item.id)}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              layer === item.id
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {LAYERS.find((item) => item.id === layer)?.hint}
      </p>

      <pre
        className={cn(
          "overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words",
          compact ? "max-h-[420px]" : "max-h-[560px]",
        )}
      >
        {content}
      </pre>
    </Panel>
  );
}
