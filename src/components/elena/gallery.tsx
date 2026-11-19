"use client";

import { useState } from "react";

import { type Island, media } from "./types";

/** The photos and videos of a place, shown once its pack is opened. */
export function Gallery({
  island,
  unlocked = false,
  onClose,
}: {
  island: Island;
  unlocked?: boolean;
  onClose: () => void;
}) {
  const slides = [
    ...island.videos.map((src) => ({ kind: "video" as const, src })),
    ...island.photos.map((src) => ({ kind: "photo" as const, src })),
  ];
  const [slide, setSlide] = useState(0);
  const current = slides[slide];

  return (
    <div className="overlay">
      <article className="memory">
        {unlocked && (
          <p className="memory-unlocked">✨ Memórias desbloqueadas</p>
        )}
        <p className="memory-place">📍 {island.place}</p>
        <h2>{island.title}</h2>
        {current && (
          <div className="memory-media">
            {current.kind === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated media
              <img src={media(current.src)} alt="" />
            ) : (
              <video
                key={current.src}
                src={media(current.src)}
                controls
                playsInline
                autoPlay
                preload="auto"
                ref={(v) => {
                  // start on its own; if the browser blocks sound, start muted
                  if (!v || v.dataset.started) return;
                  v.dataset.started = "1";
                  v.play().catch(() => {
                    v.muted = true;
                    v.play().catch(() => undefined);
                  });
                }}
              />
            )}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  className="media-nav prev"
                  onClick={() =>
                    setSlide((s) => (s - 1 + slides.length) % slides.length)
                  }
                  aria-label="Anterior"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="media-nav next"
                  onClick={() => setSlide((s) => (s + 1) % slides.length)}
                  aria-label="Próxima"
                >
                  ›
                </button>
                <div className="media-dots">
                  {slides.map((s, i) => (
                    <i key={s.src} className={i === slide ? "is-on" : ""} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <p className="memory-text">{island.text}</p>
        <button type="button" className="btn-primary" onClick={onClose}>
          Continuar o passeio
        </button>
      </article>
    </div>
  );
}
