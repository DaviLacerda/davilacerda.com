import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ReactNode } from "react";

import { BRAND_MARK } from "@/components/brand-mark";
import { siteConfig } from "@/config/site";
import { profile } from "@/content/profile";

/*
 * Shared design for the generated Open Graph / Twitter images: the site's
 * light theme on a 1200x630 card. White ground, ink type in Jost (the site's
 * only face), surface-grey pills for questions and suggestions, signal red
 * only on the send button. No gradients, rules or shadows. Fonts are bundled
 * static TTFs (Satori cannot read woff2), see ./fonts.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** Light-theme tokens from globals.css. */
export const ogColors = {
  page: "#ffffff",
  ink: "#0a0a0a",
  muted: "#666666",
  surface: "#f2f2f2",
  border: "#d4d4d4",
  accent: siteConfig.brandColor,
  onAccent: "#ffffff",
} as const;

const FONT_DIR = path.join(process.cwd(), "src/lib/og/fonts");
const FAMILY = "Jost";

type Font = {
  name: string;
  data: Buffer;
  weight: 400 | 500;
  style: "normal";
};

let fontsPromise: Promise<Font[]> | undefined;

/** Loads the bundled fonts once per process. */
export function loadOgFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "Jost-Regular.ttf")),
    readFile(path.join(FONT_DIR, "Jost-Medium.ttf")),
  ]).then(([regular, medium]) => [
    { name: FAMILY, data: regular, weight: 400, style: "normal" },
    { name: FAMILY, data: medium, weight: 500, style: "normal" },
  ]);
  return fontsPromise;
}

/** Davi's mark (see `@/components/brand-mark`) as an inline SVG. */
export function OgMark({
  height = 34,
  color = ogColors.ink,
}: {
  height?: number;
  color?: string;
}) {
  const width = Math.round((height * 139) / 128);
  return (
    <svg width={width} height={height} viewBox={BRAND_MARK.viewBox}>
      <path fillRule="evenodd" fill={color} d={BRAND_MARK.body} />
      {BRAND_MARK.pixels.map((pixel) => (
        <rect key={`${pixel.x}-${pixel.y}`} fill={color} {...pixel} />
      ))}
    </svg>
  );
}

/** The card: mark and name top left, domain top right, content below. */
export function OgFrame({
  children,
  justify = "flex-end",
}: {
  children: ReactNode;
  /** Vertical placement of the content block. */
  justify?: "flex-end" | "center";
}) {
  const domain = new URL(siteConfig.url).hostname;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: ogColors.page,
        color: ogColors.ink,
        fontFamily: FAMILY,
        padding: "64px 72px 72px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgMark />
          <span style={{ fontWeight: 500 }}>{profile.name}</span>
        </div>
        <span style={{ color: ogColors.muted }}>{domain}</span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Shortens text to `max` characters at a word boundary, ending with an ellipsis. */
export function clampText(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  return `${cut.slice(0, end > max * 0.6 ? end : max).replace(/[\s,.;:]+$/, "")}…`;
}

/**
 * Display title sized to its length so long post titles still fit in three
 * lines. `max` caps the size when something else shares the card.
 */
export function OgTitle({ text, max = 112 }: { text: string; max?: number }) {
  const fontSize = Math.min(
    max,
    text.length > 70 ? 64 : text.length > 42 ? 76 : text.length > 24 ? 92 : 112,
  );
  return (
    <div
      style={{
        display: "flex",
        fontWeight: 500,
        fontSize,
        lineHeight: 1.02,
        letterSpacing: "-0.03em",
        color: ogColors.ink,
        maxWidth: 1040,
      }}
    >
      {text}
    </div>
  );
}

export function OgLead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 24,
        fontSize: 34,
        lineHeight: 1.35,
        color: ogColors.muted,
        maxWidth: 1000,
      }}
    >
      {children}
    </div>
  );
}

/** The visitor's question as a right-aligned bubble, like the chat. */
export function OgQuestion({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          display: "flex",
          background: ogColors.surface,
          borderRadius: "30px 30px 10px 30px",
          padding: "18px 30px",
          fontSize: 32,
          maxWidth: 820,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A row of suggestion pills. */
export function OgChips({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {items.map((item) => (
        <div
          key={item}
          style={{
            display: "flex",
            background: ogColors.surface,
            borderRadius: 999,
            padding: "10px 24px",
            fontSize: 26,
            fontWeight: 500,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

/** The composer: a pill field with its placeholder and the red send button. */
export function OgComposer({ placeholder }: { placeholder: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 88,
        borderRadius: 999,
        border: `2px solid ${ogColors.border}`,
        padding: "0 12px 0 36px",
        fontSize: 30,
        color: ogColors.muted,
      }}
    >
      <span>{placeholder}</span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: 64,
          background: ogColors.accent,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 256 256">
          <path
            fill={ogColors.onAccent}
            d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"
          />
        </svg>
      </div>
    </div>
  );
}

/** A quiet line of facts under the content (spaced, never dotted). */
export function OgMeta({ items }: { items: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 32,
        marginTop: 28,
        fontSize: 26,
        color: ogColors.muted,
      }}
    >
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
