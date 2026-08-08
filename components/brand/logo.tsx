import { cn } from "@/lib/utils";

/**
 * The toodip mark: a mine cart carrying two glowing nuggets.
 *
 * The nuggets are the double o of the wordmark, carried over from the first
 * version of the mark, and the cart is what the product does: it mines. The
 * neon stays deliberate and contained, on the mark and nowhere else, so the
 * product reads as operations software rather than a landing page.
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
        width={size * 0.66}
        height={size * 0.66}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cart body: a trapezoid with a rounded bottom edge. */}
        <path
          d="M4.4 6.6h15.2l-1.72 6.55a1.9 1.9 0 0 1-1.84 1.42H7.96a1.9 1.9 0 0 1-1.84-1.42L4.4 6.6Z"
          fill="var(--brand-neon-ink)"
        />
        {/* The double o, riding in the cart as glowing ore. */}
        <circle cx="9.35" cy="9.9" r="1.7" fill="var(--brand-neon)" />
        <circle cx="14.65" cy="9.9" r="1.7" fill="var(--brand-neon)" />
        {/* Wheels on a hint of rail. */}
        <circle cx="8.8" cy="17.1" r="1.65" fill="var(--brand-neon-ink)" />
        <circle cx="15.2" cy="17.1" r="1.65" fill="var(--brand-neon-ink)" />
        <rect
          x="4.6"
          y="19.9"
          width="14.8"
          height="1.25"
          rx="0.625"
          fill="var(--brand-neon-ink)"
          opacity="0.65"
        />
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
