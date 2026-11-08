import type { TrendPoint } from "@/services/visibility";

/**
 * Share of category answers naming the venue, one point per measurement, as
 * an inline SVG. Measurements made with different methods (another model, an
 * imported baseline) are separate series: the current method is the solid
 * brand line, every other method is dashed and muted, and no line ever joins
 * two methods. Labels stay at 10px or more so the chart reads on a phone.
 */
export function ScoreTrend({ timeline }: { timeline: TrendPoint[] }) {
  if (timeline.length === 0) return null;

  const width = 640;
  const height = 176;
  const padX = 30;
  const padTop = 16;
  const padBottom = 44;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const x = (index: number) =>
    timeline.length === 1 ? padX + innerW / 2 : padX + (innerW * index) / (timeline.length - 1);
  const y = (score: number) => padTop + innerH * (1 - score);

  // Series per method, in order of first appearance; the latest point's
  // method is the one the headline numbers describe.
  const currentKey = timeline[timeline.length - 1].method.key;
  const series = new Map<string, { label: string; indices: number[] }>();
  timeline.forEach((point, index) => {
    const entry = series.get(point.method.key) ?? { label: point.method.label, indices: [] };
    entry.indices.push(index);
    series.set(point.method.key, entry);
  });

  // With many points the day labels collide; show every other one.
  const labelEvery = timeline.length > 8 ? 2 : 1;

  return (
    <div className="overflow-x-auto p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[480px] w-full"
        role="img"
        aria-label={`Share of answers naming the venue across ${timeline.length} measurements`}
      >
        {[0, 0.5, 1].map((line) => (
          <g key={line}>
            <line x1={padX} x2={width - padX} y1={y(line)} y2={y(line)} className="stroke-border" strokeWidth={0.5} />
            <text x={padX - 6} y={y(line) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {Math.round(line * 100)}
            </text>
          </g>
        ))}

        {[...series.entries()].map(([key, s]) => {
          const current = key === currentKey;
          const path = s.indices
            .map((index, i) => `${i === 0 ? "M" : "L"}${x(index)},${y(timeline[index].score)}`)
            .join(" ");
          return (
            <g key={key}>
              {s.indices.length > 1 && (
                <path
                  d={path}
                  fill="none"
                  className={current ? "stroke-brand" : "stroke-muted-foreground/60"}
                  strokeWidth={current ? 1.75 : 1.25}
                  strokeDasharray={current ? undefined : "4 4"}
                />
              )}
              {s.indices.map((index) => {
                const point = timeline[index];
                return (
                  <circle
                    key={point.period}
                    cx={x(index)}
                    cy={y(point.score)}
                    r={current ? 3.5 : 3}
                    className={current ? "fill-brand" : "fill-muted-foreground/70"}
                  >
                    <title>{`${point.label}: ${point.ownMentions} of ${point.runs} answers (${Math.round(point.score * 100)}%), ${point.method.label}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}

        {timeline.map((point, index) => (
          <g key={point.period}>
            {point.interventions > 0 && (
              <>
                <line
                  x1={x(index)}
                  x2={x(index)}
                  y1={padTop}
                  y2={padTop + innerH}
                  className="stroke-positive/50"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <text x={x(index) + 4} y={padTop + 9} className="fill-positive text-[10px]">
                  {point.interventions} {point.interventions === 1 ? "change" : "changes"}
                </text>
              </>
            )}
            {index % labelEvery === 0 || index === timeline.length - 1 ? (
              <>
                <text x={x(index)} y={height - 24} textAnchor="middle" className="fill-foreground text-[10px]">
                  {point.label}
                </text>
                <text x={x(index)} y={height - 11} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {point.ownMentions}/{point.runs}
                </text>
              </>
            ) : null}
          </g>
        ))}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {[...series.entries()].map(([key, s]) => {
          const current = key === currentKey;
          const reps = timeline[s.indices[s.indices.length - 1]].method.reps;
          return (
            <li key={key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={current ? "inline-block h-[2px] w-4 bg-brand" : "inline-block h-0 w-4 border-t border-dashed border-muted-foreground"}
              />
              <span className={current ? "text-foreground" : undefined}>
                {s.label} · ×{reps} per question
                {current ? " (current)" : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Share of category answers (branded excluded) naming the venue, one point per measurement; a monthly report is one
        point however many days it took. Different methods are separate lines and are never compared with each other.
        Dashed vertical lines mark periods with logged changes.
      </p>
    </div>
  );
}
