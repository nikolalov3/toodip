import type { ReactNode } from "react";

/**
 * An assistant's answer as it was stored, made readable: sources become
 * small links to the page that was cited, bold stays bold, list items keep
 * their lines. Nothing is added or removed; this is the evidence.
 */

const INLINE = /\(\s*\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*\)|\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyPrefix}-${index}`;
    index += 1;
    if (match[2] || match[4]) {
      const url = match[2] ?? match[4];
      const label = (match[1] ?? match[3] ?? "").trim();
      const isFootnote = Boolean(match[2]) || /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(label);
      out.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer noopener nofollow"
          title={url}
          className={
            isFootnote
              ? "mx-0.5 inline-block rounded-md bg-muted px-1.5 py-px align-baseline text-[11.5px] font-medium text-muted-foreground no-underline hover:text-brand"
              : "text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
          }
        >
          {isFootnote ? hostOf(url) : label}
        </a>,
      );
    } else {
      out.push(
        <strong key={key} className="font-semibold">
          {match[5]}
        </strong>,
      );
    }
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function AnswerText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5 text-[13.5px] leading-relaxed">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim() || /^\s*-{3,}\s*$/.test(line)) return null;
        const heading = line.match(/^\s*#{1,4}\s+(.*)$/);
        if (heading) {
          return (
            <p key={i} className="mt-1.5 font-semibold">
              {inline(heading[1], `h${i}`)}
            </p>
          );
        }
        const bullet = line.match(/^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (bullet) {
          const numbered = line.match(/^\s*(\d+[.)])/);
          return (
            <p key={i} className="flex gap-2" style={{ paddingLeft: Math.min(bullet[1].length, 6) * 6 }}>
              <span aria-hidden className="text-numeric shrink-0 text-muted-foreground">
                {numbered ? numbered[1] : "•"}
              </span>
              <span className="min-w-0">{inline(bullet[2], `b${i}`)}</span>
            </p>
          );
        }
        return <p key={i}>{inline(line.replace(/^\s+/, ""), `p${i}`)}</p>;
      })}
    </div>
  );
}
