import { cn } from "@/lib/utils";

/**
 * The toodip mark: a reply bubble with the two dots of the double o.
 *
 * The neon is deliberate and contained. It lives on the mark and nowhere else,
 * so the product still reads as operations software rather than a landing page.
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg",
        "bg-[linear-gradient(145deg,var(--brand-neon),var(--brand))]",
        "shadow-[0_0_0_1px_var(--brand-neon-ring),0_0_14px_-4px_var(--brand-neon)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 6.8C4 5.25 5.25 4 6.8 4h10.4C18.75 4 20 5.25 20 6.8v6.9c0 1.55-1.25 2.8-2.8 2.8H10l-4.6 3.45A0.8 0.8 0 0 1 4.2 19.3l.05-2.9A2.8 2.8 0 0 1 4 15.6V6.8Z"
          fill="var(--brand-neon-ink)"
        />
        <circle cx="9.4" cy="10.2" r="1.55" fill="var(--brand-neon)" />
        <circle cx="14.6" cy="10.2" r="1.55" fill="var(--brand-neon)" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight lowercase text-foreground",
        className,
      )}
    >
      toodip
    </span>
  );
}

export function Logo({
  size = 28,
  className,
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <Wordmark className={wordmarkClassName} />
    </span>
  );
}
