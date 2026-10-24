import type { IconifyJSON } from "@iconify/types";
import { getIconData } from "@iconify/utils/lib/icon-set/get-icon";
import { iconToSVG } from "@iconify/utils/lib/svg/build";

import iconSets from "./icons.json";
import { logoRegistry, type LogoId } from "./registry";

export { logoRegistry, type LogoId } from "./registry";

/**
 * Where a logo comes from: a bundled brand logo (an id from the registry) or
 * a file in /public, such as "/logos/algar.svg".
 */
export type LogoSource = LogoId | `/${string}`;

const sets = iconSets as Record<string, IconifyJSON>;

export function isLogoId(value: string): value is LogoId {
  return Object.hasOwn(logoRegistry, value);
}

const byName = new Map<string, LogoId>();
for (const [id, spec] of Object.entries(logoRegistry)) {
  for (const name of "names" in spec ? spec.names : []) {
    byName.set(name.toLowerCase(), id as LogoId);
  }
}

/** The logo for a technology as written in the profile ("Next.js", "Azure"), if there is one. */
export function techLogo(name: string): LogoId | undefined {
  return byName.get(name.toLowerCase());
}

export type LogoSvg = { label: string; viewBox: string; body: string };

/** SVG data for a bundled logo, ready to inline (server only; nothing reaches the client bundle). */
export function getLogoSvg(id: LogoId): LogoSvg {
  const spec = logoRegistry[id];
  const [prefix = "", name = ""] = spec.icon.split(":");
  const set = sets[prefix];
  const data = set ? getIconData(set, name) : null;
  if (!data) {
    throw new Error(
      `Logo "${id}" (${spec.icon}) is missing: run \`yarn logos\`.`,
    );
  }
  const { attributes, body } = iconToSVG(data);
  return { label: spec.label, viewBox: attributes.viewBox, body };
}

/**
 * Prefixes every id inside an SVG body (and the `url(#…)` / `href="#…"`
 * references to it), so two copies of a logo with gradients on one page
 * never share an id.
 */
export function scopeSvgIds(body: string, prefix: string): string {
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  let scoped = body;
  for (const id of ids) {
    if (!id) continue;
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    scoped = scoped.replace(
      new RegExp(`([#;"])(${escaped})([")]|\\.[a-z])`, "g"),
      `$1${prefix}$2$3`,
    );
  }
  return scoped;
}
