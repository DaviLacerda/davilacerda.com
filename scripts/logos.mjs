#!/usr/bin/env node
/**
 * Copies the icons listed in src/lib/logos/registry.ts out of the Iconify
 * sets (@iconify-json/logos, @iconify-json/simple-icons, several MB each)
 * into src/lib/logos/icons.json, so the site bundles only the few it uses.
 * `file:<name>` icons are read from public/logos/<name>.svg (an optimized
 * SVG with a viewBox: run it through svgo first) into a `file` set, with the
 * entry's `tint` colour turned into `currentColor`.
 *
 *   yarn logos
 *
 * Needs Node 22.18+ (it imports the TypeScript registry directly).
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getIcons } from "@iconify/utils/lib/icon-set/get-icons";

import { logoRegistry } from "../src/lib/logos/registry.ts";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "src/lib/logos/icons.json");

const wanted = new Map();
for (const [id, spec] of Object.entries(logoRegistry)) {
  const [prefix, name] = spec.icon.split(":");
  if (!prefix || !name) throw new Error(`${id}: bad icon id "${spec.icon}"`);
  if (!wanted.has(prefix)) wanted.set(prefix, new Set());
  wanted.get(prefix).add(name);
}

/** An SVG file as an Iconify icon: its viewBox and the markup inside the root. */
async function fileIcon(name, tint) {
  const svg = await readFile(
    path.join(root, "public/logos", `${name}.svg`),
    "utf8",
  );
  const viewBox = /<svg[^>]*\sviewBox="([^"]+)"/.exec(svg)?.[1];
  const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1];
  if (!viewBox || inner === undefined) {
    throw new Error(`file:${name}: no viewBox`);
  }
  const [left, top, width, height] = viewBox
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  let body = inner.trim();
  if (tint) {
    body = body.replace(
      new RegExp(tint.replace("#", "#?"), "gi"),
      "currentColor",
    );
  }
  return { body, left, top, width, height };
}

const tints = new Map(
  Object.values(logoRegistry)
    .filter((spec) => spec.tint)
    .map((spec) => [spec.icon, spec.tint]),
);

const sets = {};
for (const [prefix, names] of [...wanted].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  if (prefix === "file") {
    const icons = {};
    for (const name of [...names].sort()) {
      icons[name] = await fileIcon(name, tints.get(`file:${name}`));
    }
    sets.file = { prefix: "file", icons };
    continue;
  }
  const file = require.resolve(`@iconify-json/${prefix}/icons.json`);
  const full = JSON.parse(await readFile(file, "utf8"));
  const subset = getIcons(full, [...names].sort(), true);
  if (!subset) throw new Error(`No icons found in ${prefix}`);
  const missing = [...names].filter((name) => !subset.icons[name]);
  if (missing.length)
    throw new Error(`Missing in ${prefix}: ${missing.join(", ")}`);
  // Keep only what rendering needs (licence and author stay in the sets' own files).
  sets[prefix] = {
    prefix: subset.prefix,
    icons: subset.icons,
    ...(subset.aliases && Object.keys(subset.aliases).length
      ? { aliases: subset.aliases }
      : {}),
    ...(subset.width ? { width: subset.width } : {}),
    ...(subset.height ? { height: subset.height } : {}),
  };
}

await writeFile(out, `${JSON.stringify(sets, null, 2)}\n`);
console.log(
  `Wrote ${path.relative(root, out)}: ${Object.entries(sets)
    .map(([prefix, set]) => `${prefix} (${Object.keys(set.icons).length})`)
    .join(", ")}`,
);
