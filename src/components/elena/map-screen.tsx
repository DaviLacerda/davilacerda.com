"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Binder } from "./binder";
import {
  clearFinalCard,
  FINAL_CARD,
  FINAL_PLACE,
  FINAL_WHEN,
  FinalChapter,
  readFinalCard,
} from "./final-chapter";
import { Gallery } from "./gallery";
import { PlaceView } from "./place-view";
import { chime } from "./sound";
import {
  CARD_ORDER,
  type Content,
  ISLAND_ORDER,
  media,
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

/** Where each place sits on the stylised map (0..1), and its line on the timeline. */
const PINS: Record<string, { x: number; y: number; when: string }> = {
  panedoca: { x: 0.4, y: 0.34, when: "28 de agosto · o primeiro encontro" },
  "casa-vo": { x: 0.56, y: 0.22, when: "30 de agosto · conhecendo a família" },
  caldas: { x: 0.92, y: 0.86, when: "4 a 7 de setembro · a primeira viagem" },
  sabia: { x: 0.68, y: 0.36, when: "13 de setembro · dia de estádio" },
  famiglia: { x: 0.34, y: 0.72, when: "19 de setembro · a noite do pedido" },
  casa: { x: 0.52, y: 0.5, when: "19 de setembro · rosas e alianças" },
  benedith: { x: 0.2, y: 0.52, when: "2 de outubro · noite de rock" },
  itumbiara: { x: 0.08, y: 0.9, when: "9 de outubro · boliche em família" },
  alpendre: { x: 0.72, y: 0.6, when: "16 de outubro · a voz dela" },
  caramel: { x: 0.62, y: 0.76, when: "19 de outubro · um mês de nós" },
  cinema: { x: 0.74, y: 0.8, when: "19 de outubro · sessão de Verity" },
};

type Overlay =
  | { kind: "place"; id: string }
  | { kind: "binder" }
  | { kind: "gallery"; id: string }
  | { kind: "finale" }
  | { kind: "final" }
  | { kind: "final-binder" }
  | null;

/**
 * The open-world map: a night city drawn on a canvas (avenues, parks, the
 * lake, the highway to Caldas Novas), with a pin for every place in the order
 * of the story. Pick a pin, read its chapter, enter it in first person.
 */
export function MapGame({
  content: baseContent,
  skin,
  cards,
  opened,
  onOpenPack,
  onFinish,
  onReplayIntro,
  onChangeSkin,
  onReset,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // the last card is printed from the photo they send, kept on this device
  const [finalCard, setFinalCard] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setFinalCard(readFinalCard());
  }, []);
  const content = useMemo(
    () =>
      finalCard
        ? {
            ...baseContent,
            cards: {
              ...baseContent.cards,
              [FINAL_CARD]: { image: finalCard, title: "Dois meses" },
            },
          }
        : baseContent,
    [baseContent, finalCard],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [warp, setWarp] = useState<{ id: string; index: number } | null>(null);

  /** The teleport: a flash and a chapter card while the next place loads behind it. */
  const teleport = (id: string | "finale") => {
    chime("reveal");
    if (id === "finale") {
      setWarp({ id: "finale", index: ISLAND_ORDER.length });
      setTimeout(() => setOverlay({ kind: "finale" }), 900);
    } else {
      setWarp({
        id,
        index: ISLAND_ORDER.indexOf(id as (typeof ISLAND_ORDER)[number]),
      });
      setTimeout(() => {
        setSelected(id);
        setOverlay({ kind: "place", id });
      }, 900);
    }
    setTimeout(() => setWarp(null), 3600);
  };

  // the map is the hub: chapters unlock one by one, in order
  const [nope, setNope] = useState<string | null>(null);
  const nextId = ISLAND_ORDER.find((id) => !opened.includes(id)) ?? null;
  const allDone = ISLAND_ORDER.every((id) => opened.includes(id));
  const have = CARD_ORDER.filter((id) => cards.includes(id)).length;

  // pick the next chapter by default
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the story's progress
    setSelected((s) => s ?? nextId);
  }, [nextId]);

  const route = useMemo(
    () =>
      ISLAND_ORDER.map((id) => PINS[id]).filter(Boolean) as {
        x: number;
        y: number;
      }[],
    [],
  );

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    let seed = 11;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const blocks = Array.from({ length: 900 }, () => ({
      x: r(),
      y: r(),
      s: 0.004 + r() * 0.01,
      lit: r(),
    }));
    const parks = Array.from({ length: 9 }, () => ({
      x: r(),
      y: r() * 0.8,
      rx: 0.03 + r() * 0.05,
      ry: 0.02 + r() * 0.04,
    }));
    const draw = (ms: number) => {
      const t = ms / 1000;
      g.fillStyle = "#0d0b14";
      g.fillRect(0, 0, w, h);
      // land texture: city blocks
      for (const b of blocks) {
        g.fillStyle =
          b.lit > 0.92 ? "rgba(255,190,120,0.25)" : "rgba(120,110,150,0.13)";
        g.fillRect(b.x * w, b.y * h, b.s * w, b.s * w * 0.8);
      }
      // parks and the lake
      for (const p of parks) {
        g.fillStyle = "rgba(60,140,90,0.28)";
        g.beginPath();
        g.ellipse(p.x * w, p.y * h, p.rx * w, p.ry * h, 0.4, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "rgba(70,140,220,0.28)";
      g.beginPath();
      g.ellipse(w * 0.15, h * 0.2, w * 0.07, h * 0.05, -0.3, 0, Math.PI * 2);
      g.fill();
      // avenues: a loose grid and a ring
      g.strokeStyle = "rgba(255,255,255,0.10)";
      g.lineWidth = 1;
      for (let i = 1; i < 14; i++) {
        g.beginPath();
        g.moveTo(0, (i / 14) * h + Math.sin(i) * 12);
        g.lineTo(w, (i / 14) * h - Math.cos(i) * 12);
        g.stroke();
        g.beginPath();
        g.moveTo((i / 14) * w + Math.cos(i) * 12, 0);
        g.lineTo((i / 14) * w - Math.sin(i) * 12, h);
        g.stroke();
      }
      g.strokeStyle = "rgba(255,200,120,0.35)";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(w * 0.45, h * 0.38, w * 0.3, h * 0.22, 0.2, 0, Math.PI * 2);
      g.stroke();
      // the highway out of town, toward Caldas Novas
      g.strokeStyle = "rgba(255,200,120,0.45)";
      g.lineWidth = 4;
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(w * 0.62, h * 0.48);
      g.bezierCurveTo(
        w * 0.72,
        h * 0.55,
        w * 0.8,
        h * 0.56,
        w * 0.92,
        h * 0.57,
      );
      g.stroke();
      // the story's route, animated
      g.strokeStyle = "rgba(255,120,170,0.9)";
      g.lineWidth = 2.5;
      g.setLineDash([8, 8]);
      g.lineDashOffset = -t * 30;
      g.beginPath();
      route.forEach((p, i) =>
        i
          ? g.lineTo(p.x * w, (0.14 + p.y * 0.52) * h)
          : g.moveTo(p.x * w, (0.14 + p.y * 0.52) * h),
      );
      g.stroke();
      g.setLineDash([]);
      // labels
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.font = `600 ${Math.max(12, w * 0.012)}px sans-serif`;
      g.fillText("UBERLÂNDIA", w * 0.4, h * 0.12);
      g.fillText("CALDAS NOVAS →", w * 0.78, h * 0.62);
      g.fillText("← ITUMBIARA", w * 0.04, h * 0.66);
      // vignette
      const v = g.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.3,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75,
      );
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,0.7)");
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [route]);

  const sel = selected ? content.islands[selected] : null;
  const selIndex = selected
    ? ISLAND_ORDER.indexOf(selected as (typeof ISLAND_ORDER)[number])
    : -1;

  return (
    <div className="map">
      <canvas ref={ref} className="map-canvas" aria-hidden />
      <header className="map-top">
        <div>
          <p className="map-kicker">ELENA &amp; DAVI</p>
          <h1>Nossa história</h1>
        </div>
        <button
          type="button"
          className="hud-pill"
          onClick={() => setOverlay({ kind: "binder" })}
        >
          <span className="hud-heart">♥</span> Binder {have}/{CARD_ORDER.length}
        </button>
      </header>

      {ISLAND_ORDER.map((id, i) => {
        const pin = PINS[id];
        if (!pin) return null;
        const done = opened.includes(id);
        const locked = !done && id !== nextId;
        return (
          <button
            key={id}
            type="button"
            aria-disabled={locked}
            className={`map-pin ${done ? "is-done" : ""} ${id === nextId ? "is-next" : ""} ${id === selected ? "is-selected" : ""} ${locked ? "is-locked" : ""} ${nope === id ? "is-nope" : ""}`}
            style={{ left: `${pin.x * 100}%`, top: `${14 + pin.y * 52}%` }}
            onClick={() => {
              if (locked) {
                navigator.vibrate?.(30);
                setNope(id);
                setTimeout(() => setNope((n) => (n === id ? null : n)), 1600);
                return;
              }
              chime("pop");
              setSelected(id);
            }}
          >
            <span className="map-pin-dot">
              {done ? "♥" : locked ? "🔒" : i + 1}
            </span>
            <span className="map-pin-label">{content.islands[id]?.place}</span>
          </button>
        );
      })}
      {nope && (
        <p className="map-toast" role="status">
          {nope === "final"
            ? `🔒 ${FINAL_PLACE}: complete todos os capítulos primeiro`
            : `🔒 Complete o capítulo ${ISLAND_ORDER.indexOf(nope as (typeof ISLAND_ORDER)[number])} primeiro`}
        </p>
      )}
      <button
        type="button"
        aria-disabled={!allDone}
        className={`map-pin is-final ${finalCard ? "is-done" : allDone ? "is-next" : "is-locked"} ${nope === "final" ? "is-nope" : ""}`}
        style={{ left: "46%", top: `${14 + 0.62 * 52}%` }}
        onClick={() => {
          if (finalCard) return setOverlay({ kind: "finale" });
          if (!allDone) {
            navigator.vibrate?.(30);
            setNope("final");
            setTimeout(() => setNope((n) => (n === "final" ? null : n)), 1600);
            return;
          }
          chime("pop");
          setOverlay({ kind: "final" });
        }}
      >
        <span className="map-pin-dot">{finalCard ? "♥" : "🔒"}</span>
        <span className="map-pin-label">{FINAL_PLACE}</span>
      </button>

      {sel && selected && (
        <aside className="map-card">
          <p className="map-card-kicker">
            Capítulo {selIndex + 1} · {PINS[selected]?.when}
          </p>
          <h2>{sel.place}</h2>
          <p>{sel.text}</p>
          <div className="map-card-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => teleport(selected)}
            >
              {opened.includes(selected) ? "Visitar de novo" : "Entrar"}
            </button>
            {opened.includes(selected) && (
              <button
                type="button"
                className="map-link"
                onClick={() => setOverlay({ kind: "gallery", id: selected })}
              >
                Ver as fotos
              </button>
            )}
          </div>
          <p className="map-card-status">
            {opened.includes(selected)
              ? "✓ Pacote aberto"
              : "🎁 Um pacote de cartas está escondido lá dentro"}
          </p>
        </aside>
      )}

      {overlay?.kind === "place" && (
        <PlaceView
          key={overlay.id}
          id={overlay.id}
          content={content}
          skin={skin}
          cards={cards}
          opened={opened.includes(overlay.id)}
          onOpened={(c) => onOpenPack(overlay.id, c)}
          next={(() => {
            const after = ISLAND_ORDER.find(
              (id) => id !== overlay.id && !opened.includes(id),
            );
            if (after)
              return {
                label: `${content.islands[after]?.place ?? ""} · ${PINS[after]?.when ?? ""}`,
                go: () => {
                  setOverlay(null);
                  setSelected(after);
                  chime("pop");
                },
              };
            return {
              label: `${FINAL_PLACE} · ${FINAL_WHEN} 🔒`,
              go: () => setOverlay({ kind: "final" }),
            };
          })()}
          onExit={() => {
            setOverlay(null);
            const n = ISLAND_ORDER.find(
              (id) => !opened.includes(id) && id !== overlay.id,
            );
            if (n) setSelected(n);
          }}
        />
      )}
      {warp && (
        <div className="warp" aria-live="polite">
          <div className="warp-rays" aria-hidden />
          <div className="warp-card">
            <p>
              {warp.id === "finale"
                ? "O ÚLTIMO CAPÍTULO"
                : `CAPÍTULO ${warp.index + 1}`}
            </p>
            <h2>
              {warp.id === "finale"
                ? "Nós dois"
                : content.islands[warp.id]?.place}
            </h2>
            <span>{warp.id === "finale" ? "♥" : PINS[warp.id]?.when}</span>
          </div>
        </div>
      )}
      {overlay?.kind === "gallery" && content.islands[overlay.id] && (
        <Gallery
          island={content.islands[overlay.id]!}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "binder" && (
        <Binder
          content={content}
          cards={cards}
          onClose={() => setOverlay(null)}
          onPhotos={(cardId) => {
            const id = Object.keys(content.islands).find((k) =>
              content.islands[k]?.cards.includes(cardId),
            );
            if (id) setOverlay({ kind: "gallery", id });
          }}
          footer={
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
                    clearFinalCard();
                  onReset();
                }}
              >
                Recomeçar
              </button>
            </>
          }
        />
      )}
      {overlay?.kind === "final" && (
        <FinalChapter
          onClose={() => setOverlay(null)}
          onDone={(card) => {
            setFinalCard(card);
            onOpenPack("casa-massas", [FINAL_CARD]);
            setOverlay({ kind: "final-binder" });
          }}
        />
      )}
      {overlay?.kind === "final-binder" && (
        <Binder
          content={content}
          cards={[...new Set([...cards, FINAL_CARD])]}
          fresh={[FINAL_CARD]}
          primary={{
            label: "Binder completo 💗 Ver a última página",
            onClick: () => setOverlay({ kind: "finale" }),
          }}
        />
      )}
      {overlay?.kind === "finale" && (
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
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onFinish();
                setOverlay({ kind: "binder" });
              }}
            >
              Ver o nosso binder
            </button>
          </article>
        </div>
      )}
    </div>
  );
}
