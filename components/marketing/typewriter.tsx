"use client";

import { useEffect, useState } from "react";

/**
 * The headline, typed as if someone were writing it while the pin draws.
 * The full sentence sits in the layout from the first frame (invisible), so
 * nothing below it moves while the letters arrive; the typed prefix is
 * painted on top. Greedy line wrapping means a prefix always breaks exactly
 * where the full text does. Reduced motion shows the finished sentence.
 */
export function Typewriter({
  text,
  startMs = 500,
  charMs = 34,
  className,
}: {
  text: string;
  startMs?: number;
  charMs?: number;
  className?: string;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    let timer = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) {
        // A touch of unevenness reads as a hand, not a metronome; a longer
        // pause after punctuation does the same.
        const prev = text[i - 1];
        const pause = prev === "," ? 260 : prev === " " ? charMs * 1.4 : charMs;
        timer = window.setTimeout(tick, pause + Math.random() * 28);
      }
    };
    timer = window.setTimeout(tick, startMs);
    return () => window.clearTimeout(timer);
  }, [text, startMs, charMs]);

  // Server and first client paint: the full sentence, invisible, holding
  // the space. Visible to assistive tech via aria-label on the wrapper.
  const shown = count === null ? 0 : count;
  const done = shown >= text.length;

  return (
    <span className="relative block" aria-label={text}>
      <span aria-hidden className={`${className ?? ""} invisible block`}>
        {text}
      </span>
      <span aria-hidden className={`${className ?? ""} absolute inset-0 block`}>
        {text.slice(0, shown)}
        <span className={`tw-caret ${done ? "tw-caret-done" : ""}`} />
      </span>
    </span>
  );
}
