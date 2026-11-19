import * as THREE from "three";

import type { Who } from "../types";
import type { Outfit, Pose } from "./types";

/*
 * Procedural people for the first-person scenes, built without any model
 * files. One skeleton per person drives skinned, continuous surfaces: a lofted
 * torso, arms and legs whose cross sections come from measured profiles, and
 * clothes generated as offset shells of the same surfaces (so they deform with
 * the body). The head is a signed-distance sculpture (skull, jaw, cheeks, nose,
 * lips, eye sockets) ray-cast into a mesh, with real eyeballs, lids and lashes,
 * brows made of strands, shell-textured short hair and beard, and long hair
 * made of layered strand sheets. Units are meters, +Y up, the person faces +Z.
 *
 * `makeHuman` is a full person; `makeFirstPersonBody` is the player's own body
 * seen when looking down (no head).
 */

export type Look = {
  skin: string;
  hair: string;
  hairStyle?: "short" | "long" | "bun" | "bald";
  /** Meters. */
  height?: number;
  beard?: boolean;
  glasses?: boolean;
  female?: boolean;
  /** 1 = average build, 1.3 = fuller. */
  build?: number;
  /** Iris color. */
  eyes?: string;
  /** Nail color (polish). */
  nails?: string;
};

export const LOOKS: Record<Who, Look> = {
  davi: {
    skin: "#e4b598",
    hair: "#20150f",
    hairStyle: "short",
    height: 1.84,
    beard: true,
    glasses: true,
    build: 1.36,
    eyes: "#3a2213",
  },
  elena: {
    skin: "#eec4a8",
    hair: "#0c0908",
    hairStyle: "long",
    height: 1.75,
    female: true,
    build: 1.34,
    eyes: "#24140b",
    nails: "#5a0c19",
  },
};

export type Human = {
  group: THREE.Group;
  height: number;
  setPose: (pose: Pose) => void;
  /** speed in m/s (0 = idle). */
  update: (t: number, dt: number, speed: number) => void;
};

/* ------------------------------------------------------------------ */
/* small math                                                          */
/* ------------------------------------------------------------------ */

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const gauss = (x: number, s: number) => Math.exp(-(x * x) / (s * s));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/** Monotone cubic interpolation through (xs, ys), xs ascending. */
function spline(xs: number[], ys: number[]) {
  const n = xs.length;
  const h: number[] = [];
  const dl: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1]! - xs[i]!);
    dl.push((ys[i + 1]! - ys[i]!) / h[i]!);
  }
  const m: number[] = new Array<number>(n).fill(0);
  m[0] = dl[0]!;
  m[n - 1] = dl[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const a = dl[i - 1]!;
    const b = dl[i]!;
    if (a * b <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i]! + h[i - 1]!;
      const w2 = h[i]! + 2 * h[i - 1]!;
      m[i] = (w1 + w2) / (w1 / a + w2 / b);
    }
  }
  return (x: number) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]!) i++;
    const hh = h[i]!;
    const t = (x - xs[i]!) / hh;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i]! +
      (t3 - 2 * t2 + t) * hh * m[i]! +
      (-2 * t3 + 3 * t2) * ys[i + 1]! +
      (t3 - t2) * hh * m[i + 1]!
    );
  };
}

/** n+1 samples on [a, b] spaced so that the density function gets uniform coverage. */
function warp(a: number, b: number, n: number, dens: (x: number) => number) {
  const steps = 2000;
  const cum: number[] = [0];
  for (let i = 1; i <= steps; i++)
    cum.push(cum[i - 1]! + dens(a + ((i - 0.5) / steps) * (b - a)));
  const total = cum[steps]!;
  const out: number[] = [];
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * total;
    while (k < steps && cum[k + 1]! < target) k++;
    const c0 = cum[k]!;
    const c1 = cum[Math.min(steps, k + 1)]!;
    const f = c1 > c0 ? (target - c0) / (c1 - c0) : 0;
    out.push(a + ((k + f) / steps) * (b - a));
  }
  return out;
}

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function rng(seed: number) {
  let s = Math.floor(seed * 2147483646) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const col = (c: string) => new THREE.Color(c);
const mix = (a: THREE.Color, b: THREE.Color, t: number) =>
  a.clone().lerp(b, clamp(t, 0, 1));
const tint = (a: THREE.Color, r: number, g: number, b: number) =>
  new THREE.Color(a.r * r, a.g * g, a.b * b);

/* ------------------------------------------------------------------ */
/* textures (canvas, cached)                                           */
/* ------------------------------------------------------------------ */

const texCache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

function normalFromHeight(
  src: HTMLCanvasElement,
  strength: number,
  wrap = true,
) {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const { c, g } = canvas(w, h);
  const out = g.createImageData(w, h);
  const at = (x: number, y: number) => {
    const xx = wrap ? (x + w) % w : clamp(x, 0, w - 1);
    const yy = wrap ? (y + h) % h : clamp(y, 0, h - 1);
    return data[(yy * w + xx) * 4]! / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / len) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

function canvasTex(c: HTMLCanvasElement, srgb: boolean, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Jersey-knit fabric: albedo detail + normal map. One tile is ~1 cm. */
function knitMaps() {
  const hit = texCache.get("knit");
  if (hit) return { normal: hit, map: texCache.get("knit-a")! };
  const S = 128;
  const hgt = canvas(S, S);
  const alb = canvas(S, S);
  const r = rng(0.37);
  hgt.g.fillStyle = "#808080";
  hgt.g.fillRect(0, 0, S, S);
  alb.g.fillStyle = "#f0f0f0";
  alb.g.fillRect(0, 0, S, S);
  const cell = 8;
  for (let y = 0; y < S; y += cell) {
    for (let x = 0; x < S; x += cell) {
      for (const side of [-1, 1]) {
        const v = 150 + r() * 70;
        hgt.g.fillStyle = `rgb(${v},${v},${v})`;
        hgt.g.beginPath();
        hgt.g.ellipse(
          x + cell / 2 + side * 1.6,
          y + cell / 2,
          1.6,
          3.6,
          side * 0.45,
          0,
          TAU,
        );
        hgt.g.fill();
      }
      const a = 0.04 + r() * 0.06;
      alb.g.fillStyle = `rgba(0,0,0,${a})`;
      alb.g.fillRect(x, y, cell, cell);
    }
  }
  const normal = canvasTex(normalFromHeight(hgt.c, 2.2), false);
  const map = canvasTex(alb.c, true);
  texCache.set("knit", normal);
  texCache.set("knit-a", map);
  return { normal, map };
}

/** Denim twill: diagonal ribs and faded streaks. */
function denimMaps() {
  const hit = texCache.get("denim");
  if (hit) return { normal: hit, map: texCache.get("denim-a")! };
  const S = 128;
  const hgt = canvas(S, S);
  const alb = canvas(S, S);
  const r = rng(0.71);
  const img = hgt.g.createImageData(S, S);
  const aimg = alb.g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = (x + y * 0.5) % 4;
      const v = d < 2 ? 170 : 90;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v + (r() - 0.5) * 30;
      img.data[i + 3] = 255;
      const streak =
        0.85 +
        0.15 * Math.sin(x * 0.21 + Math.sin(y * 0.05) * 3) +
        (r() - 0.5) * 0.12;
      const a = Math.round(clamp(streak * (d < 2 ? 1.0 : 0.88), 0, 1) * 255);
      aimg.data[i] = aimg.data[i + 1] = aimg.data[i + 2] = a;
      aimg.data[i + 3] = 255;
    }
  }
  hgt.g.putImageData(img, 0, 0);
  alb.g.putImageData(aimg, 0, 0);
  const normal = canvasTex(normalFromHeight(hgt.c, 1.6), false);
  const map = canvasTex(alb.c, true);
  texCache.set("denim", normal);
  texCache.set("denim-a", map);
  return { normal, map };
}

/** Hair strand sheets: `cards` has alpha gaps between strands; `inner` is opaque except the tips. */
function hairMaps() {
  const hit = texCache.get("hair-n");
  if (hit)
    return {
      normal: hit,
      cards: texCache.get("hair-c")!,
      inner: texCache.get("hair-i")!,
    };
  const W = 256;
  const Hh = 512;
  const r = rng(0.53);
  const cards = canvas(W, Hh);
  const inner = canvas(W, Hh);
  const hgt = canvas(W, Hh);
  hgt.g.fillStyle = "#606060";
  hgt.g.fillRect(0, 0, W, Hh);
  inner.g.fillStyle = "#9a9a9a";
  inner.g.fillRect(0, 0, W, Hh * 0.82);
  const grad = inner.g.createLinearGradient(0, Hh * 0.8, 0, Hh);
  grad.addColorStop(0, "rgba(154,154,154,1)");
  grad.addColorStop(1, "rgba(154,154,154,0)");
  inner.g.fillStyle = grad;
  inner.g.fillRect(0, Hh * 0.8, W, Hh * 0.2);
  for (let i = 0; i < 520; i++) {
    const x0 = r() * W;
    const len = Hh * (0.72 + r() * 0.28);
    const v = Math.floor(120 + r() * 135);
    const wdt = 0.8 + r() * 1.6;
    const sway = (r() - 0.5) * 6;
    for (const tgt of [cards.g, hgt.g, inner.g]) {
      tgt.strokeStyle =
        tgt === hgt.g
          ? `rgb(${v},${v},${v})`
          : `rgba(${v},${v},${v},${tgt === inner.g ? 0.55 : 1})`;
      tgt.lineWidth = wdt;
      for (const dx of [0, W, -W]) {
        tgt.beginPath();
        tgt.moveTo(x0 + dx, 0);
        tgt.bezierCurveTo(
          x0 + dx + sway,
          len * 0.33,
          x0 + dx - sway,
          len * 0.66,
          x0 + dx + sway * 0.5,
          tgt === inner.g ? Math.min(len, Hh * 0.8) : len,
        );
        tgt.stroke();
      }
    }
  }
  const normal = canvasTex(normalFromHeight(hgt.c, 3), false);
  const cardsT = canvasTex(cards.c, true);
  const innerT = canvasTex(inner.c, true);
  for (const t of [normal, cardsT, innerT]) t.wrapT = THREE.ClampToEdgeWrapping;
  texCache.set("hair-n", normal);
  texCache.set("hair-c", cardsT);
  texCache.set("hair-i", innerT);
  return { normal, cards: cardsT, inner: innerT };
}

/** Eyeball texture: rows are the polar angle from the front pole (pupil), columns go around. */
function eyeTexture(iris: string) {
  const key = "eye" + iris;
  const hit = texCache.get(key);
  if (hit) return hit;
  const W = 128;
  const Hh = 128;
  const { c, g } = canvas(W, Hh);
  const r = rng(0.19);
  const rowOf = (theta: number) => (theta / Math.PI) * Hh;
  g.fillStyle = "#ece6de";
  g.fillRect(0, 0, W, Hh);
  // faint vessels toward the corners
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(190,80,80,${0.08 + r() * 0.12})`;
    g.lineWidth = 0.6;
    const x = r() * W;
    g.beginPath();
    g.moveTo(x, rowOf(1.3) + r() * 20);
    g.lineTo(x + (r() - 0.5) * 8, rowOf(0.65));
    g.stroke();
  }
  const ic = new THREE.Color(iris);
  const shade = (k: number) =>
    `rgb(${Math.round(clamp(ic.r * k, 0, 1) * 255)},${Math.round(clamp(ic.g * k, 0, 1) * 255)},${Math.round(clamp(ic.b * k, 0, 1) * 255)})`;
  // iris: 0.19..0.55 rad
  g.fillStyle = shade(1);
  g.fillRect(0, 0, W, rowOf(0.56));
  for (let x = 0; x < W; x++) {
    g.fillStyle = shade(0.7 + r() * 0.9);
    g.fillRect(x, rowOf(0.16), 1, rowOf(0.5) - rowOf(0.16));
  }
  g.fillStyle = shade(1.6);
  g.globalAlpha = 0.35;
  g.fillRect(0, rowOf(0.24), W, rowOf(0.33) - rowOf(0.24));
  g.globalAlpha = 1;
  g.fillStyle = "rgba(10,6,4,0.85)";
  g.fillRect(0, rowOf(0.5), W, rowOf(0.565) - rowOf(0.5));
  g.fillStyle = "#050404";
  g.fillRect(0, 0, W, rowOf(0.16));
  const t = canvasTex(c, true, false);
  texCache.set(key, t);
  return t;
}

function printTexture(text: string, color: string) {
  const key = "print" + text + color;
  const hit = texCache.get(key);
  if (hit) return hit;
  const { c, g } = canvas(256, 256);
  g.clearRect(0, 0, 256, 256);
  g.font = "bold 210px 'Arial Black', Impact, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 14;
  g.strokeStyle = "#f4f4f2";
  g.strokeText(text, 128, 138);
  g.fillStyle = color;
  g.fillText(text, 128, 138);
  const t = canvasTex(c, true, false);
  texCache.set(key, t);
  return t;
}

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

/** Skin: physical material with wrapped, red-shifted diffuse (a cheap subsurface look). */
function skinMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.52,
    sheen: 0.35,
    sheenColor: new THREE.Color("#ff9b85"),
    sheenRoughness: 0.45,
    clearcoat: 0.12,
    clearcoatRoughness: 0.42,
    specularIntensity: 0.55,
  });
  m.onBeforeCompile = (s) => {
    const chunk = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      "reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );",
      `{
        float ndlRaw = dot( geometryNormal, directLight.direction );
        vec3 wrapW = vec3( 0.42, 0.2, 0.14 );
        vec3 wrapped = clamp( ( vec3( ndlRaw ) + wrapW ) / ( 1.0 + wrapW ), 0.0, 1.0 );
        wrapped *= wrapped * ( 3.0 - 2.0 * wrapped ) * 0.5 + wrapped * 0.5;
        reflectedLight.directDiffuse += wrapped * directLight.color * BRDF_Lambert( material.diffuseColor );
      }`,
    );
    s.fragmentShader = s.fragmentShader.replace(
      "#include <lights_physical_pars_fragment>",
      chunk,
    );
  };
  m.customProgramCacheKey = () => "skin-wrap-1";
  return m;
}

/** `base` is the garment color: the sheen follows it so dark clothes stay dark under warm light. */
function clothMaterial(
  kind: "knit" | "denim" | "smooth" | "satin",
  base = "#808080",
) {
  const bc = col(base);
  const lum = 0.2126 * bc.r + 0.7152 * bc.g + 0.0722 * bc.b;
  const src = kind === "denim" ? denimMaps() : knitMaps();
  const rep = (t: THREE.Texture, n: number) => {
    const c = t.clone();
    c.repeat.set(n, n);
    c.needsUpdate = true;
    return c;
  };
  const n = kind === "denim" ? 90 : 75;
  const maps = { normal: rep(src.normal, n), map: rep(src.map, n) };
  const m = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: kind === "satin" ? 0.5 : kind === "denim" ? 0.88 : 0.9,
    sheen:
      (kind === "satin" ? 0.6 : 0.8) * lerp(0.25, 1, sstep(0.0, 0.25, lum)),
    sheenRoughness: kind === "satin" ? 0.3 : 0.7,
    sheenColor: (kind === "denim"
      ? new THREE.Color("#8ea0c0")
      : bc.clone().lerp(new THREE.Color("#ffffff"), 0.35)
    ).multiplyScalar(lerp(0.4, 1, sstep(0.0, 0.25, lum))),
    normalMap: maps.normal,
    normalScale: new THREE.Vector2(
      kind === "smooth" || kind === "satin" ? 0.25 : 0.6,
      kind === "smooth" || kind === "satin" ? 0.25 : 0.6,
    ),
    map: kind === "satin" ? null : maps.map,
  });
  return m;
}

/** Short hair and beard as stacked shells: strands are carved out per fragment. */
function shellMaterial(hair: string) {
  const m = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  void hair;
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec4 shell;\nattribute vec2 hcoord;\nvarying vec4 vShell;\nvarying vec2 vH;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvShell = shell;\nvH = hcoord;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec4 vShell;\nvarying vec2 vH;\nfloat hh12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }",
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        vec2 hc = vH * vShell.zw;
        vec2 cell = floor(hc);
        float h = hh12(cell);
        float h2 = hh12(cell + 17.0);
        vec2 f = fract(hc) - 0.5;
        f.x += (h2 - 0.5) * 0.4;
        float len = (0.25 + 0.75 * h) * vShell.y;
        float thick = 0.48 - vShell.x * 0.28;
        bool core = vShell.x < 0.3 && vShell.y > 0.5 + 0.3 * h;
        if (!core && (h2 > vShell.y * 1.15 || len < vShell.x || abs(f.x) > thick)) discard;`,
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\ndiffuseColor.rgb *= mix(0.35, 1.25, vShell.x) * (0.8 + 0.4 * h2);",
      );
  };
  m.customProgramCacheKey = () => "hair-shell-1";
  return m;
}

/* ------------------------------------------------------------------ */
/* mesh building                                                       */
/* ------------------------------------------------------------------ */

type Wt = [number, number][];

class Mesher {
  readonly p: number[] = [];
  readonly n: number[] = [];
  readonly uv: number[] = [];
  readonly c: number[] = [];
  readonly si: number[] = [];
  readonly sw: number[] = [];
  readonly ix: number[] = [];
  readonly extra = new Map<string, { size: number; data: number[] }>();
  constructor(readonly alpha = false) {}
  get count() {
    return this.p.length / 3;
  }
  vert(
    p: THREE.Vector3,
    n: THREE.Vector3,
    u: number,
    v: number,
    c: THREE.Color,
    a = 1,
    w: Wt = [[0, 1]],
  ) {
    this.p.push(p.x, p.y, p.z);
    this.n.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    this.c.push(c.r, c.g, c.b);
    if (this.alpha) this.c.push(a);
    const ws = w
      .filter((e) => e[1] > 1e-4)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 4);
    let tot = 0;
    for (const e of ws) tot += e[1];
    if (tot <= 0) ws.splice(0, ws.length, [0, 1]);
    for (let i = 0; i < 4; i++) {
      const e = ws[i];
      this.si.push(e ? e[0] : 0);
      this.sw.push(e ? e[1] / (tot > 0 ? tot : 1) : 0);
    }
    return this.count - 1;
  }
  attr(name: string, size: number, ...values: number[]) {
    let a = this.extra.get(name);
    if (!a) this.extra.set(name, (a = { size, data: [] }));
    a.data.push(...values);
  }
  tri(a: number, b: number, c: number) {
    this.ix.push(a, b, c);
  }
  /** Appends a ready geometry (transformed), colored per vertex and bound to one weight set. */
  geo(
    g: THREE.BufferGeometry,
    m: THREE.Matrix4 | null,
    color: THREE.Color | ((p: THREE.Vector3) => THREE.Color),
    w: Wt = [[0, 1]],
  ) {
    const src = g.index ? g : g;
    const pos = src.getAttribute("position");
    if (!src.getAttribute("normal")) src.computeVertexNormals();
    const nor = src.getAttribute("normal");
    const uv = src.getAttribute("uv");
    const nm = m ? new THREE.Matrix3().getNormalMatrix(m) : null;
    const base = this.count;
    const p = V();
    const n = V();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(nor, i);
      if (m && nm) {
        p.applyMatrix4(m);
        n.applyMatrix3(nm).normalize();
      }
      this.vert(
        p,
        n,
        uv ? uv.getX(i) : 0,
        uv ? uv.getY(i) : 0,
        typeof color === "function" ? color(p) : color,
        1,
        w,
      );
    }
    if (src.index)
      for (let i = 0; i < src.index.count; i++)
        this.ix.push(base + src.index.getX(i));
    else for (let i = 0; i < pos.count; i++) this.ix.push(base + i);
  }
  build(skinned: boolean) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(this.c, this.alpha ? 4 : 3),
    );
    if (skinned) {
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.si, 4));
      g.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(this.sw, 4),
      );
    }
    for (const [name, a] of this.extra)
      g.setAttribute(name, new THREE.Float32BufferAttribute(a.data, a.size));
    g.setIndex(
      this.count > 65535
        ? new THREE.Uint32BufferAttribute(this.ix, 1)
        : new THREE.Uint16BufferAttribute(this.ix, 1),
    );
    return g;
  }
}

type GridOpts = {
  rows: number;
  cols: number;
  wrap: boolean;
  at: (i: number, j: number) => THREE.Vector3;
  color: (p: THREE.Vector3, i: number, j: number) => THREE.Color;
  weights?: (p: THREE.Vector3, i: number, j: number) => Wt;
  uv?: (i: number, j: number) => [number, number];
  alpha?: (i: number, j: number) => number;
  /** Two-sided: also emits the back faces (for thin sheets with a one-sided material). */
  both?: boolean;
  /** Skip a quad (i, j) - (i+1, j+1). */
  skip?: (i: number, j: number) => boolean;
  extra?: (m: Mesher, p: THREE.Vector3, i: number, j: number) => void;
};

/** A rows x cols surface (optionally wrapped around), with smooth normals oriented outward. */
function grid(m: Mesher, o: GridOpts) {
  const { rows: R, cols: C } = o;
  const P: THREE.Vector3[] = [];
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) P.push(o.at(i, j));
  const N = P.map(() => V());
  const jmax = o.wrap ? C : C - 1;
  const e1 = V();
  const e2 = V();
  const fn = V();
  const face = (a: number, b: number, c: number) => {
    e1.subVectors(P[b]!, P[a]!);
    e2.subVectors(P[c]!, P[a]!);
    fn.crossVectors(e1, e2);
    N[a]!.add(fn);
    N[b]!.add(fn);
    N[c]!.add(fn);
  };
  for (let i = 0; i < R - 1; i++)
    for (let j = 0; j < jmax; j++) {
      const a = i * C + j;
      const b = i * C + ((j + 1) % C);
      const c = (i + 1) * C + j;
      const d = (i + 1) * C + ((j + 1) % C);
      face(a, c, b);
      face(b, c, d);
    }
  const center = V();
  for (const p of P) center.add(p);
  center.divideScalar(P.length);
  let s = 0;
  for (let i = 0; i < P.length; i++)
    s += N[i]!.dot(e1.subVectors(P[i]!, center));
  const flip = s < 0;
  // pole rows: average
  for (let i = 0; i < R; i++) {
    let span = 0;
    for (let j = 1; j < C; j++)
      span = Math.max(span, P[i * C + j]!.distanceToSquared(P[i * C]!));
    if (span < 1e-12) {
      const avg = V();
      for (let j = 0; j < C; j++) avg.add(N[i * C + j]!.clone().normalize());
      for (let j = 0; j < C; j++) N[i * C + j]!.copy(avg);
    }
  }
  for (const n of N) {
    if (n.lengthSq() < 1e-20) n.set(0, 1, 0);
    n.normalize();
    if (flip) n.negate();
  }
  const sides = o.both ? [false, true] : [false];
  for (const back of sides) {
    const outC = o.wrap ? C + 1 : C;
    const base = m.count;
    for (let i = 0; i < R; i++)
      for (let j = 0; j < outC; j++) {
        const jj = j % C;
        const k = i * C + jj;
        const p = P[k]!;
        const n = back ? N[k]!.clone().negate() : N[k]!;
        const [u, v] = o.uv ? o.uv(i, j) : [j / (outC - 1), i / (R - 1)];
        m.vert(
          p,
          n,
          u,
          v,
          o.color(p, i, jj),
          o.alpha ? o.alpha(i, jj) : 1,
          o.weights ? o.weights(p, i, jj) : [[0, 1]],
        );
        if (o.extra) o.extra(m, p, i, jj);
      }
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < outC - 1; j++) {
        if (o.skip && o.skip(i, j % C)) continue;
        const a = base + i * outC + j;
        const b = a + 1;
        const c = a + outC;
        const d = c + 1;
        if (flip !== back) {
          m.tri(a, b, c);
          m.tri(b, d, c);
        } else {
          m.tri(a, c, b);
          m.tri(b, c, d);
        }
      }
  }
}

/* ------------------------------------------------------------------ */
/* skeleton                                                            */
/* ------------------------------------------------------------------ */

const B = {
  root: 0,
  hips: 1,
  spine: 2,
  chest: 3,
  neck: 4,
  head: 5,
  clavL: 6,
  armL: 7,
  foreL: 8,
  handL: 9,
  clavR: 10,
  armR: 11,
  foreR: 12,
  handR: 13,
  thighL: 14,
  shinL: 15,
  footL: 16,
  thighR: 17,
  shinR: 18,
  footR: 19,
} as const;
const sideBones = (s: number) =>
  s > 0
    ? {
        clav: B.clavL,
        arm: B.armL,
        fore: B.foreL,
        hand: B.handL,
        thigh: B.thighL,
        shin: B.shinL,
        foot: B.footL,
      }
    : {
        clav: B.clavR,
        arm: B.armR,
        fore: B.foreR,
        hand: B.handR,
        thigh: B.thighR,
        shin: B.shinR,
        foot: B.footR,
      };

/* ------------------------------------------------------------------ */
/* body dimensions and surfaces                                        */
/* ------------------------------------------------------------------ */

type Dims = {
  H: number;
  k: number;
  fb: number;
  f: boolean;
  yHip: number;
  hipX: number;
  yKnee: number;
  yAnkle: number;
  yShoulder: number;
  shX: number;
  upperLen: number;
  foreLen: number;
  handLen: number;
  hs: number;
  O: THREE.Vector3;
  torsoR: (y: number, phi: number) => number;
  torsoCz: (y: number) => number;
  legR: (y: number, phi: number) => number;
  legC: (y: number, s: number) => THREE.Vector2;
  armR: (d: number, phi: number) => number;
};

const TY = [
  0.448, 0.46, 0.475, 0.495, 0.52, 0.55, 0.585, 0.62, 0.66, 0.7, 0.735, 0.765,
  0.79, 0.807, 0.822, 0.836, 0.85, 0.87, 0.895, 0.915, 0.927,
];
const TORSO = {
  m: {
    hw: [
      0.0, 0.07, 0.125, 0.152, 0.163, 0.16, 0.15, 0.146, 0.15, 0.158, 0.163,
      0.165, 0.163, 0.163, 0.152, 0.118, 0.072, 0.058, 0.055, 0.05, 0.0,
    ],
    df: [
      0.0, 0.05, 0.075, 0.085, 0.09, 0.094, 0.097, 0.1, 0.104, 0.11, 0.112,
      0.105, 0.092, 0.08, 0.064, 0.054, 0.054, 0.053, 0.05, 0.045, 0.0,
    ],
    db: [
      0.0, 0.06, 0.09, 0.105, 0.106, 0.098, 0.088, 0.085, 0.088, 0.096, 0.1,
      0.1, 0.095, 0.088, 0.074, 0.062, 0.058, 0.055, 0.05, 0.045, 0.0,
    ],
  },
  f: {
    hw: [
      0.0, 0.08, 0.14, 0.168, 0.178, 0.17, 0.145, 0.132, 0.136, 0.142, 0.146,
      0.148, 0.147, 0.147, 0.138, 0.105, 0.066, 0.053, 0.05, 0.046, 0.0,
    ],
    df: [
      0.0, 0.05, 0.075, 0.085, 0.088, 0.088, 0.085, 0.085, 0.09, 0.096, 0.098,
      0.094, 0.085, 0.075, 0.06, 0.05, 0.05, 0.049, 0.047, 0.043, 0.0,
    ],
    db: [
      0.0, 0.065, 0.1, 0.115, 0.112, 0.1, 0.085, 0.08, 0.083, 0.09, 0.094,
      0.094, 0.09, 0.083, 0.07, 0.058, 0.054, 0.051, 0.047, 0.043, 0.0,
    ],
  },
  cz: [
    0.0, 0.0, -0.004, -0.004, 0.0, 0.005, 0.008, 0.008, 0.006, 0.002, -0.004,
    -0.008, -0.012, -0.015, -0.018, -0.018, -0.014, -0.008, -0.002, 0.0, 0.0,
  ],
};
const LY = [
  0.58, 0.565, 0.545, 0.52, 0.49, 0.455, 0.42, 0.38, 0.34, 0.305, 0.285, 0.265,
  0.235, 0.2, 0.165, 0.13, 0.095, 0.065, 0.05, 0.036,
];
const LEG = {
  rx: [
    0.0, 0.055, 0.08, 0.088, 0.086, 0.082, 0.077, 0.07, 0.062, 0.054, 0.051,
    0.05, 0.052, 0.051, 0.045, 0.038, 0.032, 0.029, 0.028, 0.0,
  ],
  rf: [
    0.0, 0.055, 0.08, 0.088, 0.086, 0.083, 0.079, 0.073, 0.065, 0.058, 0.055,
    0.05, 0.046, 0.043, 0.04, 0.035, 0.031, 0.03, 0.03, 0.0,
  ],
  rb: [
    0.0, 0.055, 0.082, 0.092, 0.088, 0.08, 0.072, 0.064, 0.056, 0.05, 0.05,
    0.056, 0.062, 0.062, 0.054, 0.042, 0.034, 0.03, 0.028, 0.0,
  ],
};
const AD = [
  -0.03, -0.024, -0.016, -0.007, 0.01, 0.05, 0.1, 0.16, 0.22, 0.27, 0.305,
  0.325, 0.35, 0.39, 0.45, 0.52, 0.565, 0.582,
];
const ARM = {
  rx: [
    0.0, 0.028, 0.042, 0.05, 0.055, 0.054, 0.048, 0.046, 0.044, 0.04, 0.037,
    0.037, 0.039, 0.039, 0.034, 0.027, 0.024, 0.0,
  ],
  rz: [
    0.0, 0.032, 0.046, 0.054, 0.058, 0.058, 0.05, 0.048, 0.045, 0.041, 0.039,
    0.039, 0.042, 0.041, 0.035, 0.028, 0.026, 0.0,
  ],
};

/** Polar radius of a superellipse with half-axes a (x) and b (z). */
function superR(phi: number, a: number, b: number, n: number) {
  const c = Math.abs(Math.cos(phi));
  const s = Math.abs(Math.sin(phi));
  if (a < 1e-6 || b < 1e-6) return 0;
  return Math.pow(Math.pow(c / a, n) + Math.pow(s / b, n), -1 / n);
}

function dims(look: Look, fp = false): Dims {
  const f = !!look.female;
  const H = look.height ?? (f ? 1.65 : 1.76);
  const k = H / 1.75;
  const fb = Math.max(0, (look.build ?? 1) - 1);
  const yHip = 0.53 * H;
  const yShoulder = 0.815 * H;
  const hipX = (f ? 0.09 : 0.086) * k * (1 + fb * 0.42);
  const shX = (f ? 0.152 : 0.17) * k * (1 + fb * 0.22);
  const hs = (f ? 1.02 : 1.04) * (1 + fb * 0.1);
  const O = V(0, H - 0.127 * hs, 0.012);

  const T = f ? TORSO.f : TORSO.m;
  const ys = TY.map((v) => v * H);
  const wMul = (y: number) =>
    1 +
    fb *
      (lerp(0.62, 0.3, sstep(0.79 * H, 0.86 * H, y)) +
        (f ? 0.18 * gauss(y - 0.5 * H, 0.06 * H) : 0));
  const hwF = spline(
    ys,
    T.hw.map((v) => v * k),
  );
  const dfF = spline(
    ys,
    T.df.map((v) => v * k),
  );
  const dbF = spline(
    ys,
    T.db.map((v) => v * k),
  );
  const czF = spline(
    ys,
    TORSO.cz.map((v) => v * k),
  );
  const bust = (f ? 0.05 * (1 + fb * 1.3) : 0.01 + fb * 0.03) * (fp ? 0.6 : 1);
  const bx = (f ? 0.082 : 0.074) * k * (1 + fb * 0.3);
  const by = (f ? 0.703 : 0.716) * H;
  const bsx = (f ? 0.055 : 0.06) * (1 + fb * 0.3);
  const belly = fb * (f ? 0.06 : 0.17) * (fp ? 0.5 : 1);
  const glute = (f ? 0.036 : 0.022) * (1 + fb * 1.1);
  const torsoR = (y: number, phi: number) => {
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    const mul = wMul(y);
    const a = hwF(y) * mul;
    const bz =
      (s > 0 ? dfF(y) * (1 + fb * 0.55) : dbF(y) * (1 + fb * 0.5)) *
      (y < 0.79 * H
        ? 1
        : lerp(1, 0.7, sstep(0.79 * H, 0.86 * H, y)) +
          (0.3 * sstep(0.79 * H, 0.86 * H, y)) / mul);
    let r = superR(phi, a, bz, 2.5);
    const x = r * c;
    const front = sstep(0.05, 0.5, s);
    const back = sstep(0.05, 0.5, -s);
    // chest
    for (const side of [-1, 1]) {
      const dx = x - side * bx;
      const dy = y - by;
      r +=
        bust *
        front *
        gauss(dx, bsx) *
        gauss(dy, dy > 0 ? (f ? 0.07 : 0.055) : f ? 0.045 : 0.035);
    }
    // belly
    r += belly * front * gauss(y - 0.6 * H, 0.06 * H) * gauss(x, 0.14);
    // glutes
    for (const side of [-1, 1])
      r +=
        glute *
        back *
        gauss(x - side * 0.068 * k, 0.07) *
        gauss(y - 0.497 * H, 0.05 * H);
    // love handles
    r +=
      fb *
      0.025 *
      gauss(y - 0.575 * H, 0.04 * H) *
      sstep(0.6, 0.9, Math.abs(c));
    return Math.max(0, r);
  };

  const lys = LY.map((v) => v * H);
  const thighMul = (y: number) =>
    lerp(1 + fb * (f ? 0.95 : 0.6), 1 + fb * 0.4, sstep(0.36 * H, 0.3 * H, y)) *
    (f ? lerp(1.07, 0.98, sstep(0.36 * H, 0.3 * H, y)) : 1);
  const lrx = spline(lys.slice().reverse(), LEG.rx.map((v) => v * k).reverse());
  const lrf = spline(lys.slice().reverse(), LEG.rf.map((v) => v * k).reverse());
  const lrb = spline(lys.slice().reverse(), LEG.rb.map((v) => v * k).reverse());
  const legR = (y: number, phi: number) => {
    const m = thighMul(y);
    const s = Math.sin(phi);
    return superR(phi, lrx(y) * m, (s > 0 ? lrf(y) : lrb(y)) * m, 2.2);
  };
  const legC = (y: number, s: number) => {
    const t = sstep(yHip, 0.285 * H, y);
    const t2 = sstep(0.285 * H, 0.045 * H, y);
    return new THREE.Vector2(
      s * hipX * lerp(1, 0.8, t) * lerp(1, 0.97, t2),
      lerp(0.004, 0, t) - 0.006 * t2,
    );
  };

  const upperLen = 0.186 * H;
  const foreLen = 0.146 * H;
  const ad = AD.map((d) =>
    d <= 0.325
      ? (d * upperLen) / 0.325
      : upperLen + ((d - 0.325) * foreLen) / 0.257,
  );
  const arx = spline(
    ad,
    ARM.rx.map((v) => v * k),
  );
  const arz = spline(
    ad,
    ARM.rz.map((v) => v * k),
  );
  const armR = (d: number, phi: number) => {
    const m =
      (f ? 0.9 : 1) *
      lerp(
        1 + fb * 0.55,
        1 + fb * 0.35,
        sstep(upperLen - 0.04, upperLen + 0.04, d),
      );
    return superR(phi, arx(d) * m, arz(d) * m, 2.1);
  };

  return {
    H,
    k,
    fb,
    f,
    yHip,
    hipX,
    yKnee: 0.285 * H,
    yAnkle: 0.045 * H,
    yShoulder,
    shX,
    upperLen,
    foreLen,
    handLen: 0.108 * H,
    hs,
    O,
    torsoR,
    torsoCz: czF,
    legR,
    legC,
    armR,
  };
}

/* weights ---------------------------------------------------------- */

function torsoWeights(d: Dims, p: THREE.Vector3): Wt {
  const H = d.H;
  const y = p.y;
  const a1 = sstep(0.55 * H, 0.63 * H, y);
  const a2 = sstep(0.64 * H, 0.72 * H, y);
  const a3 = sstep(0.832 * H, 0.858 * H, y);
  const a4 = sstep(0.88 * H, 0.905 * H, y);
  const s = p.x >= 0 ? 1 : -1;
  const sb = sideBones(s);
  const ax = Math.abs(p.x);
  const arm =
    0.5 *
    sstep(0.55 * d.shX, 0.95 * d.shX, ax) *
    sstep(0.735 * H, 0.79 * H, y) *
    (1 - sstep(0.835 * H, 0.855 * H, y));
  const clav =
    0.45 *
    sstep(0.25 * d.shX, 0.7 * d.shX, ax) *
    sstep(0.77 * H, 0.815 * H, y) *
    (1 - sstep(0.84 * H, 0.86 * H, y));
  const th =
    0.8 * sstep(d.yHip + 0.03, d.yHip - 0.07, y) * sstep(0.0, 0.05, ax);
  const rest = Math.max(0, 1 - arm - clav - th);
  return [
    [B.hips, rest * (1 - a1)],
    [B.spine, rest * a1 * (1 - a2)],
    [B.chest, rest * a1 * a2 * (1 - a3)],
    [B.neck, rest * a1 * a2 * a3 * (1 - a4)],
    [B.head, rest * a1 * a2 * a3 * a4],
    [sb.arm, arm],
    [sb.clav, clav],
    [sb.thigh, th],
  ];
}

function legWeights(d: Dims, p: THREE.Vector3, s: number): Wt {
  const sb = sideBones(s);
  const tw = sstep(d.yHip + 0.05, d.yHip - 0.05, p.y);
  const sh = sstep(d.yKnee + 0.04, d.yKnee - 0.04, p.y);
  const ft = 0.6 * sstep(d.yAnkle + 0.025, d.yAnkle - 0.01, p.y);
  return [
    [B.hips, 1 - tw],
    [sb.thigh, tw * (1 - sh)],
    [sb.shin, tw * sh * (1 - ft)],
    [sb.foot, tw * sh * ft],
  ];
}

function armWeights(d: Dims, dist: number, s: number): Wt {
  const sb = sideBones(s);
  const top = 0.55 * sstep(0.03, -0.05, dist);
  const e = sstep(d.upperLen - 0.035, d.upperLen + 0.04, dist);
  const h =
    0.4 *
    sstep(d.upperLen + d.foreLen - 0.025, d.upperLen + d.foreLen + 0.005, dist);
  return [
    [sb.clav, top * 0.6],
    [B.chest, top * 0.4],
    [sb.arm, (1 - top) * (1 - e)],
    [sb.fore, (1 - top) * e * (1 - h)],
    [sb.hand, (1 - top) * e * h],
  ];
}

/* body surfaces ------------------------------------------------------ */

function torsoPoint(d: Dims, y: number, phi: number, extra = 0) {
  const r = d.torsoR(y, phi) + extra;
  return V(r * Math.cos(phi), y, d.torsoCz(y) + r * Math.sin(phi));
}

function legPoint(d: Dims, y: number, phi: number, s: number, extra = 0) {
  const c = d.legC(y, s);
  const r = d.legR(y, phi) + extra;
  return V(c.x + r * Math.cos(phi), y, c.y + r * Math.sin(phi));
}

function armPoint(d: Dims, dist: number, phi: number, s: number, extra = 0) {
  const r = d.armR(dist, phi) + extra;
  return V(
    s * d.shX + r * Math.cos(phi),
    d.yShoulder - dist,
    -0.008 + r * Math.sin(phi),
  );
}

type Cover = {
  torso: (y: number, phi: number) => number;
  arm: (dist: number) => number;
  leg: (y: number) => number;
};

/** Body skin; `cover` (0..1) shrinks it slightly where clothes sit on top, so it never pokes through. */
function buildBodySkin(
  d: Dims,
  m: Mesher,
  skin: THREE.Color,
  fp: boolean,
  cover: Cover,
) {
  const SH = 0.007;
  const H = d.H;
  const knee = tint(skin, 1.03, 0.94, 0.92);
  // torso
  const top = fp ? 0.845 * H : 0.927 * H;
  const ty = warp(
    0.448 * H,
    top,
    40,
    (y) =>
      1 +
      1.5 * gauss(y - 0.8 * H, 0.05 * H) +
      0.8 * gauss(y - 0.7 * H, 0.05 * H),
  );
  const cols = 40;
  grid(m, {
    rows: ty.length + (fp ? 3 : 0),
    cols,
    wrap: true,
    at: (i, j) => {
      const phi = (j / cols) * TAU;
      if (i >= ty.length) {
        const k = i - ty.length;
        const sc = [0.8, 0.45, 0][k]!;
        const y = top + [0.008, 0.014, 0.017][k]!;
        const r = d.torsoR(top, phi) * sc;
        return V(r * Math.cos(phi), y, d.torsoCz(top) + r * Math.sin(phi));
      }
      return torsoPoint(d, ty[i]!, phi, -SH * cover.torso(ty[i]!, phi));
    },
    color: () => skin,
    weights: (p) => torsoWeights(d, p),
  });
  // legs
  const ly = warp(
    0.036 * H,
    0.58 * H,
    34,
    (y) =>
      1 +
      1.2 * gauss(y - d.yKnee, 0.05 * H) +
      0.6 * gauss(y - d.yAnkle, 0.04 * H),
  ).reverse();
  for (const s of [-1, 1])
    grid(m, {
      rows: ly.length,
      cols: 22,
      wrap: true,
      at: (i, j) =>
        legPoint(d, ly[i]!, (j / 22) * TAU, s, -SH * cover.leg(ly[i]!)),
      color: (p) => mix(skin, knee, gauss(p.y - d.yKnee, 0.05) * 0.8),
      weights: (p) => legWeights(d, p, s),
    });
  // arms
  const total = d.upperLen + d.foreLen;
  const ad = warp(
    -0.03 * d.k,
    total + 0.002,
    34,
    (x) => 1 + 1.5 * gauss(x + 0.03, 0.04) + gauss(x - d.upperLen, 0.04),
  );
  for (const s of [-1, 1])
    grid(m, {
      rows: ad.length,
      cols: 18,
      wrap: true,
      at: (i, j) =>
        armPoint(d, ad[i]!, (j / 18) * TAU, s, -SH * cover.arm(ad[i]!)),
      color: (p) =>
        mix(skin, knee, gauss(d.yShoulder - p.y - d.upperLen, 0.04) * 0.5),
      weights: (_p, i) => armWeights(d, ad[i]!, s),
    });
}

/* ------------------------------------------------------------------ */
/* clothes                                                             */
/* ------------------------------------------------------------------ */

type TopStyle = NonNullable<Outfit["topStyle"]>;

/** Fabric radius that hangs from what is above it (drapes off the chest and belly instead of hugging them). */
function draped(
  base: (y: number) => number,
  y: number,
  yTop: number,
  slope: number,
  off: number,
) {
  let r = base(y) + off;
  const step = 0.012;
  for (let yy = y + step; yy <= yTop + 1e-6; yy += step)
    r = Math.max(r, base(yy) + off - (yy - y) * slope);
  return r;
}

function topSpec(style: TopStyle, d: Dims) {
  const H = d.H;
  const crew = (phi: number) =>
    0.842 * H -
    0.024 * H * Math.pow(Math.max(0, Math.sin(phi)), 2) +
    0.004 * H * Math.max(0, -Math.sin(phi));
  const vneck = (phi: number) =>
    crew(phi) - 0.05 * H * Math.pow(Math.max(0, Math.sin(phi)), 6);
  const tank = (phi: number) => {
    const c = Math.abs(Math.cos(phi));
    const strap = gauss(c - 0.6, 0.11);
    const arm = sstep(0.74, 0.9, c);
    const front = Math.sin(phi) > 0;
    const low = lerp(front ? 0.772 * H : 0.79 * H, 0.745 * H, arm);
    return lerp(low, 0.84 * H, strap);
  };
  const scoop = (phi: number) =>
    crew(phi) - 0.032 * H * Math.pow(Math.max(0, Math.sin(phi)), 3);
  switch (style) {
    case "tank":
      return {
        off: 0.004,
        slope: 0.7,
        hem: 0.505 * H,
        neck: tank,
        sleeve: 0,
        sleeveOff: 0,
        flare: 0,
      };
    case "dress":
      return {
        off: 0.005,
        slope: 0.6,
        hem: 0.58 * H,
        neck: tank,
        sleeve: 0,
        sleeveOff: 0,
        flare: 0,
      };
    case "blouse":
      return {
        off: 0.009,
        slope: 0.3,
        hem: 0.49 * H,
        neck: scoop,
        sleeve: 0.3 * d.upperLen,
        sleeveOff: 0.008,
        flare: 0.018,
      };
    case "jersey":
      return {
        off: 0.017,
        slope: 0.18,
        hem: 0.47 * H,
        neck: vneck,
        sleeve: 0.55 * d.upperLen,
        sleeveOff: 0.012,
        flare: 0.01,
      };
    case "hoodie":
      return {
        off: 0.016,
        slope: 0.22,
        hem: 0.485 * H,
        neck: (phi: number) => crew(phi) + 0.006 * H,
        sleeve: d.upperLen + d.foreLen - 0.025,
        sleeveOff: 0.01,
        flare: 0.003,
      };
    default:
      return {
        off: 0.008,
        slope: 0.32,
        hem: 0.5 * H,
        neck: crew,
        sleeve: 0.42 * d.upperLen,
        sleeveOff: 0.007,
        flare: 0.008,
      };
  }
}

function buildTop(
  d: Dims,
  m: Mesher,
  outfit: Outfit,
  fp: boolean,
  deco: Mesher | null,
) {
  const style: TopStyle = outfit.topStyle ?? "tshirt";
  const spec = topSpec(style, d);
  const base = col(outfit.top);
  const H = d.H;
  const cols = 48;
  const rows = 30;
  const loose = 0.004 * d.fb;
  const radius = (y: number, phi: number) => {
    const yTop = spec.neck(phi);
    let r = draped(
      (yy) => d.torsoR(yy, phi),
      y,
      yTop,
      spec.slope,
      spec.off + loose,
    );
    if (y < 0.61 * H) r += 0.013 * sstep(0.61 * H, 0.58 * H, y);
    return r;
  };
  const neckCap = fp ? 0.836 * H : Infinity;
  const rowY = (i: number, phi: number) => {
    const y0 =
      spec.hem -
      (style === "jersey" || style === "hoodie"
        ? 0
        : 0.006 * H * Math.max(0, -Math.sin(phi)));
    const y1 = Math.min(spec.neck(phi), neckCap);
    return lerp(y0, y1, i / (rows - 1));
  };
  grid(m, {
    rows: rows + 2,
    cols,
    wrap: true,
    at: (i, j) => {
      const phi = (j / cols) * TAU;
      const ii = clamp(i - 1, 0, rows - 1);
      const y = rowY(ii, phi);
      const r = radius(y, phi);
      const inset = i === 0 || i === rows + 1 ? -0.004 : 0;
      const lift = i === 0 ? 0.004 : i === rows + 1 ? -0.004 : 0;
      return V(
        (r + inset) * Math.cos(phi),
        y + lift,
        d.torsoCz(y) + (r + inset) * Math.sin(phi),
      );
    },
    color: (p, i) => {
      let c = base;
      if (style === "hoodie" && (i <= 3 || i >= rows))
        c = tint(base, 0.85, 0.85, 0.85);
      if (style === "jersey" && i >= rows - 1)
        c = col(outfit.printColor ?? "#ff8a1f");
      return c;
    },
    weights: (p) => torsoWeights(d, p),
    uv: (i, j) => [(j / cols) * 1.0, i * 0.02],
  });
  // sleeves
  if (spec.sleeve > 0) {
    const ad = warp(-0.038 * d.k, spec.sleeve, 16, () => 1);
    for (const s of [-1, 1]) {
      grid(m, {
        rows: ad.length + 1,
        cols: 20,
        wrap: true,
        at: (i, j) => {
          const phi = (j / 20) * TAU;
          const dist = ad[Math.min(i, ad.length - 1)]!;
          const fl = spec.flare * sstep(0, spec.sleeve, dist);
          const rr = draped(
            (dd) => d.armR(-dd, phi),
            -dist,
            0.038,
            0.25,
            spec.sleeveOff + fl + 0.004 * d.fb,
          );
          const r = i === ad.length ? rr - 0.005 : rr;
          return armPoint(
            d,
            dist - (i === ad.length ? 0.004 : 0),
            phi,
            s,
            r - d.armR(dist, phi),
          );
        },
        color: (_p, i) => {
          if (style === "jersey" && outfit.printColor) {
            const t = ad[Math.min(i, ad.length - 1)]! / spec.sleeve;
            if ((t > 0.72 && t < 0.79) || (t > 0.84 && t < 0.91))
              return col(outfit.printColor);
          }
          if (style === "hoodie" && i >= ad.length - 2)
            return tint(base, 0.85, 0.85, 0.85);
          return base;
        },
        weights: (_p, i) => armWeights(d, ad[Math.min(i, ad.length - 1)]!, s),
        uv: (i, j) => [(j / 20) * 0.35, i * 0.02],
      });
    }
  }
  // jersey numbers (front and back), conforming decals
  if (outfit.print && deco) {
    for (const back of [false, true]) {
      const y0 = back ? 0.64 * H : 0.665 * H;
      const y1 = back ? 0.79 * H : 0.765 * H;
      const span = back ? 0.62 : 0.5;
      const c0 = back ? -Math.PI / 2 : Math.PI / 2;
      grid(deco, {
        rows: 12,
        cols: 12,
        wrap: false,
        at: (i, j) => {
          const phi = c0 + (back ? 1 : -1) * (j / 11 - 0.5) * span;
          const y = lerp(y0, y1, i / 11);
          const r = radius(y, phi) + 0.0018;
          return V(r * Math.cos(phi), y, d.torsoCz(y) + r * Math.sin(phi));
        },
        color: () => new THREE.Color(1, 1, 1),
        weights: (p) => torsoWeights(d, p),
        uv: (i, j) => [j / 11, i / 11],
      });
    }
  }
  return radius;
}

function buildBottom(d: Dims, m: Mesher, outfit: Outfit, fp: boolean) {
  const H = d.H;
  const dress = outfit.topStyle === "dress";
  const style = dress ? "skirt" : (outfit.bottomStyle ?? "jeans");
  const baseCol = col(dress ? outfit.top : outfit.bottom);
  const cols = 44;
  if (style === "skirt") {
    // waist to hem cone with soft folds; front follows the thighs when walking and sitting
    const yTop = dress ? 0.6 * H : 0.585 * H;
    const hem = dress ? 0.29 * H : 0.37 * H;
    const rows = 26;
    const seed = hash(outfit.top.length + outfit.bottom.length);
    grid(m, {
      rows: rows + 1,
      cols: 56,
      wrap: true,
      at: (i, j) => {
        const phi = (j / 56) * TAU;
        const ii = Math.min(i, rows - 1);
        const y = lerp(yTop, hem, ii / (rows - 1));
        const body = draped(
          (yy) =>
            Math.max(
              d.torsoR(Math.max(yy, 0.47 * H), phi),
              legEnvelope(d, yy, phi),
            ),
          y,
          yTop,
          0.3,
          0.008,
        );
        const t = sstep(d.yHip, hem, y);
        const fold =
          1 +
          0.07 * t * Math.sin(9 * phi + seed * 6) +
          0.03 * t * Math.sin(17 * phi + seed * 3);
        let r = (body + t * 0.07 * (dress ? 1 : 0.6)) * fold;
        if (i === rows) r -= 0.004;
        return V(
          r * Math.cos(phi),
          y + (i === rows ? 0.004 : 0),
          d.torsoCz(Math.max(y, 0.47 * H)) * (1 - t) + r * Math.sin(phi),
        );
      },
      color: () => baseCol,
      weights: (p) => skirtWeights(d, p, yTop),
      uv: (i, j) => [j / 56, i * 0.02],
    });
    if (dress) return;
  }
  // briefs / pants top (crotch to waist)
  const waist = (phi: number) =>
    style === "skirt"
      ? 0.5 * H
      : 0.585 * H -
        0.012 * H * Math.max(0, Math.sin(phi)) +
        0.004 * H * Math.max(0, -Math.sin(phi));
  const off = style === "jeans" ? 0.006 : style === "pants" ? 0.008 : 0.01;
  const rows = 18;
  const belt = !d.f && (style === "jeans" || style === "pants");
  grid(m, {
    rows: rows + 1,
    cols,
    wrap: true,
    at: (i, j) => {
      const phi = (j / cols) * TAU;
      const yTop = waist(phi);
      const y = lerp(0.448 * H, yTop, Math.min(i, rows - 1) / (rows - 1));
      let r = draped((yy) => d.torsoR(yy, phi), y, yTop, 0.5, off);
      if (i >= rows - 3) r += belt ? 0.004 : 0.002;
      if (i === rows) r -= 0.006;
      return V(r * Math.cos(phi), y, d.torsoCz(y) + r * Math.sin(phi));
    },
    color: (_p, i) =>
      belt && i >= rows - 3
        ? col("#2a1d16")
        : i >= rows - 3
          ? tint(baseCol, 0.9, 0.9, 0.9)
          : baseCol,
    weights: (p) => torsoWeights(d, p),
    uv: (i, j) => [(j / cols) * 1.0, i * 0.02],
  });
  if (style === "skirt") return;
  // legs
  const hem = style === "shorts" ? (d.f ? 0.405 * H : 0.335 * H) : 0.05 * H;
  const legOff = style === "shorts" ? 0.016 : off;
  const ly = warp(
    hem,
    0.57 * H,
    30,
    (y) => 1 + gauss(y - d.yKnee, 0.05 * H),
  ).reverse();
  const kneeR = (phi: number) => d.legR(d.yKnee, phi);
  for (const s of [-1, 1]) {
    grid(m, {
      rows: ly.length + 1,
      cols: 24,
      wrap: true,
      at: (i, j) => {
        const phi = (j / 24) * TAU;
        const y = ly[Math.min(i, ly.length - 1)]!;
        let r = draped((yy) => d.legR(yy, phi), y, 0.57 * H, 0.45, legOff);
        if (style !== "shorts" && y < d.yKnee)
          r = Math.max(
            r,
            kneeR(phi) * 0.92 + off + 0.008 * sstep(d.yKnee, 0.1 * H, y),
          );
        if (style !== "shorts")
          r +=
            0.006 *
            sstep(0.14 * H, 0.06 * H, y) *
            (1 + 0.5 * Math.sin(phi * 5 + y * 90));
        if (style === "shorts") r += 0.01 * sstep(0.45 * H, hem, y);
        if (i === ly.length) r -= 0.005;
        const c = d.legC(y, s);
        return V(
          c.x + r * Math.cos(phi),
          y + (i === ly.length ? 0.004 : 0),
          c.y + r * Math.sin(phi),
        );
      },
      color: (p, i) => {
        if (i >= ly.length - 1) return tint(baseCol, 0.85, 0.85, 0.85);
        // faded thighs and knees for denim
        if (style === "jeans")
          return mix(
            baseCol,
            tint(baseCol, 1.35, 1.35, 1.25),
            0.5 * gauss(p.y - 0.45 * H, 0.06 * H) +
              0.25 * gauss(p.y - d.yKnee, 0.04 * H),
          );
        return baseCol;
      },
      weights: (p) => legWeights(d, p, s),
      uv: (i, j) => [(j / 24) * 0.5, i * 0.03],
    });
  }
  void fp;
}

/** Outer bound of both legs at height y in direction phi (for skirts). */
function legEnvelope(d: Dims, y: number, phi: number) {
  let best = 0;
  for (const s of [-1, 1]) {
    const c = d.legC(y, s);
    const dirx = Math.cos(phi);
    const dirz = Math.sin(phi);
    // farthest point of the leg's circle along the ray
    const proj = c.x * dirx + c.y * dirz;
    const r = d.legR(y, phi);
    best = Math.max(best, proj + r);
  }
  return best;
}

function skirtWeights(d: Dims, p: THREE.Vector3, yTop: number): Wt {
  const H = d.H;
  const t = sstep(d.yHip + 0.02, d.yHip - 0.16, p.y);
  const front = sstep(-0.05, 0.12, p.z);
  const thighs = t * (0.3 + 0.62 * front);
  const l = sstep(-0.05, 0.05, p.x);
  const hip = 1 - thighs;
  const w = torsoWeights(d, V(p.x, Math.max(p.y, 0.5 * H), p.z)).map(
    ([b, x]) => [b, x * hip] as [number, number],
  );
  void yTop;
  return [...w, [B.thighL, thighs * l], [B.thighR, thighs * (1 - l)]];
}

/* ------------------------------------------------------------------ */
/* hands and feet (rigid, in bone space)                               */
/* ------------------------------------------------------------------ */

/** Left hand in hand-bone space: wrist at origin, fingers along -Y, palm toward -X, thumb toward +Z. */
function handGeometry(
  d: Dims,
  skin: THREE.Color,
  nails: string | undefined,
  curl: number,
  thumbCurl: number,
) {
  const m = new Mesher();
  const hk = (d.handLen / 0.19) * 1;
  const wk = 1 + d.fb * 0.18;
  const palmCol = tint(skin, 1.04, 0.97, 0.95);
  const knuckle = tint(skin, 1.0, 0.9, 0.88);
  const nailCol = nails ? col(nails) : tint(skin, 1.08, 0.95, 0.95);
  const pl = 0.098 * hk;
  // palm
  const py = [
    0.012, 0.0, -0.015, -0.035, -0.055, -0.075, -0.09, -0.1, -0.106,
  ].map((v) => v * hk);
  const pw = [0.0, 0.026, 0.032, 0.039, 0.043, 0.044, 0.043, 0.036, 0.0];
  const pp = [0.0, 0.016, 0.018, 0.018, 0.017, 0.016, 0.014, 0.011, 0.0];
  const pb = [0.0, 0.012, 0.012, 0.011, 0.01, 0.01, 0.0095, 0.0085, 0.0];
  grid(m, {
    rows: py.length,
    cols: 18,
    wrap: true,
    at: (i, j) => {
      const phi = (j / 18) * TAU;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const end = i === 0 || i === py.length - 1;
      const w = pw[i]! * wk * (end ? 0 : 1);
      const th = (c < 0 ? pp[i]! : pb[i]!) * wk;
      // thenar bulge (palm side toward thumb)
      const thenar =
        c < 0
          ? 0.006 * gauss(py[i]! + 0.035 * hk, 0.025) * sstep(0, 0.8, sn) * -c
          : 0;
      const r = superR(phi, th + thenar, w, 2.6);
      const x = r * c;
      const z = r * sn;
      return V(x, py[i]! - (end && i > 0 ? 0 : 0), z);
    },
    color: (p) => (p.x < -0.004 ? palmCol : skin),
  });
  // fingers
  const fz = [0.03, 0.0105, -0.0085, -0.026].map((v) => v * wk);
  const fy = [-0.094, -0.099, -0.096, -0.088].map((v) => v * hk);
  const fl = [0.072, 0.08, 0.075, 0.06].map((v) => v * hk);
  const fr = [0.0095, 0.0098, 0.0092, 0.0082].map((v) => v * wk);
  const spread = [0.08, 0.02, -0.04, -0.1];
  const finger = (
    base: THREE.Vector3,
    dir0: THREE.Vector3,
    palmN: THREE.Vector3,
    lens: number[],
    angs: number[],
    r0: number,
    r1: number,
  ) => {
    const pts: THREE.Vector3[] = [base.clone()];
    const dirs: THREE.Vector3[] = [];
    let dir = dir0.clone().normalize();
    let p = base.clone();
    const samples = 4;
    for (let sgi = 0; sgi < lens.length; sgi++) {
      const axis = new THREE.Vector3().crossVectors(dir, palmN).normalize();
      dir = dir.clone().applyAxisAngle(axis, angs[sgi]!);
      for (let k = 1; k <= samples; k++) {
        p = p.clone().addScaledVector(dir, lens[sgi]! / samples);
        pts.push(p);
      }
    }
    for (let i = 0; i < pts.length; i++)
      dirs.push(
        pts[Math.min(pts.length - 1, i + 1)]!.clone()
          .sub(pts[Math.max(0, i - 1)]!)
          .normalize(),
      );
    const total = lens.reduce((a, b) => a + b, 0);
    const rows = pts.length + 2;
    const cols = 10;
    grid(m, {
      rows,
      cols,
      wrap: true,
      at: (i, j) => {
        const phi = (j / cols) * TAU;
        if (i >= pts.length) {
          // rounded tip
          const last = pts[pts.length - 1]!;
          const dd = dirs[dirs.length - 1]!;
          const n1 = palmN
            .clone()
            .addScaledVector(dd, -palmN.dot(dd))
            .normalize();
          const n2 = new THREE.Vector3().crossVectors(dd, n1);
          const f = i === pts.length ? 0.72 : 0;
          const rr = r1 * f;
          return last
            .clone()
            .addScaledVector(dd, i === pts.length ? r1 * 0.55 : r1 * 0.85)
            .addScaledVector(n1, Math.cos(phi) * rr * 0.85)
            .addScaledVector(n2, Math.sin(phi) * rr);
        }
        const c = pts[i]!;
        const dd = dirs[i]!;
        const n1 = palmN
          .clone()
          .addScaledVector(dd, -palmN.dot(dd))
          .normalize();
        const n2 = new THREE.Vector3().crossVectors(dd, n1);
        const t = i / (pts.length - 1);
        let r = lerp(r0, r1, t);
        // joints slightly thicker
        r *=
          1 +
          0.08 *
            (gauss(t - lens[0]! / total, 0.06) +
              gauss(t - (lens[0]! + lens[1]!) / total, 0.05));
        const flat = Math.cos(phi) > 0 ? 0.92 : 0.8;
        return c
          .clone()
          .addScaledVector(n1, Math.cos(phi) * r * flat)
          .addScaledVector(n2, Math.sin(phi) * r);
      },
      color: (p, i, j) => {
        const phi = (j / cols) * TAU;
        const t = i / (pts.length - 1);
        // nail on the back (away from the palm) of the last 30%
        if (t > 0.74 && Math.cos(phi) < -0.35) return nailCol;
        if (Math.cos(phi) > 0.3) return palmCol;
        if (gauss(t - lens[0]! / total, 0.07) > 0.5 && Math.cos(phi) < 0)
          return knuckle;
        void p;
        return skin;
      },
    });
  };
  for (let f = 0; f < 4; f++) {
    const base = V(-0.002, fy[f]! + 0.012, fz[f]!);
    const dir0 = V(0, -1, spread[f]! * 0.6);
    const L = fl[f]!;
    finger(
      base,
      dir0,
      V(-1, 0, 0),
      [0.012 + L * 0.44, L * 0.3, L * 0.26],
      [curl * 0.25, curl * 0.62, curl * 0.4],
      fr[f]!,
      fr[f]! * 0.8,
    );
  }
  // thumb
  finger(
    V(-0.008, -0.022 * hk, 0.03 * wk),
    V(-0.42, -0.6, 0.68),
    V(-0.55, 0, -0.85).normalize(),
    [0.042 * hk, 0.032 * hk, 0.028 * hk],
    [thumbCurl * 0.15, thumbCurl * 0.35, thumbCurl * 0.35],
    0.014 * wk,
    0.0095 * wk,
  );
  void pl;
  return m.build(false);
}

function mirrorX(g: THREE.BufferGeometry) {
  const out = g.clone();
  out.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  const idx = out.getIndex();
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
    idx.needsUpdate = true;
  }
  return out;
}

/** Shoe (or bare foot in a flip-flop) in foot-bone space: ankle at origin, toes toward +Z, ground at y = -yAnkle. */
function footGeometry(
  d: Dims,
  skin: THREE.Color,
  shoeColor: string,
  sandal: boolean,
  nails: string | undefined,
) {
  const m = new Mesher();
  const g = -d.yAnkle;
  const L = (d.f ? 0.148 : 0.152) * d.H + (sandal ? 0 : 0.02);
  const z0 = -0.058 * d.k - (sandal ? 0 : 0.01);
  const wk = (1 + d.fb * 0.12) * d.k;
  const shoe = col(shoeColor);
  const light = shoe.r + shoe.g + shoe.b > 1.8;
  const sole = light ? col("#f4f2ee") : col("#ece8e0");
  const ts = [0, 0.04, 0.12, 0.25, 0.4, 0.55, 0.68, 0.8, 0.9, 0.96, 1];
  if (!sandal) {
    const w = spline(
      ts,
      [
        0.0, 0.029, 0.036, 0.039, 0.042, 0.047, 0.05, 0.049, 0.043, 0.032, 0.0,
      ].map((v) => v * wk),
    );
    const top = spline(
      ts,
      [
        0.074, 0.086, 0.09, 0.084, 0.07, 0.058, 0.05, 0.044, 0.039, 0.034,
        0.028,
      ],
    );
    const bot = 0.024;
    const rows = 26;
    const cols = 20;
    const tAt = warp(
      0,
      1,
      rows - 1,
      (t) => 1 + 2 * gauss(t, 0.06) + 2 * gauss(1 - t, 0.08),
    );
    grid(m, {
      rows,
      cols,
      wrap: true,
      at: (i, j) => {
        const t = tAt[i]!;
        const phi = (j / cols) * TAU;
        const end = Math.min(
          1,
          Math.sqrt(t / 0.04 + 1e-9),
          Math.sqrt((1 - t) / 0.06 + 1e-9),
        );
        const hy = ((top(t) - bot) / 2) * (0.35 + 0.65 * end);
        const yc = g + bot + hy;
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const ww = w(t);
        const x = ww * Math.sign(c) * Math.pow(Math.abs(c), 0.7);
        const y =
          yc + hy * Math.sign(s) * Math.pow(Math.abs(s), s < 0 ? 0.4 : 0.9);
        return V(x, y, z0 + t * L);
      },
      color: (p, i, j) => {
        const t = tAt[i]!;
        const phi = (j / cols) * TAU;
        const up = Math.sin(phi) > 0.75;
        // laces across the instep
        if (up && t > 0.38 && t < 0.66 && Math.abs(Math.cos(phi)) < 0.32)
          return Math.floor(t * 40) % 2 === 0
            ? col("#f2f2f0")
            : tint(shoe, 0.8, 0.8, 0.8);
        // collar opening
        if (up && t < 0.36 && Math.abs(Math.cos(phi)) < 0.6)
          return col("#1c1c1e");
        // heel tab and side stripe
        if (t < 0.1) return tint(shoe, 0.75, 0.75, 0.78);
        if (Math.abs(p.y - (g + 0.045)) < 0.006 && t > 0.3 && t < 0.75)
          return light ? col("#c9ccd2") : tint(shoe, 1.25, 1.25, 1.25);
        return shoe;
      },
    });
    // sole
    const sw = spline(
      ts,
      [
        0.0, 0.034, 0.041, 0.043, 0.046, 0.051, 0.054, 0.053, 0.047, 0.036, 0.0,
      ].map((v) => v * wk),
    );
    grid(m, {
      rows: 22,
      cols: 18,
      wrap: true,
      at: (i, j) => {
        const t = clamp(i / 21, 0, 1) * 1.02 - 0.01;
        const tt = clamp(t, 0, 1);
        const phi = (j / 18) * TAU;
        const end = Math.min(
          1,
          Math.sqrt(tt / 0.03 + 1e-9),
          Math.sqrt((1 - tt) / 0.05 + 1e-9),
        );
        const lift = 0.014 * sstep(0.82, 1, tt);
        const c = Math.cos(phi);
        const s = Math.sin(phi);
        const ww = sw(tt) * Math.min(1, end * 1.4);
        const h = 0.013 * (0.4 + 0.6 * end);
        return V(
          ww * Math.sign(c) * Math.pow(Math.abs(c), 0.5),
          g + h + lift + h * Math.sign(s) * Math.pow(Math.abs(s), 0.5),
          z0 - 0.004 + tt * (L + 0.008),
        );
      },
      color: (p) => (p.y < g + 0.008 ? tint(sole, 0.75, 0.75, 0.75) : sole),
    });
    return m.build(false);
  }
  // bare foot
  const fw = spline(
    ts,
    [
      0.0, 0.026, 0.032, 0.034, 0.037, 0.042, 0.045, 0.044, 0.036, 0.024, 0.0,
    ].map((v) => v * wk),
  );
  const ftop = spline(
    ts,
    [0.05, 0.065, 0.074, 0.07, 0.056, 0.044, 0.034, 0.027, 0.023, 0.02, 0.016],
  );
  const bot = 0.012;
  const flip = col(shoeColor);
  grid(m, {
    rows: 24,
    cols: 18,
    wrap: true,
    at: (i, j) => {
      const t = i / 23;
      const phi = (j / 18) * TAU;
      const end = Math.min(
        1,
        Math.sqrt(t / 0.05 + 1e-9),
        Math.sqrt((1 - t) / 0.12 + 1e-9),
      );
      const hy = ((ftop(t) - bot) / 2) * (0.4 + 0.6 * end);
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      return V(
        fw(t) * Math.sign(c) * Math.pow(Math.abs(c), 0.8),
        g +
          bot +
          hy +
          hy * Math.sign(s) * Math.pow(Math.abs(s), s < 0 ? 0.4 : 1),
        z0 + t * L * 0.86,
      );
    },
    color: () => skin,
  });
  // toes
  const toeNail = nails ? col(nails) : tint(skin, 1.06, 0.96, 0.95);
  const tx = [-0.026, -0.008, 0.008, 0.021, 0.032].map((v) => v * wk);
  const tl = [0.034, 0.03, 0.026, 0.022, 0.018];
  const tr = [0.012, 0.0085, 0.008, 0.0075, 0.007];
  for (let i = 0; i < 5; i++) {
    const zBase = z0 + L * (0.8 - i * 0.012 - (i > 0 ? 0.02 : 0));
    const zEnd = zBase + tl[i]!;
    grid(m, {
      rows: 8,
      cols: 10,
      wrap: true,
      at: (r, j) => {
        const t = r / 7;
        const phi = (j / 10) * TAU;
        const rr =
          tr[i]! *
          Math.sqrt(Math.max(0, 1 - Math.pow(t, 3))) *
          (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, t * 1.5)));
        return V(
          tx[i]! + rr * Math.cos(phi),
          g + bot + tr[i]! * 0.9 + rr * 0.8 * Math.sin(phi) - t * 0.004,
          lerp(zBase, zEnd, t),
        );
      },
      color: (_p, r, j) =>
        r >= 4 && Math.sin((j / 10) * TAU) > 0.4 ? toeNail : skin,
    });
  }
  // flip-flop sole and strap
  const sw = spline(
    ts,
    [0.0, 0.032, 0.038, 0.04, 0.044, 0.05, 0.054, 0.054, 0.048, 0.036, 0.0].map(
      (v) => v * wk,
    ),
  );
  grid(m, {
    rows: 20,
    cols: 16,
    wrap: true,
    at: (i, j) => {
      const t = i / 19;
      const phi = (j / 16) * TAU;
      const end = Math.min(
        1,
        Math.sqrt(t / 0.03 + 1e-9),
        Math.sqrt((1 - t) / 0.05 + 1e-9),
      );
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      return V(
        sw(t) *
          Math.min(1, end * 1.3) *
          Math.sign(c) *
          Math.pow(Math.abs(c), 0.4),
        g + 0.006 + 0.006 * Math.sign(s) * Math.pow(Math.abs(s), 0.4),
        z0 - 0.006 + t * (L + 0.012),
      );
    },
    color: (p) => (p.y > g + 0.009 ? tint(flip, 1.1, 1.1, 1.1) : flip),
  });
  const strap = new THREE.CatmullRomCurve3([
    V(-0.044 * wk, g + 0.013, z0 + L * 0.5),
    V(-0.022 * wk, g + 0.04, z0 + L * 0.6),
    V(-0.016 * wk, g + 0.03, z0 + L * 0.76),
    V(-0.017 * wk, g + 0.013, z0 + L * 0.79),
  ]);
  const strap2 = new THREE.CatmullRomCurve3([
    V(0.046 * wk, g + 0.013, z0 + L * 0.48),
    V(0.02 * wk, g + 0.042, z0 + L * 0.6),
    V(-0.014 * wk, g + 0.03, z0 + L * 0.76),
    V(-0.017 * wk, g + 0.013, z0 + L * 0.79),
  ]);
  for (const c of [strap, strap2])
    m.geo(new THREE.TubeGeometry(c, 16, 0.0045, 6, false), null, flip);
  return m.build(false);
}

/* ------------------------------------------------------------------ */
/* head                                                                */
/* ------------------------------------------------------------------ */

type Face = {
  w: number;
  jaw: number;
  cheek: number;
  nose: number;
  lip: number;
  mouth: number;
  brow: number;
  chin: number;
  neck: number;
};

function sdEll(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
) {
  const px = (x - cx) / rx;
  const py = (y - cy) / ry;
  const pz = (z - cz) / rz;
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const k1 = Math.sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2);
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
function sdCone(
  x: number,
  y: number,
  z: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  ra: number,
  rb: number,
) {
  const pax = x - ax;
  const pay = y - ay;
  const paz = z - az;
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const h = clamp(
    (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz),
    0,
    1,
  );
  return (
    Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - lerp(ra, rb, h)
  );
}
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

type HeadModel = {
  sdf: (x: number, y: number, z: number, ears?: boolean) => number;
  eye: THREE.Vector3;
  lipSdf: (x: number, y: number, z: number) => number;
};

function headModel(face: Face, hs: number): HeadModel {
  const W = face.w;
  const ex = 0.0318 * Math.sqrt(W);
  const ey = 0.008;
  const ez = 0.0728;
  const lip = (x: number, y: number, z: number) => {
    const u = sdEll(
      x,
      y,
      z,
      0,
      -0.0458,
      0.0962,
      0.0215 * face.mouth,
      0.0064 * face.lip,
      0.0108,
    );
    const l = sdEll(
      x,
      y,
      z,
      0,
      -0.0585,
      0.0942,
      0.0195 * face.mouth,
      0.0078 * face.lip,
      0.0108,
    );
    return smin(u, l, 0.005);
  };
  const raw = (x: number, y: number, z: number, ears: boolean) => {
    let d = sdEll(x, y, z, 0, 0.03, -0.01, 0.073 * W, 0.097, 0.099);
    d = smin(
      d,
      sdEll(
        x,
        y,
        z,
        0,
        -0.028,
        0.02,
        0.063 * W * Math.sqrt(face.cheek),
        0.068,
        0.07,
      ),
      0.03,
    );
    d = smin(
      d,
      sdEll(
        x,
        y,
        z,
        0,
        -0.062 + 0.004 * (1 - face.chin),
        0.03,
        0.05 * W * face.jaw,
        0.04 * face.chin,
        0.056,
      ),
      0.03,
    );
    d = smin(
      d,
      sdEll(
        x,
        y,
        z,
        0,
        -0.085 * face.chin,
        0.07,
        0.02 * face.chin,
        0.019,
        0.019,
      ),
      0.022,
    );
    for (const s of [-1, 1]) {
      d = smin(
        d,
        sdEll(
          x,
          y,
          z,
          s * 0.042 * W,
          -0.024,
          0.055,
          0.026 * face.cheek,
          0.027 * face.cheek,
          0.026,
        ),
        0.022,
      );
      d = smin(
        d,
        sdEll(x, y, z, s * 0.05 * W, -0.003, 0.052, 0.022, 0.013, 0.022),
        0.015,
      );
    }
    d = smin(
      d,
      sdEll(x, y, z, 0, 0.034, 0.079, 0.052 * W, 0.014, 0.017 * face.brow),
      0.015,
    );
    d = smin(d, sdEll(x, y, z, 0, -0.046, 0.077, 0.033, 0.03, 0.026), 0.016);
    // nose
    const nk = face.nose;
    let n = sdCone(
      x,
      y,
      z,
      0,
      0.016,
      0.0885,
      0,
      -0.016,
      0.107 + 0.006 * (nk - 1),
      0.0055 * nk,
      0.0088 * nk,
    );
    n = smin(
      n,
      sdEll(
        x,
        y,
        z,
        0,
        -0.021,
        0.1075 + 0.008 * (nk - 1),
        0.011 * nk,
        0.0098 * nk,
        0.0102 * nk,
      ),
      0.006,
    );
    for (const s of [-1, 1])
      n = smin(
        n,
        sdEll(
          x,
          y,
          z,
          s * 0.013 * nk,
          -0.026,
          0.099,
          0.0084 * nk,
          0.0074,
          0.0088,
        ),
        0.005,
      );
    d = smin(d, n, 0.008);
    d = smin(d, lip(x, y, z), 0.006);
    // mouth line
    d = smax(
      d,
      -sdEll(x, y, z, 0, -0.0518, 0.104, 0.0212 * face.mouth, 0.0011, 0.014),
      0.0018,
    );
    // eye sockets
    for (const s of [-1, 1])
      d = smax(d, -(Math.hypot(x - s * ex, y - ey, z - ez) - 0.0134), 0.004);
    // neck
    d = smin(
      d,
      sdCone(
        x,
        y,
        z,
        0,
        -0.04,
        -0.022,
        0,
        -0.17,
        -0.012,
        0.054 * face.neck,
        0.058 * face.neck,
      ),
      0.03,
    );
    if (ears)
      for (const s of [-1, 1])
        d = smin(
          d,
          sdEll(x, y, z, s * 0.078 * W, -0.004, -0.014, 0.014, 0.033, 0.021),
          0.01,
        );
    return d;
  };
  return {
    sdf: (x, y, z, ears = false) => raw(x / hs, y / hs, z / hs, ears) * hs,
    eye: V(ex * hs, ey * hs, ez * hs),
    lipSdf: (x, y, z) => lip(x / hs, y / hs, z / hs) * hs,
  };
}

/** Outer surface point along a ray from origin o in direction dir (marching inward from far). */
function march(
  sdf: (x: number, y: number, z: number) => number,
  o: THREE.Vector3,
  dir: THREE.Vector3,
  tMax = 0.36,
) {
  let t = tMax;
  let d = sdf(o.x + dir.x * t, o.y + dir.y * t, o.z + dir.z * t);
  let last = 0;
  for (let i = 0; i < 200 && d > 0.00015; i++) {
    last = Math.max(d * 0.8, 0.0003);
    t -= last;
    if (t <= 0) return 0;
    d = sdf(o.x + dir.x * t, o.y + dir.y * t, o.z + dir.z * t);
  }
  if (d < 0) {
    let lo = t;
    let hi = t + last;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (sdf(o.x + dir.x * mid, o.y + dir.y * mid, o.z + dir.z * mid) > 0)
        hi = mid;
      else lo = mid;
    }
    t = (lo + hi) / 2;
  }
  return t;
}

function sdfNormal(
  sdf: (x: number, y: number, z: number) => number,
  p: THREE.Vector3,
  e = 0.0006,
) {
  return V(
    sdf(p.x + e, p.y, p.z) - sdf(p.x - e, p.y, p.z),
    sdf(p.x, p.y + e, p.z) - sdf(p.x, p.y - e, p.z),
    sdf(p.x, p.y, p.z + e) - sdf(p.x, p.y, p.z - e),
  ).normalize();
}

const deg = (r: number) => (r * 180) / Math.PI;

/** Hairline height (head space, before scale) as a function of |azimuth| from the front, degrees. */
const hairline = spline(
  [0, 18, 34, 48, 60, 68, 74, 80, 88, 108, 122, 140, 160, 180],
  [
    0.074, 0.075, 0.071, 0.058, 0.034, 0.0, -0.016, -0.012, 0.03, 0.03, -0.02,
    -0.058, -0.068, -0.07,
  ],
);
/** Upper edge of a beard (head space), same azimuth convention. */
const beardTop = spline(
  [0, 10, 18, 28, 40, 55, 66, 74, 82],
  [-0.0345, -0.036, -0.034, -0.032, -0.03, -0.022, -0.013, -0.007, -0.002],
);

type HeadPack = {
  group: THREE.Group;
  eyes: THREE.Mesh[];
  lids: THREE.Group[];
  lidRest: number[];
};

/** Builds the head group (head-local space: origin between the ears, face toward +Z). */
function buildHead(
  look: Look,
  face: Face,
  hs: number,
  skin: THREE.Color,
  mats: { skin: THREE.Material },
  female: boolean,
  lite = false,
): HeadPack {
  const model = headModel(face, hs);
  const sdf = (x: number, y: number, z: number) => model.sdf(x, y, z);
  const hair = col(look.hair);
  const E = model.eye;
  const style = look.hairStyle ?? (female ? "long" : "short");
  const lipsCol = female
    ? tint(skin, 0.98, 0.62, 0.64)
    : tint(skin, 0.92, 0.66, 0.64);
  const blushCol = tint(skin, 1.0, 0.8, 0.78);

  const browCurve = (t: number, s: number) => {
    const x = s * lerp(0.012, 0.061, t) * hs;
    const y =
      (0.024 + 0.011 * Math.sin(Math.PI * Math.pow(t, 0.75)) - 0.004 * t) * hs +
      E.y;
    return { x, y };
  };
  const browDist = (p: THREE.Vector3) => {
    const s = p.x >= 0 ? 1 : -1;
    let best = 1;
    for (let i = 0; i <= 20; i++) {
      const b = browCurve(i / 20, s);
      best = Math.min(best, Math.hypot(p.x - b.x, p.y - b.y));
    }
    return best;
  };
  const hairMask = (p: THREE.Vector3) => {
    if (style === "bald") return 0;
    const az = Math.abs(deg(Math.atan2(p.x, p.z)));
    const hl = hairline(az) * hs;
    return sstep(hl - 0.003, hl + 0.007, p.y);
  };
  const beardMask = (p: THREE.Vector3) => {
    if (!look.beard) return 0;
    const az = Math.abs(deg(Math.atan2(p.x, p.z)));
    if (az > 92) return 0;
    const top = beardTop(az) * hs;
    let m = sstep(top + 0.002, top - 0.006, p.y);
    m *= sstep(-0.118 * hs, -0.1 * hs, p.y);
    m *= sstep(-0.035, 0.0, p.z);
    m *=
      1 - sstep(0.0, 0.0028, -model.lipSdf(p.x, p.y, p.z) * -1 + 0.0015) * 0.0;
    const lipD = model.lipSdf(p.x, p.y, p.z);
    m *= sstep(0.0005, 0.0045, lipD);
    const dens =
      0.42 + 0.33 * sstep(30, 8, az) + 0.12 * sstep(-0.07, -0.09, p.y / hs);
    return clamp(m * dens, 0, 1);
  };
  const headColor = (p: THREE.Vector3) => {
    let c = skin.clone();
    const lipD = model.lipSdf(p.x, p.y, p.z);
    c = mix(c, lipsCol, sstep(0.0028, 0.0, lipD));
    for (const s of [-1, 1]) {
      c = mix(
        c,
        blushCol,
        0.45 *
          gauss(
            Math.hypot(p.x - s * 0.046 * hs, p.y + 0.022 * hs, p.z - 0.07 * hs),
            0.022,
          ),
      );
      const de = Math.hypot(p.x - s * E.x, p.y - E.y, p.z - E.z);
      c = mix(c, tint(skin, 0.86, 0.76, 0.78), 0.5 * gauss(de - 0.0145, 0.004));
      c = mix(
        c,
        tint(skin, 0.4, 0.28, 0.28),
        0.9 *
          gauss(
            Math.hypot(
              p.x - s * 0.0072 * hs,
              p.y + 0.0315 * hs,
              p.z - 0.104 * hs,
            ),
            0.0035,
          ),
      );
    }
    c = mix(
      c,
      blushCol,
      0.35 * gauss(Math.hypot(p.x, p.y + 0.022 * hs, p.z - 0.12 * hs), 0.012),
    );
    c = mix(
      c,
      tint(skin, 0.4, 0.25, 0.25),
      0.8 * gauss(p.y + 0.0518 * hs, 0.0011) * sstep(0.004, -0.0005, lipD),
    );
    c = mix(
      c,
      tint(hair, 1.4, 1.4, 1.4),
      0.55 * sstep(0.0055, 0.001, browDist(p)) * sstep(0.06, 0.08, p.z),
    );
    c = mix(c, tint(hair, 1.15, 1.15, 1.15), 0.92 * hairMask(p));
    c = mix(c, mix(skin, hair, 0.5), 0.55 * beardMask(p));
    return c;
  };

  // grid on a warped sphere: dense on the face
  const C = lite ? 56 : 84;
  const R = lite ? 44 : 66;
  const phis = warp(-Math.PI, Math.PI, C, (a) => 1 + 3.2 * gauss(a, 0.95));
  const lams = warp(
    -Math.PI / 2,
    Math.PI / 2,
    R - 1,
    (l) => 1 + 2.4 * gauss(l + 0.2, 0.55),
  );
  const dirAt = (i: number, j: number, ph = phis, la = lams) => {
    const phi = ph[j]!;
    const lam = la[i]!;
    return V(
      Math.cos(lam) * Math.sin(phi),
      Math.sin(lam),
      Math.cos(lam) * Math.cos(phi),
    );
  };
  const origin = V(0, 0, 0);
  const m = new Mesher();
  const surf = (dir: THREE.Vector3) =>
    dir.clone().multiplyScalar(march(sdf, origin, dir));
  const pts: THREE.Vector3[][] = [];
  for (let i = 0; i < R; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < C; j++)
      row.push(
        i === 0
          ? V(0, -0.25, 0)
          : i === R - 1
            ? V(0, 0.2, 0)
            : surf(dirAt(i, j)),
      );
    pts.push(row);
  }
  // poles
  for (const i of [0, R - 1]) {
    const p = surf(i === 0 ? V(0, -1, 0) : V(0, 1, 0));
    for (let j = 0; j < C; j++) pts[i]![j] = p.clone();
  }
  {
    const base = m.count;
    for (let i = 0; i < R; i++)
      for (let j = 0; j <= C; j++) {
        const p = pts[i]![j % C]!;
        const n = sdfNormal(sdf, p);
        let occ = 0;
        for (let k = 1; k <= 4; k++) {
          const h = 0.004 * k;
          occ +=
            (h - sdf(p.x + n.x * h, p.y + n.y * h, p.z + n.z * h)) /
            Math.pow(2, k);
        }
        const ao = clamp(1 - occ * 55, 0.45, 1);
        m.vert(
          p,
          n,
          j / C,
          i / (R - 1),
          headColor(p).multiplyScalar(lerp(1, ao, 0.85)),
        );
      }
    for (let i = 0; i < R - 1; i++)
      for (let j = 0; j < C; j++) {
        const a = base + i * (C + 1) + j;
        const b = a + 1;
        const c = a + C + 1;
        const d = c + 1;
        m.tri(a, b, c);
        m.tri(b, d, c);
      }
  }
  // ears
  for (const s of [-1, 1]) {
    const ear = new Mesher();
    grid(ear, {
      rows: 14,
      cols: 18,
      wrap: true,
      at: (i, j) => {
        const th = (i / 13) * Math.PI;
        const u = (j / 18) * TAU;
        const sn = Math.sin(u);
        const a = 0.016 * (1 - 0.3 * Math.max(0, -sn));
        const b = 0.03;
        let z = 0.0075 * Math.cos(th);
        const rr = Math.sin(th);
        if (th < 1.15)
          z -=
            0.009 *
            Math.pow(1 - th / 1.15, 1.2) *
            (0.6 + 0.4 * Math.max(0, sn + 0.3));
        const rim = 1 + 0.08 * gauss(th - 1.25, 0.2);
        return V(a * rr * Math.cos(u) * rim, b * rr * sn * rim, z);
      },
      color: (p, i) =>
        i < 4 ? tint(skin, 0.82, 0.68, 0.68) : tint(skin, 1.0, 0.88, 0.86),
    });
    const g = ear.build(false);
    const mtx = new THREE.Matrix4().compose(
      V(s * 0.074 * face.w * hs, -0.006 * hs, -0.014 * hs),
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.08, s * (Math.PI / 2 - 0.35), 0),
      ),
      V(hs, hs, hs),
    );
    m.geo(g, mtx, (p) => headColor(p).lerp(tint(skin, 1.0, 0.88, 0.86), 0.7));
  }
  // lower lids (static) and the eyes
  const group = new THREE.Group();
  const eyes: THREE.Mesh[] = [];
  const lids: THREE.Group[] = [];
  const lidRest: number[] = [];
  const rEye = 0.0118 * hs;
  const rLid = 0.0127 * hs;
  const eyeMat = new THREE.MeshPhysicalMaterial({
    map: eyeTexture(look.eyes ?? "#3a2414"),
    roughness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 0.6,
  });
  const lidSkin = tint(skin, 0.97, 0.88, 0.88);
  const lash = col(female ? "#0a0706" : "#1a120d");
  const lashLen = female ? 0.0058 : 0.004;
  const upperGeo = (s: number) => {
    const um = new Mesher();
    const theta1 = 1.86;
    const cap = new THREE.SphereGeometry(rLid, 28, 10, 0, TAU, 0, theta1);
    um.geo(cap, null, lidSkin);
    const R0 = rLid * Math.sin(theta1);
    const h = rLid * Math.cos(theta1);
    um.geo(
      new THREE.TorusGeometry(R0, 0.0009 * hs, 5, 40),
      new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, h, 0),
      tint(lash, 1.4, 1.4, 1.4),
    );
    // lashes: a strip curling out of the lid margin (front half only), both faces
    const strip = new Mesher();
    grid(strip, {
      rows: 3,
      cols: 22,
      wrap: false,
      both: true,
      at: (i, j) => {
        const a = lerp(0.12, 0.88, j / 21) * Math.PI;
        const radial = V(Math.cos(a), 0, Math.sin(a));
        const t = i / 2;
        const len =
          lashLen *
          (0.55 + 0.45 * Math.sin(Math.PI * (j / 21)) ** 0.6) *
          (s > 0 ? 1 : 1);
        return V(0, h - 0.0004, 0)
          .addScaledVector(radial, R0 + len * t * 0.95)
          .add(V(0, len * t * t * 0.55 - len * 0.18 * t, 0));
      },
      color: () => lash,
    });
    const sg = strip.build(false);
    um.geo(sg, null, lash);
    return um.build(false);
  };
  const lowerGeo = () => {
    const lm = new Mesher();
    const theta2 = 1.81;
    const cap = new THREE.SphereGeometry(
      rLid * 0.995,
      28,
      8,
      0,
      TAU,
      Math.PI - theta2,
      theta2,
    );
    lm.geo(cap, null, lidSkin);
    const R0 = rLid * Math.sin(theta2);
    lm.geo(
      new THREE.TorusGeometry(R0, 0.0008 * hs, 5, 40),
      new THREE.Matrix4()
        .makeRotationX(Math.PI / 2)
        .setPosition(0, -rLid * Math.cos(theta2), 0),
      tint(skin, 0.92, 0.72, 0.72),
    );
    return lm.build(false);
  };
  const lowerG = lowerGeo();
  for (const s of [-1, 1]) {
    const center = V(s * E.x, E.y, E.z);
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(rEye, 28, 18).rotateX(Math.PI / 2),
      eyeMat,
    );
    eye.position.copy(center);
    eye.castShadow = false;
    eye.receiveShadow = true;
    group.add(eye);
    eyes.push(eye);
    const pivot = new THREE.Group();
    pivot.position.copy(center);
    const rest = -0.78;
    pivot.rotation.set(rest, 0, s * 0.05);
    const upper = new THREE.Mesh(upperGeo(s), mats.skin);
    upper.castShadow = false;
    upper.receiveShadow = true;
    pivot.add(upper);
    group.add(pivot);
    lids.push(pivot);
    lidRest.push(rest);
    const lowerM = new THREE.Matrix4().compose(
      center,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.625, 0, -s * 0.06)),
      V(1, 1, 1),
    );
    m.geo(lowerG, lowerM, lidSkin);
  }
  const headMesh = new THREE.Mesh(m.build(false), mats.skin);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  group.add(headMesh);

  // brows: short strands lying on the skin
  {
    const bm = new Mesher();
    const r = rng(0.29 + (female ? 0.1 : 0));
    const count = female ? 170 : 150;
    for (const s of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const t = Math.pow(r(), 0.85);
        const b = browCurve(t, s);
        const thick = (female ? 0.0085 : 0.008) * (1 - 0.6 * t) * hs;
        const y = b.y + (r() - 0.5) * thick;
        const hit = march(sdf, V(b.x, y, 0.0), V(0, 0, 1), 0.2);
        // march from the front: find surface along -z from z = 0.2
        void hit;
        const zf = (() => {
          let zz = 0.16;
          for (let k = 0; k < 120; k++) {
            const dd = sdf(b.x, y, zz);
            if (dd < 0.0002) break;
            zz -= Math.max(dd * 0.8, 0.0003);
          }
          return zz;
        })();
        const p = V(b.x, y, zf);
        const n = sdfNormal(sdf, p);
        // growth direction: up near the nose, then outward and slightly down
        const ang = lerp(0.9, -0.2, sstep(0.0, 0.7, t)) + (r() - 0.5) * 0.25;
        const dir = V(s * Math.cos(ang), Math.sin(ang), 0);
        dir.addScaledVector(n, -dir.dot(n)).normalize();
        const side = new THREE.Vector3().crossVectors(n, dir).normalize();
        const len = (0.0035 + r() * 0.003) * hs;
        const w = 0.0006 * hs;
        const p0 = p.clone().addScaledVector(n, 0.0005);
        const p1 = p0
          .clone()
          .addScaledVector(dir, len)
          .addScaledVector(n, 0.0009);
        const a = bm.vert(p0.clone().addScaledVector(side, w), n, 0, 0, hair);
        const bb = bm.vert(p0.clone().addScaledVector(side, -w), n, 1, 0, hair);
        const c = bm.vert(p1, n, 0.5, 1, hair);
        bm.tri(a, bb, c);
        bm.tri(a, c, bb);
      }
    }
    const brows = new THREE.Mesh(
      bm.build(false),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.75,
        side: THREE.DoubleSide,
      }),
    );
    group.add(brows);
  }

  // shells: short hair and beard
  if (style === "short" || style === "bun" || look.beard) {
    const sm = new Mesher();
    const SC = lite ? 40 : 56;
    const SR = lite ? 30 : 44;
    const sp = warp(-Math.PI, Math.PI, SC, (a) => 1 + 2 * gauss(a, 0.95));
    const sl = warp(
      -Math.PI / 2,
      Math.PI / 2,
      SR - 1,
      (l) => 1 + 1.6 * gauss(l + 0.2, 0.6),
    );
    const L = lite ? 4 : 7;
    const info: {
      p: THREE.Vector3;
      n: THREE.Vector3;
      hairM: number;
      beardM: number;
      thick: number;
      hc: [number, number];
    }[][] = [];
    for (let i = 0; i < SR; i++) {
      const row: (typeof info)[number] = [];
      for (let j = 0; j < SC; j++) {
        const dir = dirAt(i, j, sp, sl);
        const p = surf(dir);
        const n = sdfNormal(sdf, p);
        const hm = style === "short" || style === "bun" ? hairMask(p) : 0;
        const bmk = beardMask(p);
        const top = sstep(0.03, 0.11, p.y / hs);
        const front = sstep(0.02, 0.07, p.z / hs) * top;
        const sideT = 0.007 + 0.009 * top + 0.012 * front;
        const thick =
          hm > 0.01
            ? sideT * hs
            : 0.0042 * hs * (0.7 + 0.5 * sstep(-0.06, -0.095, p.y / hs));
        row.push({
          p,
          n,
          hairM: hm,
          beardM: bmk,
          thick,
          hc: [sp[j]! * 0.1, sl[i]! * 0.1],
        });
      }
      info.push(row);
    }
    for (let l = 1; l <= L; l++) {
      const f = l / L;
      grid(sm, {
        rows: SR,
        cols: SC,
        wrap: true,
        at: (i, j) => {
          const c = info[i]![j]!;
          return c.p.clone().addScaledVector(c.n, c.thick * f + 0.0004);
        },
        color: (_p, i, j) => {
          const c = info[i]![j]!;
          return c.beardM > c.hairM ? tint(hair, 1.9, 1.75, 1.6) : hair;
        },
        skip: (i, j) => {
          let mx = 0;
          for (const [a, b] of [
            [i, j],
            [i + 1, j],
            [i, (j + 1) % SC],
            [i + 1, (j + 1) % SC],
          ] as const) {
            const c = info[a]?.[b];
            if (c) mx = Math.max(mx, c.hairM, c.beardM);
          }
          return mx < 0.03;
        },
        extra: (mm, _p, i, j) => {
          const c = info[i]![j]!;
          const isBeard = c.beardM > c.hairM;
          const dens = isBeard ? c.beardM : c.hairM;
          mm.attr(
            "shell",
            4,
            f,
            isBeard ? 0.2 + 0.8 * dens : dens * 1.05,
            isBeard ? 1000 : 1400,
            isBeard ? 330 : 140,
          );
          mm.attr("hcoord", 2, c.hc[0], c.hc[1]);
        },
      });
    }
    const shells = new THREE.Mesh(sm.build(false), shellMaterial(look.hair));
    shells.castShadow = false;
    shells.receiveShadow = true;
    group.add(shells);
  }
  if (style === "bun") {
    const bun = new THREE.Mesh(
      new THREE.SphereGeometry(0.045 * hs, 20, 14),
      new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.55 }),
    );
    bun.position.set(0, 0.1 * hs, -0.085 * hs);
    bun.scale.set(1, 0.85, 0.9);
    bun.castShadow = true;
    group.add(bun);
  }

  if (look.glasses) group.add(glasses(hs, face.w));
  return { group, eyes, lids, lidRest };
}

function glasses(hs: number, w: number) {
  const g = new THREE.Group();
  const frameM = new THREE.MeshPhysicalMaterial({
    color: "#0b0b0c",
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  });
  const lensM = new THREE.MeshPhysicalMaterial({
    color: "#eef3ff",
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    envMapIntensity: 0.8,
  });
  const rr = (cx: number, cy: number, wdt: number, hgt: number, r: number) => {
    const s = new THREE.Shape();
    const x = cx - wdt / 2;
    const y = cy - hgt / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + wdt - r, y);
    s.quadraticCurveTo(x + wdt, y, x + wdt, y + r);
    s.lineTo(x + wdt, y + hgt - r);
    s.quadraticCurveTo(x + wdt, y + hgt, x + wdt - r, y + hgt);
    s.lineTo(x + r, y + hgt);
    s.quadraticCurveTo(x, y + hgt, x, y + hgt - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const fm = new Mesher();
  const lm = new Mesher();
  const ex = 0.0325 * Math.sqrt(w);
  for (const s of [-1, 1]) {
    const outer = rr(0, 0, 0.056, 0.042, 0.011);
    const hole = rr(0, 0.001, 0.045, 0.031, 0.008);
    outer.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(outer, {
      depth: 0.005,
      bevelEnabled: true,
      bevelThickness: 0.0012,
      bevelSize: 0.0012,
      bevelSegments: 2,
      curveSegments: 6,
    });
    const mtx = new THREE.Matrix4().compose(
      V(s * ex, 0.0095, 0.094),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, -s * 0.12, 0)),
      V(1, 1, 1),
    );
    fm.geo(geo, mtx, new THREE.Color(1, 1, 1));
    const lens = new THREE.ShapeGeometry(rr(0, 0.001, 0.046, 0.032, 0.008), 6);
    lm.geo(
      lens,
      mtx.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.0025)),
      new THREE.Color(1, 1, 1),
    );
    // temple arm
    const arm = new THREE.BoxGeometry(0.004, 0.007, 0.105);
    const hingeX = s * (ex + 0.028);
    const amtx = new THREE.Matrix4().compose(
      V(s * 0.0775 * w, 0.012, 0.045),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.03, s * -0.1, 0)),
      V(1, 1, 1),
    );
    fm.geo(arm, amtx, new THREE.Color(1, 1, 1));
    const tip = new THREE.BoxGeometry(0.0035, 0.006, 0.03);
    fm.geo(
      tip,
      new THREE.Matrix4().compose(
        V(s * 0.072 * w, -0.002, -0.012),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0, 0)),
        V(1, 1, 1),
      ),
      new THREE.Color(1, 1, 1),
    );
    const hinge = new THREE.BoxGeometry(0.012, 0.012, 0.01);
    fm.geo(
      hinge,
      new THREE.Matrix4().makeTranslation(hingeX + s * 0.002, 0.012, 0.091),
      new THREE.Color(1, 1, 1),
    );
  }
  const bridge = new THREE.TorusGeometry(0.009, 0.0025, 6, 12, Math.PI);
  fm.geo(
    bridge,
    new THREE.Matrix4().makeTranslation(0, 0.014, 0.0975),
    new THREE.Color(1, 1, 1),
  );
  const frame = new THREE.Mesh(fm.build(false), frameM);
  frame.castShadow = true;
  const lenses = new THREE.Mesh(lm.build(false), lensM);
  lenses.renderOrder = 2;
  g.add(frame, lenses);
  g.scale.setScalar(hs);
  return g;
}

/* ------------------------------------------------------------------ */
/* long hair                                                           */
/* ------------------------------------------------------------------ */

function buildLongHair(d: Dims, model: HeadModel, look: Look) {
  const O = d.O;
  const hs = d.hs;
  const sdfE = (x: number, y: number, z: number) => model.sdf(x, y, z, true);
  const Cc = V(0, 0.03 * hs, -0.01 * hs);
  const surfAt = (dir: THREE.Vector3) =>
    Cc.clone().addScaledVector(
      dir,
      march(sdfE, Cc, dir.clone().normalize(), 0.3),
    );
  const partFront = V(0, 0.62, 0.78).normalize();
  const partBack = V(0, 0.96, -0.28).normalize();
  const torsoY = (y: number) => clamp(y, 0.45 * d.H, 0.925 * d.H);

  const strand = (s: number, j: number, o: number, length: number) => {
    const a = Math.min(1, j / 0.72);
    const root = surfAt(partFront.clone().lerp(partBack, a).normalize());
    root.x += s * 0.001;
    const psi = (j * Math.PI) / 2;
    const T = V(s * Math.cos(psi), -0.15, -Math.sin(psi));
    const pts: THREE.Vector3[] = [];
    let p = root.clone();
    const front = j < 0.3;
    // over the head
    for (let k = 0; k < 90; k++) {
      const n = sdfNormal(sdfE, p);
      const vol =
        (o + 0.004 * sstep(0.2, -0.4, n.y) + 0.002) *
        sstep(0, 0.025, p.distanceTo(root));
      pts.push(p.clone().addScaledVector(n, vol).add(O));
      T.add(V(0, -0.16, 0));
      T.addScaledVector(n, -T.dot(n)).normalize();
      const q = p.clone().addScaledVector(T, 0.007);
      p = surfAt(q.clone().sub(Cc).normalize());
      if (n.y < -0.3 || p.y < -0.05 * hs) break;
    }
    // hanging
    let P = pts[pts.length - 1]!.clone();
    let Tw = T.clone();
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += pts[i]!.distanceTo(pts[i - 1]!);
    const bias = V(0, 0, front ? 0.22 : -0.1);
    let guard = 0;
    while (len < length && guard++ < 200) {
      Tw = Tw.multiplyScalar(0.55)
        .add(V(0, -0.45, 0))
        .add(bias)
        .normalize();
      const prev = P.clone();
      P.addScaledVector(Tw, 0.012);
      if (!front && P.y < O.y - 0.08 && Math.abs(P.x) < 0.15 * d.k)
        P.x *= 1.035;
      // head
      const hl = P.clone().sub(O);
      const hd = sdfE(hl.x, hl.y, hl.z);
      if (hd < o + 0.003)
        P.addScaledVector(sdfNormal(sdfE, hl), o + 0.003 - hd);
      // shoulders (deltoids)
      for (const side of [-1, 1]) {
        const c = V(side * d.shX, d.yShoulder, -0.008);
        const rr = d.armR(0.01, 0) + 0.014 + o;
        const dv = P.clone().sub(c);
        const dl = dv.length();
        if (dl < rr) {
          dv.z += front ? 0.03 : -0.03;
          P = c.clone().addScaledVector(dv.normalize(), rr);
        }
      }
      // torso and neck
      for (let it = 0; it < 3; it++) {
        const y = torsoY(P.y);
        const cz = d.torsoCz(y);
        const dx = P.x;
        const dz = P.z - cz;
        const phi = Math.atan2(dz, dx);
        const need = d.torsoR(y, phi) + 0.014 + o;
        const r = Math.hypot(dx, dz);
        if (r >= need) break;
        const k = P.y > d.yShoulder - 0.08 ? 0.4 : 1;
        const dir = V(dx * k, 0, dz + (front ? 0.02 : -0.02)).normalize();
        P.x = dir.x * need;
        P.z = cz + dir.z * need;
      }
      len += P.distanceTo(prev);
      Tw = P.clone().sub(prev).normalize();
      pts.push(P.clone());
    }
    // resample
    const NR = 34;
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i++)
      cum.push(cum[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
    const total = Math.min(length, cum[cum.length - 1]!);
    const out: THREE.Vector3[] = [];
    let k = 0;
    for (let i = 0; i < NR; i++) {
      const target = (i / (NR - 1)) * total;
      while (k < cum.length - 2 && cum[k + 1]! < target) k++;
      const f = (target - cum[k]!) / Math.max(1e-6, cum[k + 1]! - cum[k]!);
      out.push(
        pts[k]!.clone().lerp(
          pts[Math.min(pts.length - 1, k + 1)]!,
          clamp(f, 0, 1),
        ),
      );
    }
    return out;
  };

  const hairCol = col(look.hair);
  const outer = new Mesher(true);
  const inner = new Mesher(true);
  const weights = (p: THREE.Vector3): Wt => {
    const h = sstep(O.y - 0.17, O.y - 0.07, p.y);
    return [
      [B.head, h],
      [B.chest, 1 - h],
    ];
  };
  const layers = [
    { o: 0.002, target: inner, len: 0.97, alpha: 1 },
    { o: 0.008, target: outer, len: 1.0, alpha: 1 },
    { o: 0.015, target: outer, len: 0.94, alpha: 0.9 },
  ];
  const r = rng(0.77);
  for (const [li, layer] of layers.entries()) {
    const sheet = (cols: { s: number; j: number }[], front: boolean) => {
      const strands = cols.map(({ s, j }) =>
        strand(
          s,
          j,
          layer.o + (r() - 0.5) * 0.002,
          (front ? 0.5 : 0.6 - 0.05 * Math.abs(Math.cos(j * 2))) *
            layer.len *
            d.k,
        ),
      );
      const rows = strands[0]!.length;
      grid(layer.target, {
        rows,
        cols: strands.length,
        wrap: false,
        at: (i, j) => strands[j]![i]!,
        color: (_p, i) => {
          const ao =
            lerp(0.55, 1, sstep(0, 0.25, i / (rows - 1))) *
            (li === 0 ? 0.75 : 1);
          return hairCol.clone().multiplyScalar(ao);
        },
        alpha: (_i, j) =>
          li > 0 && (j === 0 || j === strands.length - 1) ? 0.35 : layer.alpha,
        weights: (p) => weights(p),
        uv: (i, j) => [j * 0.16 + li * 0.37, 1 - i / (rows - 1)],
      });
    };
    const backCols: { s: number; j: number }[] = [];
    const nb = 15;
    for (let i = 0; i <= nb; i++)
      backCols.push({ s: 1, j: lerp(0.3, 1, i / nb) });
    for (let i = nb - 1; i >= 0; i--)
      backCols.push({ s: -1, j: lerp(0.3, 1, i / nb) });
    sheet(backCols, false);
    for (const s of [-1, 1]) {
      const fc: { s: number; j: number }[] = [];
      for (let i = 0; i <= 6; i++) fc.push({ s, j: lerp(0.0, 0.28, i / 6) });
      if (s < 0) fc.reverse();
      sheet(fc, true);
    }
  }
  const maps = hairMaps();
  const make = (alphaMap: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      vertexColors: true,
      map: alphaMap,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.42,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      sheen: 1,
      sheenColor: hairCol.clone().lerp(new THREE.Color("#8a6a52"), 0.5),
      sheenRoughness: 0.35,
      anisotropy: 0.7,
      anisotropyRotation: Math.PI / 2,
      specularIntensity: 0.8,
    });
  const outerMat = make(maps.cards);
  const innerMat = make(maps.inner);
  return {
    outer: outer.build(true),
    inner: inner.build(true),
    outerMat,
    innerMat,
  };
}

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */

/** Violin in its own space: end button at the origin, neck toward +Z, top plate facing +Y. */
function violinGeometry() {
  const m = new Mesher();
  const wood = col("#7c3410");
  const woodLight = col("#a5541c");
  const ebony = col("#0d0b0a");
  const string = col("#cfc8bb");
  const L = 0.356;
  const us = [
    0, 0.03, 0.1, 0.2, 0.3, 0.38, 0.45, 0.52, 0.58, 0.65, 0.75, 0.85, 0.93,
    0.98, 1,
  ];
  const hw = spline(
    us,
    [
      0.0, 0.058, 0.092, 0.103, 0.1, 0.08, 0.058, 0.056, 0.068, 0.08, 0.083,
      0.075, 0.055, 0.03, 0.0,
    ],
  );
  const shape = new THREE.Shape();
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = hw(u) * Math.sqrt(Math.min(1, u / 0.02, (1 - u) / 0.02 + 1e-6));
    if (i === 0) shape.moveTo(x, u * L);
    else shape.lineTo(x, u * L);
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    shape.lineTo(
      -hw(u) * Math.sqrt(Math.min(1, u / 0.02, (1 - u) / 0.02 + 1e-6)),
      u * L,
    );
  }
  const body = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.004,
    bevelSegments: 3,
    curveSegments: 4,
  });
  body.rotateX(Math.PI / 2);
  body.translate(0, 0.032, 0);
  m.geo(body, null, (p) => (p.y > 0.03 ? woodLight : wood));
  const box = (
    w: number,
    h: number,
    l: number,
    x: number,
    y: number,
    z: number,
    c: THREE.Color,
    rx = 0,
  ) =>
    m.geo(
      new THREE.BoxGeometry(w, h, l),
      new THREE.Matrix4().compose(
        V(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)),
        V(1, 1, 1),
      ),
      c,
    );
  box(0.026, 0.02, 0.135, 0, 0.03, L + 0.066, wood);
  box(0.034, 0.006, 0.27, 0, 0.05, 0.375, ebony, -0.035);
  box(0.022, 0.026, 0.07, 0, 0.03, 0.525, wood);
  m.geo(
    new THREE.TorusGeometry(0.014, 0.007, 8, 18).rotateY(Math.PI / 2),
    new THREE.Matrix4().makeTranslation(0, 0.034, 0.567),
    wood,
  );
  for (let i = 0; i < 4; i++)
    m.geo(
      new THREE.CylinderGeometry(0.0032, 0.0032, 0.058, 8).rotateZ(Math.PI / 2),
      new THREE.Matrix4().makeTranslation(0, 0.034, 0.502 + i * 0.013),
      ebony,
    );
  box(0.042, 0.03, 0.004, 0, 0.05, 0.157, col("#d9b98c"));
  box(0.036, 0.008, 0.11, 0, 0.042, 0.075, ebony, 0.06);
  m.geo(
    new THREE.SphereGeometry(1, 14, 10),
    new THREE.Matrix4().compose(
      V(0.035, 0.043, 0.035),
      new THREE.Quaternion(),
      V(0.034, 0.009, 0.03),
    ),
    ebony,
  );
  for (const s of [-1, 1])
    m.geo(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.Matrix4().compose(
        V(s * 0.03, 0.0385, 0.16),
        new THREE.Quaternion(),
        V(0.0035, 0.0012, 0.032),
      ),
      ebony,
    );
  const xs = [-0.0105, -0.0035, 0.0035, 0.0105];
  for (const x of xs) {
    const a = V(x * 0.9, 0.047, 0.125);
    const b = V(x, 0.066, 0.157);
    const c = V(x * 0.55, 0.055, 0.51);
    for (const [p, q] of [
      [a, b],
      [b, c],
    ] as const) {
      const len = p.distanceTo(q);
      const g = new THREE.CylinderGeometry(0.0005, 0.0005, len, 4).rotateX(
        Math.PI / 2,
      );
      const mtx = new THREE.Matrix4()
        .lookAt(q, p, V(0, 1, 0))
        .setPosition(p.clone().add(q).multiplyScalar(0.5));
      m.geo(g, mtx, string);
    }
  }
  return m.build(false);
}

/** Bow along +Z from the frog (origin) to the tip, hair below the stick (-Y). */
function bowGeometry() {
  const m = new Mesher();
  const stick = new THREE.CylinderGeometry(0.0034, 0.0046, 0.74, 8).rotateX(
    Math.PI / 2,
  );
  m.geo(stick, new THREE.Matrix4().makeTranslation(0, 0, 0.37), col("#3a1c0c"));
  m.geo(
    new THREE.BoxGeometry(0.011, 0.02, 0.042),
    new THREE.Matrix4().makeTranslation(0, -0.011, 0.03),
    col("#0e0c0b"),
  );
  const hairLen = 0.69;
  const hair = new THREE.BoxGeometry(0.009, 0.0007, hairLen);
  const mtx = new THREE.Matrix4().compose(
    V(0, -0.0135, 0.05 + hairLen / 2),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.011, 0, 0)),
    V(1, 1, 1),
  );
  m.geo(hair, mtx, col("#efe9dc"));
  m.geo(
    new THREE.BoxGeometry(0.006, 0.012, 0.012),
    new THREE.Matrix4().makeTranslation(0, -0.004, 0.738),
    col("#e8e2d6"),
  );
  return m.build(false);
}

/* ------------------------------------------------------------------ */
/* assembly                                                            */
/* ------------------------------------------------------------------ */

type Rig = {
  root: THREE.Group;
  bones: THREE.Bone[];
  rest: THREE.Vector3[];
  d: Dims;
  head: HeadPack | null;
  hands: {
    L: THREE.Mesh;
    R: THREE.Mesh;
    grip: { L: THREE.BufferGeometry; R: THREE.BufferGeometry };
    relax: { L: THREE.BufferGeometry; R: THREE.BufferGeometry };
  };
  violin: THREE.Mesh | null;
  bow: THREE.Mesh | null;
};

function faceFor(look: Look): Face {
  const fb = Math.max(0, (look.build ?? 1) - 1);
  if (look.female)
    return {
      w: 1 + fb * 0.12,
      jaw: 0.97 + fb * 0.12,
      cheek: 1.1 + fb * 0.55,
      nose: 0.86,
      lip: 1.12,
      mouth: 1.1,
      brow: 0.75,
      chin: 0.95,
      neck: 0.95 + fb * 0.2,
    };
  return {
    w: 1 + fb * 0.25,
    jaw: 1.06 + fb * 0.3,
    cheek: 1 + fb * 0.5,
    nose: 1.08,
    lip: 0.98,
    mouth: 1.08,
    brow: 1.05,
    chin: 1.0,
    neck: 1.05 + fb * 0.3,
  };
}

function buildRig(look: Look, outfit: Outfit, fp: boolean): Rig {
  const d = dims(look, fp);
  const H = d.H;
  const skin = col(look.skin);
  const root = new THREE.Group();
  root.name = "human";

  // skeleton (bind: identity rotations)
  const bones: THREE.Bone[] = [];
  const world: THREE.Vector3[] = [];
  const add = (name: string, parent: number, p: THREE.Vector3) => {
    const b = new THREE.Bone();
    b.name = name;
    if (parent >= 0) {
      bones[parent]!.add(b);
      b.position.copy(p).sub(world[parent]!);
    } else {
      root.add(b);
      b.position.copy(p);
    }
    bones.push(b);
    world.push(p.clone());
  };
  add("root", -1, V());
  add("hips", 0, V(0, d.yHip + 0.03, 0));
  add("spine", 1, V(0, 0.6 * H, -0.01));
  add("chest", 2, V(0, 0.7 * H, -0.012));
  add("neck", 3, V(0, 0.836 * H, -0.02));
  add("head", 4, V(0, d.O.y - 0.035, d.O.z - 0.018));
  for (const s of [1, -1]) {
    add(s > 0 ? "clavL" : "clavR", B.chest, V(s * 0.022, 0.808 * H, 0.01));
    add(
      s > 0 ? "armL" : "armR",
      s > 0 ? B.clavL : B.clavR,
      V(s * d.shX, d.yShoulder, -0.008),
    );
    add(
      s > 0 ? "foreL" : "foreR",
      s > 0 ? B.armL : B.armR,
      V(s * d.shX, d.yShoulder - d.upperLen, -0.008),
    );
    add(
      s > 0 ? "handL" : "handR",
      s > 0 ? B.foreL : B.foreR,
      V(s * d.shX, d.yShoulder - d.upperLen - d.foreLen, -0.008),
    );
  }
  for (const s of [1, -1]) {
    const c1 = d.legC(d.yHip, s);
    const c2 = d.legC(d.yKnee, s);
    const c3 = d.legC(d.yAnkle, s);
    add(s > 0 ? "thighL" : "thighR", B.hips, V(c1.x, d.yHip, c1.y));
    add(
      s > 0 ? "shinL" : "shinR",
      s > 0 ? B.thighL : B.thighR,
      V(c2.x, d.yKnee, c2.y),
    );
    add(
      s > 0 ? "footL" : "footR",
      s > 0 ? B.shinL : B.shinR,
      V(c3.x, d.yAnkle, c3.y),
    );
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const rest = bones.map((b) => b.position.clone());

  const skinMat = skinMaterial();
  const bound = new THREE.Sphere(V(0, H / 2, 0), H * 0.8);
  const skinned = (
    g: THREE.BufferGeometry,
    mat: THREE.Material,
    shadow = true,
  ) => {
    const mesh = new THREE.SkinnedMesh(g, mat);
    mesh.bind(skeleton, new THREE.Matrix4());
    mesh.boundingSphere = bound.clone();
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  // body
  const bodyM = new Mesher();
  {
    const ts = topSpec(outfit.topStyle ?? "tshirt", d);
    const dress = outfit.topStyle === "dress";
    const bs = dress ? "skirt" : (outfit.bottomStyle ?? "jeans");
    const legHem =
      bs === "shorts"
        ? d.f
          ? 0.405 * H
          : 0.335 * H
        : bs === "skirt"
          ? Infinity
          : 0.05 * H;
    const waist = bs === "skirt" && !dress ? 0.5 * H : 0.585 * H;
    const cover: Cover = {
      torso: (y, phi) =>
        Math.max(
          sstep(ts.hem, ts.hem + 0.03, y) *
            sstep(ts.neck(phi), ts.neck(phi) - 0.025, y),
          sstep(waist, waist - 0.03, y),
        ),
      arm: (dist) =>
        ts.sleeve > 0 ? sstep(ts.sleeve, ts.sleeve - 0.035, dist) : 0,
      leg: (y) =>
        Number.isFinite(legHem) ? sstep(legHem, legHem + 0.035, y) : 0,
    };
    buildBodySkin(d, bodyM, skin, fp, cover);
  }
  skinned(bodyM.build(true), skinMat);

  // clothes
  const topStyle = outfit.topStyle ?? "tshirt";
  const topM = new Mesher();
  const deco = outfit.print ? new Mesher() : null;
  buildTop(d, topM, outfit, fp, deco);
  const fabric =
    topStyle === "blouse" || topStyle === "dress"
      ? clothMaterial("satin", outfit.top)
      : topStyle === "jersey"
        ? clothMaterial("smooth", outfit.top)
        : clothMaterial("knit", outfit.top);
  skinned(topM.build(true), fabric);
  if (deco && outfit.print) {
    const pm = new THREE.MeshStandardMaterial({
      map: printTexture(outfit.print, outfit.printColor ?? "#ff8a1f"),
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    skinned(deco.build(true), pm, false);
  }
  const botM = new Mesher();
  buildBottom(d, botM, outfit, fp);
  if (botM.count > 0) {
    const kind =
      outfit.topStyle === "dress"
        ? "satin"
        : (outfit.bottomStyle ?? "jeans") === "jeans"
          ? "denim"
          : "knit";
    skinned(
      botM.build(true),
      clothMaterial(
        kind,
        outfit.topStyle === "dress" ? outfit.top : outfit.bottom,
      ),
    );
  }

  // hands
  const nails = look.nails;
  const relaxL = handGeometry(d, skin, nails, 0.55, 0.3);
  const gripL = handGeometry(d, skin, nails, 1.25, 0.9);
  const relax = { L: relaxL, R: mirrorX(relaxL) };
  const grip = { L: gripL, R: mirrorX(gripL) };
  const handL = new THREE.Mesh(relax.L, skinMat);
  const handR = new THREE.Mesh(relax.R, skinMat);
  for (const h of [handL, handR]) {
    h.castShadow = true;
    h.receiveShadow = true;
  }
  bones[B.handL]!.add(handL);
  bones[B.handR]!.add(handR);

  // feet
  const sandal = outfit.bottomStyle === "shorts";
  const footG = footGeometry(d, skin, outfit.shoes ?? "#2a2a2a", sandal, nails);
  for (const s of [1, -1]) {
    const geo = s > 0 ? footG : mirrorX(footG);
    const mesh = new THREE.Mesh(
      geo,
      sandal
        ? skinMat
        : new THREE.MeshPhysicalMaterial({
            color: "#ffffff",
            vertexColors: true,
            roughness: 0.62,
            sheen: 0.3,
            clearcoat: 0.1,
          }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bones[s > 0 ? B.footL : B.footR]!.add(mesh);
  }

  // head and hair
  let head: HeadPack | null = null;
  if (!fp) {
    const face = faceFor(look);
    head = buildHead(
      look,
      face,
      d.hs,
      skin,
      { skin: skinMat },
      !!look.female,
      look !== LOOKS.davi && look !== LOOKS.elena,
    );
    const hb = bones[B.head]!;
    head.group.position.copy(d.O).sub(world[B.head]!);
    hb.add(head.group);
    const style = look.hairStyle ?? (look.female ? "long" : "short");
    if (style === "long") {
      const model = headModel(face, d.hs);
      const hair = buildLongHair(d, model, look);
      skinned(hair.inner, hair.innerMat);
      skinned(hair.outer, hair.outerMat);
    }
  }

  return {
    root,
    bones,
    rest,
    d,
    head,
    hands: { L: handL, R: handR, grip, relax },
    violin: null,
    bow: null,
  };
}

/* ------------------------------------------------------------------ */
/* animation                                                           */
/* ------------------------------------------------------------------ */

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _m = new THREE.Matrix4();

function setWorldBasis(
  bone: THREE.Bone,
  X: THREE.Vector3,
  Y: THREE.Vector3,
  Z: THREE.Vector3,
) {
  _m.makeBasis(X, Y, Z);
  _q.setFromRotationMatrix(_m);
  bone.parent!.getWorldQuaternion(_q2);
  bone.quaternion.copy(_q2.invert().multiply(_q));
  bone.updateMatrixWorld(true);
}

/** Two-bone IK: the limb's local -Y points along the bone; `pole` is the direction the elbow/knee points. */
function twoBone(
  upper: THREE.Bone,
  lower: THREE.Bone,
  end: THREE.Bone,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  knee: boolean,
) {
  const A = upper.getWorldPosition(V());
  const l1 = lower.position.length();
  const l2 = end.position.length();
  const D = target.clone().sub(A);
  const dist = clamp(D.length(), 0.05, (l1 + l2) * 0.999);
  const dir = D.normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const n = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (n.lengthSq() < 1e-8) n.set(0, 0, knee ? 1 : -1);
  n.normalize();
  const E = A.clone().addScaledVector(dir, a).addScaledVector(n, h);
  const T = A.clone().addScaledVector(dir, dist);
  const u = E.clone().sub(A).normalize();
  const w = T.clone().sub(E).normalize();
  const Y = u.clone().negate();
  const Z = (knee ? n.clone() : n.clone().negate())
    .addScaledVector(Y, -(knee ? n : n.clone().negate()).dot(Y))
    .normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  setWorldBasis(upper, X, Y, new THREE.Vector3().crossVectors(X, Y));
  const Y2 = w.clone().negate();
  const Z2 = new THREE.Vector3().crossVectors(X, Y2).normalize();
  const X2 = new THREE.Vector3().crossVectors(Y2, Z2).normalize();
  setWorldBasis(lower, X2, Y2, Z2);
}

/** Orients a hand in world space: fingers along `fingers`, palm facing `palm`. side +1 = left. */
function aimHand(
  hand: THREE.Bone,
  fingers: THREE.Vector3,
  palm: THREE.Vector3,
  side: number,
) {
  const Y = fingers.clone().normalize().negate();
  const X = (side > 0 ? palm.clone().negate() : palm.clone())
    .addScaledVector(Y, -0)
    .normalize();
  X.addScaledVector(Y, -X.dot(Y)).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
  setWorldBasis(hand, X, Y, Z);
}

function animator(rig: Rig, seed: number, fp = false) {
  const { bones, d, rest } = rig;
  const b = (i: number) => bones[i]!;
  let pose: Pose = "stand";
  let phase = 0;
  let walk = 0;
  let nextBlink = 1 + seed * 3;
  let blinkStart = -10;
  let sacc = V();
  let nextSacc = 0.5;
  const fb = d.fb;
  const toWorld = (p: THREE.Vector3) => rig.root.localToWorld(p.clone());
  const dirWorld = (v: THREE.Vector3) =>
    v
      .clone()
      .applyQuaternion(rig.root.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

  const setHands = (gripL: boolean, gripR: boolean) => {
    rig.hands.L.geometry = gripL ? rig.hands.grip.L : rig.hands.relax.L;
    rig.hands.R.geometry = gripR ? rig.hands.grip.R : rig.hands.relax.R;
  };

  const setPose = (p: Pose) => {
    pose = p;
    setHands(p === "violin", p === "violin");
    if (p === "violin" && !rig.violin) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        vertexColors: true,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      });
      const violin = new THREE.Mesh(violinGeometry(), mat);
      violin.castShadow = true;
      // violin placement in chest space
      const chestW = new THREE.Vector3(0, 0.7 * d.H, -0.012);
      const pos = V(0.045, d.yShoulder + 0.035, 0.07).sub(chestW);
      const Zv = V(0.6, 0.2, 0.78).normalize();
      const Yv = V(-0.42, 0.9, 0)
        .addScaledVector(Zv, -V(-0.42, 0.9, 0).dot(Zv))
        .normalize();
      const Xv = new THREE.Vector3().crossVectors(Yv, Zv);
      violin.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(Xv, Yv, Zv),
      );
      violin.position.copy(pos);
      b(B.chest).add(violin);
      rig.violin = violin;
      const bow = new THREE.Mesh(bowGeometry(), mat);
      bow.castShadow = true;
      bow.position.set(0.016, -0.083, -0.045);
      bow.rotation.set(0, 0, Math.PI / 2);
      b(B.handR).add(bow);
      rig.bow = bow;
    }
    if (rig.violin) rig.violin.visible = p === "violin";
    if (rig.bow) rig.bow.visible = p === "violin";
  };

  const update = (t: number, dtIn: number, speed: number) => {
    const dt = Math.min(0.1, Math.max(0, dtIn));
    const target = pose === "sit" ? 0 : clamp(speed / 1.2, 0, 1);
    walk += (target - walk) * Math.min(1, dt * 6);
    if (speed > 0.05) phase += (dt * Math.PI * speed) / (0.41 * d.H);
    // reset
    for (let i = 0; i < bones.length; i++) {
      bones[i]!.quaternion.identity();
      bones[i]!.position.copy(rest[i]!);
    }
    const w = walk;
    const sp = phase;
    const sn = Math.sin(sp);
    const amp = 0.36 * clamp(speed / 1.4, 0.5, 1.2);
    const tt = t + seed * 10;

    // idle: breathing, weight shift
    const breath = Math.sin(tt * 1.55);
    const shift = Math.sin(tt * 0.31) * (1 - w);
    b(B.chest).rotation.x = -0.012 * breath;
    b(B.spine).rotation.x = 0.006 * breath + 0.03 * w;
    b(B.hips).position.x += 0.012 * shift;
    b(B.hips).rotation.z = 0.025 * shift;
    b(B.spine).rotation.z = -0.03 * shift;
    b(B.thighL).rotation.z = -0.025 * shift;
    b(B.thighR).rotation.z = -0.025 * shift;
    // head look-around
    b(B.head).rotation.y =
      (0.16 * Math.sin(tt * 0.21) + 0.06 * Math.sin(tt * 0.67)) * (1 - 0.6 * w);
    b(B.head).rotation.x = 0.04 * Math.sin(tt * 0.37) + 0.02;
    b(B.neck).rotation.x = -0.02;

    // walk
    if (w > 0.001) {
      b(B.thighL).rotation.x = -amp * sn * w;
      b(B.thighR).rotation.x = amp * sn * w;
      const kneeL = 0.12 + 0.95 * Math.pow(Math.max(0, Math.cos(sp + 0.35)), 2);
      const kneeR =
        0.12 + 0.95 * Math.pow(Math.max(0, Math.cos(sp + Math.PI + 0.35)), 2);
      b(B.shinL).rotation.x = kneeL * w * clamp(speed / 1.4, 0.6, 1.1);
      b(B.shinR).rotation.x = kneeR * w * clamp(speed / 1.4, 0.6, 1.1);
      b(B.footL).rotation.x =
        (amp * sn * 0.6 -
          kneeL * 0.4 +
          0.15 * Math.max(0, Math.sin(sp - 0.6))) *
        w;
      b(B.footR).rotation.x =
        (-amp * sn * 0.6 -
          kneeR * 0.4 +
          0.15 * Math.max(0, Math.sin(sp + Math.PI - 0.6))) *
        w;
      b(B.hips).position.y -= (0.012 + 0.012 * Math.cos(2 * sp)) * w;
      b(B.hips).rotation.y = 0.12 * amp * sn * w;
      b(B.hips).rotation.z += 0.035 * Math.cos(sp) * w;
      b(B.spine).rotation.y = -0.18 * amp * sn * w;
      b(B.chest).rotation.y = -0.12 * amp * sn * w;
      b(B.head).rotation.y -= 0.05 * amp * sn * w;
    }

    // first person: lean the upper body back so the chest and shoulders stay out of the eye's way
    if (fp) {
      b(B.spine).rotation.x -= 0.12;
      b(B.chest).rotation.x -= 0.1;
    }
    // arms at rest / swinging (overridden by poses below)
    const abd = 0.1 + fb * 0.32;
    b(B.armL).rotation.set(0.05 + 0.75 * amp * sn * w, 0, abd);
    b(B.armR).rotation.set(0.05 - 0.75 * amp * sn * w, 0, -abd);
    b(B.foreL).rotation.x = -0.2 - 0.25 * w * Math.max(0, -sn);
    b(B.foreR).rotation.x = -0.2 - 0.25 * w * Math.max(0, sn);
    b(B.handL).rotation.set(-0.08, 0.15, 0.06);
    b(B.handR).rotation.set(-0.08, -0.15, -0.06);

    rig.root.updateMatrixWorld(true);

    if (pose === "sit") {
      const seat = 0.45;
      const hipJoint = seat + 0.09 + fb * 0.05;
      b(B.hips).position.y = hipJoint + 0.03;
      b(B.hips).position.z = -0.02;
      b(B.spine).rotation.x = 0.05;
      rig.root.updateMatrixWorld(true);
      for (const s of [1, -1]) {
        const sb = sideBones(s);
        const ankle = toWorld(
          V(s * (d.hipX + 0.025), d.yAnkle, 0.37 * d.k + 0.06),
        );
        twoBone(
          b(sb.thigh),
          b(sb.shin),
          b(sb.foot),
          ankle,
          dirWorld(V(s * 0.1, 0.4, 1)),
          true,
        );
        const fq = rig.root.getWorldQuaternion(new THREE.Quaternion());
        b(sb.shin).getWorldQuaternion(_q2);
        b(sb.foot).quaternion.copy(_q2.invert().multiply(fq));
        b(sb.foot).updateMatrixWorld(true);
      }
      for (const s of [1, -1]) {
        const sb = sideBones(s);
        const thighTop = hipJoint + 0.1 + fb * 0.06;
        const wrist = toWorld(V(s * 0.115, thighTop + 0.035, 0.17 * d.k));
        twoBone(
          b(sb.arm),
          b(sb.fore),
          b(sb.hand),
          wrist,
          dirWorld(V(s * 0.5, -0.3, -1)),
          false,
        );
        aimHand(
          b(sb.hand),
          dirWorld(V(-s * 0.35, -0.35, 1)),
          dirWorld(V(-s * 0.15, -1, 0.1)),
          s,
        );
      }
    } else if (pose === "wave") {
      const osc = Math.sin(tt * 6.5);
      b(B.clavR).rotation.z = -0.1;
      rig.root.updateMatrixWorld(true);
      const wrist = toWorld(
        V(-d.shX - 0.13 + 0.035 * osc, d.yShoulder + 0.2, 0.1),
      );
      twoBone(
        b(B.armR),
        b(B.foreR),
        b(B.handR),
        wrist,
        dirWorld(V(-0.6, -1, -0.2)),
        false,
      );
      aimHand(
        b(B.handR),
        dirWorld(V(-0.12 + 0.3 * osc, 1, 0.05)),
        dirWorld(V(0, 0, 1)),
        -1,
      );
    } else if (pose === "talk") {
      for (const s of [1, -1]) {
        const sb = sideBones(s);
        const ph = s > 0 ? 0 : 2.1;
        const wrist = toWorld(
          V(
            s * (0.17 + 0.035 * Math.sin(tt * 1.7 + ph)),
            d.yHip + 0.2 + 0.05 * Math.sin(tt * 2.3 + ph + 1),
            0.2 + 0.05 * Math.sin(tt * 1.3 + ph) + 0.03 * fb,
          ),
        );
        twoBone(
          b(sb.arm),
          b(sb.fore),
          b(sb.hand),
          wrist,
          dirWorld(V(s * 0.6, -0.5, -0.6)),
          false,
        );
        aimHand(
          b(sb.hand),
          dirWorld(V(-s * 0.3 + 0.1 * Math.sin(tt * 1.9 + ph), 0.05, 1)),
          dirWorld(V(-s * 0.35, 1, 0)),
          s,
        );
      }
      b(B.head).rotation.x += 0.05 * Math.sin(tt * 2.2);
      b(B.head).updateMatrixWorld(true);
    } else if (pose === "violin" && rig.violin && rig.bow) {
      b(B.head).rotation.set(0.24, 0.42, -0.2);
      b(B.clavL).rotation.z = 0.06;
      rig.root.updateMatrixWorld(true);
      const vm = rig.violin.matrixWorld;
      const vq = rig.violin.getWorldQuaternion(new THREE.Quaternion());
      const Xv = V(1, 0, 0).applyQuaternion(vq);
      const Yv = V(0, 1, 0).applyQuaternion(vq);
      const Zv = V(0, 0, 1).applyQuaternion(vq);
      // left hand on the neck
      const neck = V(0, 0.032, 0.465).applyMatrix4(vm);
      const fingersL = Yv.clone()
        .multiplyScalar(0.9)
        .addScaledVector(Xv, -0.5)
        .addScaledVector(Zv, 0.1);
      const palmL = Xv.clone().negate().addScaledVector(Yv, 0.2);
      const tmp = new THREE.Bone();
      void tmp;
      // first aim, then derive the wrist from the grip point
      const handLB = b(B.handL);
      const gripL = V(-0.022, -0.075, 0.012);
      const Yh = fingersL.clone().normalize().negate();
      const Xh = palmL
        .clone()
        .negate()
        .addScaledVector(Yh, -palmL.clone().negate().dot(Yh))
        .normalize();
      const Zh = new THREE.Vector3().crossVectors(Xh, Yh);
      const qh = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(Xh, Yh, Zh),
      );
      const wristL = neck.clone().sub(gripL.clone().applyQuaternion(qh));
      twoBone(
        b(B.armL),
        b(B.foreL),
        handLB,
        wristL,
        dirWorld(V(0.2, -1, -0.3)),
        false,
      );
      aimHand(handLB, fingersL, palmL, 1);
      // right hand bowing across the strings near the bridge
      const stroke = 0.33 + 0.22 * Math.sin(tt * 1.7);
      const contact = V(0, 0.07, 0.205).applyMatrix4(vm);
      const bowDir = Xv.clone();
      const fingersR = Yv.clone()
        .negate()
        .addScaledVector(Zv, -0.25)
        .normalize();
      const Yr = fingersR.clone().negate();
      const Zr = bowDir
        .clone()
        .addScaledVector(Yr, -bowDir.dot(Yr))
        .normalize();
      const Xr = new THREE.Vector3().crossVectors(Yr, Zr);
      const qr = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(Xr, Yr, Zr),
      );
      const gripR = rig.bow.position.clone();
      const stickPoint = contact
        .clone()
        .addScaledVector(Yv, 0.014)
        .addScaledVector(bowDir, -stroke);
      const bowOffset = V(0, 0, 0.045).applyQuaternion(rig.bow.quaternion);
      const wristR = stickPoint
        .clone()
        .sub(gripR.clone().add(bowOffset).applyQuaternion(qr));
      twoBone(
        b(B.armR),
        b(B.foreR),
        b(B.handR),
        wristR,
        dirWorld(V(-0.8, -0.5, -0.2)),
        false,
      );
      setWorldBasis(b(B.handR), Xr, Yr, Zr);
    }

    // eyes: blinks and saccades
    if (rig.head) {
      if (t > nextBlink) {
        blinkStart = t;
        nextBlink = t + 2.2 + hash(t + seed) * 4;
      }
      const bt = (t - blinkStart) / 0.16;
      const close = bt >= 0 && bt <= 1 ? Math.sin(bt * Math.PI) : 0;
      rig.head.lids.forEach(
        (l, i) => (l.rotation.x = rig.head!.lidRest[i]! + close * 0.85),
      );
      if (t > nextSacc) {
        sacc = V(
          (hash(t * 1.3 + seed) - 0.5) * 0.25,
          (hash(t * 2.1 + seed) - 0.5) * 0.12,
          0,
        );
        nextSacc = t + 0.6 + hash(t + 3 + seed) * 2.2;
      }
      for (const e of rig.head.eyes) {
        e.rotation.y += (sacc.x - e.rotation.y) * Math.min(1, dt * 25);
        e.rotation.x += (-sacc.y - e.rotation.x) * Math.min(1, dt * 25);
      }
    }
  };
  return { setPose, update };
}

let humanCount = 0;

function assemble(look: Look, outfit: Outfit, fp: boolean): Human {
  const rig = buildRig(look, outfit, fp);
  const group = new THREE.Group();
  group.add(rig.root);
  if (fp) rig.root.position.z = 0.05;
  const anim = animator(rig, hash(++humanCount * 7.13), fp);
  anim.setPose("stand");
  anim.update(0, 0, 0);
  return { group, height: rig.d.H, setPose: anim.setPose, update: anim.update };
}

export function makeHuman(look: Look, outfit: Outfit): Human {
  return assemble(look, outfit, false);
}

/** The player's body without a head, for the first-person camera to look down at. */
export function makeFirstPersonBody(look: Look, outfit: Outfit): Human {
  return assemble(look, outfit, true);
}
