"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Binder } from "./binder";
import { Gallery } from "./gallery";
import { type Bubble, World } from "./game/world";
import { PackOpening } from "./pack-opening";
import { chime } from "./sound";
import {
  CARD_ORDER,
  type Content,
  ISLAND_ORDER,
  media,
  other,
  type Who,
} from "./types";

type Props = {
  content: Content;
  skin: Who;
  cards: string[];
  opened: string[];
  onOpenPack: (islandId: string, cards: string[]) => void;
  onFinish: () => void;
  onReplayIntro: () => void;
  onChangeSkin: () => void;
  onReset: () => void;
};

type Overlay =
  | { kind: "pack"; island: string }
  | { kind: "binder"; fresh: string[]; island?: string }
  | { kind: "gallery"; island: string; unlocked: boolean }
  | { kind: "finale" }
  | null;

const cardNumber = (id: string) =>
  `Carta ${CARD_ORDER.indexOf(id as (typeof CARD_ORDER)[number]) + 1} de ${CARD_ORDER.length}`;

export function Game({
  content,
  skin,
  cards,
  opened,
  onOpenPack,
  onFinish,
  onReplayIntro,
  onChangeSkin,
  onReset,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const [bubble, setBubble] = useState<Bubble>(null);
  const [next, setNext] = useState<string | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [help, setHelp] = useState(true);
  const openedRef = useRef(opened);
  useEffect(() => {
    openedRef.current = opened;
  }, [opened]);

  const labels = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(content.islands).map(([id, i]) => [id, i.place]),
      ),
    [content],
  );
  const partner = other(skin);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = new World(
      canvas,
      {
        onNear: setNear,
        onPackTap: (id) => {
          world.paused = true;
          setOverlay({ kind: "pack", island: id });
        },
        onFinale: () => {
          chime("finale");
          world.celebrate();
          setOverlay({ kind: "finale" });
        },
        onBubble: setBubble,
        onNext: setNext,
      },
      {
        skin,
        lines: Object.fromEntries(
          Object.entries(content.islands).map(([id, i]) => [
            id,
            i.lines[partner],
          ]),
        ),
        labels,
        opened: openedRef.current,
      },
    );
    worldRef.current = world;
    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, [content, labels, skin, partner]);

  const resume = () => {
    setOverlay(null);
    if (worldRef.current) worldRef.current.paused = false;
  };

  const openPack = (id: string) => {
    if (worldRef.current) worldRef.current.paused = true;
    setOverlay({ kind: "pack", island: id });
  };

  const have = CARD_ORDER.filter((id) => cards.includes(id)).length;
  const island =
    overlay && "island" in overlay && overlay.island
      ? content.islands[overlay.island]
      : null;

  return (
    <div className="game">
      <canvas ref={canvasRef} className="game-canvas" />

      <header className="hud">
        <button
          type="button"
          className="hud-pill"
          onClick={() => {
            if (worldRef.current) worldRef.current.paused = true;
            setOverlay({ kind: "binder", fresh: [] });
          }}
        >
          <span className="hud-heart">♥</span> Binder {have}/{CARD_ORDER.length}
        </button>
        {next && <p className="hud-next">Próxima ilha: {next}</p>}
      </header>

      {bubble && !overlay && (
        <div className="bubble-3d" style={{ left: bubble.x, top: bubble.y }}>
          {bubble.text}
        </div>
      )}

      <Joystick
        onMove={(x, y) => worldRef.current?.setStick(x, y)}
        onTap={(x, y) => worldRef.current?.pick(x, y)}
      />

      {near && !overlay && (
        <button
          type="button"
          className="open-pack"
          onClick={() => openPack(near)}
        >
          🎁 Abrir o pacote
        </button>
      )}

      {help && (
        <div className="help" onClick={() => setHelp(false)}>
          <div className="help-card">
            <h2>Ilhas da nossa história</h2>
            <p>
              Cada ilha é um lugar que a gente viveu. Atravesse as pontes,
              encontre o pacote de cartas escondido em cada uma, abra e guarde
              as cartas no binder. As fotos de cada lugar só aparecem depois que
              o pacote é aberto.
            </p>
            <p className="help-controls">
              <span className="only-touch">
                Arraste o dedo na tela para andar e toque no pacote para abrir.
              </span>
              <span className="only-mouse">
                Ande com W A S D ou as setas e clique no pacote para abrir.
              </span>
            </p>
            <button type="button" className="btn-primary">
              Vamos!
            </button>
          </div>
        </div>
      )}

      {overlay?.kind === "pack" && island && (
        <div className="overlay">
          <PackOpening
            label={island.place}
            cards={island.cards.flatMap((id) => {
              const c = content.cards[id];
              return c
                ? [
                    {
                      image: media(c.image),
                      title: c.title,
                      badge: cardNumber(id),
                    },
                  ]
                : [];
            })}
            onDone={() => {
              onOpenPack(overlay.island, island.cards);
              worldRef.current?.markOpened(overlay.island);
              setOverlay({
                kind: "binder",
                fresh: island.cards,
                island: overlay.island,
              });
            }}
          />
        </div>
      )}

      {overlay?.kind === "binder" && (
        <Binder
          content={content}
          cards={cards}
          fresh={overlay.fresh}
          onClose={overlay.island ? undefined : resume}
          primary={
            overlay.island
              ? {
                  label: "Ver as fotos desbloqueadas ✨",
                  onClick: () =>
                    setOverlay({
                      kind: "gallery",
                      island: overlay.island!,
                      unlocked: true,
                    }),
                }
              : undefined
          }
          onPhotos={(cardId) => {
            const id = Object.keys(content.islands).find((k) =>
              content.islands[k]?.cards.includes(cardId),
            );
            if (id)
              setOverlay({ kind: "gallery", island: id, unlocked: false });
          }}
          footer={
            overlay.island ? null : (
              <>
                <button type="button" onClick={onReplayIntro}>
                  Rever o match
                </button>
                <button type="button" onClick={onChangeSkin}>
                  Trocar personagem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Recomeçar do zero? O binder volta a ficar vazio.",
                      )
                    )
                      onReset();
                  }}
                >
                  Recomeçar
                </button>
              </>
            )
          }
        />
      )}

      {overlay?.kind === "gallery" && island && (
        <Gallery island={island} unlocked={overlay.unlocked} onClose={resume} />
      )}

      {overlay?.kind === "finale" && (
        <Finale
          content={content}
          onClose={() => {
            onFinish();
            setOverlay({ kind: "binder", fresh: [] });
          }}
        />
      )}

      <p className="hud-progress" aria-hidden>
        {ISLAND_ORDER.map((id) => (
          <i key={id} className={opened.includes(id) ? "on" : ""} />
        ))}
      </p>
    </div>
  );
}

/* ---------------- joystick: drag anywhere; a short tap picks ---------------- */

function Joystick({
  onMove,
  onTap,
}: {
  onMove: (x: number, y: number) => void;
  onTap: (x: number, y: number) => void;
}) {
  const [origin, setOrigin] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const moved = useRef(false);
  const R = 56;

  const end = (e: React.PointerEvent) => {
    if (origin && !moved.current) onTap(e.clientX, e.clientY);
    setOrigin(null);
    onMove(0, 0);
  };

  return (
    <div
      className="joystick-zone"
      onPointerDown={(e) => {
        moved.current = false;
        if (e.pointerType === "mouse") {
          setOrigin({ x: e.clientX, y: e.clientY, id: e.pointerId });
          return;
        }
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setOrigin({ x: e.clientX, y: e.clientY, id: e.pointerId });
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        if (!origin || e.pointerId !== origin.id) return;
        let dx = e.clientX - origin.x;
        let dy = e.clientY - origin.y;
        const d = Math.hypot(dx, dy);
        if (d > 8) moved.current = true;
        if (e.pointerType === "mouse") return;
        if (d > R) {
          dx = (dx / d) * R;
          dy = (dy / d) * R;
        }
        setKnob({ x: dx, y: dy });
        onMove(dx / R, dy / R);
      }}
      onPointerUp={end}
      onPointerCancel={() => {
        setOrigin(null);
        onMove(0, 0);
      }}
    >
      {origin && (knob.x !== 0 || knob.y !== 0) && (
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
                style={{ ["--i" as string]: i - 3.5 }}
              />
            ) : null;
          })}
        </div>
        <h2>{content.finale.title}</h2>
        <p>{content.finale.message}</p>
        <p className="finale-sign">{content.finale.signature}</p>
        <button type="button" className="btn-primary" onClick={onClose}>
          Ver o nosso binder
        </button>
      </article>
    </div>
  );
}
