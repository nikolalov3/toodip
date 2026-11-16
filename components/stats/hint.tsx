"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The "?" next to a number or a heading. A real button: the explanation
 * opens on hover, on keyboard focus and on tap, and it is tied to the button
 * with aria-describedby, so phones and screen readers get what a title
 * attribute never gave them. Escape, or a tap elsewhere, closes it.
 */
export function Hint({ text }: { text: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const rect = button.current?.getBoundingClientRect();
    if (rect) setAlignEnd(rect.left + 280 > window.innerWidth - 16);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      const root = button.current?.parentElement;
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        ref={button}
        type="button"
        aria-label="What does this mean?"
        aria-describedby={id}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onPointerDown={(event) => {
          // A finger has no hover and, on some phones, gives no focus either:
          // the tap itself toggles. Mouse and keyboard are handled above.
          if (event.pointerType !== "touch") return;
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        ?
      </button>
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          "absolute bottom-full z-20 mb-1.5 w-max max-w-[min(280px,calc(100vw-32px))] rounded-lg border border-border bg-popover px-2.5 py-1.5 text-left text-[12px] leading-relaxed font-normal text-popover-foreground shadow-md",
          alignEnd ? "right-0" : "left-0",
        )}
      >
        {text}
      </span>
    </span>
  );
}
