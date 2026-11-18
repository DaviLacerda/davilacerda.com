"use client";

import { useEffect, useRef, useState } from "react";

import { chime } from "./sound";

type Props = {
  image: string;
  title: string;
  /** Number of the card in the album, e.g. "3/7". */
  badge?: string;
  action?: string;
  onDone: () => void;
};

/** A card face down that flips, shines and tilts under the finger. */
export function CardReveal({
  image,
  title,
  badge,
  action = "Guardar no álbum",
  onDone,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = image;
  }, [image]);

  const flip = () => {
    if (flipped) return;
    setFlipped(true);
    chime("reveal");
  };

  const tilt = (event: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el || !flipped) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 16).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 20).toFixed(2)}deg`);
    el.style.setProperty("--px", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--py", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const reset = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="reveal">
      <p className="reveal-kicker">
        {flipped ? "Carta desbloqueada!" : "Uma carta nova…"}
      </p>
      <div
        className="reveal-stage"
        onPointerMove={tilt}
        onPointerLeave={reset}
        onClick={flip}
      >
        <div
          ref={cardRef}
          className={`reveal-card ${flipped ? "is-flipped" : ""}`}
        >
          <div className="reveal-face reveal-back" aria-hidden>
            <span>♥</span>
            <small>toque para virar</small>
          </div>
          <div className="reveal-face reveal-front">
            {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media, no optimizer */}
            <img src={image} alt={title} draggable={false} />
            <div className="reveal-holo" aria-hidden />
          </div>
        </div>
        {flipped && (
          <div className="reveal-burst" aria-hidden>
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} style={{ ["--i" as string]: i }}>
                ♥
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={`reveal-footer ${flipped ? "is-visible" : ""}`}>
        <h2>{title}</h2>
        {badge && <p>{badge}</p>}
        <button
          type="button"
          className="btn-primary"
          onClick={onDone}
          disabled={!flipped}
        >
          {action}
        </button>
      </div>
    </div>
  );
}
