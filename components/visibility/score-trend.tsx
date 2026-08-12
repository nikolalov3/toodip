import type { TrendPoint } from "@/services/visibility";

/**
 * Category visibility score per measurement day, as an inline SVG line. One
 * chart, thirty-ish points: a chart library would cost more than it draws.
 * Days with a thin battery still plot, but the run count under each point
 * keeps a 1-of-3 day from reading like a 40-of-120 day.
 */
export function ScoreTrend({ timeline }: { timeline: TrendPoint[] }) {
  if (timeline.length === 0) return null;

  const width = 640;
  const height = 140;
  const padX = 26;
  const padTop = 14;
  const padBottom = 30;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;

  const x = (index: number) =>
    timeline.length === 1
      ? padX + innerW / 2
      : padX + (innerW * index) / (timeline.length - 1);
  const y = (score: number) => padTop + innerH * (1 - score);

  const path = timeline
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.score)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[480px] w-full"
        role="img"
        aria-label="Visibility score over time"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((line) => (
          <g key={line}>
            <line
              x1={padX}
              x2={width - padX}
              y1={y(line)}
              y2={y(line)}
              className="stroke-border"
              strokeWidth={0.5}
            />
            <text
              x={padX - 6}
              y={y(line) + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[8px]"
            >
              {Math.round(line * 100)}
            </text>
          </g>
        ))}

        {timeline.length > 1 && (
          <path d={path} fill="none" className="stroke-brand" strokeWidth={1.5} />
        )}

        {timeline.map((point, index) => (
          <g key={point.date}>
            {point.interventions > 0 && (
              <line
                x1={x(index)}
                x2={x(index)}
                y1={padTop}
                y2={padTop + innerH}
                className="stroke-positive/40"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}
            <circle
              cx={x(index)}
              cy={y(point.score)}
              r={3}
              className="fill-brand"
            />
            <text
              x={x(index)}
              y={height - 16}
              textAnchor="middle"
              className="fill-foreground text-[8px]"
            >
              {point.date.slice(5)}
            </text>
            <text
              x={x(index)}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[7px]"
            >
              {point.ownMentions}/{point.runs} runs
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Share of category prompts (branded excluded) where the venue was
        mentioned, per measurement day. Dashed lines mark days with logged
        interventions. Compare days with a similar prompt battery; a day of 3
        runs is a hint, not a trend.
      </p>
    </div>
  );
}
