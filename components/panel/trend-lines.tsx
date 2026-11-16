import { ASSISTANT_COLOR } from "@/components/panel/ui";
import { wilson } from "@/lib/stats-math";
import type { TrendPoint } from "@/services/visibility";

/**
 * Share of answers naming the venue over time, one line per series.
 *
 * Time runs along the bottom as it really ran: two assistants asked in the
 * same week sit above each other, a gap of a month looks like a month. The
 * series the page describes is drawn in full with the band its true value
 * plausibly lies in (wide band, small sample); the others are thin, so the
 * eye can compare shapes without ever reading two methods as one line.
 * Pure SVG, rendered on the server, once wide and once for a phone.
 */
export function TrendLines({ points, selectedSeriesId }: { points: TrendPoint[]; selectedSeriesId: string | null }) {
  if (points.length === 0) return null;

  const selected = points.filter((p) => p.seriesId === selectedSeriesId);
  const selectedPlatform = selected[0]?.platform ?? null;
  // Another assistant keeps its own colour; another model of the same assistant
  // goes grey, so two green lines are never mistaken for one series.
  const colorOf = (p: TrendPoint) =>
    p.seriesId === selectedSeriesId || p.platform !== selectedPlatform ? ASSISTANT_COLOR[p.platform] : "var(--assistant-other)";

  const bySeries = new Map<string, TrendPoint[]>();
  for (const p of points) bySeries.set(p.seriesId, [...(bySeries.get(p.seriesId) ?? []), p]);
  // The selected series is painted last, on top.
  const ordered = [...bySeries.entries()].sort((a, b) => Number(a[0] === selectedSeriesId) - Number(b[0] === selectedSeriesId));

  const highest = Math.max(...points.map((p) => p.score), ...selected.map((p) => wilson(p.ownMentions, p.runs).high), 0.2);
  const top = Math.min(1, Math.ceil((highest + 0.04) * 5) / 5);
  const dayOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 864e5;
  const days = points.map((p) => dayOf(p.date));
  const minDay = Math.min(...days);
  const maxDay = Math.max(...days);
  const dates = [...new Map(points.map((p) => [p.date, p])).values()].sort((a, b) => a.date.localeCompare(b.date));

  const plot = (width: number, height: number, compact: boolean) => {
    const pad = { left: compact ? 34 : 40, right: compact ? 22 : 26, top: 20, bottom: 34 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const x = (iso: string) => (maxDay === minDay ? pad.left + innerW / 2 : pad.left + ((dayOf(iso) - minDay) / (maxDay - minDay)) * innerW);
    const y = (rate: number) => pad.top + innerH * (1 - Math.min(rate, top) / top);

    // One label per distinct date, newest first, thinned so they never collide.
    const labelled: TrendPoint[] = [];
    let lastX = Infinity;
    for (const p of [...dates].reverse()) {
      if (lastX - x(p.date) < (compact ? 52 : 64)) continue;
      labelled.push(p);
      lastX = x(p.date);
    }
    const changes = dates.filter((p) => points.some((q) => q.date === p.date && q.interventions > 0));
    const path = (rows: TrendPoint[]) => rows.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
    const band = (rows: TrendPoint[]) => {
      const upper = rows.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(wilson(p.ownMentions, p.runs).high).toFixed(1)}`);
      const lower = [...rows].reverse().map((p) => `L${x(p.date).toFixed(1)},${y(wilson(p.ownMentions, p.runs).low).toFixed(1)}`);
      return `${upper.join(" ")} ${lower.join(" ")} Z`;
    };

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Share of answers naming the venue across ${points.length} measurements`}>
        {[0, top / 2, top].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} strokeDasharray={tick === 0 ? undefined : "2 4"} />
            <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}

        {changes.map((p) => (
          <g key={`change-${p.date}`}>
            <line x1={x(p.date)} x2={x(p.date)} y1={pad.top} y2={pad.top + innerH} className="stroke-positive/50" strokeWidth={1} strokeDasharray="2 3" />
            {!compact && (
              <text x={x(p.date) + 4} y={pad.top + 10} className="fill-positive text-[10.5px]">
                change logged
              </text>
            )}
          </g>
        ))}

        {ordered.map(([seriesId, rows]) => {
          const isSelected = seriesId === selectedSeriesId;
          const color = colorOf(rows[0]);
          return (
            <g key={seriesId} opacity={isSelected ? 1 : 0.7}>
              {isSelected && rows.length > 1 && <path d={band(rows)} fill={color} opacity={0.12} />}
              {rows.length > 1 && (
                <path
                  d={path(rows)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 2.25 : 1.5}
                  strokeDasharray={isSelected ? undefined : "5 4"}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {rows.map((p) => {
                const range = wilson(p.ownMentions, p.runs);
                return (
                  <g key={p.key}>
                    {isSelected && rows.length === 1 && (
                      <line x1={x(p.date)} x2={x(p.date)} y1={y(range.high)} y2={y(range.low)} stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.18} />
                    )}
                    <circle cx={x(p.date)} cy={y(p.score)} r={isSelected ? 4.5 : 3.5} fill={color} className="stroke-card" strokeWidth={2}>
                      <title>{`${p.label}: named in ${p.ownMentions} of ${p.runs} answers (${Math.round(p.score * 100)}%), plausibly ${Math.round(range.low * 100)} to ${Math.round(range.high * 100)}%. ${p.method.label}.`}</title>
                    </circle>
                    {isSelected && (
                      <text x={x(p.date)} y={y(p.score) - 10} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
                        {Math.round(p.score * 100)}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {labelled.map((p) => (
          <text key={`label-${p.date}`} x={x(p.date)} y={height - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            {p.shortLabel}
          </text>
        ))}
      </svg>
    );
  };

  return (
    <div>
      <div className="hidden sm:block">{plot(960, 280, false)}</div>
      <div className="sm:hidden">{plot(360, 230, true)}</div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted-foreground">
        {[...ordered].reverse().map(([seriesId, rows]) => {
          const last = rows[rows.length - 1];
          const isSelected = seriesId === selectedSeriesId;
          return (
            <li key={seriesId} className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-[3px] w-5 shrink-0 rounded-full" style={{ background: colorOf(last), opacity: isSelected ? 1 : 0.7 }} />
              <span className={isSelected ? "font-medium text-foreground" : undefined}>
                {last.method.label}
                <span className="font-normal text-muted-foreground"> · ×{last.method.reps} per question</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
