"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CardReveal } from "./card-reveal";
import { type Bubble, World } from "./game/world";
import { chime } from "./sound";
import { CARD_ORDER, type Content, media, type Memory } from "./types";

type Props = {
  content: Content;
  collected: string[];
  onCollect: (id: string) => void;
  onFinish: () => void;
  onReplayIntro: () => void;
  onReset: () => void;
};

export function Game({
  content,
  collected,
  onCollect,
  onFinish,
  onReplayIntro,
  onReset,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const [bubble, setBubble] = useState<Bubble>(null);
  const [next, setNext] = useState<string | null>(null);
  const [memory, setMemory] = useState<string | null>(null);
  const [album, setAlbum] = useState(false);
  const [finale, setFinale] = useState(false);
  const [help, setHelp] = useState(true);
  const collectedRef = useRef(collected);
  useEffect(() => {
    collectedRef.current = collected;
  }, [collected]);

  const labels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(content.memories).map(([id, m]) => [
          id,
          `${m.place}: ${m.title}`,
        ]),
      ),
    [content],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const lines = Object.fromEntries(
      Object.entries(content.memories).flatMap(([id, m]) => [
        [id, m.davi],
        ...(id === "pedido" ? [["casa", m.davi]] : []),
      ]),
    );
    const world = new World(
      canvas,
      {
        onPickup: (id) => {
          chime("pickup");
          setMemory(id);
        },
        onFinale: () => {
          chime("finale");
          world.celebrate();
          setFinale(true);
        },
        onBubble: setBubble,
        onNext: setNext,
      },
      lines,
      labels,
      collectedRef.current,
    );
    worldRef.current = world;
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, [content, labels]);

  const cardsHave = CARD_ORDER.filter((id) => collected.includes(id)).length;

  const finishMemory = (id: string) => {
    onCollect(id);
    worldRef.current?.collect(id);
    setMemory(null);
    if (worldRef.current) worldRef.current.paused = false;
  };

  const current = memory ? content.memories[memory] : null;

  return (
    <div className="game">
      <canvas ref={canvasRef} className="game-canvas" />

      <header className="hud">
        <button
          type="button"
          className="hud-pill"
          onClick={() => setAlbum(true)}
        >
          <span className="hud-heart">♥</span> {cardsHave}/{CARD_ORDER.length}{" "}
          cartas
        </button>
        {next && <p className="hud-next">Próximo: {next}</p>}
      </header>

      {bubble && (
        <div className="bubble-3d" style={{ left: bubble.x, top: bubble.y }}>
          {bubble.text}
        </div>
      )}

      <Joystick onMove={(x, y) => worldRef.current?.setStick(x, y)} />

      {help && (
        <div className="help" onClick={() => setHelp(false)}>
          <div className="help-card">
            <h2>Nossa história, em 3D</h2>
            <p>
              Caminhe pelos lugares que a gente viveu junto e encontre os
              corações ♥. Cada um guarda uma memória e uma carta para o seu
              álbum.
            </p>
            <p className="help-controls">
              <span className="only-touch">
                Arraste o dedo na tela para andar.
              </span>
              <span className="only-mouse">Ande com W A S D ou as setas.</span>
            </p>
            <button type="button" className="btn-primary">
              Vamos!
            </button>
          </div>
        </div>
      )}

      {current && memory && (
        <MemoryModal
          id={memory}
          memory={current}
          content={content}
          index={
            CARD_ORDER.indexOf(current.card as (typeof CARD_ORDER)[number]) + 1
          }
          onDone={() => finishMemory(memory)}
        />
      )}

      {album && (
        <Album
          content={content}
          collected={collected}
          onClose={() => setAlbum(false)}
          onReplayIntro={onReplayIntro}
          onReset={() => {
            if (
              window.confirm("Recomeçar do zero? O álbum volta a ficar vazio.")
            )
              onReset();
          }}
        />
      )}

      {finale && (
        <Finale
          content={content}
          onClose={() => {
            onFinish();
            setFinale(false);
            setAlbum(true);
            if (worldRef.current) worldRef.current.paused = false;
          }}
        />
      )}
    </div>
  );
}

/* ---------------- joystick: drag anywhere on the canvas ---------------- */

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [origin, setOrigin] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 56;

  return (
    <div
      className="joystick-zone"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setOrigin({ x: e.clientX, y: e.clientY, id: e.pointerId });
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        if (!origin || e.pointerId !== origin.id) return;
        let dx = e.clientX - origin.x;
        let dy = e.clientY - origin.y;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          dx = (dx / d) * R;
          dy = (dy / d) * R;
        }
        setKnob({ x: dx, y: dy });
        onMove(dx / R, dy / R);
      }}
      onPointerUp={() => {
        setOrigin(null);
        onMove(0, 0);
      }}
      onPointerCancel={() => {
        setOrigin(null);
        onMove(0, 0);
      }}
    >
      {origin && (
        <div className="joystick" style={{ left: origin.x, top: origin.y }}>
          <div
            className="joystick-knob"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- a memory: photos, videos, then the card ---------------- */

function MemoryModal({
  id,
  memory,
  content,
  index,
  onDone,
}: {
  id: string;
  memory: Memory;
  content: Content;
  index: number;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"memory" | "card">("memory");
  const slides = [
    ...memory.photos.map((p) => ({ kind: "photo" as const, src: p })),
    ...memory.videos.map((v) => ({ kind: "video" as const, src: v })),
  ];
  const [slide, setSlide] = useState(0);
  const card = memory.card ? content.cards[memory.card] : undefined;

  if (step === "card" && card) {
    return (
      <div className="overlay">
        <CardReveal
          image={media(card.image)}
          title={card.title}
          badge={`Carta ${index} de ${CARD_ORDER.length}`}
          onDone={onDone}
        />
      </div>
    );
  }

  const current = slides[slide];
  return (
    <div className="overlay">
      <article className="memory" key={id}>
        <p className="memory-place">📍 {memory.place}</p>
        <h2>{memory.title}</h2>
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
                preload="metadata"
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
        <p className="memory-text">{memory.text}</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => (card ? setStep("card") : onDone())}
        >
          {card ? "Revelar a carta ♥" : "Continuar o caminho"}
        </button>
      </article>
    </div>
  );
}

/* ---------------- album ---------------- */

function Album({
  content,
  collected,
  onClose,
  onReplayIntro,
  onReset,
}: {
  content: Content;
  collected: string[];
  onClose: () => void;
  onReplayIntro: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const openCard = open ? content.cards[open] : null;
  return (
    <div className="overlay" onClick={onClose}>
      <section className="album" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Nosso álbum</h2>
          <button
            type="button"
            className="album-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>
        <div className="album-grid">
          {CARD_ORDER.map((id, i) => {
            const card = content.cards[id];
            const have = collected.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`album-slot ${have ? "have" : ""}`}
                disabled={!have}
                onClick={() => setOpen(id)}
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
        <footer className="album-footer">
          <button type="button" onClick={onReplayIntro}>
            Rever o match
          </button>
          <button type="button" onClick={onReset}>
            Recomeçar
          </button>
        </footer>
      </section>
      {openCard && (
        <div
          className="album-zoom"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated media */}
          <img src={media(openCard.image)} alt={openCard.title} />
        </div>
      )}
    </div>
  );
}

/* ---------------- the end ---------------- */

function Finale({
  content,
  onClose,
}: {
  content: Content;
  onClose: () => void;
}) {
  return (
    <div className="overlay finale">
      <div className="finale-hearts" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} style={{ ["--i" as string]: i }}>
            ♥
          </span>
        ))}
      </div>
      <article className="finale-card">
        <div className="finale-fan" aria-hidden>
          {CARD_ORDER.map((id, i) => {
            const card = content.cards[id];
            return card ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated media
              <img
                key={id}
                src={media(card.image)}
                alt=""
                style={{ ["--i" as string]: i - 3 }}
              />
            ) : null;
          })}
        </div>
        <h2>{content.finale.title}</h2>
        <p>{content.finale.message}</p>
        <p className="finale-sign">{content.finale.signature}</p>
        <button type="button" className="btn-primary" onClick={onClose}>
          Ver o nosso álbum
        </button>
      </article>
    </div>
  );
}
