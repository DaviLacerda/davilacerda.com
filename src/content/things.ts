/**
 * Things Davi uses every day: the Things page (`/[lang]/personal/things`), a
 * wall of stickers that zooms into one to show what it is and where to get
 * it. Edit this list; the page, its Markdown rendition, llms files, the
 * sitemap entry's page and the JSON-LD follow.
 *
 * - The picture is a sticker: `public/things/<id>.png`, made by
 *   `yarn stickers` from the product photo cut out of its background
 *   (`assets/things/<id>.png`). Add the photo there for a new thing.
 * - `url` is the maker's own page for the product (a localized one when the
 *   maker has a Brazilian store). Prefer the product page over a reseller.
 * - `facts` are short, verifiable product facts (two or three), not opinions.
 *   TODO(davi): add a `note` in your own words when you want one.
 */
import type { L10n, Localizable } from "@/i18n";

import stickers from "./stickers.json";

export type ThingCategory = "tech" | "wear";

export type Thing = {
  /** Stable slug: the URL hash on the page (`#macbook-air-m3`). */
  id: string;
  name: string;
  brand: string;
  category: ThingCategory;
  /** What it is, in a few words: "Smart glasses", "Laptop". */
  kind: Localizable;
  /** The colour or finish he has. */
  finish?: Localizable;
  /** Two or three product facts. */
  facts: L10n<string[]>;
  /** The maker's page for it. */
  url: Localizable;
};

export const things: Thing[] = [
  {
    id: "ray-ban-meta-wayfarer",
    name: "Ray-Ban Meta Wayfarer",
    brand: "Ray-Ban, Meta",
    category: "wear",
    kind: { en: "Smart glasses", "pt-br": "Óculos inteligentes" },
    finish: { en: "Black", "pt-br": "Preto" },
    facts: {
      en: ["12 MP camera", "Open-ear speakers", "Meta AI built in"],
      "pt-br": [
        "Câmera de 12 MP",
        "Alto-falantes abertos",
        "Meta AI integrada",
      ],
    },
    url: "https://www.meta.com/ai-glasses/wayfarer/",
  },
  {
    id: "macbook-air-m3",
    name: "MacBook Air M3",
    brand: "Apple",
    category: "tech",
    kind: { en: "Laptop", "pt-br": "Notebook" },
    facts: {
      en: ["Apple M3 chip", "Fanless", "Up to 18 hours of battery"],
      "pt-br": ["Chip Apple M3", "Sem ventoinha", "Até 18 horas de bateria"],
    },
    url: {
      en: "https://www.apple.com/macbook-air/",
      "pt-br": "https://www.apple.com/br/macbook-air/",
    },
  },
  {
    id: "airpods-pro-2",
    name: "AirPods Pro 2",
    brand: "Apple",
    category: "tech",
    kind: { en: "Earbuds", "pt-br": "Fones de ouvido" },
    facts: {
      en: ["Active Noise Cancellation", "Adaptive Audio", "Apple H2 chip"],
      "pt-br": [
        "Cancelamento Ativo de Ruído",
        "Áudio Adaptativo",
        "Chip Apple H2",
      ],
    },
    url: {
      en: "https://www.apple.com/airpods-pro/",
      "pt-br": "https://www.apple.com/br/airpods-pro/",
    },
  },
  {
    id: "nike-vomero-5",
    // TODO(davi): confirm the model (Vomero 5 assumed from "Nike Vomero White").
    name: "Nike Vomero 5",
    brand: "Nike",
    category: "wear",
    kind: { en: "Sneakers", "pt-br": "Tênis" },
    finish: { en: "White", "pt-br": "Branco" },
    facts: {
      en: ["Zoom Air cushioning", "Mesh and synthetic upper"],
      "pt-br": ["Amortecimento Zoom Air", "Cabedal em malha e sintético"],
    },
    url: "https://www.nike.com/w?q=vomero%205",
  },
  {
    id: "nike-book-1",
    name: "Nike Book 1",
    brand: "Nike",
    category: "wear",
    kind: { en: "Basketball shoes", "pt-br": "Tênis de basquete" },
    finish: { en: "Black", "pt-br": "Preto" },
    facts: {
      en: ["Devin Booker's first signature shoe", "Low top"],
      "pt-br": ["Primeiro tênis assinado por Devin Booker", "Cano baixo"],
    },
    url: "https://www.nike.com/w?q=book%201",
  },
  {
    id: "logitech-g-pro",
    // TODO(davi): confirm the model (PRO Wireless assumed from "Logitech G Pro").
    name: "Logitech G PRO",
    brand: "Logitech G",
    category: "tech",
    kind: { en: "Gaming mouse", "pt-br": "Mouse gamer" },
    finish: { en: "Black", "pt-br": "Preto" },
    facts: {
      en: ["HERO 25K sensor", "LIGHTSPEED wireless", "80 grams"],
      "pt-br": ["Sensor HERO 25K", "Sem fio LIGHTSPEED", "80 gramas"],
    },
    url: {
      en: "https://www.logitechg.com/en-us/products/gaming-mice/pro-wireless-mouse.html",
      "pt-br":
        "https://www.logitechg.com/pt-br/products/gaming-mice/pro-wireless-mouse.html",
    },
  },
];

export type ThingSticker = { src: string; width: number; height: number };

/** A thing's sticker (`yarn stickers` writes the file and its size). */
export function thingSticker(id: string): ThingSticker {
  const size = (stickers as Record<string, Omit<ThingSticker, "src">>)[id];
  if (!size) throw new Error(`No sticker for "${id}": run yarn stickers.`);
  return { src: `/things/${id}.png`, ...size };
}

/** The host of a thing's link, as shown on its button: "apple.com". */
export function thingStore(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
