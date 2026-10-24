#!/usr/bin/env node
/**
 * Copies the icons listed in src/lib/logos/registry.ts out of the Iconify
 * sets (@iconify-json/logos, @iconify-json/simple-icons, several MB each)
 * into src/lib/logos/icons.json, so the site bundles only the few it uses.
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

const sets = {};
for (const [prefix, names] of [...wanted].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
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
