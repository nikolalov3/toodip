"use client";

import { Play, Plus, Sparkles, Square, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  finishMeasurementAction,
  generateBatteryAction,
  runVisibilityPromptAction,
  saveBatteryAction,
} from "@/app/actions/visibility";
import { Panel, PanelHeader } from "@/components/common/surfaces";
import { Button } from "@/components/ui/button";
import { RUN_COST_ESTIMATE_USD } from "@/lib/billing";
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
  costUsd: number;
}

const LANG_RE = /^[a-z]{2}(-[a-z]{2})?$/;
const FIELD =
  "h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60";

/**
 * Two modes, one panel.
 *
 * Setup (no battery yet): the agent proposes questions from the business
 * profile and the client's website; the client edits every line in a table
 * — text, intent, language, branded flag — adds or removes rows, then saves.
 * Nothing runs until that explicit save.
 *
 * Run (battery exists): each server action call is one prompt execution,
 * three in flight at a time; the queue is capped at the plan's remaining
 * monthly allowance and the estimate shows runs, cost and time up front.
 */
export function MeasurePanel({
  prompts,
  suggestions,
  hasKey,
  canGenerate,
  runsUsed,
  runsLimit,
}: {
  prompts: BatteryPrompt[];
  suggestions: PromptProposal[];
  hasKey: boolean;
  /** Whether any AI key is configured for writing the battery itself. */
  canGenerate: boolean;
  /** Executions already recorded this calendar month (source "toodip"). */
  runsUsed: number;
  /** The plan's monthly allowance. */
  runsLimit: number;
}) {
  const router = useRouter();
  const intents = useMemo(
    () => [...new Set(prompts.map((prompt) => prompt.intent))],
    [prompts],
  );

  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(
    () =>
      new Set(
        intents.filter((intent) => !prompts.find((p) => p.intent === intent)?.isBranded),
      ),
  );
  // Product default: every question asked twice. One monthly report = 50 × 2.
  const [reps, setReps] = useState(2);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopRef = useRef(false);

  // Setup mode state. Rows start as the deterministic templates; "Generate"
  // replaces them with the agent's proposals. Every cell stays editable.
  const [rows, setRows] = useState<PromptProposal[]>(suggestions);
  const [generated, setGenerated] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [count, setCount] = useState(50);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  function updateRow(index: number, patch: Partial<PromptProposal>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  if (prompts.length === 0) {
    const defaultLang = rows[0]?.language ?? "en";
    const invalid = rows.filter(
      (row) =>
        row.text.trim().length < 8 ||
        row.intent.trim().length < 2 ||
        !LANG_RE.test(row.language.trim().toLowerCase()),
    ).length;

    async function generate() {
      setGenerating(true);
      const result = await generateBatteryAction({
        websiteUrl: websiteUrl.trim() || undefined,
        count,
      });
      setGenerating(false);
      if (!result.ok) {
        toast.error(result.message ?? "Generation failed.");
        return;
      }
      setRows(result.proposals);
      setGenerated(true);
      toast[result.source === "templates" ? "warning" : "success"](
        result.message ??
          `${result.proposals.length} questions written for your business.`,
      );
    }

    async function save() {
      if (invalid > 0) {
        toast.error(
          `${invalid} row${invalid === 1 ? "" : "s"} need a question (8+ characters), an intent and a two-letter language.`,
        );
        return;
      }
      setSaving(true);
      const result = await saveBatteryAction(
        rows.map((row) => ({
          ...row,
          text: row.text.trim(),
          intent: row.intent.trim(),
          language: row.language.trim().toLowerCase(),
        })),
      );
      setSaving(false);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    }

    return (
      <Panel>
        <PanelHeader
          title="Set up your question battery"
          description="The questions your customers ask AI assistants before choosing. Edit any line, add your own, remove what does not fit — nothing runs until you save."
        />

        {canGenerate && (
          <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-3">
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Your website (optional — sharpens the questions)
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://yourvenue.com"
                disabled={generating || saving}
                className={FIELD}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              How many
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                disabled={generating || saving}
                className={cn(FIELD, "w-24")}
              >
                {[30, 50, 80].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              variant="outline"
              disabled={generating || saving}
              onClick={generate}
            >
              <Sparkles className="size-3.5" />
              {generating
                ? "Writing questions…"
                : generated
                  ? "Regenerate"
                  : "Generate with AI"}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-8 px-4 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Question</th>
                <th className="w-44 px-2 py-2 font-medium">Intent</th>
                <th className="w-16 px-2 py-2 font-medium">Lang</th>
                <th className="w-20 px-2 py-2 text-center font-medium">Branded</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const bad =
                  row.text.trim().length < 8 ||
                  row.intent.trim().length < 2 ||
                  !LANG_RE.test(row.language.trim().toLowerCase());
                return (
                  <tr
                    key={index}
                    className={cn(
                      "border-b border-border/70 last:border-b-0",
                      bad && "bg-caution-soft/40",
                    )}
                  >
                    <td className="px-4 py-1.5 text-xs text-muted-foreground text-numeric">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.text}
                        onChange={(event) => updateRow(index, { text: event.target.value })}
                        placeholder="What would a customer ask an AI assistant?"
                        aria-label={`Question ${index + 1}`}
                        disabled={saving}
                        className={FIELD}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.intent}
                        onChange={(event) => updateRow(index, { intent: event.target.value })}
                        placeholder="e.g. Best in city"
                        aria-label={`Intent ${index + 1}`}
                        disabled={saving}
                        className={FIELD}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={row.language}
                        onChange={(event) =>
                          updateRow(index, { language: event.target.value.slice(0, 5) })
                        }
                        placeholder="en"
                        aria-label={`Language ${index + 1}`}
                        disabled={saving}
                        className={cn(FIELD, "uppercase")}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.isBranded}
                        onChange={(event) => updateRow(index, { isBranded: event.target.checked })}
                        aria-label={`Branded ${index + 1}`}
                        disabled={saving}
                        className="size-3.5 rounded border-input"
                        title="Asks about you by name — scored separately, never inflates the category score"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                        disabled={saving}
                        aria-label={`Remove question ${index + 1}`}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-critical disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { intent: "", language: defaultLang, text: "", isBranded: false },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add question
            </Button>
            <p className="text-xs text-muted-foreground">
              {rows.length} question{rows.length === 1 ? "" : "s"}
              {invalid > 0 && (
                <span className="ml-1.5 text-caution">· {invalid} incomplete</span>
              )}
              {!canGenerate && (
                <span className="ml-1.5">· standard templates (no AI key configured)</span>
              )}
            </p>
          </div>
          <Button size="sm" disabled={saving || generating || rows.length === 0} onClick={save}>
            {saving ? "Saving…" : `Save ${rows.length} question${rows.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </Panel>
    );
  }

  const selectedPrompts = prompts.filter((prompt) => selectedIntents.has(prompt.intent));
  const totalRuns = selectedPrompts.length * reps;
  const remaining = Math.max(0, runsLimit - runsUsed);
  const willRun = Math.min(totalRuns, remaining);
  const estimateUsd = willRun * RUN_COST_ESTIMATE_USD;
  const estimateMin = Math.max(1, Math.ceil((willRun * 10) / 60 / 3));

  async function run() {
    stopRef.current = false;
    setRunning(true);
    const queue: string[] = [];
    for (const prompt of selectedPrompts) {
      for (let i = 0; i < reps; i += 1) queue.push(prompt.id);
    }
    // Never queue past the plan's allowance; the server enforces it too.
    queue.length = Math.min(queue.length, remaining);
    const state: Progress = { done: 0, total: queue.length, mentioned: 0, failed: 0, costUsd: 0 };
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
        if (outcome.costUsd) state.costUsd += outcome.costUsd;
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
        `Measurement finished: ${state.done} runs, ${state.mentioned} mentioned this venue${state.failed ? `, ${state.failed} failed` : ""} · $${state.costUsd.toFixed(2)}.`,
      );
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Run a measurement"
        description={
          hasKey
            ? "Each question is asked on ChatGPT with web search on, as many times as you set. Results land below the moment the loop finishes."
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
            Repetitions per question
            <select
              value={reps}
              disabled={running}
              onChange={(event) => setReps(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {[1, 2, 3, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <span className="text-xs text-muted-foreground">
            {selectedPrompts.length} questions × {reps} = {totalRuns} runs · ≈ $
            {estimateUsd.toFixed(2)} · ~{estimateMin} min ·{" "}
            <span className="text-numeric">
              {runsUsed}/{runsLimit}
            </span>{" "}
            used this month
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
              <Button size="sm" disabled={!hasKey || willRun === 0} onClick={run}>
                <Play className="size-3.5" />
                Run {willRun} executions
              </Button>
            )}
          </div>
        </div>

        {totalRuns > remaining && (
          <p className="text-xs text-caution">
            {remaining === 0
              ? "This month's allowance is used up. It resets on the 1st, or upgrade on the Billing page."
              : `Only ${remaining} executions left this month — the run stops there. Lower the repetitions or deselect an intent to fit the whole battery.`}
          </p>
        )}

        {progress && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress.done}/{progress.total} done · {progress.mentioned} mentioned this venue
                {progress.failed > 0 && ` · ${progress.failed} failed`}
                {progress.costUsd > 0 && ` · $${progress.costUsd.toFixed(2)}`}
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
