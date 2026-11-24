import { Caveat, Geist, Geist_Mono } from "next/font/google"; // taste-skill-ignore: Geist Mono is for literal code only

/**
 * Typefaces (self-hosted at build time by next/font):
 * - Geist, a neo-grotesque by Vercel (variable 400–600 in use), for
 *   everything: display, headings, body and UI. Large x-height, tabular
 *   figures and Latin Extended (Portuguese accents) included.
 * - Geist Mono, its monospaced sibling, for literal code inside `<pre>` and
 *   `<code>` only. Never for labels, dates or metadata.
 * - Caveat, a handwriting face, for the notebook touches of blog posts only
 *   (captions, notes, pull quotes; see `src/lib/scrapbook.ts`).
 *
 * The CSS variables are mapped to `font-sans` / `font-mono` in `globals.css`.
 * Apply `fontVariables` to `<html>`. The OG images use static Geist TTFs from
 * `src/lib/og/fonts` (satori cannot read the variable WOFF2).
 */
const sans = Geist({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  display: "swap",
  variable: "--font-geist",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
  // Only blog code blocks use it; do not preload it on every page.
  preload: false,
});

const hand = Caveat({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-caveat",
  // Only blog posts use it.
  preload: false,
});

export const fontVariables = [sans.variable, mono.variable, hand.variable].join(
  " ",
);
