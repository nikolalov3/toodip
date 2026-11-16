"use client";

import { useState, useTransition } from "react";

import { logInterventionAction } from "@/app/actions/visibility";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const KINDS = [
  { value: "record_update", label: "Google Business Profile" },
  { value: "site_change", label: "Website content or schema" },
  { value: "guide_entry", label: "Listing in a guide or directory" },
  { value: "social_post", label: "Instagram or Facebook" },
  { value: "review_reply", label: "Review replies" },
  { value: "other", label: "Something else" },
] as const;

const SURFACES = [
  { value: "google", label: "Google" },
  { value: "site", label: "Own website" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "guide", label: "External guide" },
  { value: "other", label: "Other" },
] as const;

const DEFAULT_SURFACE: Record<(typeof KINDS)[number]["value"], (typeof SURFACES)[number]["value"]> = {
  record_update: "google",
  site_change: "site",
  guide_entry: "guide",
  social_post: "instagram",
  review_reply: "google",
  other: "other",
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * A small append-only form for the interventions ledger. Opens inline so the
 * owner logs a change right where the measurements are read.
 */
export function LogChangeForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("site_change");
  const [surface, setSurface] = useState<(typeof SURFACES)[number]["value"]>("site");
  const [performedOn, setPerformedOn] = useState(today);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (description.trim().length < 3) {
      setMessage({ ok: false, text: "Describe the change in a few words." });
      return;
    }
    startTransition(async () => {
      const result = await logInterventionAction({ kind, surface, description, performedOn });
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        setDescription("");
        setOpen(false);
      }
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-muted-foreground">
          Changed something? Log it with its date and the next measurement reads against it.
        </p>
        <Button type="button" size="sm" variant={open ? "outline" : "default"} onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Log a change"}
        </Button>
      </div>
      {open && (
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_150px]"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
            What changed
            <select
              className={selectClass}
              value={kind}
              onChange={(event) => {
                const next = event.target.value as (typeof KINDS)[number]["value"];
                setKind(next);
                setSurface(DEFAULT_SURFACE[next]);
              }}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
            Where
            <select
              className={selectClass}
              value={surface}
              onChange={(event) => setSurface(event.target.value as (typeof SURFACES)[number]["value"])}
            >
              {SURFACES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
            Date
            <Input type="date" value={performedOn} max={today} onChange={(event) => setPerformedOn(event.target.value)} className="h-8 text-[13px]" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-muted-foreground sm:col-span-3">
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Added opening hours, menu with prices and a FAQ page to the website"
              className="text-[13px]"
            />
          </label>
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            {message && (
              <p className={cn("text-[12.5px]", message.ok ? "text-positive" : "text-critical")} role="status">
                {message.text}
              </p>
            )}
          </div>
        </form>
      )}
      {!open && message?.ok && (
        <p className="mt-2 text-[12.5px] text-positive" role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
