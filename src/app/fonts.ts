import {
  Geist_Mono,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";

/**
 * Typefaces (self-hosted at build time by next/font):
 * - Display: Instrument Serif, a condensed editorial serif for headlines.
 *   Only weight 400 exists; use italics (`italic`) for emphasis, never bold.
 * - Sans: Instrument Sans (variable 400–700), body copy and UI.
 * - Mono: Geist Mono, code, eyebrows, metadata.
 *
 * The CSS variables are mapped to `font-display` / `font-sans` / `font-mono`
 * in `globals.css`. Apply `fontVariables` to `<html>`.
 */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const fontVariables = [
  display.variable,
  sans.variable,
  mono.variable,
].join(" ");
