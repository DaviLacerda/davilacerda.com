"use client";

import { useState } from "react";

import { CardReveal } from "./card-reveal";
import { chime } from "./sound";

type Props = {
  label: string;
  cards: { image: string; title: string; badge: string }[];
  onDone: () => void;
};

/** A card pack: shake, tear it open, then flip each card inside. */
export function PackOpening({ label, cards, onDone }: Props) {
  const [stage, setStage] = useState<"pack" | "tearing" | "cards">("pack");
  const [index, setIndex] = useState(0);

  const tear = () => {
    if (stage !== "pack") return;
    setStage("tearing");
    chime("pickup");
    setTimeout(() => setStage("cards"), 900);
  };

  if (stage === "cards") {
    const card = cards[index];
    if (!card) return null;
    const last = index === cards.length - 1;
    return (
      <CardReveal
        key={card.image}
        image={card.image}
        title={card.title}
        badge={
          cards.length > 1
            ? `${card.badge} · ${index + 1} de ${cards.length} no pacote`
            : card.badge
        }
        action={last ? "Guardar no binder" : "Próxima carta"}
        onDone={() => (last ? onDone() : setIndex((i) => i + 1))}
      />
    );
  }

  return (
    <div className="pack-stage">
      <p className="reveal-kicker">
        {stage === "pack" ? "Você encontrou um pacote!" : "Abrindo…"}
      </p>
      <button
        type="button"
        className={`pack ${stage === "tearing" ? "is-tearing" : ""}`}
        onClick={tear}
        aria-label="Abrir pacote"
      >
        <span className="pack-top" aria-hidden />
        <span className="pack-body">
          <small>NOSSA HISTÓRIA</small>
          <b>♥</b>
          <strong>{label}</strong>
          <small>
            {cards.length} {cards.length === 1 ? "carta" : "cartas"}
          </small>
        </span>
        <span className="pack-glow" aria-hidden />
      </button>
      <p className="pack-hint">
        {stage === "pack" ? "Toque no pacote para abrir" : " "}
      </p>
    </div>
  );
}
