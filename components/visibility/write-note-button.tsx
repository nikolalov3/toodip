"use client";

import { useState, useTransition } from "react";

import { writeAnalystNoteAction } from "@/app/actions/visibility";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Asks the server to write (or rewrite) the analyst note for the latest measurement. */
export function WriteNoteButton({ hasNote }: { hasNote: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={hasNote ? "outline" : "default"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await writeAnalystNoteAction();
            setMessage({ ok: result.ok, text: result.ok ? "" : result.message });
          })
        }
      >
        {pending ? "Writing…" : hasNote ? "Write again" : "Write the analyst note"}
      </Button>
      {message && !message.ok && (
        <span className={cn("text-[12px]", "text-critical")} role="status">
          {message.text}
        </span>
      )}
    </span>
  );
}
