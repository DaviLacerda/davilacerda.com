"use client";

import { useEffect, useRef, useState } from "react";

import { Binder } from "./binder";
import { Interior } from "./fp/engine";
import { Gallery } from "./gallery";
import { PackRip as PackOpening } from "./pack-rip";
import { SCENES } from "./scenes";
import {
  CARD_ORDER,
  type Content,
  media,
  SPECIAL_CARDS,
  type Who,
} from "./types";

type Props = {
  id: string;
  content: Content;
  skin: Who;
  cards: string[];
  opened: boolean;
  onOpened: (cards: string[]) => void;
  onExit: () => void;
  /** The next chapter, if any: offered as a teleport once the pack is opened. */
  next?: { label: string; go: () => void } | null;
};

type Step = "play" | "pack" | "binder" | "gallery" | "teleport";

const cardNumber = (id: string) =>
  `Carta ${CARD_ORDER.indexOf(id as (typeof CARD_ORDER)[number]) + 1} de ${CARD_ORDER.length}`;

/** One place in first person: walk around, find the pack, open it, see the photos. */
export function PlaceView({
  id,
  content,
  skin,
  cards,
  opened,
  onOpened,
  onExit,
  next,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interiorRef = useRef<Interior | null>(null);
  const [ready, setReady] = useState(false);
  const [focus, setFocus] = useState(false);
  const [bubble, setBubble] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [step, setStep] = useState<Step>("play");
  // the place's ambient sound stops while the pack, binder and videos are open
  useEffect(() => {
    interiorRef.current?.setAmbientPaused(step !== "play");
  }, [step]);
  const [third, setThird] = useState(false);
  const [locked, setLocked] = useState(false);
  const island = content.islands[id];
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const loader = SCENES[id];
    if (!canvas || !loader) return;
    const interior = new Interior(canvas, skin, {
      onFocus: setFocus,
      onBubble: setBubble,
      onExit: () => onExitRef.current(),
      onReady: () => setReady(true),
    });
    interiorRef.current = interior;
    let alive = true;
    void loader().then((m) =>
      alive ? interior.load(m.default, opened) : undefined,
    );
    const onLock = () => setLocked(document.pointerLockElement === canvas);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      alive = false;
      document.removeEventListener("pointerlockchange", onLock);
      interior.dispose();
      interiorRef.current = null;
    };
    // the scene is built once per place; `opened` only matters at load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, skin]);

  const openPack = () => {
    const interior = interiorRef.current;
    if (!interior) return;
    interior.paused = true;
    interior.releasePointer();
    setFocus(false);
    setStep("pack");
  };

  // E (or a click while looking at it) opens the pack on desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && focus && step === "play") openPack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const [done, setDone] = useState(opened);
  const resume = () => {
    setStep("play");
    if (interiorRef.current) interiorRef.current.paused = false;
  };

  return (
    <div className="place">
      <canvas ref={canvasRef} className="game-canvas" />
      {!ready && (
        <div className="place-loading">
          <div className="loading-heart">♥</div>
          <p>Entrando em {island?.place ?? "…"}</p>
        </div>
      )}
      <div className="place-crosshair" data-on={focus} aria-hidden />
      {bubble && step === "play" && (
        <div className="bubble-3d" style={{ left: bubble.x, top: bubble.y }}>
          {bubble.text}
        </div>
      )}
      {step === "play" && ready && (
        <>
          <TouchControls interior={interiorRef} />
          <header className="place-hud">
            <span className="place-name">📍 {island?.place}</span>
            <button
              type="button"
              onClick={() =>
                setThird((t) => (interiorRef.current?.setThirdPerson(!t), !t))
              }
            >
              {third ? "1ª pessoa" : "3ª pessoa"}
            </button>
            {done && next && (
              <button type="button" className="place-next" onClick={next.go}>
                🗺️ Próximo no mapa
              </button>
            )}
            <button type="button" onClick={onExit}>
              Mapa
            </button>
          </header>
          {!locked && (
            <p className="place-hint only-mouse">
              Clique na tela para olhar com o mouse · WASD para andar · Shift
              corre · V troca a câmera · E abre o pacote
            </p>
          )}
          {focus && (
            <button type="button" className="open-pack" onClick={openPack}>
              🎁 Abrir o pacote <span className="only-mouse">(E)</span>
            </button>
          )}
        </>
      )}

      {step === "pack" && island && (
        <div className="overlay">
          <PackOpening
            label={island.place}
            cards={island.cards.flatMap((cid) => {
              const c = content.cards[cid];
              return c
                ? [
                    {
                      image: media(c.image),
                      title: c.title,
                      badge: cardNumber(cid),
                      special: SPECIAL_CARDS.includes(cid),
                    },
                  ]
                : [];
            })}
            onDone={() => {
              onOpened(island.cards);
              setDone(true);
              interiorRef.current?.unlock();
              setStep("binder");
            }}
          />
        </div>
      )}
      {step === "binder" && island && (
        <Binder
          content={content}
          cards={Array.from(new Set([...cards, ...island.cards]))}
          fresh={island.cards}
          primary={{
            label: "Ver as fotos desbloqueadas ✨",
            onClick: () => setStep("gallery"),
          }}
        />
      )}
      {step === "gallery" && island && (
        <Gallery
          island={island}
          unlocked
          onClose={() => (next ? setStep("teleport") : resume())}
        />
      )}
      {step === "teleport" && next && (
        <div className="overlay">
          <article className="teleport-card">
            <p className="teleport-kicker">Pacote guardado no binder ✨</p>
            <h2>Próximo capítulo liberado no mapa</h2>
            <p className="teleport-next">{next.label}</p>
            <button type="button" className="btn-primary" onClick={next.go}>
              🗺️ Ir para o mapa
            </button>
            <button type="button" className="map-link" onClick={resume}>
              Ficar mais um pouco aqui
            </button>
          </article>
        </div>
      )}
    </div>
  );
}

/** Left thumb walks, right thumb looks (touch screens only). */
function TouchControls({
  interior,
}: {
  interior: React.RefObject<Interior | null>;
}) {
  const stick = useRef<{ id: number; x: number; y: number } | null>(null);
  const look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null>(null);
  const R = 56;
  return (
    <div
      className="place-touch only-touch-block"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        if (e.clientX < window.innerWidth / 2 && !stick.current) {
          stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
        } else if (!look.current) {
          look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }
      }}
      onPointerMove={(e) => {
        if (stick.current?.id === e.pointerId) {
          let dx = e.clientX - stick.current.x;
          let dy = e.clientY - stick.current.y;
          const d = Math.hypot(dx, dy);
          if (d > R) {
            dx = (dx / d) * R;
            dy = (dy / d) * R;
          }
          setKnob({ x: stick.current.x, y: stick.current.y, dx, dy });
          interior.current?.setMove(dx / R, dy / R);
        } else if (look.current?.id === e.pointerId) {
          interior.current?.look(
            (e.clientX - look.current.x) * 1.2,
            (e.clientY - look.current.y) * 1.2,
          );
          look.current = { ...look.current, x: e.clientX, y: e.clientY };
        }
      }}
      onPointerUp={(e) => {
        if (stick.current?.id === e.pointerId) {
          stick.current = null;
          setKnob(null);
          interior.current?.setMove(0, 0);
        }
        if (look.current?.id === e.pointerId) look.current = null;
      }}
      onPointerCancel={() => {
        stick.current = null;
        look.current = null;
        setKnob(null);
        interior.current?.setMove(0, 0);
      }}
    >
      {knob && (
        <div className="joystick" style={{ left: knob.x, top: knob.y }}>
          <div
            className="joystick-knob"
            style={{ transform: `translate(${knob.dx}px, ${knob.dy}px)` }}
          />
        </div>
      )}
    </div>
  );
}
