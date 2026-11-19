"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { chime, crinkle } from "./sound";

type PackCard = {
  image: string;
  title: string;
  badge: string;
  special?: boolean;
};

type Props = {
  label: string;
  cards: PackCard[];
  onDone: () => void;
};

/*
 * Pack opening in the style of online "rip" games: a big foil pack in the
 * middle of the screen that tilts with the finger (or the phone) and shines.
 * Drag along the seal at the top: the tear follows the finger with a ragged
 * edge, the strip bends up, and at the end it snaps off and falls with
 * gravity. Light pours out, the stack rises out of the pack and fills the
 * screen. Tap to flip each card (special cards: light rays, rainbow foil,
 * sparkles and a flash), swipe or tap to send it away and see the next.
 */

type Phase = "pack" | "falling" | "rising" | "card" | "done";

function ragged(p: number, seed = 7) {
  // a jagged tear edge from x=0..p (percent), as polygon points
  const pts: string[] = [];
  const steps = 40;
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * p * 100;
    pts.push(`${x.toFixed(2)}% ${(78 + r() * 22).toFixed(1)}%`);
  }
  return pts;
}

export function PackRip({ label, cards, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("pack");
  const [tear, setTear] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const tearRef = useRef(0);
  const dragging = useRef(false);
  const lastSound = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // tilt and shine follow the pointer, or the phone
  const tilt = useCallback((x: number, y: number) => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--tx", x.toFixed(3));
    el.style.setProperty("--ty", y.toFixed(3));
  }, []);
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilt(
        Math.max(-1, Math.min(1, e.gamma / 30)),
        Math.max(-1, Math.min(1, (e.beta - 45) / 30)),
      );
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [tilt]);

  // the strip snaps off and falls
  const snap = useCallback(() => {
    setPhase("falling");
    chime("reveal");
    navigator.vibrate?.(40);
    const el = stripRef.current;
    let x = 0;
    let y = 0;
    let rot = 0;
    let vx = 220 + Math.random() * 120;
    let vy = -380;
    const vr = 140 + Math.random() * 120;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      vy += 1500 * dt;
      vx *= 0.995;
      x += vx * dt;
      y += vy * dt;
      rot += vr * dt;
      if (el)
        el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      if (y < 1400) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => setPhase("rising"), 650);
    setTimeout(() => setPhase("card"), 1700);
  }, []);

  const advance = (p: number) => {
    if (p <= tearRef.current) return;
    tearRef.current = p;
    setTear(p);
    const now = performance.now();
    if (now - lastSound.current > 45) {
      crinkle();
      lastSound.current = now;
    }
    if (p >= 0.97) {
      dragging.current = false;
      snap();
    }
  };

  const sealPointer = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return (e.clientX - rect.left) / rect.width;
  };

  const card = cards[index];
  const next = () => {
    if (leaving) return;
    setLeaving(1);
    setTimeout(() => {
      setLeaving(0);
      setFlipped(false);
      if (index < cards.length - 1) setIndex((i) => i + 1);
      else {
        setPhase("done");
        onDone();
      }
    }, 420);
  };
  const flip = () => {
    if (flipped || !card) return;
    setFlipped(true);
    chime(card.special ? "finale" : "reveal");
    navigator.vibrate?.(card.special ? [30, 40, 60] : 25);
  };

  return (
    <div
      ref={rootRef}
      className={`rip2 phase-${phase}`}
      onPointerMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        tilt(
          ((e.clientX - r.left) / r.width - 0.5) * 2,
          ((e.clientY - r.top) / r.height - 0.5) * 2,
        );
      }}
    >
      <div className="rip2-spot" aria-hidden />

      {(phase === "pack" || phase === "falling" || phase === "rising") && (
        <div className="rip2-pack-wrap">
          {/* the cards waiting inside, rising out once it's open */}
          <div className="rip2-inside" aria-hidden>
            {cards.slice(0, 3).map((c, i) => (
              <div
                key={c.image}
                className="rip2-back small"
                style={{ ["--i" as string]: i }}
              />
            ))}
          </div>
          <div className="rip2-pack">
            <div className="rip2-foil" />
            <div className="rip2-art">
              <span className="rip2-art-top">NOSSA HISTÓRIA</span>
              <span className="rip2-art-heart">♥</span>
              <span className="rip2-art-label">{label}</span>
              <span className="rip2-art-count">
                {cards.length} {cards.length === 1 ? "carta" : "cartas"} ·
                edição Elena &amp; Davi
              </span>
            </div>
            <div className="rip2-glare" />
            <div className="rip2-crimp bottom" />
            <div
              className="rip2-light"
              style={{ opacity: phase === "pack" ? tear * 0.8 : 1 }}
            />
          </div>
          {/* the seal: the part already torn bends up, the rest stays */}
          <div
            className="rip2-seal"
            onPointerDown={(e) => {
              if (phase !== "pack") return;
              dragging.current = true;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              advance(Math.min(sealPointer(e), tearRef.current + 0.04));
            }}
            onPointerMove={(e) => {
              if (!dragging.current || phase !== "pack") return;
              // the tear only follows forward, and never jumps ahead of the finger
              advance(Math.min(sealPointer(e), tearRef.current + 0.25));
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
          >
            <div
              ref={stripRef}
              className="rip2-strip torn"
              style={{
                clipPath: `polygon(0% 0%, ${(tear * 100).toFixed(2)}% 0%, ${ragged(tear).reverse().join(", ")})`,
                ["--p" as string]: tear,
              }}
            />
            <div
              className="rip2-strip"
              style={{
                clipPath: `polygon(${(tear * 100).toFixed(2)}% 0%, 100% 0%, 100% 100%, ${(tear * 100).toFixed(2)}% 100%)`,
              }}
            />
            {phase === "pack" && (
              <div className="rip2-guide" style={{ left: `${tear * 100}%` }} />
            )}
          </div>
        </div>
      )}

      {phase === "card" && card && (
        <div
          className="rip2-stage"
          onPointerDown={(e) =>
            (swipe.current = { x: e.clientX, y: e.clientY })
          }
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (flipped && Math.abs(dx) > 60) next();
            else if (!flipped) flip();
          }}
        >
          {card.special && flipped && <div className="rip2-rays" aria-hidden />}
          {flipped && (
            <div
              className={`rip2-flash ${card.special ? "special" : ""}`}
              aria-hidden
            />
          )}
          <div
            className={`rip2-card ${flipped ? "is-flipped" : ""} ${card.special ? "is-special" : ""} ${leaving ? "is-leaving" : ""}`}
            key={card.image}
          >
            <div className="rip2-face rip2-back" />
            <div className="rip2-face rip2-front">
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
              <img src={card.image} alt={card.title} draggable={false} />
              <div className="rip2-holo" />
              {card.special && <div className="rip2-rainbow" />}
            </div>
          </div>
          {card.special && flipped && (
            <div className="rip2-sparks" aria-hidden>
              {Array.from({ length: 24 }, (_, i) => (
                <i key={i} style={{ ["--i" as string]: i }} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rip2-ui">
        {phase === "pack" && (
          <>
            <p className="rip2-title">{label}</p>
            <p className="rip2-hint">
              {tear > 0
                ? "Isso, continua arrastando →"
                : "Arraste o dedo pela linha pontilhada, da esquerda para a direita"}
            </p>
          </>
        )}
        {phase === "card" && card && (
          <>
            <p className="rip2-count">
              {index + 1} / {cards.length}
            </p>
            {flipped ? (
              <>
                <p className="rip2-title">
                  {card.special ? `✨ ${card.title}` : card.title}
                </p>
                <p className="rip2-hint">
                  {card.special
                    ? `Edição especial · ${card.badge}`
                    : card.badge}
                </p>
                <button type="button" className="btn-primary" onClick={next}>
                  {index < cards.length - 1
                    ? "Próxima carta"
                    : "Guardar no binder"}
                </button>
              </>
            ) : (
              <p className="rip2-hint">Toque na carta para virar</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
