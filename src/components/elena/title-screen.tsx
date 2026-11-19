"use client";

import { useEffect, useRef } from "react";

/**
 * The opening: an original, cinematic "game launch" title screen. A painted
 * sunset over the sea with palm silhouettes, a skyline, drifting birds, film
 * grain and letterbox bars, all drawn on a canvas.
 */
export function TitleBackdrop({ dim = false }: { dim?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // a fixed random skyline and palm layout
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const towers = Array.from({ length: 40 }, () => ({
      x: r(),
      w: 0.012 + r() * 0.03,
      h: 0.04 + r() * 0.16,
      lights: r(),
    }));
    const palms = [
      { x: 0.08, h: 0.62, lean: -0.18, s: 1.1 },
      { x: 0.16, h: 0.48, lean: 0.12, s: 0.85 },
      { x: 0.86, h: 0.66, lean: 0.2, s: 1.15 },
      { x: 0.94, h: 0.5, lean: -0.1, s: 0.9 },
    ];
    const birds = Array.from({ length: 7 }, (_, i) => ({
      x: r(),
      y: 0.18 + r() * 0.2,
      v: 0.004 + r() * 0.006,
      p: i,
    }));

    const palm = (
      x: number,
      base: number,
      height: number,
      lean: number,
      s: number,
      t: number,
    ) => {
      const top = { x: x + lean * height, y: base - height };
      g.strokeStyle = "#12051a";
      g.lineCap = "round";
      g.lineWidth = 9 * s;
      g.beginPath();
      g.moveTo(x, base);
      g.quadraticCurveTo(
        x + lean * height * 0.2,
        base - height * 0.55,
        top.x,
        top.y,
      );
      g.stroke();
      g.fillStyle = "#12051a";
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + Math.sin(t * 0.8 + i) * 0.04;
        const len = (70 + (i % 3) * 18) * s;
        const ex = top.x + Math.cos(a) * len;
        const ey = top.y + Math.sin(a) * len * 0.45 + len * 0.35;
        g.beginPath();
        g.moveTo(top.x, top.y);
        g.quadraticCurveTo((top.x + ex) / 2, top.y - 18 * s, ex, ey);
        g.quadraticCurveTo((top.x + ex) / 2, top.y + 4 * s, top.x, top.y + 3);
        g.fill();
      }
    };

    const draw = (ms: number) => {
      const t = ms / 1000;
      const horizon = h * 0.64;
      // sky
      const sky = g.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, "#1a0b3a");
      sky.addColorStop(0.35, "#5a1a6e");
      sky.addColorStop(0.65, "#e0457b");
      sky.addColorStop(0.88, "#ff8a4c");
      sky.addColorStop(1, "#ffc46b");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, horizon);
      // sun with horizontal cuts
      const sunR = Math.min(w, h) * 0.2;
      const sx = w * 0.5;
      const sy = horizon - sunR * 0.35;
      const sun = g.createLinearGradient(0, sy - sunR, 0, sy + sunR);
      sun.addColorStop(0, "#fff3b0");
      sun.addColorStop(0.6, "#ffb347");
      sun.addColorStop(1, "#ff5e7e");
      g.save();
      g.beginPath();
      g.arc(sx, sy, sunR, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = sun;
      g.fillRect(sx - sunR, sy - sunR, sunR * 2, sunR * 2);
      for (let i = 0; i < 7; i++) {
        const yy =
          sy + sunR * 0.1 + i * sunR * 0.14 + ((t * 8) % (sunR * 0.14));
        g.fillStyle = "#e0457b";
        g.fillRect(sx - sunR, yy, sunR * 2, 2 + i * 1.6);
      }
      g.restore();
      const glow = g.createRadialGradient(sx, sy, sunR * 0.6, sx, sy, sunR * 3);
      glow.addColorStop(0, "rgba(255,170,90,0.35)");
      glow.addColorStop(1, "rgba(255,120,120,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, w, horizon);
      // clouds
      g.fillStyle = "rgba(255,160,190,0.18)";
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 0.23 + t * 0.006) % 1.3) * w - w * 0.15;
        g.beginPath();
        g.ellipse(
          cx,
          h * (0.14 + (i % 3) * 0.09),
          w * 0.18,
          h * 0.018,
          0,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      // skyline
      for (const tw of towers) {
        const x = tw.x * w;
        const bw = tw.w * w;
        const bh = tw.h * h;
        g.fillStyle = "#2a0d36";
        g.fillRect(x, horizon - bh, bw, bh);
        g.fillStyle = "rgba(255,210,140,0.55)";
        for (let yy = horizon - bh + 6; yy < horizon - 4; yy += 7) {
          for (let xx = x + 3; xx < x + bw - 3; xx += 6) {
            if (((xx * 13 + yy * 7) % 11) / 11 < tw.lights * 0.45)
              g.fillRect(xx, yy, 2, 3);
          }
        }
      }
      // sea with reflections
      const sea = g.createLinearGradient(0, horizon, 0, h);
      sea.addColorStop(0, "#7a2a6e");
      sea.addColorStop(1, "#14082a");
      g.fillStyle = sea;
      g.fillRect(0, horizon, w, h - horizon);
      for (let i = 0; i < 40; i++) {
        const yy = horizon + (i / 40) ** 1.6 * (h - horizon);
        const ww = sunR * (1.2 - i / 50) * (0.6 + 0.4 * Math.sin(t * 1.5 + i));
        g.fillStyle = `rgba(255,190,110,${0.5 * (1 - i / 40)})`;
        g.fillRect(sx - ww / 2 + Math.sin(t + i) * 6, yy, ww, 1.5);
      }
      // birds
      g.strokeStyle = "#1a0a24";
      g.lineWidth = 1.6;
      for (const b of birds) {
        const bx = ((b.x + t * b.v) % 1.2) * w - w * 0.1;
        const by = b.y * h + Math.sin(t * 2 + b.p) * 4;
        const f = Math.sin(t * 9 + b.p) * 4;
        g.beginPath();
        g.moveTo(bx - 7, by - f);
        g.quadraticCurveTo(bx - 3, by - 3, bx, by);
        g.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - f);
        g.stroke();
      }
      // palms in front
      for (const p of palms)
        palm(
          p.x * w,
          h * 1.02,
          p.h * h,
          p.lean,
          p.s * Math.min(1.3, w / 900 + 0.4),
          t,
        );
      // grain and vignette
      const vig = g.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.3,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.65)");
      g.fillStyle = vig;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={`title-canvas ${dim ? "is-dim" : ""}`}
      aria-hidden
    />
  );
}

export function TitleScreen({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const go = (e: KeyboardEvent) => {
      if (e.key.length === 1 || e.key === "Enter" || e.key === " ") onStart();
    };
    window.addEventListener("keydown", go);
    return () => window.removeEventListener("keydown", go);
  }, [onStart]);

  return (
    <button type="button" className="title" onClick={onStart}>
      <span className="title-bar top" aria-hidden />
      <span className="title-block">
        <span className="title-kicker">
          uma história de amor em mundo aberto
        </span>
        <span className="title-name">
          ELENA <i>&amp;</i> DAVI
        </span>
        <span className="title-sub">NOSSA HISTÓRIA</span>
        <span className="title-date">19 · 09 · 2026 — para sempre</span>
      </span>
      <span className="title-press">
        <span className="only-mouse">PRESSIONE QUALQUER TECLA PARA JOGAR</span>
        <span className="only-touch">TOQUE PARA JOGAR</span>
      </span>
      <span className="title-bar bottom" aria-hidden />
    </button>
  );
}
