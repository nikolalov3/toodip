"use client";

import { useState } from "react";

import type { TrendPoint } from "@/services/stats";

/**
 * Page views per day as two lines, AI-sourced in the brand colour over the
 * rest in grey, with a hover tooltip per day. Same picture as the stats panel.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const padL = 6;
  const padR = 6;
  const padT = 14;
  const padB = 26;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.total));
  const x = (i: number) => (n <= 1 ? padL + iw / 2 : padL + (iw * i) / (n - 1));
  const y = (v: number) => padT + ih - (v / max) * ih;
  const path = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const rest = points.map((p) => p.total - p.ai);
  const ai = points.map((p) => p.ai);
  const band = n > 1 ? iw / (n - 1) : iw;
  const hovered = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="block"
        onMouseLeave={() => setHover(null)}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={W - padR}
            y1={padT + ih - f * ih}
            y2={padT + ih - f * ih}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={path(rest)} fill="none" stroke="var(--chart-5)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={path(ai)} fill="none" stroke="var(--brand)" strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={x(i)} cy={y(p.total - p.ai)} r={3} fill="var(--chart-5)" />
            <circle cx={x(i)} cy={y(p.ai)} r={3.4} fill="var(--brand)" />
            {(i % 3 === 0 || i === n - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
                {p.day.slice(5)}
              </text>
            )}
            <rect
              x={x(i) - band / 2}
              y={0}
              width={band}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-[4px] border border-border bg-popover px-2.5 py-1.5 text-[12px] leading-relaxed shadow-lg"
          style={{
            left: `${Math.max(7, Math.min(93, (x(hover) / W) * 100))}%`,
            top: `${(y(hovered.total) / H) * 100}%`,
            transform: "translate(-50%, -118%)",
          }}
        >
          <div className="font-semibold">{hovered.day}</div>
          Odsłony: <b className="text-numeric">{hovered.total}</b>
          <br />
          <span className="text-brand">
            z AI: <b className="text-numeric">{hovered.ai}</b>
          </span>{" "}
          · reszta: <b className="text-numeric">{hovered.total - hovered.ai}</b>
        </div>
      )}
      <div className="mt-2 flex gap-4 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[2px] bg-brand" /> z AI
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[2px] bg-chart-5" /> reszta
        </span>
      </div>
    </div>
  );
}
