import { Eyebrow, Surface } from "@/components/panel/ui";
import { WriteNoteButton } from "@/components/visibility/write-note-button";
import { formatDate } from "@/lib/format";
import type { AnalystNote } from "@/services/analyst";

/**
 * The summary in words. The panel computed every number and every verdict in
 * it; a model (DeepSeek) only worded the sentences, and a sentence stating a
 * number the facts do not contain was dropped before it got here. Each point
 * carries the ids of the facts it rests on; hovering an id shows the fact.
 */
export function AnalystNoteCard({
  note,
  canWrite,
  periodLabel,
  seriesId,
}: {
  note: AnalystNote | null;
  canWrite: boolean;
  periodLabel: string;
  /** The series the summary is about, so "write" writes about the assistant on the page. */
  seriesId?: string;
}) {
  if (!note) {
    return (
      <Surface className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <Eyebrow>Summary in words</Eyebrow>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {canWrite
              ? `No written summary yet for ${periodLabel}. It is worded from the facts on this page; no number in it is invented.`
              : `No written summary yet for ${periodLabel}. It is written when the report finishes.`}
          </p>
        </div>
        {canWrite && <WriteNoteButton hasNote={false} seriesId={seriesId} />}
      </Surface>
    );
  }

  const factById = new Map(note.facts.map((f) => [f.id, f.text]));
  const byRules = note.model === "template";
  return (
    <Surface className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Summary in words · {periodLabel}</Eyebrow>
          <p className="mt-1.5 text-[17px] font-semibold leading-snug tracking-tight">{note.headline}</p>
        </div>
        {canWrite && <WriteNoteButton hasNote seriesId={seriesId} />}
      </div>
      <ol className="mt-3.5 flex flex-col gap-2.5">
        {note.points.map((point, index) => (
          <li key={index} className="flex gap-3 text-[14px] leading-relaxed">
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
                      className="cursor-help rounded-md border border-border px-1 text-[10.5px] font-medium text-muted-foreground no-underline"
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
      <p className="mt-3.5 text-[12px] leading-relaxed text-muted-foreground">
        {byRules
          ? `Written by the panel's own rules on ${formatDate(note.createdAt)} from ${note.facts.length} facts it computed.`
          : `Worded by DeepSeek on ${formatDate(note.createdAt)} from ${note.facts.length} facts the panel computed. The model saw no raw answers and did no arithmetic; a sentence stating a number that is not in the facts is dropped.`}{" "}
        Hover a fact id to read the fact.
      </p>
    </Surface>
  );
}
