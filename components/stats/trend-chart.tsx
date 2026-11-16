"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { TrendPoint } from "@/services/stats";

/**
 * Page views per day as two lines, AI-sourced in the brand colour over the
 * rest in grey. The chart is drawn at the width of its box (measured, so
 * text and dots keep their size on a phone), has a value axis, and the
 * per-day readout works with a mouse, a finger and the keyboard: hover or
 * tap a day, or focus the chart and use the arrow keys.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const [width, setWidth] = useState(720);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const W = width;
  const H = 220;
  const padL = 36;
  const padR = 10;
  const padT = 14;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = points.length;
  const { max, ticks } = niceScale(Math.max(1, ...points.map((p) => p.total)));
  const x = (i: number) => (n <= 1 ? padL + iw / 2 : padL + (iw * i) / (n - 1));
  const y = (v: number) => padT + ih - (v / max) * ih;
  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const rest = points.map((p) => p.total - p.ai);
  const ai = points.map((p) => p.ai);
  const band = n > 1 ? iw / (n - 1) : iw;
  // Date labels at least 56px apart, anchored on the newest day.
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 56))));
  const current = active === null ? null : points[active];
  const total = points.reduce((sum, p) => sum + p.total, 0);
  const totalAi = points.reduce((sum, p) => sum + p.ai, 0);

  const show = (i: number) => setActive(Math.max(0, Math.min(n - 1, i)));
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const from = active ?? n - 1;
    if (event.key === "ArrowLeft") show(from - 1);
    else if (event.key === "ArrowRight") show(from + 1);
    else if (event.key === "Home") show(0);
    else if (event.key === "End") show(n - 1);
    else if (event.key === "Escape") {
      setActive(null);
      setPinned(false);
    } else return;
    event.preventDefault();
  };
  const onBandDown = (event: PointerEvent<SVGRectElement>, i: number) => {
    if (pinned && active === i) {
      setPinned(false);
      if (event.pointerType === "touch") setActive(null);
      return;
    }
    setActive(i);
    setPinned(true);
  };
  const tooltipLeft = current && active !== null ? (x(active) / W) * 100 : 50;
  const tooltipShift = tooltipLeft < 25 ? "0%" : tooltipLeft > 75 ? "-100%" : "-50%";

  return (
    <div className="relative" ref={box}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Page views per day, last ${n} days: ${total} in total, ${totalAi} from AI assistants. Focus the chart and use the arrow keys to read each day.`}
        tabIndex={0}
        className="block focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onPointerLeave={() => {
          if (!pinned) setActive(null);
        }}
        onFocus={() => {
          if (active === null && n > 0) setActive(n - 1);
        }}
        onBlur={() => {
          if (!pinned) setActive(null);
        }}
        onKeyDown={onKeyDown}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
              strokeDasharray={tick === 0 ? undefined : "2 4"}
            />
            <text x={padL - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {formatTick(tick)}
            </text>
          </g>
        ))}
        <path d={path(rest)} fill="none" stroke="var(--chart-5)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path(ai)} fill="none" stroke="var(--brand)" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={x(i)} cy={y(p.total - p.ai)} r={active === i ? 4.5 : 3} fill="var(--chart-5)" />
            <circle cx={x(i)} cy={y(p.ai)} r={active === i ? 4.8 : 3.4} fill="var(--brand)" />
            {(n - 1 - i) % labelEvery === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                {p.day.slice(5)}
              </text>
            )}
            {active === i && (
              <line x1={x(i)} x2={x(i)} y1={padT} y2={padT + ih} stroke="var(--border)" />
            )}
            <rect
              x={x(i) - band / 2}
              y={0}
              width={band}
              height={H}
              fill="transparent"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && !pinned) setActive(i);
              }}
              onPointerDown={(event) => onBandDown(event, i)}
            />
          </g>
        ))}
      </svg>
      <div aria-live="polite" className="contents">
        {current && active !== null && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[12px] leading-relaxed shadow-lg"
            style={{
              left: `${tooltipLeft}%`,
              top: `${(y(current.total) / H) * 100}%`,
              transform: `translate(${tooltipShift}, -118%)`,
            }}
          >
            <div className="font-semibold">{current.day}</div>
            Views: <b className="text-numeric">{current.total}</b>
            <br />
            <span className="text-brand">
              from AI: <b className="text-numeric">{current.ai}</b>
            </span>{" "}
            · rest: <b className="text-numeric">{current.total - current.ai}</b>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[2px] bg-brand" /> from AI
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[2px] bg-chart-5" /> rest
        </span>
        <span className="ml-auto hidden sm:inline">Tap or hover a day for the numbers</span>
      </div>
    </div>
  );
}

/** Four steps from zero to a round number at or above the highest value. */
function niceScale(maxValue: number): { max: number; ticks: number[] } {
  const steps = 4;
  const rough = maxValue / steps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * magnitude);
  let step = candidates.find((c) => c * steps >= maxValue) ?? candidates[candidates.length - 1];
  if (step < 1) step = 1;
  step = Number.isInteger(step) ? step : Math.ceil(step);
  const ticks: number[] = [];
  for (let i = 0; i <= steps; i += 1) ticks.push(i * step);
  return { max: step * steps, ticks };
}

function formatTick(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k`;
  return String(value);
}
