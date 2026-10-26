import "server-only";

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CSSProperties, ReactNode } from "react";

import { BRAND_MARK } from "@/components/brand-mark";
import { siteConfig } from "@/config/site";
import { profile } from "@/content/profile";
import { getLogoSvg, type LogoId } from "@/lib/logos";

/*
 * Shared design for the generated Open Graph / Twitter images: the site's
 * light theme on a 1200x630 card, in black and white like the site. White
 * ground, ink type in Geist (the site's only face), surface-grey and ink
 * panels; the only colour is a brand's own logo. No gradients, rules or
 * shadows. Each Work answer gets the same picture as its answer on the page
 * (see ./answers.tsx). Fonts are bundled static TTFs (Satori cannot read
 * woff2), see ./fonts. Their kerning and ligature features are stripped:
 * Satori draws kerned glyphs but spaces the words by unkerned widths, which
 * opened visible gaps after words like "LATAM" or "Microsoft".
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/** Light-theme tokens from globals.css. */
export const ogColors = {
  page: "#ffffff",
  ink: "#0a0a0a",
  muted: "#666666",
  surface: "#f4f4f4",
  border: "#dcdcdc",
  onInk: "#ffffff",
  onInkMuted: "#a3a3a3",
} as const;

const FONT_DIR = path.join(process.cwd(), "src/lib/og/fonts");
const FAMILY = "Geist";

type Font = {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 600;
  style: "normal";
};

let fontsPromise: Promise<Font[]> | undefined;

/** Loads the bundled fonts once per process. */
export function loadOgFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "Geist-Regular.ttf")),
    readFile(path.join(FONT_DIR, "Geist-Medium.ttf")),
    readFile(path.join(FONT_DIR, "Geist-SemiBold.ttf")),
  ]).then(([regular, medium, semibold]) => [
    { name: FAMILY, data: regular, weight: 400, style: "normal" },
    { name: FAMILY, data: medium, weight: 500, style: "normal" },
    { name: FAMILY, data: semibold, weight: 600, style: "normal" },
  ]);
  return fontsPromise;
}

const imageCache = new Map<string, string>();

/**
 * A PNG or JPEG from /public as a data URI for an <img> on a card (Satori's
 * renderer cannot read WebP or AVIF). Read once per process; OG images are
 * generated at build time.
 */
export function ogPublicImage(publicPath: string): string {
  let uri = imageCache.get(publicPath);
  if (!uri) {
    const file = readFileSync(path.join(process.cwd(), "public", publicPath));
    const type = publicPath.endsWith(".png") ? "image/png" : "image/jpeg";
    uri = `data:${type};base64,${file.toString("base64")}`;
    imageCache.set(publicPath, uri);
  }
  return uri;
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
export function OgTitle({ text, max = 104 }: { text: string; max?: number }) {
  const fontSize = Math.min(
    max,
    text.length > 70 ? 60 : text.length > 42 ? 70 : text.length > 24 ? 84 : 104,
  );
  return (
    <div
      style={{
        display: "flex",
        fontWeight: 600,
        fontSize,
        lineHeight: 1.04,
        letterSpacing: "-0.045em",
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
        fontSize: 32,
        lineHeight: 1.35,
        letterSpacing: "-0.012em",
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

/**
 * A bundled brand logo, in its own colours, as an image (Satori draws SVG
 * through an <img>). Black-and-white marks take the ink colour.
 */
export function OgLogo({ id, size }: { id: LogoId; size: number }) {
  const svg = getLogoSvg(id);
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${svg.viewBox}" color="${ogColors.ink}">${svg.body}</svg>`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM.
    <img
      alt=""
      width={size}
      height={size}
      src={`data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`}
      style={{ objectFit: "contain" }}
    />
  );
}

/** Phosphor's trophy (regular), as on the award panels. */
export function OgTrophy({
  size = 30,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256">
      <path
        fill={color}
        d="M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z"
      />
    </svg>
  );
}

/** A rounded panel: ink (the headline fact) or surface grey. */
export function OgPanel({
  tone = "ink",
  style,
  children,
}: {
  tone?: "ink" | "surface";
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 36,
        padding: "36px 44px 40px",
        background: tone === "ink" ? ogColors.ink : ogColors.surface,
        color: tone === "ink" ? ogColors.onInk : ogColors.ink,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
