"use client";

import { useEffect, useRef } from "react";

/**
 * A slowly rotating wireframe globe drawn on a canvas: parallels and meridians
 * as moving lines, with faint nodes at their crossings. Front hemisphere only,
 * depth-faded, so the silhouette reads as a sphere rather than a flat disc.
 *
 * Deliberately restrained — thin cool lines on near-black, no bloom — so it sits
 * behind the copy as texture, not decoration. Honors reduced-motion by drawing a
 * single still frame.
 */
export function GlobeBackground({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w = 0;
    let h = 0;
    let angle = 0;
    let raf = 0;

    const deg = Math.PI / 180;
    const tilt = 0.42;
    const sinT = Math.sin(tilt);
    const cosT = Math.cos(tilt);
    const SEG = 72;
    const PARALLELS = [-60, -30, 0, 30, 60];

    // Each line is a list of unit vectors on the sphere.
    const lines: number[][][] = [];
    for (const lat of PARALLELS) {
      const y = Math.sin(lat * deg);
      const r = Math.cos(lat * deg);
      const line: number[][] = [];
      for (let i = 0; i <= SEG; i += 1) {
        const lon = (i / SEG) * Math.PI * 2;
        line.push([r * Math.cos(lon), y, r * Math.sin(lon)]);
      }
      lines.push(line);
    }
    for (let m = 0; m < 12; m += 1) {
      const lon = m * 30 * deg;
      const line: number[][] = [];
      for (let i = 0; i <= SEG; i += 1) {
        const lat = (-90 + (i / SEG) * 180) * deg;
        const y = Math.sin(lat);
        const r = Math.cos(lat);
        line.push([r * Math.cos(lon), y, r * Math.sin(lon)]);
      }
      lines.push(line);
    }

    const nodes: number[][] = [];
    for (const lat of PARALLELS) {
      const y = Math.sin(lat * deg);
      const r = Math.cos(lat * deg);
      for (let m = 0; m < 12; m += 1) {
        const lon = m * 30 * deg;
        nodes.push([r * Math.cos(lon), y, r * Math.sin(lon)]);
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.max(1, Math.floor(w * dpr));
      canvas!.height = Math.max(1, Math.floor(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project(p: number[], a: number) {
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const x1 = p[0] * ca + p[2] * sa;
      const z1 = -p[0] * sa + p[2] * ca;
      const y1 = p[1];
      const y2 = y1 * cosT - z1 * sinT;
      const z2 = y1 * sinT + z1 * cosT;
      const radius = Math.min(w, h) * 0.42;
      const fov = 3.2;
      const scale = fov / (fov - z2);
      return {
        x: w / 2 + x1 * radius * scale,
        y: h / 2 + y2 * radius * scale,
        z: z2,
      };
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const line of lines) {
        for (let i = 1; i < line.length; i += 1) {
          const a = project(line[i - 1], angle);
          const b = project(line[i], angle);
          const zf = (a.z + b.z) / 2;
          if (zf < -0.15) continue;
          const front = Math.max(0, Math.min(1, (zf + 0.15) / 1.15));
          ctx!.strokeStyle = `rgba(96,178,240,${0.04 + front * 0.12})`;
          ctx!.lineWidth = front > 0.6 ? 1 : 0.7;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }
      for (const n of nodes) {
        const p = project(n, angle);
        if (p.z < -0.05) continue;
        const front = Math.max(0, Math.min(1, (p.z + 0.05) / 1.05));
        ctx!.fillStyle = `rgba(150,208,255,${0.05 + front * 0.4})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, front * 1.5 + 0.3, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function frame() {
      angle += 0.0022;
      draw();
      raf = requestAnimationFrame(frame);
    }

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    observer.observe(canvas);

    if (reduce) draw();
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
