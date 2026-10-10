"use client";

import { useEffect, useRef } from "react";

/**
 * The pin arriving, on a slow loop. The outline draws itself from the tip, up
 * the left side, over the top and back down the right, with the inner ring
 * closing around the signal dot; the body fills; the pin lifts, then drops and
 * stamps the page; it rests, fades, and draws again. Only the first stamp
 * sends the event the globe behind answers with a wave through its lines, so
 * the page settles after its entrance.
 *
 * People who asked for reduced motion get the finished pin, nothing moving:
 * the stylesheet handles that, so the markup is the same on the server and in
 * the browser and the drawing starts on the first painted frame.
 */

const OUTER =
  "M16 30.5C12.9 23.4 4.8 20.3 4.8 13A11.2 11.2 0 1 1 27.2 13C27.2 20.3 19.1 23.4 16 30.5Z";
const INNER = "M16 5.8A7.1 7.1 0 1 0 16 20 7.1 7.1 0 0 0 16 5.8Z";

export const STAMP_EVENT = "toodip:stamp";
/** One cycle of the loop; the stamp lands at 40% of it. Matches globals.css. */
const CYCLE_MS = 8000;
const STAMP_AT_MS = CYCLE_MS * 0.4;

export function PinIntro({ size = 52 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      window.dispatchEvent(
        new CustomEvent(STAMP_EVENT, {
          detail: { x: rect.left + rect.width / 2, y: rect.bottom - rect.height * 0.05 },
        }),
      );
    }, STAMP_AT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} className="pin-intro" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pin-intro-svg"
        aria-hidden
      >
        <path d={OUTER} className="pin-stroke pin-stroke-outer" />
        <path d={INNER} className="pin-stroke pin-stroke-inner" />
        <path
          d={`${OUTER} ${INNER}`}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          className="pin-fill"
        />
        <circle cx="16" cy="12.9" r="3.7" fill="#38b6ff" className="pin-dot" />
      </svg>
      <span className="pin-shadow" aria-hidden />
    </div>
  );
}
