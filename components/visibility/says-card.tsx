import { Card } from "@/components/stats/blocks";
import type { Descriptor, Quote } from "@/services/visibility";

/**
 * What the assistants say about the venue: the sentences that name it, as
 * evidence the owner can read, and the words that sit next to its name
 * against the words next to the strongest rival. The difference between the
 * two lists is usually the reason the venue is missing from a question type.
 */
export function SaysCard({
  venueName,
  quotes,
  descriptors,
  rival,
}: {
  venueName: string;
  quotes: Quote[];
  descriptors: Descriptor[];
  rival: { name: string; words: Descriptor[] } | null;
}) {
  const ownWords = new Set(descriptors.map((d) => d.word));
  const rivalOnly = rival ? rival.words.filter((d) => !ownWords.has(d.word)).slice(0, 5) : [];

  return (
    <Card className="p-0">
      <div className="grid gap-0 md:grid-cols-[1.3fr_1fr] md:divide-x md:divide-border">
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">In the assistants&apos; words</p>
          {quotes.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">No answer in this measurement names {venueName}, so there is nothing to quote yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {quotes.map((q) => (
                <li key={q.prompt}>
                  <blockquote className="border-l-2 border-brand/50 pl-3 text-[13.5px] leading-relaxed">“{q.text}”</blockquote>
                  <p className="mt-1 pl-3 text-[12px] text-muted-foreground">asked: {q.prompt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-4 border-t border-border px-4 py-3 md:border-t-0">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Words next to your name</p>
            {descriptors.length === 0 ? (
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">Nothing repeats yet.</p>
            ) : (
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {descriptors.map((d) => (
                  <span key={d.word} className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[12px] text-brand">
                    {d.word} <span className="text-numeric opacity-70">{d.count}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
          {rival && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Words next to {rival.name}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {rival.words.map((d) => (
                  <span key={d.word} className="rounded-md bg-muted px-1.5 py-0.5 text-[12px] text-muted-foreground">
                    {d.word} <span className="text-numeric opacity-70">{d.count}</span>
                  </span>
                ))}
              </p>
              {rivalOnly.length > 0 && (
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  Said about them, never about you: <span className="text-foreground">{rivalOnly.map((d) => d.word).join(", ")}</span>. If any of
                  it is true of you too, it belongs on your site and your profiles.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
