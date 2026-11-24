#!/usr/bin/env node
/**
 * Turns the cut-out product photos of the Things page into stickers: each
 * photo, trimmed and scaled to the same size, inside a white die-cut border
 * that follows its outline.
 *
 *   assets/things/<id>.png      the product photo with its background removed
 *                               (transparent PNG; remove.bg, rembg or similar)
 *   public/things/<id>.png      the sticker (written)
 *   src/content/stickers.json   each sticker's size, read by src/content/things.ts (written)
 *
 *   yarn stickers
 *
 * The border is the photo's own silhouette grown by BORDER pixels (the alpha
 * channel blurred, then cut at a low level, so corners come out round), filled
 * white; the photo sits on top. The shadow and the tilt are CSS (ThingsWall).
 * Needs sharp (installed with Next.js).
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "assets/things");
const output = path.join(root, "public/things");
const sizes = path.join(root, "src/content/stickers.json");

/** The photo's longest side, in pixels. */
const SIZE = 900;
/** The white border's width, in pixels. */
const BORDER = 22;
/** Transparent room around the border, so the edge never touches the canvas. */
const PAD = BORDER + 6;

/** Gaussian blur of a one-channel mask, returned as one byte per pixel. */
async function blur(mask, width, height, sigma) {
  // A raw one-channel buffer goes through a greyscale PNG first: blurred as
  // raw, sharp reads it as sRGB and the result comes back wrong.
  const png = await sharp(mask, { raw: { width, height, channels: 1 } })
    .toColourspace("b-w")
    .png()
    .toBuffer();
  return sharp(png).blur(sigma).extractChannel(0).raw().toBuffer();
}

async function sticker(file) {
  const id = path.basename(file, ".png");
  const photo = await sharp(path.join(source, file))
    .ensureAlpha()
    .trim({ threshold: 1 })
    .resize(SIZE, SIZE, { fit: "inside" })
    .extend({
      top: PAD,
      bottom: PAD,
      left: PAD,
      right: PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = photo.info;

  // The silhouette grown by BORDER: blur the alpha, keep everything above a
  // low level, then soften the cut by a pixel for a clean edge. Each step is
  // its own sharp pipeline: sharp runs a pipeline's operations in a fixed
  // order (and keeps only the last blur), not in the order they are called.
  const alpha = await sharp(photo.data)
    .extractChannel("alpha")
    .raw()
    .toBuffer();
  const blurred = await blur(alpha, width, height, BORDER / 2);
  const cut = Buffer.from(blurred.map((value) => (value > 6 ? 255 : 0)));
  const grown = await blur(cut, width, height, 0.8);

  // White everywhere, with the grown silhouette as its alpha.
  const rgba = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = grown[i] ?? 0;
  const white = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  await sharp(white)
    .composite([{ input: photo.data }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(output, `${id}.png`));

  return [id, { width, height }];
}

await mkdir(output, { recursive: true });
const files = (await readdir(source)).filter((file) => file.endsWith(".png"));
const entries = await Promise.all(files.sort().map(sticker));
await writeFile(
  sizes,
  `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`,
);
for (const [id, size] of entries) {
  console.log(`public/things/${id}.png  ${size.width}x${size.height}`);
}
