#!/usr/bin/env node
/**
 * Writes every file of Davi's mark from the vector in
 * src/components/brand/mark.ts, so the favicons, app icons and the master SVG
 * never drift from the mark the site draws:
 *
 *   public/brand/logo.svg          the master (currentColor, tight viewBox)
 *   public/favicon.svg             ink on light tabs, white on dark (prefers-color-scheme)
 *   public/favicon.ico             16, 32 and 48px: ink on a white rounded tile
 *   public/apple-touch-icon.png    180px, full bleed (iOS rounds it)
 *   public/icons/icon-{192,512}.png, maskable-512.png   web manifest, MCP card, ARD catalog
 *   public/images/logo.png         139x128, the RSS channel image
 *
 *   yarn brand
 *
 * Needs Node 22.18+ (it imports the TypeScript geometry directly) and sharp
 * (installed with Next.js) to rasterize.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { BRAND_MARK } from "../src/components/brand/mark.ts";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pub = (file) => path.join(root, "public", file);

/** The site's ink and page tokens (globals.css, light theme). */
const INK = "#0a0a0a";
const PAGE = "#ffffff";
const { width: W, height: H, glyph } = BRAND_MARK;

const svgDoc = (attrs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>\n`;

/** The master: tight viewBox, currentColor (black when opened on its own). */
const master = svgDoc(
  `viewBox="0 0 ${W} ${H}" fill="currentColor"`,
  `<path fill-rule="evenodd" d="${glyph}"/>`,
);

/**
 * Browser-tab favicon: square, the glyph as wide as the square, ink by
 * default and white when the browser is dark. No tile: tabs supply the ground.
 * A 20-unit outline (about 0.3px at 16px) keeps the hairline flag visible at
 * tab size.
 */
const side = Math.max(W, H) + 4;
const favicon = svgDoc(
  `viewBox="${(W - side) / 2} ${(H - side) / 2} ${side} ${side}"`,
  `<style>path{fill:${INK};stroke:${INK}}@media (prefers-color-scheme:dark){path{fill:#fff;stroke:#fff}}</style>` +
    `<path fill-rule="evenodd" stroke-width="20" stroke-linejoin="round" d="${glyph}"/>`,
);

/**
 * A raster: the glyph on a page-coloured ground, `scale` = glyph width / the
 * image width, centred on its box, `radius` = tile corner (0 = full bleed),
 * `weight` = extra outline in output pixels, so the hairline flag and the
 * counter survive at favicon sizes (optical-size compensation).
 */
function tile({ width, height = width, scale, radius = 0, weight = 0 }) {
  const gw = width * scale;
  const k = gw / W;
  const gh = H * k;
  const x = (width - gw) / 2;
  const y = (height - gh) / 2;
  const ground =
    radius > 0
      ? `<rect width="${width}" height="${height}" rx="${radius * Math.min(width, height)}" fill="${PAGE}"/>`
      : `<rect width="${width}" height="${height}" fill="${PAGE}"/>`;
  return svgDoc(
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`,
    `${ground}<path fill-rule="evenodd" fill="${INK}"${weight ? ` stroke="${INK}" stroke-width="${weight / k}" stroke-linejoin="round"` : ""} transform="translate(${x} ${y}) scale(${k})" d="${glyph}"/>`,
  );
}

const png = (svg) =>
  sharp(Buffer.from(svg), { density: 72 })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

/** A .ico holding PNG images (every browser since IE9/Vista reads them). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry); // width
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height
    header.writeUInt8(0, entry + 2); // palette
    header.writeUInt8(0, entry + 3); // reserved
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const files = new Map();
files.set("brand/logo.svg", master);
files.set("favicon.svg", favicon);

const icoSizes = [
  { size: 16, scale: 0.86, weight: 0.45 },
  { size: 32, scale: 0.82, weight: 0.4 },
  { size: 48, scale: 0.8, weight: 0 },
];
const icoImages = await Promise.all(
  icoSizes.map(async ({ size, scale, weight }) => ({
    size,
    data: await png(tile({ width: size, scale, radius: 0.22, weight })),
  })),
);
files.set("favicon.ico", ico(icoImages));
files.set("apple-touch-icon.png", await png(tile({ width: 180, scale: 0.62 })));
files.set(
  "icons/icon-192.png",
  await png(tile({ width: 192, scale: 0.64, radius: 0.22 })),
);
files.set(
  "icons/icon-512.png",
  await png(tile({ width: 512, scale: 0.64, radius: 0.22 })),
);
// Maskable: full bleed, the glyph inside the central 80% safe circle.
files.set(
  "icons/maskable-512.png",
  await png(tile({ width: 512, scale: 0.54 })),
);
files.set(
  "images/logo.png",
  await png(tile({ width: 139, height: 128, scale: 0.8, radius: 0.16 })),
);

for (const [file, data] of files) {
  await mkdir(path.dirname(pub(file)), { recursive: true });
  await writeFile(pub(file), data);
  console.log(`public/${file}`);
}
