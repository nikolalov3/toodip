"use client";

import { useState } from "react";

import { DONUT_COLORS } from "@/components/stats/donut";
import type { ShareTimelinePoint } from "@/services/visibility-share";

/**
 * Share of voice over time: one line per brand (top rivals in colour, the
 * venue in the brand colour and thicker), one point per measurement day.
 */
export function ShareLines({
  points,
  brands,
  ownName,
}: {
  points: ShareTimelinePoint[];
  brands: string[];
  ownName: string | null;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 240;
  const padL = 34;
  const padR = 10;
  const padT = 14;
  const padB = 28;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = points.length;
  const max = Math.max(0.05, ...points.flatMap((p) => Object.values(p.shares)));
  const x = (i: number) => (n <= 1 ? padL + iw / 2 : padL + (iw * i) / (n - 1));
  const y = (v: number) => padT + ih - (v / max) * ih;
  const color = (name: string, i: number) => (name === ownName ? "var(--brand)" : DONUT_COLORS[i % DONUT_COLORS.length]);
  const band = n > 1 ? iw / (n - 1) : iw;
  const hovered = hover === null ? null : points[hover];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="block" onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={padT + ih - f * ih} y2={padT + ih - f * ih} stroke="var(--border)" strokeDasharray={f === 0 ? undefined : "2 4"} />
            <text x={padL - 6} y={padT + ih - f * ih + 4} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
              {Math.round(f * max * 100)}%
            </text>
          </g>
        ))}
        {brands.map((name, bi) => (
          <path
            key={name}
            d={points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.shares[name] ?? 0).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={color(name, bi)}
            strokeWidth={name === ownName ? 3 : 1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity={name === ownName ? 1 : 0.85}
          />
        ))}
        {points.map((p, i) => (
          <g key={p.date}>
            {brands.map((name, bi) => (
              <circle key={name} cx={x(i)} cy={y(p.shares[name] ?? 0)} r={name === ownName ? 4 : 2.6} fill={color(name, bi)} />
            ))}
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
              {p.date.slice(5)}
            </text>
            <rect x={x(i) - band / 2} y={0} width={band} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-[4px] border border-border bg-popover px-2.5 py-2 text-[12px] leading-relaxed shadow-lg"
          style={{ left: `${Math.max(10, Math.min(90, (x(hover) / W) * 100))}%`, top: 0, transform: "translate(-50%, 0)" }}
        >
          <div className="mb-1 font-semibold">
            {hovered.date} · {hovered.runs} answers
          </div>
          {brands.map((name, bi) => (
            <div key={name} className="flex items-center gap-2">
              <i className="inline-block size-2 rounded-[2px]" style={{ background: color(name, bi) }} />
              <span className={name === ownName ? "font-semibold text-brand" : ""}>{name}</span>
              <b className="text-numeric ml-auto pl-3">{Math.round((hovered.shares[name] ?? 0) * 100)}%</b>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        {brands.map((name, bi) => (
          <span key={name} className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-[2px]" style={{ background: color(name, bi) }} />
            <span className={name === ownName ? "font-semibold text-brand" : ""}>{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
