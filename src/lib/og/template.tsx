import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";

/*
 * Shared design for the generated Open Graph / Twitter images and app icons:
 * warm paper background, ink text, the violet accent, Instrument Serif for
 * display type and Geist Mono for labels (the same faces as the site). Fonts
 * are bundled TTF subsets (Satori cannot read woff2), see ./fonts.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** Light-theme tokens from globals.css, as hex (Satori has no oklch). */
export const ogColors = {
  paper: "#fbfaf7",
  ink: "#17171f",
  muted: "#6b6b78",
  border: "#e4e2dc",
  accent: "#5f2fbd",
  accentSoft: "#efe9fb",
} as const;

const FONT_DIR = path.join(process.cwd(), "src/lib/og/fonts");

type Font = {
  name: string;
  data: Buffer;
  weight: 400 | 500;
  style: "normal" | "italic";
};

let fontsPromise: Promise<Font[]> | undefined;

/** Loads the bundled fonts once per process. */
export function loadOgFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "InstrumentSerif-Regular.ttf")),
    readFile(path.join(FONT_DIR, "InstrumentSerif-Italic.ttf")),
    readFile(path.join(FONT_DIR, "GeistMono-Regular.ttf")),
    readFile(path.join(FONT_DIR, "GeistMono-Medium.ttf")),
  ]).then(([serif, serifItalic, mono, monoMedium]) => [
    { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
    {
      name: "Instrument Serif",
      data: serifItalic,
      weight: 400,
      style: "italic",
    },
    { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
    { name: "Geist Mono", data: monoMedium, weight: 500, style: "normal" },
  ]);
  return fontsPromise;
}

const SERIF = "Instrument Serif";
const MONO = "Geist Mono";

/** "dl" monogram in a ring, like the site header. */
export function Monogram({ size = 64 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `2px solid ${ogColors.ink}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SERIF,
        fontStyle: "italic",
        fontSize: size * 0.5,
        color: ogColors.ink,
        lineHeight: 1,
        paddingBottom: size * 0.06,
      }}
    >
      dl
    </div>
  );
}

/** Mono, uppercase label with an accent dash (the site's Eyebrow). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: MONO,
        fontWeight: 500,
        fontSize: 22,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: ogColors.accent,
      }}
    >
      <div style={{ width: 36, height: 2, background: ogColors.accent }} />
      {children}
    </div>
  );
}

type FrameProps = {
  eyebrow: ReactNode;
  children: ReactNode;
  /** Left side of the footer row, joined by slashes (e.g. ["Davi Lacerda", "AI Engineer"]). */
  footer: ReactNode[];
  /** How many leading footer items are set in ink instead of muted. */
  footerStrong?: number;
  /** Right side of the footer row; defaults to the domain. */
  footerRight?: ReactNode;
};

/** The card: paper background, soft violet glow, hairline frame, header and footer rows. */
export function OgFrame({
  eyebrow,
  children,
  footer,
  footerStrong = 0,
  footerRight,
}: FrameProps) {
  const domain = new URL(siteConfig.url).hostname;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: ogColors.paper,
        backgroundImage: `radial-gradient(circle at 88% 0%, rgba(95, 47, 189, 0.16), rgba(251, 250, 247, 0) 46%), radial-gradient(circle at 0% 100%, rgba(95, 47, 189, 0.06), rgba(251, 250, 247, 0) 40%)`,
        color: ogColors.ink,
        fontFamily: SERIF,
        padding: 40,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: `1px solid ${ogColors.border}`,
          borderRadius: 28,
          padding: "52px 64px 48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          <Monogram size={60} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${ogColors.border}`,
            paddingTop: 26,
            fontFamily: MONO,
            fontSize: 22,
            color: ogColors.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {footer.map((item, index) => (
              <div
                key={index}
                style={{ display: "flex", alignItems: "center" }}
              >
                {index > 0 ? (
                  <span style={{ color: ogColors.border, margin: "0 16px" }}>
                    /
                  </span>
                ) : null}
                <span
                  style={{
                    color: index < footerStrong ? ogColors.ink : ogColors.muted,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", color: ogColors.ink }}>
            {footerRight ?? domain}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Display title sized to its length so long post titles still fit in three lines. */
export function OgTitle({
  children,
  text,
}: {
  children?: ReactNode;
  text: string;
}) {
  const fontSize =
    text.length > 70
      ? 66
      : text.length > 42
        ? 80
        : text.length > 24
          ? 100
          : 124;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontFamily: SERIF,
        fontSize,
        lineHeight: 1.02,
        letterSpacing: "-0.02em",
        color: ogColors.ink,
        maxWidth: 980,
      }}
    >
      {children ?? text}
    </div>
  );
}

export function OgLead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 26,
        fontFamily: SERIF,
        fontSize: 36,
        lineHeight: 1.3,
        color: ogColors.muted,
        maxWidth: 960,
        lineClamp: 2,
      }}
    >
      {children}
    </div>
  );
}

export const ogFonts = { serif: SERIF, mono: MONO } as const;
