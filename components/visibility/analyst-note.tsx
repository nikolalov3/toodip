import { Card } from "@/components/stats/blocks";
import { WriteNoteButton } from "@/components/visibility/write-note-button";
import { formatDate } from "@/lib/format";
import type { AnalystNote } from "@/services/analyst";
import { modelLabel } from "@/services/visibility";

/**
 * The analyst's reading of the latest measurement. Every point carries the
 * ids of the facts it rests on; hovering an id shows the fact, so the owner
 * (or a sceptical reader) can check each sentence against the numbers.
 */
export function AnalystNoteCard({
  note,
  canWrite,
  periodLabel,
}: {
  note: AnalystNote | null;
  canWrite: boolean;
  periodLabel: string;
}) {
  if (!note) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Analyst note</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {canWrite
              ? `No note yet for ${periodLabel}. The analyst reads the facts below and writes what they mean in five points.`
              : `No note yet for ${periodLabel}. It is written when the measurement finishes.`}
          </p>
        </div>
        {canWrite && <WriteNoteButton hasNote={false} />}
      </Card>
    );
  }

  const factById = new Map(note.facts.map((f) => [f.id, f.text]));
  return (
    <Card className="border-brand/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Analyst note · {periodLabel}</p>
          <p className="mt-1 text-[16px] font-semibold leading-snug">{note.headline}</p>
        </div>
        {canWrite && <WriteNoteButton hasNote />}
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {note.points.map((point, index) => (
          <li key={index} className="flex gap-2.5 text-[13.5px] leading-relaxed">
            <span className="mt-[3px] inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
              {index + 1}
            </span>
            <span className="min-w-0">
              {point.text}
              {point.facts.length > 0 && (
                <span className="ml-1.5 inline-flex flex-wrap gap-1 align-middle">
                  {point.facts.map((id) => (
                    <abbr
                      key={id}
                      title={factById.get(id) ?? id}
                      className="cursor-help rounded-[3px] border border-border px-1 text-[10px] font-medium text-muted-foreground no-underline"
                    >
                      {id}
                    </abbr>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Written by {modelLabel(note.model)} on {formatDate(note.createdAt)} from {note.facts.length} facts computed by the panel; the model saw no raw
        answers and did no arithmetic. Hover a fact id to read the fact.
      </p>
    </Card>
  );
}
