import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  concrete,
  emissive,
  fabric,
  marble,
  metal,
  pbr,
  repeat,
  seeded,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneCtx, SceneModule } from "../fp/types";

/*
 * Caramel Sweet & Salt (Center Shopping Uberlândia, 2nd floor), 19/10/2026:
 * Davi and Elena's one-month dinner, right before the cinema.
 *
 * What the references show, and where it went:
 * - Elena's selfie (IMG_6193): she sits on a dark upholstered sofa, the big
 *   night window right at her left with a light wood sill, a concrete pillar
 *   beside it. Past her backrest: another table and a grey sofa facing it, then
 *   tables with beige chairs, a wall clad in warm wood, a white dome pendant,
 *   a small green exit sign.
 *   -> booths perpendicular to the window (z = -8): sofas facing each other in
 *      pairs across a table, repeated (Davi: "vários sofás um de frente pro
 *      outro e várias mesas"); round tables with beige chairs in the middle.
 * - Their selfies (IMG_6194, 6200-6230): the two of them side by side on the
 *   sofa, Elena at the window end, Davi on her right; behind them the concrete
 *   pillar with the round "Caramel" logo, the dark window strip beside it.
 *   -> their sofa backs onto the pillar (x = 0); two chairs across the table
 *      (IMG_6217/6218: a beige chair across, the wood-clad wainscot and the
 *      window beyond; Davi: "sofá de parede, mesa dupla, duas cadeiras").
 * - The food (IMG_6196-6199, 6214-6219): a dark stone plate with two fried
 *   balls on white cream with a herb leaf; a cast-iron skillet with meatballs
 *   in tomato sauce, white mozzarella, an arugula sprig and potato wedges with
 *   rosemary, on a white paper placemat with a grey print; stemmed water glasses
 *   (one with a gin and lime), a small table card, a beige stone table top.
 * - Public photo of the venue: wood floor, upholstered chairs on wooden legs,
 *   round tables, concrete columns.
 *
 * Floor plan (meters): x in [-6, 6], z in [-8, 6], ceiling at 3.3 m. Entrance
 * from the mall corridor through the glass front (z = 6). Their booth is the
 * one against the pillar in the middle of the window row (table at x = 1.2).
 */

/* ---------------- room ---------------- */

const X0 = -6;
const X1 = 6;
const Z0 = -8;
const Z1 = 6;
const H = 3.3;
const SILL = 1.05; // top of the concrete ledge under the window
const TOP = 0.76; // table top height

/** The window booths: sofas run along z from the window ledge into the room. */
const BZ0 = Z0 + 0.24; // window end of the sofas
const BZ1 = BZ0 + 1.3; // aisle end
const SOFA = 0.575; // sofa depth, back included
/** The concrete pillar at the window, behind their sofa (x range). */
const PIL0 = -0.3;
const PIL1 = 0.3;
/** Their table: in front of the sofa against the pillar. */
const HX = PIL1 + SOFA + 0.35;
const HZ = (BZ0 + BZ1) / 2;
/** Centers of the other booth pairs (sofa, table, sofa). */
const PAIRS = [-4.925, -3.075, PIL0 - SOFA - 0.35, 3.2, 5.05];

/* ---------------- geometry batching ---------------- */

type Kit = Map<THREE.Material, THREE.BufferGeometry[]>;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const WHITE = new THREE.Color(1, 1, 1);

function norm(geo: THREE.BufferGeometry, color: THREE.Color = WHITE) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes))
    if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position!.count;
  if (!g.attributes.uv)
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = color.r;
    col[i * 3 + 1] = color.g;
    col[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function putM(
  kit: Kit,
  mat: THREE.Material,
  geo: THREE.BufferGeometry,
  m: THREE.Matrix4,
  color?: THREE.Color,
) {
  const g = norm(geo, color);
  g.applyMatrix4(m);
  const list = kit.get(mat);
  if (list) list.push(g);
  else kit.set(mat, [g]);
}

function put(
  kit: Kit,
  mat: THREE.Material,
  geo: THREE.BufferGeometry,
  p: [number, number, number],
  r: [number, number, number] = [0, 0, 0],
  s: [number, number, number] = [1, 1, 1],
  color?: THREE.Color,
) {
  _m.compose(
    _p.set(p[0], p[1], p[2]),
    _q.setFromEuler(_e.set(r[0], r[1], r[2])),
    _s.set(s[0], s[1], s[2]),
  );
  putM(kit, mat, geo, _m, color);
}

/** A box stretched between two points. */
function beam(
  kit: Kit,
  mat: THREE.Material,
  a: THREE.Vector3,
  b: THREE.Vector3,
  w: number,
  d = w,
) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    new THREE.Vector3(1, 1, 1),
  );
  putM(kit, mat, new THREE.BoxGeometry(w, len, d), m);
}

function bake(kit: Kit, root: THREE.Object3D, cast = true, receive = true) {
  for (const [mat, geos] of kit) {
    const geo = mergeGeometries(geos, false);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
  kit.clear();
}

function instanced(
  root: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  mats: THREE.Matrix4[],
  cast = true,
) {
  const im = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((m, i) => im.setMatrixAt(i, m));
  im.castShadow = cast;
  im.receiveShadow = true;
  root.add(im);
  return im;
}

function mat4(
  x: number,
  y: number,
  z: number,
  ry = 0,
  rx = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
    new THREE.Vector3(sx, sy, sz),
  );
}

/* ---------------- noise ---------------- */

function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) =>
    hash3(ix + dx, iy + dy, iz + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), sx), l(c(0, 1, 0), c(1, 1, 0), sx), sy),
    l(l(c(0, 0, 1), c(1, 0, 1), sx), l(c(0, 1, 1), c(1, 1, 1), sx), sy),
    sz,
  );
}

/** Fractal noise in [-1, 1]. */
function fbm(x: number, y: number, z: number, oct = 3) {
  let a = 0.5;
  let f = 1;
  let s = 0;
  let t = 0;
  for (let i = 0; i < oct; i++) {
    s += a * (vnoise(x * f, y * f, z * f) * 2 - 1);
    t += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / t;
}

/** Pushes every vertex along its direction from `c` by a noise amount (lumpy food). */
function lumpy(
  geo: THREE.BufferGeometry,
  amp: number,
  freq: number,
  seed: number,
  sy = 1,
) {
  const p = geo.attributes.position!;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k =
      1 + amp * fbm(v.x * freq + seed, v.y * freq, v.z * freq - seed, 3);
    v.multiplyScalar(k);
    v.y *= sy;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------------- canvas textures ---------------- */

function canvas2d(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

function toTex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sobel normal map from a grayscale height canvas. */
function normalFrom(src: HTMLCanvasElement, strength: number) {
  const w = src.width;
  const h = src.height;
  const sg = src.getContext("2d", { willReadFrequently: true });
  if (!sg) throw new Error("2d canvas unavailable");
  const d = sg.getImageData(0, 0, w, h).data;
  const { c, g } = canvas2d(w, h);
  const img = g.createImageData(w, h);
  const o = img.data;
  const at = (x: number, y: number) =>
    (d[(((y + h) % h) * w + ((x + w) % w)) * 4] ?? 0) / 255;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      o[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      o[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      o[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      o[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return toTex(c, false);
}

/** Random dots on a canvas (color specks and height bumps). */
function specks(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  n: number,
  colors: string[],
  rMin: number,
  rMax: number,
) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(rand() * colors.length)] ?? "#000";
    g.beginPath();
    g.arc(
      rand() * w,
      rand() * h,
      rMin + rand() * (rMax - rMin),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
}

type FoodMaps = { map: THREE.Texture; normalMap: THREE.Texture };

/** A color + bump pair painted from colored specks over a base. */
function speckMaps(
  size: number,
  seed: number,
  base: string,
  colors: string[],
  count: number,
  rMin: number,
  rMax: number,
  bump: number,
): FoodMaps {
  const rand = seeded(seed);
  const col = canvas2d(size);
  col.g.fillStyle = base;
  col.g.fillRect(0, 0, size, size);
  specks(col.g, size, size, rand, count, colors, rMin, rMax);
  const hgt = canvas2d(size);
  hgt.g.fillStyle = "#808080";
  hgt.g.fillRect(0, 0, size, size);
  const r2 = seeded(seed + 11);
  specks(
    hgt.g,
    size,
    size,
    r2,
    count,
    ["#ffffff", "#c0c0c0", "#404040", "#000000"],
    rMin,
    rMax,
  );
  return { map: toTex(col.c), normalMap: normalFrom(hgt.c, bump) };
}

/** Vertical wood grain (slats, booth frames): grain runs along V. */
function grainTex(base: string, seed: number) {
  const rand = seeded(seed);
  const w = 128;
  const h = 512;
  const { c, g } = canvas2d(w, h);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = rand() * w;
    const dark = rand() < 0.6;
    g.strokeStyle = dark
      ? `rgba(60,30,12,${0.08 + rand() * 0.18})`
      : `rgba(255,220,170,${0.05 + rand() * 0.1})`;
    g.lineWidth = 0.6 + rand() * 2.2;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 32)
      g.lineTo(x + Math.sin(y * 0.02 + i) * (1 + rand() * 2), y);
    g.stroke();
  }
  return toTex(c);
}

/** The white paper placemat with its grey ornamental print. */
function placematTex() {
  const s = 512;
  const { c, g } = canvas2d(s);
  g.fillStyle = "#f3f0ea";
  g.fillRect(0, 0, s, s);
  g.strokeStyle = "rgba(110,108,104,0.75)";
  g.lineWidth = 1.6;
  const n = 8;
  const step = s / n;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = i * step;
      const y = j * step;
      // a little rosette at every node and a diamond between
      g.beginPath();
      g.arc(x, y, step * 0.22, 0, Math.PI * 2);
      g.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        g.beginPath();
        g.ellipse(
          x + Math.cos(a) * step * 0.3,
          y + Math.sin(a) * step * 0.3,
          step * 0.12,
          step * 0.05,
          a,
          0,
          Math.PI * 2,
        );
        g.stroke();
      }
      g.beginPath();
      g.moveTo(x + step / 2, y + step * 0.32);
      g.lineTo(x + step * 0.68, y + step / 2);
      g.lineTo(x + step / 2, y + step * 0.68);
      g.lineTo(x + step * 0.32, y + step / 2);
      g.closePath();
      g.stroke();
    }
  return toTex(c);
}

/** The round "Caramel sweet & salt" logo (transparent background). */
function logoTex() {
  const s = 512;
  const { c, g } = canvas2d(s);
  g.clearRect(0, 0, s, s);
  g.fillStyle = "rgba(236,228,214,0.92)";
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.47, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#4a3022";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.43, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(s / 2, s / 2, s * 0.405, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#4a3022";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "italic 700 112px Georgia, 'Times New Roman', serif";
  g.fillText("Caramel", s / 2, s * 0.47);
  g.font = "600 34px Georgia, serif";
  g.fillText("SWEET  &  SALT", s / 2, s * 0.62);
  g.fillRect(s * 0.3, s * 0.555, s * 0.4, 2);
  return toTex(c);
}

/** The view out of the window at night: sky glow, tree canopies, city lights. */
function nightTex() {
  const w = 1024;
  const h = 384;
  const rand = seeded(77);
  const { c, g } = canvas2d(w, h);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0b1220");
  sky.addColorStop(0.55, "#1a2233");
  sky.addColorStop(1, "#0a0c10");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // distant buildings with lit windows
  for (let i = 0; i < 14; i++) {
    const bx = rand() * w;
    const bw = 30 + rand() * 70;
    const bh = 60 + rand() * 150;
    g.fillStyle = "#0d1119";
    g.fillRect(bx, h * 0.62 - bh, bw, bh + h);
    for (let k = 0; k < 18; k++) {
      if (rand() < 0.5) continue;
      g.fillStyle = rand() < 0.7 ? "#ffcf8a" : "#9fc7ff";
      g.globalAlpha = 0.4 + rand() * 0.5;
      g.fillRect(
        bx + 4 + rand() * (bw - 10),
        h * 0.62 - bh + 6 + rand() * (bh - 12),
        3,
        4,
      );
    }
    g.globalAlpha = 1;
  }
  // street lights (soft bokeh)
  for (let i = 0; i < 40; i++) {
    const x = rand() * w;
    const y = h * (0.55 + rand() * 0.35);
    const r = 3 + rand() * 9;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const warm = rand() < 0.75;
    gr.addColorStop(
      0,
      warm ? "rgba(255,210,150,0.95)" : "rgba(170,210,255,0.9)",
    );
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // tree canopies in front, almost black green
  for (let i = 0; i < 26; i++) {
    const x = rand() * w;
    const y = h * (0.45 + rand() * 0.45);
    const r = 40 + rand() * 70;
    for (let k = 0; k < 18; k++) {
      g.fillStyle = `rgba(${8 + rand() * 10},${16 + rand() * 14},${10 + rand() * 8},0.9)`;
      g.beginPath();
      g.arc(
        x + (rand() - 0.5) * r * 1.4,
        y + (rand() - 0.5) * r * 0.9,
        r * (0.25 + rand() * 0.35),
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
  // a few lights caught between the leaves (as in Elena's selfie)
  for (let i = 0; i < 30; i++) {
    const x = rand() * w;
    const y = h * (0.4 + rand() * 0.5);
    g.fillStyle = "rgba(255,236,200,0.85)";
    g.fillRect(x, y, 2, 2);
  }
  return toTex(c);
}

/** The mall corridor seen through the entrance: bright floor and shop lights. */
function mallTex() {
  const w = 512;
  const h = 256;
  const rand = seeded(91);
  const { c, g } = canvas2d(w, h);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#d9d3c8");
  gr.addColorStop(0.55, "#efe9df");
  gr.addColorStop(0.62, "#b9b1a5");
  gr.addColorStop(1, "#e7e1d6");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const x = i * 90 + rand() * 30;
    g.fillStyle = ["#2b2b2b", "#6b4a32", "#e8e2d4", "#1f3b57"][i % 4] ?? "#333";
    g.fillRect(x, h * 0.18, 70, h * 0.42);
    g.fillStyle = "rgba(255,244,220,0.9)";
    g.fillRect(x + 8, h * 0.24, 54, h * 0.3);
  }
  for (let i = 0; i < 10; i++) {
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.fillRect(i * 52 + 10, h * 0.05, 22, 4);
  }
  return toTex(c);
}

function tableCardTex() {
  const { c, g } = canvas2d(256, 320);
  g.fillStyle = "#f6f3ee";
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#4a3022";
  g.textAlign = "center";
  g.font = "italic 700 46px Georgia, serif";
  g.fillText("Caramel", 128, 80);
  g.font = "600 16px Georgia, serif";
  g.fillText("SWEET & SALT", 128, 108);
  // a QR-like square
  const rand = seeded(5);
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 15; x++)
      if (rand() < 0.5) g.fillRect(68 + x * 8, 150 + y * 8, 8, 8);
  g.fillRect(68, 150, 24, 24);
  g.fillRect(164, 150, 24, 24);
  g.fillRect(68, 246, 24, 24);
  return toTex(c);
}

function exitSignTex() {
  const { c, g } = canvas2d(256, 96);
  g.fillStyle = "#0f8a3c";
  g.fillRect(0, 0, 256, 96);
  g.fillStyle = "#ffffff";
  g.font = "700 48px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("SAÍDA", 150, 50);
  g.beginPath();
  g.moveTo(26, 48);
  g.lineTo(60, 24);
  g.lineTo(60, 72);
  g.fill();
  return toTex(c);
}

/* ---------------- food & tableware geometry ---------------- */

function lathe(pts: [number, number][], seg: number) {
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
}

/** Stemmed water goblet (shell with thickness). */
function gobletGeo(seg = 20) {
  return lathe(
    [
      [0, 0],
      [0.034, 0],
      [0.035, 0.004],
      [0.008, 0.008],
      [0.0045, 0.02],
      [0.0042, 0.07],
      [0.012, 0.078],
      [0.034, 0.092],
      [0.042, 0.125],
      [0.04, 0.165],
      [0.038, 0.165],
      [0.0395, 0.126],
      [0.032, 0.095],
      [0.011, 0.082],
      [0, 0.08],
    ],
    seg,
  );
}

/** One arugula leaf: lobed sides and a round terminal lobe, lying along -Z. */
function arugulaGeo() {
  const L = 0.068;
  const N = 46;
  const width = (t: number, side: number) => {
    if (t > 0.6) {
      const u = (t - 0.8) / 0.2;
      return 0.0165 * Math.sqrt(Math.max(0, 1 - u * u));
    }
    const lobe = Math.abs(Math.sin(t * Math.PI * 3.3 + (side > 0 ? 0 : 0.5)));
    return 0.0015 + 0.012 * Math.pow(t, 0.8) * (0.3 + 0.7 * lobe);
  };
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(width(t, 1), t * L));
  }
  for (let i = N - 1; i > 0; i--) {
    const t = i / N;
    pts.push(new THREE.Vector2(-width(t, -1), t * L));
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2); // length now along -Z, face up
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const d = -p.getZ(i);
    const y =
      0.005 * Math.sin((Math.PI * d) / L) +
      0.22 * Math.abs(x) +
      0.0015 * Math.sin(d * 260);
    p.setY(i, y);
  }
  g.computeVertexNormals();
  return g;
}

/** Basil leaf: ovate and cupped, lying along -Z. */
function basilGeo(L: number) {
  const pts: THREE.Vector2[] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(
      new THREE.Vector2(
        0.42 * L * Math.sin(Math.PI * Math.pow(t, 0.75)),
        t * L,
      ),
    );
  }
  for (let i = N - 1; i > 0; i--) {
    const t = i / N;
    pts.push(
      new THREE.Vector2(
        -0.42 * L * Math.sin(Math.PI * Math.pow(t, 0.75)),
        t * L,
      ),
    );
  }
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts));
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const d = -p.getZ(i);
    p.setY(i, (0.9 * (x * x)) / L + 0.12 * L * Math.sin((Math.PI * d) / L));
  }
  g.computeVertexNormals();
  return g;
}

/** A roasted potato wedge: an extruded pie slice, tapered toward both ends. */
function wedgeGeo() {
  const r = 0.026;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(r, 0);
  s.absarc(0, 0, r, 0, 1.1, false);
  s.lineTo(0, 0);
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(s, {
    depth: 0.058,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 7,
    steps: 6,
  });
  g.translate(-r * 0.5, -r * 0.35, -0.029);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const f = 1 - 0.5 * Math.pow(Math.min(1, Math.abs(z) / 0.034), 2);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f + 0.002 * Math.sin(z * 90), z);
  }
  g.deleteAttribute("normal");
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}

/* ---------------- the scene ---------------- */

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  davi: {
    top: "#5a3b2b",
    topStyle: "tshirt",
    bottom: "#2f3542",
    bottomStyle: "jeans",
    shoes: "#ececec",
  },
  elena: {
    top: "#1d1d1d",
    topStyle: "blouse",
    bottom: "#22252d",
    bottomStyle: "jeans",
    shoes: "#141414",
  },
};

function build(ctx: SceneCtx) {
  const root = new THREE.Group();
  ctx.scene.add(root);
  const low = ctx.quality === "low";
  const rand = seeded(1910);
  const kit: Kit = new Map();
  const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  /* ---------- materials ---------- */
  const floorMat = pbr(repeat(woodPlanks("#7a5234", 6, 41), 6, 7), {
    roughness: 0.7,
  });
  const concreteMat = pbr(repeat(concrete("#9b968e", 31), 3, 1.2), {
    roughness: 0.95,
  });
  const ceilMat = pbr(repeat(concrete("#bdb6ab", 43), 4, 5), {
    roughness: 1,
  });
  const slatMat = new THREE.MeshStandardMaterial({
    map: grainTex("#a8673a", 3),
    roughness: 0.62,
    vertexColors: true,
  });
  const lightWood = new THREE.MeshStandardMaterial({
    map: grainTex("#c09468", 9),
    roughness: 0.55,
    vertexColors: true,
  });
  // table tops: light beige stone with soft veins (IMG_6214, 6217)
  const tableStone = pbr(
    repeat(marble("#e4d8c4", "rgba(150,120,90,0.28)", 51), 1, 1),
    { roughness: 0.32 },
  );
  const benchFab = pbr(repeat(fabric("#3c3835", 61), 3, 3), {
    roughness: 0.95,
  });
  const chairFab = pbr(repeat(fabric("#b6a38b", 67), 2, 2), {
    roughness: 0.95,
  });
  const blackMetal = metal("#1d1c1b", 0.45);
  const bronze = metal("#2a2522", 0.5);
  const steel = metal("#d4d4d2", 0.22);
  const porcelain = new THREE.MeshStandardMaterial({
    color: "#f6f4ef",
    roughness: 0.18,
  });
  const napkinMat = pbr(repeat(fabric("#ede7dc", 71), 1, 1), {
    roughness: 0.9,
  });
  const clearGlass = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.2,
    envMapIntensity: 2.5,
    depthWrite: false,
  });
  const whiteMatte = new THREE.MeshStandardMaterial({
    color: "#f2efe9",
    roughness: 0.75,
    side: THREE.DoubleSide,
  });

  /* ---------- floor, ceiling ---------- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(X1 - X0, Z1 - Z0),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  floor.receiveShadow = true;
  root.add(floor);
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(X1 - X0, Z1 - Z0),
    ceilMat,
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((X0 + X1) / 2, H, (Z0 + Z1) / 2);
  root.add(ceil);

  /* ---------- left wall: warm wood slats (IMG_6193 background) ---------- */
  {
    put(kit, concreteMat, new THREE.BoxGeometry(0.1, H, Z1 - Z0), [
      X0 - 0.05,
      H / 2,
      (Z0 + Z1) / 2,
    ]);
    const slat = new THREE.BoxGeometry(0.09, H - 0.12, 0.024);
    for (let z = Z0 + 0.06; z < Z1 - 0.04; z += 0.105) {
      // each board a slightly different tone; width along z, grain vertical
      const tone = new THREE.Color().setScalar(0.82 + rand() * 0.3);
      put(
        kit,
        slatMat,
        slat,
        [X0 + 0.013, (H - 0.12) / 2, z],
        [0, Math.PI / 2, 0],
        [1, 1, 1],
        tone,
      );
    }
    // dark shadow gap behind the slats
    put(kit, blackMetal, new THREE.BoxGeometry(0.005, H, Z1 - Z0), [
      X0 + 0.0005,
      H / 2,
      (Z0 + Z1) / 2,
    ]);
    // cove on top, with a warm LED line (the glowing soffit in the selfie)
    put(kit, ceilMat, new THREE.BoxGeometry(0.22, 0.12, Z1 - Z0), [
      X0 + 0.11,
      H - 0.06,
      (Z0 + Z1) / 2,
    ]);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.02, Z1 - Z0 - 0.2),
      emissive("#ffb46a", 3.2),
    );
    led.position.set(X0 + 0.2, H - 0.125, (Z0 + Z1) / 2);
    root.add(led);
  }

  /* ---------- right wall: concrete, wood band, logo (Davi's selfies) ---------- */
  {
    put(kit, concreteMat, new THREE.BoxGeometry(0.12, 2.5, Z1 - Z0), [
      X1 + 0.06,
      1.25,
      (Z0 + Z1) / 2,
    ]);
    // wood band up to the ceiling, vertical boards
    const board = new THREE.BoxGeometry(0.14, H - 2.5, 0.02);
    for (let z = Z0 + 0.07; z < Z1; z += 0.15)
      put(
        kit,
        lightWood,
        board,
        [X1 - 0.01, 2.5 + (H - 2.5) / 2, z],
        [0, Math.PI / 2, 0],
        [1, 1, 1],
        new THREE.Color().setHSL(0.08, 0.3, 0.75 + rand() * 0.15),
      );
    // baseboard
    put(kit, bronze, new THREE.BoxGeometry(0.015, 0.08, Z1 - Z0), [
      X1 - 0.008,
      0.04,
      (Z0 + Z1) / 2,
    ]);
    // concrete column half-embedded in the wall, between logo and window
    put(kit, concreteMat, new THREE.BoxGeometry(0.3, H, 0.45), [
      X1 - 0.15,
      H / 2,
      -2.2,
    ]);
  }

  /* ---------- window wall: ledge, glass, night view (IMG_6193, 6218) ---------- */
  {
    // light wood wainscot under the glass, horizontal planks (IMG_6193 at
    // Elena's side, IMG_6217/6218 across their table), and a wooden sill
    const board = new THREE.BoxGeometry(1.5, SILL / 4 - 0.004, 0.24);
    for (let x = X0 + 0.75; x < X1; x += 1.5)
      for (let k = 0; k < 4; k++)
        put(
          kit,
          lightWood,
          board,
          [x, (k + 0.5) * (SILL / 4), Z0 + 0.1],
          [0, 0, 0],
          [1, 1, 1],
          new THREE.Color().setScalar(0.82 + rand() * 0.24),
        );
    put(
      kit,
      lightWood,
      new THREE.BoxGeometry(X1 - X0, 0.035, 0.3),
      [0, SILL + 0.0175, Z0 + 0.12],
      [0, 0, 0],
      [1, 1, 1],
      new THREE.Color(0.95, 0.9, 0.85),
    );
    put(kit, concreteMat, new THREE.BoxGeometry(X1 - X0, H - 3.0, 0.24), [
      0,
      (H + 3.0) / 2,
      Z0 + 0.1,
    ]);
    // mullions every 1.5 m and a transom
    for (let x = X0 + 0.03; x <= X1; x += 1.5)
      put(kit, bronze, new THREE.BoxGeometry(0.06, 3.0 - SILL, 0.1), [
        Math.min(x, X1 - 0.03),
        (SILL + 3.0) / 2,
        Z0 - 0.0,
      ]);
    put(kit, bronze, new THREE.BoxGeometry(X1 - X0, 0.06, 0.1), [0, 3.0, Z0]);
    put(kit, bronze, new THREE.BoxGeometry(X1 - X0, 0.04, 0.1), [
      0,
      SILL + 0.02,
      Z0,
    ]);
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(X1 - X0, 3.0 - SILL),
      new THREE.MeshStandardMaterial({
        color: "#1d2329",
        roughness: 0.04,
        metalness: 0.2,
        transparent: true,
        opacity: 0.16,
        envMapIntensity: 1.6,
        depthWrite: false,
      }),
    );
    pane.position.set(0, (SILL + 3.0) / 2, Z0 + 0.0);
    root.add(pane);
    const outside = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 6.5),
      new THREE.MeshBasicMaterial({ map: nightTex(), toneMapped: true }),
    );
    outside.position.set(0, 1.4, Z0 - 3.2);
    root.add(outside);
    // dark exterior slab under the view so looking down through the glass stays dark
    const slab = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 3.2),
      new THREE.MeshBasicMaterial({ color: "#07080a" }),
    );
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(0, 0.6, Z0 - 1.6);
    root.add(slab);
  }

  /* ---------- front: glass storefront onto the mall, entrance ---------- */
  const DOOR0 = 3.3;
  const DOOR1 = 4.7;
  {
    const FH = 2.7;
    put(
      kit,
      lightWood,
      new THREE.BoxGeometry(X1 - X0, H - FH, 0.14),
      [0, (H + FH) / 2, Z1],
      [0, 0, 0],
      [1, 1, 1],
      new THREE.Color(0.9, 0.85, 0.8),
    );
    const runs: [number, number][] = [
      [X0, DOOR0],
      [DOOR1, X1],
    ];
    const frontGlass = new THREE.MeshStandardMaterial({
      color: "#cfd8dc",
      roughness: 0.05,
      transparent: true,
      opacity: 0.14,
      envMapIntensity: 1.5,
      depthWrite: false,
    });
    for (const [a, b] of runs) {
      put(kit, bronze, new THREE.BoxGeometry(b - a, 0.12, 0.08), [
        (a + b) / 2,
        0.06,
        Z1,
      ]);
      put(kit, bronze, new THREE.BoxGeometry(b - a, 0.05, 0.08), [
        (a + b) / 2,
        FH - 0.025,
        Z1,
      ]);
      for (
        let x = a;
        x <= b + 0.001;
        x += (b - a) / Math.max(1, Math.round((b - a) / 1.4))
      )
        put(kit, bronze, new THREE.BoxGeometry(0.05, FH, 0.08), [
          x,
          FH / 2,
          Z1,
        ]);
      const g = new THREE.Mesh(
        new THREE.PlaneGeometry(b - a, FH - 0.17),
        frontGlass,
      );
      g.position.set((a + b) / 2, 0.12 + (FH - 0.17) / 2, Z1);
      root.add(g);
      ctx.wall(
        a === X0 ? a - 0.3 : a,
        Z1 - 0.05,
        b === X1 ? b + 0.3 : b,
        Z1 + 0.3,
      );
    }
    // mall outside: floor, the facing shops, corridor ceiling
    const mallFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshStandardMaterial({ color: "#d8d2c7", roughness: 0.35 }),
    );
    mallFloor.rotation.x = -Math.PI / 2;
    mallFloor.position.set(0, 0, Z1 + 2);
    root.add(mallFloor);
    const shops = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({ map: mallTex() }),
    );
    shops.position.set(0, 2, Z1 + 4);
    shops.rotation.y = Math.PI;
    root.add(shops);
    const mallCeil = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({ color: "#e9e4da" }),
    );
    mallCeil.rotation.x = Math.PI / 2;
    mallCeil.position.set(0, 3.6, Z1 + 2);
    root.add(mallCeil);
    ctx.wall(DOOR0 - 0.5, Z1 + 0.75, DOOR1 + 0.5, Z1 + 1.1);
    // green exit sign over the door (seen small in IMG_6193)
    const signTex = exitSignTex();
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.13, 0.04),
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: "#ffffff",
        emissiveMap: signTex,
        emissiveIntensity: 1.6,
      }),
    );
    sign.position.set((DOOR0 + DOOR1) / 2, 2.95, Z1 - 0.1);
    sign.rotation.y = Math.PI;
    root.add(sign);
  }

  /* ---------- walls on the floor plan ---------- */
  ctx.wall(X0 - 0.4, Z0 - 0.4, X1 + 0.4, Z0 + 0.22);
  ctx.wall(X0 - 0.4, Z0, X0 + 0.04, Z1 + 0.4);
  ctx.wall(X1 - 0.03, Z0, X1 + 0.4, Z1 + 0.4);
  ctx.wall(X1 - 0.3, -2.45, X1, -1.95);

  /* ---------- the booths along the window (IMG_6193, 6217, 6218) ---------- */
  // The sofas run from the window into the room and face each other in pairs
  // across a table (IMG_6193: past Elena's backrest, another table and a grey
  // sofa facing it). Their backs are clad in light wood planks (seen across
  // their table, under the window, in IMG_6217/6218). Theirs is the sofa
  // against the concrete pillar with the logo (their selfies), with two beige
  // chairs across the table (IMG_6217).
  const sofaGeo = {
    plinth: new THREE.BoxGeometry(SOFA - 0.06, 0.32, BZ1 - BZ0),
    seat: new RoundedBoxGeometry(0.45, 0.13, BZ1 - BZ0 - 0.03, 3, 0.03),
    back: new RoundedBoxGeometry(0.11, 0.56, BZ1 - BZ0 - 0.03, 3, 0.04),
    plank: new THREE.BoxGeometry(0.035, 0.255, BZ1 - BZ0 + 0.04),
    cap: new THREE.BoxGeometry(0.08, 0.035, BZ1 - BZ0 + 0.04),
    end: new THREE.BoxGeometry(SOFA - 0.035, 0.5, 0.035),
  };
  /** A sofa whose back is at x = xBack, seated toward +X (dir 1) or -X (dir -1). */
  const sofa = (xBack: number, dir: 1 | -1) => {
    const zc = (BZ0 + BZ1) / 2;
    const at = (d: number) => xBack + dir * d;
    put(kit, lightWood, sofaGeo.plinth, [
      at(0.035 + (SOFA - 0.06) / 2),
      0.16,
      zc,
    ]);
    put(kit, benchFab, sofaGeo.seat, [at(SOFA - 0.225), 0.385, zc]);
    put(kit, benchFab, sofaGeo.back, [at(0.095), 0.74, zc], [0, 0, dir * 0.08]);
    // the wooden shell: four horizontal planks, a slightly different tone each
    for (let k = 0; k < 4; k++)
      put(
        kit,
        lightWood,
        sofaGeo.plank,
        [at(0.0175), 0.15 + k * 0.26, zc],
        [0, 0, 0],
        [1, 1, 1],
        new THREE.Color().setScalar(0.84 + rand() * 0.22),
      );
    put(kit, lightWood, sofaGeo.cap, [at(0.04), 1.1, zc]);
    put(kit, lightWood, sofaGeo.end, [at(SOFA / 2 + 0.0175), 0.25, BZ1 + 0.02]);
    ctx.wall(
      Math.min(xBack, at(SOFA)),
      BZ0 - 0.05,
      Math.max(xBack, at(SOFA)),
      BZ1 + 0.04,
    );
  };

  // the concrete pillar at the window behind their sofa, with the round logo
  {
    put(kit, concreteMat, new THREE.BoxGeometry(PIL1 - PIL0, H, 0.7), [
      (PIL0 + PIL1) / 2,
      H / 2,
      Z0 + 0.35,
    ]);
    // a light wood half wall closes the gap between the two sofa backs
    put(
      kit,
      lightWood,
      new THREE.BoxGeometry(PIL1 - PIL0, 1.12, BZ1 - Z0 - 0.7),
      [(PIL0 + PIL1) / 2, 0.56, (Z0 + 0.7 + BZ1) / 2],
    );
    ctx.wall(PIL0, Z0, PIL1, BZ1 + 0.04);
    const logoMat = new THREE.MeshStandardMaterial({
      map: logoTex(),
      transparent: true,
      roughness: 0.85,
    });
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.29, 64), logoMat);
    logo.position.set(PIL1 + 0.004, 1.95, Z0 + 0.35);
    logo.rotation.y = Math.PI / 2;
    root.add(logo);
  }

  /* ---------- tables and chairs ---------- */
  // chair: upholstered seat and back, light wooden legs; the sitter faces +Z
  const chairSeat = new RoundedBoxGeometry(0.46, 0.09, 0.46, 3, 0.025);
  chairSeat.translate(0, 0.455, 0.0);
  const chairBack = new RoundedBoxGeometry(0.44, 0.46, 0.07, 3, 0.025);
  chairBack.rotateX(-0.12);
  chairBack.translate(0, 0.76, -0.21);
  const chairFabGeo = mergeGeometries(
    [norm(chairSeat), norm(chairBack)],
    false,
  );
  const legParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const l = new THREE.CylinderGeometry(
        0.014,
        0.019,
        sz < 0 ? 0.44 : 0.42,
        8,
      );
      l.translate(0, 0.21, 0);
      if (sz < 0) l.rotateX(-0.08);
      l.translate(sx * 0.19, 0, sz * 0.19);
      legParts.push(norm(l));
    }
  const chairLegGeo = mergeGeometries(legParts, false);
  const chairM: THREE.Matrix4[] = [];
  const chair = (x: number, z: number, ry: number) => {
    chairM.push(mat4(x, 0, z, ry));
    ctx.wall(x - 0.24, z - 0.24, x + 0.24, z + 0.24);
  };

  // tables: wooden tops on black pedestals
  const rectTop = new RoundedBoxGeometry(0.7, 0.04, 1.2, 2, 0.008);
  const roundTop = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 48);
  const pedestal = (() => {
    const col = new THREE.CylinderGeometry(0.035, 0.035, TOP - 0.06, 12);
    col.translate(0, (TOP - 0.06) / 2 + 0.02, 0);
    const a = new THREE.BoxGeometry(0.56, 0.03, 0.06);
    a.translate(0, 0.015, 0);
    const b = a.clone().rotateY(Math.PI / 2);
    const plate = new THREE.BoxGeometry(0.3, 0.02, 0.3);
    plate.translate(0, TOP - 0.05, 0);
    return mergeGeometries([norm(col), norm(a), norm(b), norm(plate)], false);
  })();
  const rectM: THREE.Matrix4[] = [];
  const roundM: THREE.Matrix4[] = [];
  const pedM: THREE.Matrix4[] = [];

  /** Settings (where people would sit) to dress with napkins, cutlery and a glass. */
  const places: { x: number; z: number; ry: number }[] = [];

  // booth pairs: sofa, table, sofa, repeated along the window
  const boothTable = (x: number) => {
    rectM.push(mat4(x, TOP - 0.02, HZ));
    // one pedestal, its feet turned diagonally, clear of the sitters' feet
    pedM.push(mat4(x, 0, HZ, Math.PI / 4));
    ctx.wall(x - 0.35, HZ - 0.6, x + 0.35, HZ + 0.6);
  };
  for (const c of PAIRS) {
    sofa(c - (SOFA + 0.35), 1);
    sofa(c + (SOFA + 0.35), -1);
    boothTable(c);
    for (const s of [-1, 1])
      for (const dz of [-0.3, 0.3])
        places.push({ x: c + s * 0.2, z: HZ + dz, ry: (-s * Math.PI) / 2 });
  }
  // theirs: the sofa against the pillar, the table, two chairs across
  sofa(PIL1, 1);
  boothTable(HX);
  chair(HX + 0.66, HZ - 0.3, -Math.PI / 2);
  chair(HX + 0.72, HZ + 0.33, -Math.PI / 2 + 0.22);
  // round 4-tops in the middle, under the white domes
  const ROUND: [number, number][] = [
    [-2.0, -3.6],
    [1.0, -3.8],
    [-2.3, -0.4],
    [1.3, -0.6],
    [-0.6, 2.7],
    [2.3, 2.6],
  ];
  const DINERS = 3; // index of the round table with the other couple
  ROUND.forEach(([x, z], ti) => {
    roundM.push(mat4(x, TOP - 0.02, z));
    pedM.push(mat4(x, 0, z));
    ctx.wall(x - 0.5, z - 0.5, x + 0.5, z + 0.5);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2 + (ti % 2 ? 0.12 : -0.08);
      const cx = x + Math.sin(a) * 0.74;
      const cz = z + Math.cos(a) * 0.74;
      chair(cx, cz, a + Math.PI);
      places.push({
        x: x + Math.sin(a) * 0.3,
        z: z + Math.cos(a) * 0.3,
        ry: a + Math.PI,
      });
    }
  });
  instanced(root, rectTop, tableStone, rectM);
  instanced(root, roundTop, tableStone, roundM);
  instanced(root, pedestal, blackMetal, pedM);
  instanced(root, chairFabGeo, chairFab, chairM);
  instanced(root, chairLegGeo, lightWood, chairM);

  /* ---------- simple settings on the other tables ---------- */
  {
    const goblet = gobletGeo(16);
    const napkin = new RoundedBoxGeometry(0.12, 0.012, 0.2, 2, 0.004);
    const knife = new THREE.BoxGeometry(0.012, 0.004, 0.2);
    const gm: THREE.Matrix4[] = [];
    for (const p of places) {
      const c = Math.cos(p.ry);
      const s = Math.sin(p.ry);
      // local (+x right of the sitter facing +Z after rotation)
      const at = (lx: number, lz: number): [number, number] => [
        p.x + lx * c + lz * s,
        p.z - lx * s + lz * c,
      ];
      const [nx, nz] = at(-0.17, -0.02);
      put(kit, napkinMat, napkin, [nx, TOP + 0.006, nz], [0, p.ry, 0]);
      const [fx, fz] = at(-0.17, -0.02);
      put(
        kit,
        steel,
        knife,
        [fx + 0.015 * c, TOP + 0.014, fz - 0.015 * s],
        [0, p.ry, 0],
      );
      const [kx, kz] = at(0.17, -0.02);
      put(kit, steel, knife, [kx, TOP + 0.003, kz], [0, p.ry, 0]);
      const [gx, gz] = at(0.16, 0.13);
      gm.push(mat4(gx, TOP, gz));
    }
    const gl = instanced(root, goblet, clearGlass, gm, false);
    gl.renderOrder = 2;
  }

  /* ---------- their table ---------- */
  const food = new THREE.Group();
  food.position.set(HX, TOP, HZ);
  root.add(food);
  {
    const fk: Kit = new Map();
    // paper placemats with the grey print
    const matTex = placematTex();
    const paper = new THREE.MeshStandardMaterial({
      map: matTex,
      roughness: 0.85,
    });
    const sheet = new THREE.PlaneGeometry(0.42, 0.3);
    sheet.rotateX(-Math.PI / 2);
    put(fk, paper, sheet, [-0.17, 0.001, -0.29], [0, Math.PI / 2 + 0.03, 0]);
    put(fk, paper, sheet, [-0.17, 0.0012, 0.29], [0, Math.PI / 2 - 0.04, 0]);

    /* --- cast-iron skillet: meatballs, tomato sauce, mozzarella, arugula, potato wedges --- */
    const iron = speckMaps(
      256,
      21,
      "#1d1c1b",
      ["#2a2826", "#141312", "#33302d"],
      2400,
      0.5,
      1.6,
      2.2,
    );
    const ironMat = new THREE.MeshStandardMaterial({
      ...iron,
      metalness: 0.55,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    iron.map.repeat.set(6, 2);
    iron.normalMap.repeat.set(6, 2);
    const SK = { x: -0.08, z: 0.28 };
    const skillet = new THREE.Group();
    skillet.position.set(SK.x, 0.0015, SK.z);
    skillet.rotation.y = 0.6;
    food.add(skillet);
    const sk: Kit = new Map();
    put(
      sk,
      ironMat,
      lathe(
        [
          [0, 0],
          [0.1, 0],
          [0.112, 0.003],
          [0.118, 0.012],
          [0.125, 0.042],
          [0.128, 0.048],
          [0.122, 0.05],
          [0.117, 0.044],
          [0.111, 0.015],
          [0.104, 0.009],
          [0, 0.009],
        ],
        64,
      ),
      [0, 0, 0],
    );
    beam(sk, ironMat, v3(0.118, 0.04, 0), v3(0.255, 0.056, 0), 0.012, 0.026);
    put(
      sk,
      ironMat,
      new THREE.TorusGeometry(0.016, 0.0065, 8, 20),
      [0.268, 0.057, 0],
      [Math.PI / 2, 0, 0],
    );
    put(
      sk,
      ironMat,
      new THREE.TorusGeometry(0.02, 0.006, 8, 16, Math.PI),
      [-0.124, 0.047, 0],
      [Math.PI / 2, 0, Math.PI / 2],
    );

    // tomato sauce: a lumpy, glossy surface filling the pan
    const sauceBump = speckMaps(
      256,
      34,
      "#a32d18",
      ["#7d1c0e", "#c9472a", "#d9643a", "#6e1a0c"],
      900,
      1,
      5,
      3.0,
    );
    const sauceMat = new THREE.MeshStandardMaterial({
      ...sauceBump,
      roughness: 0.28,
      vertexColors: true,
    });
    sauceBump.map.repeat.set(2, 2);
    sauceBump.normalMap.repeat.set(2, 2);
    {
      const g = new THREE.RingGeometry(0.0005, 0.112, 72, 14);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position!;
      const col = new Float32Array(p.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const r = Math.hypot(x, z);
        const n = fbm(x * 60, 0, z * 60, 3);
        p.setY(i, 0.024 + 0.004 * n - Math.max(0, r - 0.1) * 0.15);
        c.setRGB(0.95 + 0.05 * n, 0.85 + 0.15 * n, 0.85 + 0.15 * n);
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const sauce = new THREE.Mesh(g, sauceMat);
      sauce.receiveShadow = true;
      skillet.add(sauce);
    }

    // meatballs coated in sauce, on the near half (sauce side)
    const mbMat = new THREE.MeshStandardMaterial({
      ...speckMaps(
        256,
        45,
        "#8a2a15",
        ["#6b1c0c", "#a8391c", "#5a170a", "#b84a26"],
        1500,
        1,
        4,
        3.5,
      ),
      roughness: 0.33,
    });
    const meatball = lumpy(
      new THREE.SphereGeometry(0.023, 28, 18),
      0.09,
      55,
      3,
      0.8,
    );
    const MB: [number, number][] = [
      [-0.055, 0.035],
      [0.005, 0.07],
      [0.06, 0.03],
      [-0.01, 0.015],
      [0.045, 0.085],
    ];
    MB.forEach(([x, z], i) =>
      put(sk, mbMat, meatball, [x, 0.03, z], [rand() * 3, i * 1.7, rand() * 3]),
    );
    // mozzarella / burrata: soft white balls sitting in the sauce
    const mozz = new THREE.MeshPhysicalMaterial({
      color: "#f5f1e8",
      roughness: 0.36,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      sheen: 0.4,
      sheenColor: new THREE.Color("#ffffff"),
    });
    const ball = lumpy(new THREE.SphereGeometry(1, 24, 16), 0.04, 3, 7, 0.78);
    const MZ: [number, number, number][] = [
      [-0.085, 0.075, 0.015],
      [0.088, -0.005, 0.014],
      [-0.03, 0.092, 0.013],
      [0.075, 0.075, 0.012],
      [-0.035, 0.05, 0.022], // the big one (burrata)
    ];
    for (const [x, z, r] of MZ)
      put(
        sk,
        mozz,
        ball,
        [x, 0.026 + r * 0.45, z],
        [0, rand() * 6, 0],
        [r, r, r],
      );
    // potato wedges heaped on the far half, with rosemary
    const potato = speckMaps(
      256,
      52,
      "#e2b45c",
      ["#c98f3a", "#f1cf7f", "#a86a26", "#8a5520"],
      1100,
      0.8,
      3.2,
      2.2,
    );
    const potMat = new THREE.MeshStandardMaterial({
      ...potato,
      roughness: 0.5,
    });
    potato.map.repeat.set(12, 12);
    potato.normalMap.repeat.set(12, 12);
    const wedge = wedgeGeo();
    const wm: THREE.Matrix4[] = [];
    const wc: THREE.Color[] = [];
    for (let i = 0; i < 17; i++) {
      const layer = i < 10 ? 0 : 1;
      const a = rand() * Math.PI * 2;
      const r = rand() * (layer ? 0.045 : 0.075);
      const x = Math.cos(a) * r;
      const z = -0.045 + Math.sin(a) * r * 0.55;
      wm.push(
        new THREE.Matrix4().compose(
          v3(x, 0.034 + layer * 0.02 + rand() * 0.006, z),
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              (rand() - 0.5) * 0.6,
              rand() * Math.PI * 2,
              rand() * Math.PI * 2,
              "YXZ",
            ),
          ),
          v3(1, 1, 0.85 + rand() * 0.35),
        ),
      );
      wc.push(new THREE.Color().setHSL(0.11, 0.55, 0.78 + rand() * 0.2));
    }
    {
      const im = instanced(skillet, wedge, potMat, wm);
      wc.forEach((c, i) => im.setColorAt(i, c));
    }
    // rosemary sprigs on the potatoes
    const herb = new THREE.MeshStandardMaterial({
      color: "#2f4a24",
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    {
      const needle = new THREE.BoxGeometry(0.0018, 0.0007, 0.013);
      needle.translate(0, 0, -0.0065);
      const nm: THREE.Matrix4[] = [];
      const sprigs: [number, number, number][] = [
        [-0.04, -0.06, 0.4],
        [0.035, -0.035, 2.2],
        [0.0, -0.085, -1.0],
      ];
      for (const [sx, sz, ry] of sprigs) {
        const y = 0.068;
        const dir = v3(Math.sin(ry), 0, Math.cos(ry));
        beam(
          sk,
          herb,
          v3(sx, y, sz),
          v3(sx + dir.x * 0.06, y + 0.004, sz + dir.z * 0.06),
          0.0016,
        );
        for (let k = 0; k < 18; k++) {
          const t = (k / 18) * 0.058;
          const side = k % 2 ? 1 : -1;
          nm.push(
            new THREE.Matrix4().compose(
              v3(sx + dir.x * t, y + 0.001, sz + dir.z * t),
              new THREE.Quaternion().setFromEuler(
                new THREE.Euler(0.15, ry + Math.PI + side * 0.9, 0, "YXZ"),
              ),
              v3(1, 1, 1),
            ),
          );
        }
      }
      instanced(skillet, needle, herb, nm, false);
    }
    // the arugula sprig in the middle, over the meatballs
    const arugulaMat = new THREE.MeshStandardMaterial({
      color: "#3f6a28",
      roughness: 0.42,
      side: THREE.DoubleSide,
    });
    {
      const leaf = arugulaGeo();
      const lm: THREE.Matrix4[] = [];
      const base = v3(0.012, 0.058, 0.04);
      const angles = [-2.4, -1.5, -0.6, 0.35, 1.2, 2.1, 2.9];
      angles.forEach((a, i) => {
        lm.push(
          new THREE.Matrix4().compose(
            v3(
              base.x + Math.sin(a) * 0.006,
              base.y + (i % 2) * 0.004,
              base.z + Math.cos(a) * 0.006,
            ),
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(0.08, a + Math.PI, (rand() - 0.5) * 0.4, "YXZ"),
            ),
            v3(0.9 + rand() * 0.25, 1, 0.85 + rand() * 0.3),
          ),
        );
      });
      const im = instanced(skillet, leaf, arugulaMat, lm);
      angles.forEach((_, i) =>
        im.setColorAt(
          i,
          new THREE.Color().setHSL(0.27, 0.45, 0.75 + rand() * 0.25),
        ),
      );
      beam(
        sk,
        arugulaMat,
        base,
        v3(base.x - 0.03, base.y - 0.004, base.z + 0.035),
        0.002,
      );
    }
    bake(sk, skillet);

    /* --- dark stone plate with two fried balls on cream and a herb leaf --- */
    const stone = speckMaps(
      512,
      61,
      "#2f3032",
      ["#3d3e40", "#26272a", "#4a4a4c", "#1d1e20"],
      9000,
      0.4,
      1.8,
      1.6,
    );
    const stoneMat = new THREE.MeshStandardMaterial({
      ...stone,
      roughness: 0.78,
      side: THREE.DoubleSide,
    });
    stone.map.repeat.set(6, 2);
    stone.normalMap.repeat.set(6, 2);
    const PL = { x: -0.06, z: -0.26 };
    const plate = new THREE.Group();
    plate.position.set(PL.x, 0.0015, PL.z);
    food.add(plate);
    const pk: Kit = new Map();
    {
      const g = lathe(
        [
          [0, 0],
          [0.13, 0],
          [0.141, 0.005],
          [0.143, 0.011],
          [0.137, 0.014],
          [0.124, 0.011],
          [0, 0.009],
        ],
        72,
      );
      const p = g.attributes.position!;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const a = Math.atan2(z, x);
        const k = 1 + 0.02 * Math.sin(3 * a + 1) + 0.01 * Math.sin(7 * a + 2);
        p.setXYZ(i, x * k, p.getY(i), z * k);
      }
      g.computeVertexNormals();
      put(pk, stoneMat, g, [0, 0, 0]);
    }
    const cream = new THREE.MeshStandardMaterial({
      color: "#f4f1ea",
      roughness: 0.4,
    });
    const crumb = speckMaps(
      256,
      73,
      "#b8742e",
      ["#dca354", "#8a4d1a", "#e9bb69", "#6b3810", "#c98a3e"],
      5200,
      0.6,
      2.4,
      4.0,
    );
    const crumbMat = new THREE.MeshStandardMaterial({
      ...crumb,
      roughness: 0.72,
    });
    crumb.map.repeat.set(3, 2);
    crumb.normalMap.repeat.set(3, 2);
    const fried = lumpy(
      new THREE.SphereGeometry(0.027, 48, 32),
      0.07,
      110,
      11,
      0.9,
    );
    const dollop = lumpy(
      new THREE.SphereGeometry(0.022, 24, 12),
      0.08,
      90,
      5,
      0.32,
    );
    const BALLS: [number, number][] = [
      [-0.034, 0.008],
      [0.034, -0.008],
    ];
    BALLS.forEach(([x, z], i) => {
      put(pk, cream, dollop, [x, 0.011, z]);
      put(pk, crumbMat, fried, [x, 0.011 + 0.026, z], [0, i * 2.1, 0]);
    });
    {
      const basil = new THREE.Mesh(
        basilGeo(0.034),
        new THREE.MeshStandardMaterial({
          color: "#3d6b2a",
          roughness: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      basil.position.set(0.03, 0.011 + 0.026 + 0.025, -0.005);
      basil.rotation.set(-0.15, 2.4, 0.12);
      basil.castShadow = true;
      plate.add(basil);
    }
    bake(pk, plate);

    /* --- their plates, cutlery, napkins, glasses, the table card --- */
    const smallPlate = lathe(
      [
        [0, 0],
        [0.07, 0],
        [0.075, 0.004],
        [0.098, 0.014],
        [0.1, 0.017],
        [0.097, 0.017],
        [0.074, 0.008],
        [0, 0.006],
      ],
      48,
    );
    put(fk, porcelain, smallPlate, [0.2, 0.0015, -0.42]);
    put(fk, porcelain, smallPlate, [0.2, 0.0015, 0.42]);
    const napkin = new RoundedBoxGeometry(0.11, 0.012, 0.19, 2, 0.004);
    put(fk, napkinMat, napkin, [-0.2, 0.007, 0.06], [0, Math.PI / 2 + 0.05, 0]);
    put(fk, napkinMat, napkin, [-0.2, 0.007, -0.5], [0, Math.PI / 2 - 0.06, 0]);
    // fork (on the napkin, at the left) and knife (at the right) for each
    const forkGeo = (() => {
      const parts = [
        new THREE.BoxGeometry(0.012, 0.003, 0.12).translate(0, 0, 0.05),
      ];
      parts.push(
        new THREE.BoxGeometry(0.022, 0.003, 0.025).translate(0, 0.001, -0.022),
      );
      for (let k = 0; k < 4; k++)
        parts.push(
          new THREE.BoxGeometry(0.0028, 0.0025, 0.035).translate(
            -0.0084 + k * 0.0056,
            0.002,
            -0.05,
          ),
        );
      return mergeGeometries(
        parts.map((p) => norm(p)),
        false,
      );
    })();
    const knifeGeo = (() => {
      const handle = new THREE.BoxGeometry(0.013, 0.006, 0.1).translate(
        0,
        0,
        0.055,
      );
      const blade = new THREE.BoxGeometry(0.016, 0.0015, 0.11).translate(
        0.0015,
        -0.001,
        -0.05,
      );
      return mergeGeometries([norm(handle), norm(blade)], false);
    })();
    put(fk, steel, forkGeo, [-0.2, 0.015, 0.06], [0, -Math.PI / 2 + 0.05, 0]);
    put(fk, steel, knifeGeo, [-0.2, 0.004, 0.47], [0, -Math.PI / 2 - 0.03, 0]);
    put(fk, steel, forkGeo, [-0.2, 0.015, -0.5], [0, -Math.PI / 2 - 0.06, 0]);
    put(fk, steel, knifeGeo, [-0.2, 0.004, -0.08], [0, -Math.PI / 2 + 0.04, 0]);
    // table card: a small folded tent
    {
      const cardMat = new THREE.MeshStandardMaterial({
        map: tableCardTex(),
        roughness: 0.6,
        side: THREE.DoubleSide,
      });
      const face = new THREE.PlaneGeometry(0.065, 0.085);
      for (const s of [1, -1]) {
        const g = face.clone();
        g.translate(0, 0.0425, 0);
        g.rotateX(-s * 0.28);
        if (s < 0) g.rotateY(Math.PI);
        const r = Math.PI / 2 - 0.3;
        put(
          fk,
          cardMat,
          g,
          [-0.02 + s * 0.012 * Math.sin(r), 0, 0.53 + s * 0.012 * Math.cos(r)],
          [0, r, 0],
        );
      }
    }
    bake(fk, food);

    // goblets: her water, the gin with lime and ice, his water
    const gob = gobletGeo(28);
    const GIN = { x: 0.25, z: -0.04 };
    const glasses: [number, number][] = [
      [0.27, -0.21],
      [GIN.x, GIN.z],
      [0.28, 0.14],
    ];
    for (const [x, z] of glasses) {
      const m = new THREE.Mesh(gob, clearGlass);
      m.position.set(x, 0, z);
      m.renderOrder = 2;
      food.add(m);
    }
    {
      const liquid = new THREE.Mesh(
        lathe(
          [
            [0, 0.083],
            [0.011, 0.084],
            [0.031, 0.096],
            [0.0385, 0.12],
            [0, 0.12],
          ],
          28,
        ),
        new THREE.MeshStandardMaterial({
          color: "#e7efe2",
          roughness: 0.05,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      );
      liquid.position.set(GIN.x, 0, GIN.z);
      liquid.renderOrder = 1;
      food.add(liquid);
      const ice = new THREE.Mesh(
        new RoundedBoxGeometry(0.02, 0.02, 0.02, 2, 0.004),
        new THREE.MeshStandardMaterial({
          color: "#ffffff",
          roughness: 0.1,
          transparent: true,
          opacity: 0.45,
        }),
      );
      for (const [dx, dy, dz, r] of [
        [-0.01, 0.112, 0.006, 0.3],
        [0.012, 0.11, -0.008, 1.1],
        [0.004, 0.118, 0.014, 0.7],
      ] as const) {
        const c = ice.clone();
        c.position.set(GIN.x + dx, dy, GIN.z + dz);
        c.rotation.set(r, r * 1.3, 0.2);
        food.add(c);
      }
      const lime = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.016,
          0.016,
          0.004,
          20,
          1,
          false,
          0,
          Math.PI,
        ),
        new THREE.MeshStandardMaterial({ color: "#8fbf3a", roughness: 0.4 }),
      );
      lime.position.set(GIN.x - 0.008, 0.121, GIN.z - 0.003);
      lime.rotation.set(0.2, 0.4, 0);
      food.add(lime);
    }
  }

  /* ---------- ceiling fixtures ---------- */
  {
    // recessed downlights
    const dl = new THREE.CircleGeometry(0.055, 20);
    dl.rotateX(Math.PI / 2);
    const trim = new THREE.RingGeometry(0.055, 0.075, 20);
    trim.rotateX(Math.PI / 2);
    const dm: THREE.Matrix4[] = [];
    for (const x of [-4.4, -1.5, 1.5, 4.4])
      for (const z of [-6.8, -4.6, -2.0, 0.8, 3.6])
        dm.push(mat4(x, H - 0.003, z));
    instanced(root, dl, emissive("#ffd2a0", 4.5), dm, false);
    instanced(root, trim, blackMetal, dm, false);
    // white dome pendants over the round tables (IMG_6193)
    const dome = lathe(
      [
        [0.24, 0],
        [0.235, 0.05],
        [0.2, 0.14],
        [0.13, 0.205],
        [0.03, 0.235],
        [0, 0.237],
      ],
      40,
    );
    const glow = new THREE.CircleGeometry(0.2, 32);
    glow.rotateX(Math.PI / 2);
    const pm: THREE.Matrix4[] = [];
    for (const [x, z] of ROUND) {
      pm.push(mat4(x, 2.12, z));
      beam(kit, blackMetal, v3(x, 2.35, z), v3(x, H, z), 0.004);
    }
    instanced(root, dome, whiteMatte, pm, false);
    instanced(
      root,
      glow,
      emissive("#ffe3c0", 2.6),
      pm.map((m) =>
        m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.07, 0)),
      ),
      false,
    );
  }

  bake(kit, root);

  /* ---------- lights (8) ---------- */
  if (!low) RectAreaLightUniformsLib.init();
  root.add(new THREE.HemisphereLight("#ffdcb5", "#2a2018", 0.32));
  {
    const key = new THREE.SpotLight("#ffd3a0", 15, 0, 0.5, 0.75, 2);
    key.position.set(HX + 0.35, H - 0.05, HZ + 0.15);
    key.target.position.set(HX, TOP, HZ);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.015;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 5;
    root.add(key, key.target);
  }
  const spot = (
    x: number,
    z: number,
    tx: number,
    ty: number,
    tz: number,
    i: number,
    a: number,
  ) => {
    const s = new THREE.SpotLight("#ffc890", i, 0, a, 0.9, 2);
    s.position.set(x, H - 0.08, z);
    s.target.position.set(tx, ty, tz);
    root.add(s, s.target);
  };
  spot(-0.4, -1.6, -0.4, 0, -1.6, 26, 1.05);
  spot(-2.4, -6.0, -2.4, 0, HZ, 18, 0.95);
  spot(2.2, -6.0, PIL1, 1.9, Z0 + 0.35, 7, 0.6);
  const pt = (x: number, y: number, z: number, i: number, d: number) => {
    const p = new THREE.PointLight("#ffc88e", i, d, 2);
    p.position.set(x, y, z);
    root.add(p);
  };
  pt(3.8, 2.6, 3.6, 7, 9);
  pt(0.5, 1.9, 1.0, 3.5, 7);
  if (!low) {
    const wash = new THREE.RectAreaLight("#ffb370", 7, Z1 - Z0 - 1, 0.25);
    wash.position.set(X0 + 0.35, H - 0.2, (Z0 + Z1) / 2);
    wash.lookAt(X0, 1.2, (Z0 + Z1) / 2);
    root.add(wash);
  } else {
    pt(-4.6, 2.2, -2, 3, 6);
  }

  /* ---------- photo, pack, people ---------- */
  ctx.photo("caramel-1.webp", 0.42, 0.56, v3(X1 - 0.02, 1.55, -6.55), -90);
  ctx.pack(HX + 0.06, TOP + 0.0015, HZ + 0.02, 75);

  ctx.playerOutfit(OUTFITS);
  const line =
    ctx.player === "davi"
      ? "Feliz um mês, meu amor! Depois tem cinema 🎬"
      : "Um mês. Parece pouco, mas já é tudo 💗";
  // side by side on the sofa, facing the chairs (+X): Elena at the window
  // end, Davi on her right (their selfies); the player's seat is the other one
  const seatX = PIL1 + SOFA - 0.22;
  const seatZ = (who: "davi" | "elena") => HZ + (who === "elena" ? -0.3 : 0.3);
  ctx.partner(
    seatX,
    seatZ(ctx.player === "davi" ? "elena" : "davi"),
    90,
    "sit",
    OUTFITS,
    line,
  );

  // another couple at a middle table, and a waiter
  const [dx, dz] = ROUND[DINERS] ?? [1.3, -0.6];
  for (const [k, look, outfit] of [
    [
      1,
      {
        skin: "#c99a78",
        hair: "#3a2618",
        hairStyle: "long",
        female: true,
        height: 1.64,
      },
      {
        top: "#7b2f3a",
        topStyle: "blouse",
        bottom: "#1f2633",
        bottomStyle: "jeans",
        shoes: "#1a1a1a",
      },
    ],
    [
      3,
      {
        skin: "#a87656",
        hair: "#1c1612",
        hairStyle: "short",
        beard: true,
        height: 1.76,
      },
      {
        top: "#d9d6cf",
        topStyle: "tshirt",
        bottom: "#3a3f4a",
        bottomStyle: "pants",
        shoes: "#2a2a2a",
      },
    ],
  ] as const) {
    const a = Math.PI / 4 + (k * Math.PI) / 2 + 0.12;
    ctx.person(
      look,
      outfit,
      dx + Math.sin(a) * 0.74,
      dz + Math.cos(a) * 0.74,
      THREE.MathUtils.radToDeg(a + Math.PI),
      "sit",
    );
  }
  ctx.person(
    { skin: "#8d5a3c", hair: "#141010", hairStyle: "short", height: 1.74 },
    {
      top: "#161616",
      topStyle: "tshirt",
      bottom: "#151515",
      bottomStyle: "pants",
      shoes: "#0d0d0d",
    },
    -0.9,
    -5.4,
    120,
    "stand",
  );
  ctx.wall(-1.15, -5.65, -0.65, -5.15);

  /* ---------- entrance ---------- */
  const doorX = (DOOR0 + DOOR1) / 2;
  ctx.spawn(doorX, Z1 - 0.9, 0);
  ctx.exit(doorX, Z1 + 0.25, 0.6);
}

const scene: SceneModule = {
  id: "caramel",
  title: "Caramel Sweet & Salt",
  build,
};

export default scene;
