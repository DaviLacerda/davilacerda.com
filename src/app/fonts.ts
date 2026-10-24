import { Geist_Mono, Jost } from "next/font/google"; // taste-skill-ignore: Geist Mono is for literal code only

/**
 * Typefaces (self-hosted at build time by next/font):
 * - Jost, a geometric sans (variable 400–600), for everything: display,
 *   headings, body and UI. Display sizes use weight 500 and sentence case.
 * - Geist Mono, for literal code inside `<pre>` and `<code>` only. Never for
 *   labels, dates or metadata.
 *
 * The CSS variables are mapped to `font-sans` / `font-mono` in `globals.css`.
 * Apply `fontVariables` to `<html>`. The OG images use static Jost TTFs from
 * `src/lib/og/fonts` (satori cannot read the variable WOFF2).
 */
const sans = Jost({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  display: "swap",
  variable: "--font-jost",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
  // Only blog code blocks use it; do not preload it on every page.
  preload: false,
});

export const fontVariables = [sans.variable, mono.variable].join(" ");
