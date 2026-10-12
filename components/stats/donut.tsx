import { cn } from "@/lib/utils";

/**
 * A ring chart with a legend, the way the stats panel showed share of
 * voice: the venue's slice highlighted, the long tail folded into "Rest".
 * Pure SVG, server-rendered.
 */

export interface DonutSlice {
  label: string;
  value: number;
  /** Highlighted as the venue's own slice. */
  own?: boolean;
  /** Optional trailing text in the legend (e.g. "17%"). */
  note?: string;
}

export const DONUT_COLORS = [
  "#3b82f6",
  "#38bdf8",
  "#34d399",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#2dd4bf",
  "#f472b6",
  "#818cf8",
  "#facc15",
];
const REST_COLOR = "#6b7280";

export function Donut({
  slices,
  center,
  centerLabel,
  restLabel = "Rest",
  maxSlices = 8,
  size = 184,
  className,
}: {
  slices: DonutSlice[];
  center: string;
  centerLabel?: string;
  restLabel?: string;
  maxSlices?: number;
  size?: number;
  className?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const own = slices.find((s) => s.own);
  const head = slices.filter((s) => !s.own).slice(0, own ? maxSlices - 1 : maxSlices);
  const tail = slices.filter((s) => !s.own).slice(own ? maxSlices - 1 : maxSlices);
  const shown: Array<DonutSlice & { color: string }> = [];
  // Keep the original ordering for the legend, insert own where it ranks.
  let colorIndex = 0;
  for (const s of slices) {
    if (s.own) {
      shown.push({ ...s, color: "var(--brand)" });
    } else if (head.includes(s)) {
      shown.push({ ...s, color: DONUT_COLORS[colorIndex % DONUT_COLORS.length] });
      colorIndex += 1;
    }
  }
  const restValue = tail.reduce((sum, s) => sum + s.value, 0);
  if (restValue > 0) shown.push({ label: `${restLabel} (${tail.length})`, value: restValue, color: REST_COLOR });

  const r = 42;
  const stroke = 14;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-6 md:flex-row md:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
          {shown.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={s.own ? stroke + 2 : stroke}
                strokeDasharray={`${Math.max(0, len - 0.8)} ${c}`}
                strokeDashoffset={-offset}
                className="transition-[stroke-dasharray] duration-700 ease-out"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-numeric text-[30px] font-semibold leading-none tracking-tight">{center}</span>
          {centerLabel && <span className="mt-1 text-[12px] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <ol className="flex min-w-0 flex-1 flex-col gap-1.5">
        {shown.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "grid grid-cols-[10px_1fr_auto] items-center gap-3 text-[13.5px]",
              s.own ? "font-semibold text-brand" : "text-foreground",
            )}
          >
            <i className="inline-block size-2.5 rounded-[2px]" style={{ background: s.color }} />
            <span className="truncate">
              {s.color !== REST_COLOR ? `${i + 1}. ` : ""}
              {s.label}
              {s.own && (
                <span className="ml-2 rounded-[3px] border border-brand/40 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-brand">
                  You
                </span>
              )}
            </span>
            <b className="text-numeric font-semibold">{s.note ?? `${Math.round((s.value / total) * 100)}%`}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
