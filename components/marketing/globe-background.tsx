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

    // Waves started by the pin's stamp: a front expanding from the tip
    // across the whole page, displacing the lines it passes and lighting
    // them for a moment. Several may overlap; they fade out on their own.
    interface Wave { x: number; y: number; t0: number }
    const waves: Wave[] = [];
    const WAVE_SPEED = 0.9; // px per ms
    const WAVE_BAND = 90;
    const WAVE_LIFE = 2600;
    let now = 0;

    function waveAt(x: number, y: number): { dx: number; dy: number; glow: number } {
      let dx = 0;
      let dy = 0;
      let glow = 0;
      for (const wv of waves) {
        const age = now - wv.t0;
        if (age < 0 || age > WAVE_LIFE) continue;
        const r = age * WAVE_SPEED;
        const ex = x - wv.x;
        const ey = y - wv.y;
        const d = Math.hypot(ex, ey) || 1;
        const g = Math.exp(-(((d - r) / WAVE_BAND) ** 2)) * (1 - age / WAVE_LIFE);
        if (g < 0.002) continue;
        const amp = 22 * g;
        dx += (ex / d) * amp;
        dy += (ey / d) * amp;
        glow = Math.max(glow, g);
      }
      return { dx, dy, glow };
    }

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
      const x = w / 2 + x1 * radius * scale;
      const y = h / 2 + y2 * radius * scale;
      if (waves.length === 0) return { x, y, z: z2, glow: 0 };
      const wv = waveAt(x, y);
      return { x: x + wv.dx, y: y + wv.dy, z: z2, glow: wv.glow };
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
          const glow = Math.max(a.glow, b.glow);
          ctx!.strokeStyle = `rgba(${96 + glow * 80},${178 + glow * 50},${240 + glow * 15},${0.04 + front * 0.12 + glow * 0.5})`;
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
        ctx!.fillStyle = `rgba(150,208,255,${Math.min(1, 0.05 + front * 0.4 + p.glow * 0.6)})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, front * 1.5 + 0.3 + p.glow * 1.5, 0, Math.PI * 2);
        ctx!.fill();
      }
      // The front itself: one thin ring crossing the whole page.
      for (const wv of waves) {
        const age = now - wv.t0;
        if (age < 0 || age > WAVE_LIFE) continue;
        const k = 1 - age / WAVE_LIFE;
        ctx!.strokeStyle = `rgba(120,200,255,${0.22 * k * k})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(wv.x, wv.y, age * WAVE_SPEED, 0, Math.PI * 2);
        ctx!.stroke();
      }
      for (let i = waves.length - 1; i >= 0; i -= 1) {
        if (now - waves[i].t0 > WAVE_LIFE) waves.splice(i, 1);
      }
    }

    function onStamp(event: Event) {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      const rect = canvas!.getBoundingClientRect();
      waves.push({ x: detail.x - rect.left, y: detail.y - rect.top, t0: performance.now() });
    }

    function frame() {
      now = performance.now();
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
    else {
      window.addEventListener("toodip:stamp", onStamp);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("toodip:stamp", onStamp);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
