"use client";

import { useRef, useState } from "react";

import { PackRip } from "./pack-rip";
import { chime } from "./sound";

/** The last chapter's card is made on the spot from a photo they send. */
export const FINAL_CARD = "dois-meses";
export const FINAL_PLACE = "Casa das Massas";
export const FINAL_WHEN = "19 de novembro · dois meses";
const STORAGE = "elena-dois-meses-v1";

export function readFinalCard(): string | null {
  try {
    return localStorage.getItem(STORAGE);
  } catch {
    return null;
  }
}

function saveFinalCard(dataUrl: string) {
  try {
    localStorage.setItem(STORAGE, dataUrl);
  } catch {
    // storage full or blocked: the card still shows for this session
  }
}

export function clearFinalCard() {
  try {
    localStorage.removeItem(STORAGE);
  } catch {
    // nothing to clear
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Prints the photo as a mega-rare card (same size as the other cards). */
async function printCard(file: File) {
  const img = await loadImage(file);
  const W = 1062;
  const H = 1482;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  // holographic gold frame
  const frame = g.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, "#fff1b8");
  frame.addColorStop(0.2, "#e2a94a");
  frame.addColorStop(0.4, "#ff9ad1");
  frame.addColorStop(0.55, "#9fd8ff");
  frame.addColorStop(0.75, "#f6c75e");
  frame.addColorStop(1, "#fff6d6");
  g.fillStyle = frame;
  g.beginPath();
  g.roundRect(0, 0, W, H, 54);
  g.fill();
  g.fillStyle = "#1a0f1f";
  g.beginPath();
  g.roundRect(34, 34, W - 68, H - 68, 36);
  g.fill();

  // the photo, cover-fit into the window
  const px = 64;
  const py = 150;
  const pw = W - 128;
  const ph = 980;
  const s = Math.max(pw / img.width, ph / img.height);
  const sw = pw / s;
  const sh = ph / s;
  g.save();
  g.beginPath();
  g.roundRect(px, py, pw, ph, 22);
  g.clip();
  g.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    px,
    py,
    pw,
    ph,
  );
  g.restore();
  g.strokeStyle = frame;
  g.lineWidth = 6;
  g.beginPath();
  g.roundRect(px, py, pw, ph, 22);
  g.stroke();

  // header
  g.fillStyle = "#fff6d6";
  g.font = '700 44px "Anton", Impact, "Arial Narrow", sans-serif';
  g.textBaseline = "middle";
  g.fillText("Nº 14", 70, 92);
  g.textAlign = "right";
  g.fillStyle = frame;
  g.fillText("✦ MEGA RARA ✦", W - 70, 92);

  // title and caption
  g.textAlign = "center";
  g.fillStyle = "#ffffff";
  g.font = '700 104px "Anton", Impact, "Arial Narrow", sans-serif';
  g.fillText("DOIS MESES", W / 2, 1222);
  g.fillStyle = "#ffd6ea";
  g.font = '500 40px system-ui, "Segoe UI", sans-serif';
  g.fillText(`${FINAL_PLACE} · 19/11/2026`, W / 2, 1306);
  g.fillStyle = "#f6c75e";
  g.font = '500 34px system-ui, "Segoe UI", sans-serif';
  g.fillText("Elena ♥ Davi · o binder está completo", W / 2, 1376);

  return c.toDataURL("image/jpeg", 0.86);
}

type Props = {
  onDone: (card: string) => void;
  onClose: () => void;
};

/** The padlocked last chapter: send a photo of tonight to open it. */
export function FinalChapter({ onDone, onClose }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [card, setCard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (card) {
    return (
      <PackRip
        label={`${FINAL_PLACE} · edição mega rara`}
        cards={[
          {
            image: card,
            title: "Dois meses",
            badge: "Carta 14 de 14 · mega rara",
            special: true,
          },
        ]}
        onDone={() => onDone(card)}
      />
    );
  }

  return (
    <div className="overlay" onClick={onClose}>
      <article
        className="teleport-card final-lock"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="final-lock-icon" aria-hidden>
          🔒
        </div>
        <p className="teleport-kicker">O último capítulo · {FINAL_WHEN}</p>
        <h2>{FINAL_PLACE}</h2>
        <p>
          Esse capítulo está trancado. Para abrir, mande uma foto de vocês dois
          de hoje. Ela vira a carta mega rara que completa o binder dos nossos
          dois meses.
        </p>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError(null);
            try {
              const url = await printCard(file);
              saveFinalCard(url);
              chime("finale");
              setCard(url);
            } catch {
              setError("Não consegui ler essa foto. Tenta outra?");
            } finally {
              setBusy(false);
            }
          }}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Abrindo o cadeado…" : "📸 Enviar a foto"}
        </button>
        {error && <p className="final-lock-error">{error}</p>}
        <button type="button" className="map-link" onClick={onClose}>
          Depois
        </button>
      </article>
    </div>
  );
}
