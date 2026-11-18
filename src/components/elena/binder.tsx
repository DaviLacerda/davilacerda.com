"use client";

import { useState } from "react";

import { CARD_ORDER, type Content, media } from "./types";

type Props = {
  content: Content;
  cards: string[];
  /** Cards just added, which slide into their pockets. */
  fresh?: string[];
  primary?: { label: string; onClick: () => void };
  onClose?: () => void;
  /** The island a card came from, to see its photos. */
  onPhotos?: (cardId: string) => void;
  footer?: React.ReactNode;
};

/** The relationship binder: one page of nine pockets. */
export function Binder({
  content,
  cards,
  fresh = [],
  primary,
  onClose,
  onPhotos,
  footer,
}: Props) {
  const [zoom, setZoom] = useState<string | null>(null);
  const zoomed = zoom ? content.cards[zoom] : null;
  const slots = [...CARD_ORDER, "next"] as const;

  return (
    <div className="overlay" onClick={onClose}>
      <section className="binder" onClick={(e) => e.stopPropagation()}>
        <div className="binder-rings" aria-hidden>
          {[0, 1, 2].map((i) => (
            <i key={i} />
          ))}
        </div>
        <header className="binder-header">
          <div>
            <h2>Nosso binder</h2>
            <p>
              {
                cards.filter((c) =>
                  (CARD_ORDER as readonly string[]).includes(c),
                ).length
              }{" "}
              de {CARD_ORDER.length} cartas
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              className="binder-close"
              onClick={onClose}
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </header>
        <div className="binder-grid">
          {slots.map((id, i) => {
            if (id === "next") {
              return (
                <div key={id} className="binder-slot binder-next">
                  <span>
                    <b>♥</b>
                    <small>Próximo capítulo…</small>
                  </span>
                </div>
              );
            }
            const card = content.cards[id];
            const have = cards.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`binder-slot ${have ? "have" : ""} ${fresh.includes(id) ? "is-fresh" : ""}`}
                disabled={!have}
                onClick={() => setZoom(id)}
              >
                {have && card ? (
                  // eslint-disable-next-line @next/next/no-img-element -- authenticated media
                  <img src={media(card.image)} alt={card.title} />
                ) : (
                  <span>
                    <b>?</b>
                    <small>Nº {i + 1}</small>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {primary && (
          <button
            type="button"
            className="btn-primary binder-primary"
            onClick={primary.onClick}
          >
            {primary.label}
          </button>
        )}
        {footer && <footer className="binder-footer">{footer}</footer>}
      </section>
      {zoomed && zoom && (
        <div
          className="binder-zoom"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
          <img src={media(zoomed.image)} alt={zoomed.title} />
          {onPhotos && zoom !== "tinder" && (
            <button
              type="button"
              className="btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(null);
                onPhotos(zoom);
              }}
            >
              Ver as fotos desse lugar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
