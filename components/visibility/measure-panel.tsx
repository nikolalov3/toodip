"use client";

import { Play, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  finishMeasurementAction,
  runVisibilityPromptAction,
  saveBatteryAction,
} from "@/app/actions/visibility";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PromptProposal } from "@/services/measurement";

export interface BatteryPrompt {
  id: string;
  text: string;
  intent: string;
  isBranded: boolean;
}

interface Progress {
  done: number;
  total: number;
  mentioned: number;
  failed: number;
}

/**
 * Runs the battery from the browser: each server action call is one prompt
 * execution, three run in parallel, and the page refreshes with the new
 * measurement when the loop finishes. Nothing here interprets results; it only
 * produces runs for the ledger.
 */
export function MeasurePanel({
  prompts,
  suggestions,
  hasKey,
}: {
  prompts: BatteryPrompt[];
  suggestions: PromptProposal[];
  hasKey: boolean;
}) {
  const router = useRouter();
  const intents = useMemo(
    () => [...new Set(prompts.map((prompt) => prompt.intent))],
    [prompts],
  );

  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(
    () => new Set(intents.filter((intent) => !prompts.find((p) => p.intent === intent)?.isBranded)),
  );
  const [reps, setReps] = useState(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopRef = useRef(false);

  // Setup mode: proposals reviewed before anything is saved.
  const [picked, setPicked] = useState<Set<number>>(
    () => new Set(suggestions.map((_, index) => index)),
  );
  const [saving, setSaving] = useState(false);

  if (prompts.length === 0) {
    return (
      <Panel>
        <PanelHeader
          title="Set up the prompt battery"
          description="Proposed from the business profile. Review every line before saving, then edit the set in the database as the venue's strategy sharpens."
        />
        <ul className="divide-y divide-border">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.text} className="flex items-start gap-2.5 px-4 py-2.5">
              <input
                type="checkbox"
                checked={picked.has(index)}
                onChange={(event) => {
                  const next = new Set(picked);
                  if (event.target.checked) next.add(index);
                  else next.delete(index);
                  setPicked(next);
                }}
                className="mt-1 size-3.5 rounded border-input"
                aria-label={`Include: ${suggestion.text}`}
              />
              <div>
                <p className="text-sm">{suggestion.text}</p>
                <p className="text-xs text-muted-foreground">
                  {suggestion.intent} · {suggestion.language.toUpperCase()}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button
            size="sm"
            disabled={saving || picked.size === 0}
            onClick={async () => {
              setSaving(true);
              const result = await saveBatteryAction(
                suggestions.filter((_, index) => picked.has(index)),
              );
              setSaving(false);
              if (result.ok) {
                toast.success(result.message);
                router.refresh();
              } else {
                toast.error(result.message);
              }
            }}
          >
            {saving ? "Saving..." : `Save ${picked.size} prompts`}
          </Button>
        </div>
      </Panel>
    );
  }

  const selectedPrompts = prompts.filter((prompt) =>
    selectedIntents.has(prompt.intent),
  );
  const totalRuns = selectedPrompts.length * reps;

  async function run() {
    stopRef.current = false;
    setRunning(true);
    const queue: string[] = [];
    for (const prompt of selectedPrompts) {
      for (let i = 0; i < reps; i += 1) queue.push(prompt.id);
    }
    const state: Progress = { done: 0, total: queue.length, mentioned: 0, failed: 0 };
    setProgress({ ...state });

    // Three workers keep the wall clock short without hammering the API.
    async function worker() {
      while (queue.length > 0 && !stopRef.current) {
        const promptId = queue.shift();
        if (!promptId) return;
        const outcome = await runVisibilityPromptAction(promptId);
        state.done += 1;
        if (!outcome.ok) state.failed += 1;
        if (outcome.mentionedOwn) state.mentioned += 1;
        setProgress({ ...state });
        if (!outcome.ok && outcome.error?.includes("OPENAI_API_KEY")) {
          stopRef.current = true;
          toast.error(outcome.error);
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);

    setRunning(false);
    await finishMeasurementAction();
    router.refresh();
    if (!stopRef.current) {
      toast.success(
        `Measurement finished: ${state.done} runs, ${state.mentioned} mentioned this venue${state.failed ? `, ${state.failed} failed` : ""}.`,
      );
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Run a measurement"
        description={
          hasKey
            ? "Each prompt is asked with web search on, several times, on ChatGPT. Results land below the moment the loop finishes."
            : "Needs OPENAI_API_KEY in the environment. Add it and reload; the battery is ready to go."
        }
      />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {intents.map((intent) => {
            const active = selectedIntents.has(intent);
            const branded = prompts.find((p) => p.intent === intent)?.isBranded;
            return (
              <button
                key={intent}
                type="button"
                disabled={running}
                onClick={() => {
                  const next = new Set(selectedIntents);
                  if (active) next.delete(intent);
                  else next.add(intent);
                  setSelectedIntents(next);
                }}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors",
                  active
                    ? "border-brand/40 bg-brand-soft font-medium text-brand"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {intent}
                {branded && " (branded)"}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Repetitions per prompt
            <select
              value={reps}
              disabled={running}
              onChange={(event) => setReps(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {[1, 3, 5, 8].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <span className="text-xs text-muted-foreground">
            {selectedPrompts.length} prompts × {reps} = {totalRuns} runs, roughly{" "}
            {Math.ceil((totalRuns * 10) / 60 / 3)} min
          </span>

          <div className="ml-auto flex items-center gap-2">
            {running ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  stopRef.current = true;
                }}
              >
                <Square className="size-3.5" />
                Stop after current runs
              </Button>
            ) : (
              <Button size="sm" disabled={!hasKey || totalRuns === 0} onClick={run}>
                <Play className="size-3.5" />
                Run {totalRuns} executions
              </Button>
            )}
          </div>
        </div>

        {progress && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress.done}/{progress.total} done · {progress.mentioned} mentioned this venue
                {progress.failed > 0 && ` · ${progress.failed} failed`}
              </span>
              <span className="text-numeric">
                {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
