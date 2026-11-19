import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { concrete, pbr, repeat, seeded } from "../fp/materials";
import type { Outfit, SceneModule } from "../fp/types";

/*
 * Estádio Parque do Sabiá, Uberlândia — 13/09/2026, an afternoon match.
 *
 * Built from the couple's own photos and videos (refs2/stadium):
 *  - they sat high on the long side, on deep terracotta-painted concrete
 *    steps (no seats), people sitting on the steps with their feet on the
 *    step below, plastic beer cups on the concrete, white seat numbers
 *    ("040") painted on the risers;
 *  - behind them the top rim: a grey-green wall with white pillars and a
 *    brown overhang above;
 *  - to their left the main stand under a big cantilevered concrete roof
 *    with ribs underneath;
 *  - the open bowl around a dark asphalt running track, the striped pitch,
 *    the curved bench shelters on the track, an ambulance by the corner,
 *    the opposite stand with a salmon/pink sector and grey-green steps, a
 *    dark band on the rim, a scoreboard on the far rim, trees above the rim
 *    and red/white lattice floodlight masts;
 *  - the crowd in green and white (Uberlândia), some yellow and black.
 *
 * The engine walks on a flat plane at y = 0, so the couple's step is y = 0
 * and the whole stadium sits below and around it (the pitch at y = YP).
 * The crowd far away is painted on alpha "cards" (one quad per row segment,
 * fronts and backs in one atlas); the people around the player are
 * instanced low-poly figures.
 */

/* ---------------- layout (meters; pitch center at x = z = 0) ---------------- */

const L = 42; // half length of the straights of the stadium-shaped bowl
const R0 = 46; // offset of the front wall of the stands
const T = 0.9; // step tread
const H = 0.42; // step rise
const ROWS = 34;
const K = 28; // the couple's row
const FRONT = 2.4; // front wall between the track and the first row
const YP = -(FRONT + K * H); // the pitch level (-14.16)
const rowY = (r: number) => (r - K) * H;
const rowOff = (r: number) => R0 + r * T;
const RIM = rowOff(ROWS); // 76.6
const RIM_BASE = rowY(ROWS - 1); // 2.1
const RIM_TOP = 5.4;
const EAVE = 5.9;
const CARD_H = 2.1; // crowd card height (0.42 below the tread, 1.68 above)
const TILE = 8.4; // meters of crowd per atlas width
const ROOF_X0 = -40;
const ROOF_X1 = 6;
const DOOR_X = 22; // the stair aisle and the tunnel behind the couple
const ROW_Z = rowOff(K) + T / 2; // 71.65: the middle of the couple's step
const OUTER = -6; // ground level outside the bowl

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  davi: {
    top: "#1f5b3a",
    topStyle: "jersey",
    print: "8",
    printColor: "#ffffff",
    bottom: "#2f3542",
    bottomStyle: "jeans",
  },
  elena: { top: "#2f4f8f", topStyle: "dress", bottom: "#2f4f8f" },
};

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const col = (c: THREE.ColorRepresentation) => new THREE.Color(c);

type UV8 = [number, number, number, number, number, number, number, number];

/* ---------------- a small geometry accumulator (vertex colors) ---------------- */

class Geo {
  private pos: number[] = [];
  private nor: number[] = [];
  private colr: number[] = [];
  private uvs: number[] = [];

  private vert(
    p: THREE.Vector3,
    n: THREE.Vector3,
    c: THREE.Color,
    u: number,
    v: number,
  ) {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.colr.push(c.r, c.g, c.b);
    this.uvs.push(u, v);
  }

  /** A quad a-b-c-d (in order around it) facing n; the winding is fixed to match n. */
  quad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    n: THREE.Vector3,
    color: THREE.Color,
    uv: UV8 = [0, 0, 1, 0, 1, 1, 0, 1],
  ) {
    const e1 = b.clone().sub(a);
    const e2 = c.clone().sub(a);
    const flip = e1.cross(e2).dot(n) < 0;
    const P = flip ? [a, d, c, b] : [a, b, c, d];
    const U = flip
      ? [uv[0], uv[1], uv[6], uv[7], uv[4], uv[5], uv[2], uv[3]]
      : uv;
    for (const i of [0, 1, 2, 0, 2, 3])
      this.vert(P[i]!, n, color, U[i * 2]!, U[i * 2 + 1]!);
  }

  /** Appends any geometry (transformed) with one color. */
  add(geo: THREE.BufferGeometry, color: THREE.Color, m?: THREE.Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.colr.push(color.r, color.g, color.b);
      this.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    g.dispose();
    geo.dispose();
  }

  box(
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    color: THREE.Color,
    rotY = 0,
  ) {
    const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(cx, cy, cz);
    this.add(new THREE.BoxGeometry(sx, sy, sz), color, m);
  }

  /** A beam of section w×h between two points. */
  beam(
    a: THREE.Vector3,
    b: THREE.Vector3,
    w: number,
    h: number,
    color: THREE.Color,
  ) {
    const o = new THREE.Object3D();
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.lookAt(b);
    o.updateMatrix();
    this.add(new THREE.BoxGeometry(w, h, a.distanceTo(b)), color, o.matrix);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.colr, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/* ---------------- the stadium-shaped ring ---------------- */

type Sample = { px: number; nx: number; nz: number };

/** Samples of the bowl outline: a point on the center segment and the outward normal. */
function ringSamples(ns = 12, nc = 40): Sample[] {
  const out: Sample[] = [];
  for (let i = 0; i < ns; i++)
    out.push({ px: -L + (2 * L * i) / ns, nx: 0, nz: 1 });
  for (let i = 0; i < nc; i++) {
    const a = Math.PI / 2 - (Math.PI * i) / nc;
    out.push({ px: L, nx: Math.cos(a), nz: Math.sin(a) });
  }
  for (let i = 0; i < ns; i++)
    out.push({ px: L - (2 * L * i) / ns, nx: 0, nz: -1 });
  for (let i = 0; i < nc; i++) {
    const a = -Math.PI / 2 - (Math.PI * i) / nc;
    out.push({ px: -L, nx: Math.cos(a), nz: Math.sin(a) });
  }
  return out;
}

const at = (s: Sample, off: number, y: number) =>
  v3(s.px + s.nx * off, y, s.nz * off);

const inwardOf = (a: Sample, b: Sample, up = 0) =>
  v3(-(a.nx + b.nx) / 2, up, -(a.nz + b.nz) / 2).normalize();

/* ---------------- canvases ---------------- */

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

function texOf(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const shade = (hex: string, f: number) =>
  `#${new THREE.Color(hex).multiplyScalar(f).getHexString()}`;

/** Afternoon sky, partly cloudy (equirectangular). */
function skyTexture() {
  const W = 2048;
  const Hh = 1024;
  const { c, g } = canvas2d(W, Hh);
  const grad = g.createLinearGradient(0, 0, 0, Hh / 2);
  grad.addColorStop(0, "#6f9fd2");
  grad.addColorStop(0.55, "#a9c6e4");
  grad.addColorStop(1, "#e4ebf0");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, Hh / 2);
  g.fillStyle = "#e4ebf0";
  g.fillRect(0, Hh / 2, W, Hh / 2);
  const rand = seeded(404);
  // cumulus: clusters of soft puffs, flatter toward the horizon
  for (let k = 0; k < 70; k++) {
    const cy = Hh * (0.14 + rand() * 0.34);
    const cx = rand() * W;
    const flat = 0.35 + (cy / (Hh / 2)) * 0.25;
    const size = (30 + rand() * 70) * (1.3 - cy / Hh);
    for (let p = 0; p < 14; p++) {
      const x = cx + (rand() - 0.5) * size * 3.2;
      const y = cy + (rand() - 0.6) * size * flat;
      const r = size * (0.35 + rand() * 0.6);
      for (const dx of [0, W, -W]) {
        const rg = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        rg.addColorStop(0, "rgba(255,255,255,0.55)");
        rg.addColorStop(0.6, "rgba(246,248,250,0.25)");
        rg.addColorStop(1, "rgba(240,244,248,0)");
        g.fillStyle = rg;
        g.beginPath();
        g.ellipse(x + dx, y, r, r * flat * 1.4, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    // grey undersides
    const ug = g.createLinearGradient(0, cy, 0, cy + size * 0.5);
    ug.addColorStop(0, "rgba(150,160,175,0)");
    ug.addColorStop(1, "rgba(150,160,175,0.12)");
    g.fillStyle = ug;
    g.fillRect(cx - size * 1.6, cy, size * 3.2, size * 0.5);
  }
  const t = texOf(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

/** The pitch: mowing stripes and the lines, over x ∈ [-80, 80], z ∈ [-40, 40]. */
function pitchTexture() {
  const W = 2048;
  const Hh = 1024;
  const S = W / 160;
  const X = (x: number) => (x + 80) * S;
  const Z = (z: number) => (z + 40) * S;
  const { c, g } = canvas2d(W, Hh);
  g.fillStyle = "#6c9a40";
  g.fillRect(0, 0, W, Hh);
  // stripes 5.25 m wide, the halfway line on a boundary
  for (let i = -16; i < 16; i++) {
    g.fillStyle = i % 2 === 0 ? "#78a748" : "#628f39";
    g.fillRect(X(i * 5.25), 0, 5.25 * S + 1, Hh);
  }
  const rand = seeded(77);
  for (let i = 0; i < 90000; i++) {
    const v = rand();
    g.fillStyle =
      v < 0.5
        ? `rgba(40,70,20,${0.05 + rand() * 0.08})`
        : `rgba(190,210,120,${0.03 + rand() * 0.06})`;
    g.fillRect(rand() * W, rand() * Hh, 1 + rand() * 2, 1);
  }
  // worn goalmouths
  for (const gx of [-50, 50]) {
    const rg = g.createRadialGradient(X(gx), Z(0), 0, X(gx), Z(0), 7 * S);
    rg.addColorStop(0, "rgba(140,130,80,0.35)");
    rg.addColorStop(1, "rgba(140,130,80,0)");
    g.fillStyle = rg;
    g.fillRect(X(gx) - 8 * S, Z(0) - 8 * S, 16 * S, 16 * S);
  }
  g.strokeStyle = "rgba(246,246,240,0.95)";
  g.fillStyle = "rgba(246,246,240,0.95)";
  g.lineWidth = 2;
  g.strokeRect(X(-52.5), Z(-34), 105 * S, 68 * S);
  g.beginPath();
  g.moveTo(X(0), Z(-34));
  g.lineTo(X(0), Z(34));
  g.stroke();
  g.beginPath();
  g.arc(X(0), Z(0), 9.15 * S, 0, Math.PI * 2);
  g.stroke();
  const spot = (x: number) => {
    g.beginPath();
    g.arc(X(x), Z(0), 0.22 * S, 0, Math.PI * 2);
    g.fill();
  };
  spot(0);
  for (const s of [-1, 1]) {
    const gl = 52.5 * s;
    g.strokeRect(
      Math.min(X(gl), X(gl - 16.5 * s)),
      Z(-20.16),
      16.5 * S,
      40.32 * S,
    );
    g.strokeRect(
      Math.min(X(gl), X(gl - 5.5 * s)),
      Z(-9.16),
      5.5 * S,
      18.32 * S,
    );
    spot(41 * s);
    const a = Math.acos(5 / 9.15);
    g.beginPath();
    if (s > 0) g.arc(X(41), Z(0), 9.15 * S, Math.PI - a, Math.PI + a);
    else g.arc(X(-41), Z(0), 9.15 * S, -a, a);
    g.stroke();
    for (const zs of [-1, 1]) {
      g.beginPath();
      g.arc(X(gl), Z(34 * zs), 1 * S, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const t = texOf(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------------- fans ---------------- */

type Fan = {
  shirt: string;
  skin: string;
  hair: string;
  pants: string;
  shoes: string;
  cap: string | null;
  long: boolean;
  shorts: boolean;
  stand: boolean;
  scale: number;
  num: string | null;
};

const GREENS = ["#1f7a3d", "#2e8b4a", "#14532d", "#3c9c58"];
const SHIRTS: [string, number][] = [
  ["#1f7a3d", 18],
  ["#2e8b4a", 10],
  ["#14532d", 8],
  ["#3c9c58", 6],
  ["#f2f2ee", 24],
  ["#1c1c1e", 12],
  ["#e7c52b", 5],
  ["#8a8f96", 5],
  ["#2b3f6b", 4],
  ["#b33a3a", 2],
  ["#d9d2c3", 6],
];
const SKINS = [
  "#efc7aa",
  "#e0b08f",
  "#c98f68",
  "#a86e4a",
  "#7d4f33",
  "#f3d6c1",
];
const HAIRS = [
  "#16110d",
  "#241810",
  "#3a281a",
  "#5c3f26",
  "#8a6a45",
  "#1d1d1d",
];
const PANTS = [
  "#3f5778",
  "#2c3d5a",
  "#1d1d21",
  "#a7987a",
  "#5a6a7e",
  "#e9e9e6",
];

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length) % list.length]!;
}

function pickW(rand: () => number, list: [string, number][]) {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [c, w] of list) {
    r -= w;
    if (r <= 0) return c;
  }
  return list[0]![0];
}

function randomFan(rand: () => number): Fan {
  const shirt = pickW(rand, SHIRTS);
  return {
    shirt,
    skin: pick(rand, SKINS),
    hair: pick(rand, HAIRS),
    pants: pick(rand, PANTS),
    shoes: rand() < 0.4 ? "#ececec" : "#222222",
    cap: rand() < 0.12 ? (rand() < 0.5 ? "#f2f2f2" : "#1c1c1c") : null,
    long: rand() < 0.38,
    shorts: rand() < 0.35,
    stand: rand() < 0.1,
    scale: 0.9 + rand() * 0.18,
    num:
      GREENS.includes(shirt) && rand() < 0.4
        ? pick(rand, ["10", "9", "7", "11", "33", "84"])
        : null,
  };
}

/** Crowd atlas: the top half are fans seen from the pitch, the bottom half the same fans from behind. */
function crowdAtlas() {
  const W = 2048;
  const Hh = 512;
  const { c, g } = canvas2d(W, Hh * 2);
  const PX = Hh / CARD_H;
  const rand = seeded(91);
  const slots = 15;
  const slot = W / slots;
  const fans: { cx: number; f: Fan }[] = [];
  for (let i = 0; i < slots; i++) {
    if (rand() < 0.06) continue;
    fans.push({
      cx: slot * (i + 0.5) + (rand() - 0.5) * slot * 0.2,
      f: randomFan(rand),
    });
  }
  // standing fans first so the seated ones overlap them
  const order = [...fans].sort((a, b) => Number(b.f.stand) - Number(a.f.stand));
  for (const back of [false, true]) {
    const bottom = back ? Hh * 2 : Hh;
    const base = bottom - 0.42 * PX;
    for (const { cx, f } of order) drawFan(g, cx, base, PX * f.scale, f, back);
  }
  const t = texOf(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function drawFan(
  g: CanvasRenderingContext2D,
  cx: number,
  base: number,
  px: number,
  f: Fan,
  back: boolean,
) {
  const Y = (h: number) => base - h * px;
  const Wd = (w: number) => w * px;
  const rect = (
    x0: number,
    h0: number,
    w: number,
    h1: number,
    color: string,
  ) => {
    g.fillStyle = color;
    g.fillRect(cx + Wd(x0), Y(h1), Wd(w), Y(h0) - Y(h1));
  };
  const torso = (h0: number, h1: number, wb: number, wt: number) => {
    const gr = g.createLinearGradient(0, Y(h1), 0, Y(h0));
    gr.addColorStop(0, shade(f.shirt, 1.05));
    gr.addColorStop(1, shade(f.shirt, 0.72));
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(cx - Wd(wb / 2), Y(h0));
    g.lineTo(cx + Wd(wb / 2), Y(h0));
    g.lineTo(cx + Wd(wt / 2), Y(h1 - 0.04));
    g.quadraticCurveTo(cx + Wd(wt / 2), Y(h1), cx + Wd(wt / 2 - 0.06), Y(h1));
    g.lineTo(cx - Wd(wt / 2 - 0.06), Y(h1));
    g.quadraticCurveTo(cx - Wd(wt / 2), Y(h1), cx - Wd(wt / 2), Y(h1 - 0.04));
    g.closePath();
    g.fill();
    if (back && f.num) {
      g.fillStyle = "rgba(245,245,240,0.95)";
      g.font = `bold ${Math.round(Wd(0.16))}px Arial`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(f.num, cx, Y((h0 + h1) / 2 + 0.03));
    }
  };
  const limb = (
    x0: number,
    h0: number,
    x1: number,
    h1: number,
    w: number,
    color: string,
  ) => {
    g.strokeStyle = color;
    g.lineWidth = Wd(w);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(cx + Wd(x0), Y(h0));
    g.lineTo(cx + Wd(x1), Y(h1));
    g.stroke();
  };
  const head = (hc: number) => {
    if (f.long) rect(-0.1, hc - 0.2, 0.2, hc + 0.02, f.hair);
    if (back) {
      g.fillStyle = f.cap ?? f.hair;
      g.beginPath();
      g.ellipse(cx, Y(hc), Wd(0.09), Wd(0.108), 0, 0, Math.PI * 2);
      g.fill();
      if (f.cap) rect(-0.08, hc - 0.1, 0.16, hc - 0.03, f.hair);
      return;
    }
    g.fillStyle = f.hair;
    g.beginPath();
    g.ellipse(cx, Y(hc + 0.025), Wd(0.094), Wd(0.1), 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = f.skin;
    g.beginPath();
    g.ellipse(cx, Y(hc - 0.012), Wd(0.08), Wd(0.095), 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(60,35,25,0.35)";
    g.fillRect(cx - Wd(0.045), Y(hc + 0.005), Wd(0.03), Wd(0.012));
    g.fillRect(cx + Wd(0.015), Y(hc + 0.005), Wd(0.03), Wd(0.012));
    if (f.cap) {
      g.fillStyle = f.cap;
      g.beginPath();
      g.ellipse(cx, Y(hc + 0.045), Wd(0.095), Wd(0.07), 0, Math.PI, 0);
      g.fill();
      g.fillRect(cx - Wd(0.1), Y(hc + 0.05), Wd(0.2), Wd(0.025));
    }
  };
  const legColor = f.shorts ? f.skin : f.pants;
  if (f.stand) {
    rect(-0.15, 0, 0.12, 0.08, f.shoes);
    rect(0.03, 0, 0.12, 0.08, f.shoes);
    rect(-0.14, 0.06, 0.11, 0.82, legColor);
    rect(0.03, 0.06, 0.11, 0.82, legColor);
    rect(-0.17, f.shorts ? 0.55 : 0.7, 0.34, 0.9, f.pants);
    torso(0.84, 1.4, 0.38, 0.44);
    limb(-0.22, 1.34, -0.25, 0.98, 0.09, f.shirt);
    limb(0.22, 1.34, 0.25, 0.98, 0.09, f.shirt);
    limb(-0.25, 1.0, -0.24, 0.8, 0.07, f.skin);
    limb(0.25, 1.0, 0.24, 0.8, 0.07, f.skin);
    rect(-0.045, 1.38, 0.09, 1.47, f.skin);
    head(1.55);
    return;
  }
  // seated on the step, legs hanging over the riser
  if (!back) {
    rect(-0.16, -0.42, 0.13, -0.35, f.shoes);
    rect(0.03, -0.42, 0.13, -0.35, f.shoes);
    rect(-0.15, -0.37, 0.11, 0.1, legColor);
    rect(0.04, -0.37, 0.11, 0.1, legColor);
    if (f.shorts) rect(-0.19, 0.0, 0.38, 0.16, f.pants);
    g.fillStyle = f.pants;
    g.beginPath();
    g.ellipse(cx, Y(0.07), Wd(0.2), Wd(0.09), 0, 0, Math.PI * 2);
    g.fill();
  } else {
    rect(-0.18, 0.0, 0.36, 0.14, shade(f.pants, 0.8));
  }
  torso(0.1, 0.64, 0.38, 0.44);
  limb(-0.23, 0.6, -0.25, 0.4, 0.09, f.shirt);
  limb(0.23, 0.6, 0.25, 0.4, 0.09, f.shirt);
  if (!back) {
    limb(-0.25, 0.4, -0.1, 0.17, 0.07, f.skin);
    limb(0.25, 0.4, 0.1, 0.17, 0.07, f.skin);
  } else {
    limb(-0.25, 0.4, -0.24, 0.24, 0.07, f.skin);
    limb(0.25, 0.4, 0.24, 0.24, 0.07, f.skin);
  }
  rect(-0.045, 0.62, 0.09, 0.71, f.skin);
  head(0.8);
}

/* ---------------- small textures ---------------- */

/** Pitch-side boards: dark green and white panels. */
function boardsTexture() {
  const W = 2048;
  const Hh = 128;
  const { c, g } = canvas2d(W, Hh);
  const texts = [
    "UBERLÂNDIA",
    "PARQUE DO SABIÁ",
    "VERDÃO",
    "UBERLÂNDIA E.C.",
    "SABIÁ",
    "MINAS GERAIS",
  ];
  const w = W / texts.length;
  texts.forEach((text, i) => {
    const dark = i % 2 === 0;
    g.fillStyle = dark ? "#0f4f2c" : "#f1f1ec";
    g.fillRect(i * w, 0, w, Hh);
    g.fillStyle = dark ? "#ffffff" : "#13603a";
    g.font = "bold 64px Arial";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, i * w + w / 2, Hh / 2 + 4, w - 30);
  });
  const t = texOf(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Goal net: a white mesh on transparent. */
function netTexture() {
  const { c, g } = canvas2d(64, 64);
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 3;
  g.strokeRect(0, 0, 64, 64);
  const t = texOf(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** White seat numbers painted on the risers ("040" as in the photo). */
function numbersTexture() {
  const { c, g } = canvas2d(1024, 128);
  g.clearRect(0, 0, 1024, 128);
  const nums = ["032", "036", "040", "044", "048", "052", "056", "060"];
  g.fillStyle = "rgba(240,236,228,0.92)";
  g.font = "bold 74px Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  nums.forEach((n, i) => g.fillText(n, i * 128 + 64, 66, 120));
  return texOf(c);
}

function textPanel(
  text: string,
  w: number,
  h: number,
  bg: string,
  fg: string,
  font: string,
) {
  const { c, g } = canvas2d(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2, w - 16);
  return texOf(c);
}

/* ---------------- stand colors (from the photos) ---------------- */

const RED = col("#9a4a3b"); // terracotta-painted steps of the couple's side
const PINK = col("#c98d86"); // the salmon sector across
const GREY_GREEN = col("#7a8476");
const CURVE_GREY = col("#8b8780");

function standColor(s: Sample, mx: number, r: number) {
  let c: THREE.Color;
  if (s.nz > 0.5) c = RED;
  else if (s.nz < -0.5) c = mx > -4 && mx < 38 ? PINK : GREY_GREEN;
  else c = CURVE_GREY;
  return c.clone().multiplyScalar(r < 2 ? 0.8 : 1);
}

/** Baked shade of the main stand roof (the shadow map covers only the couple's area). */
const roofShade = (s: Sample, mx: number, r: number) =>
  s.nz > 0.9 && mx > ROOF_X0 - 1 && mx < ROOF_X1 + 1 ? (r < 4 ? 0.75 : 0.5) : 1;

/* ---------------- the scene ---------------- */

const scene: SceneModule = {
  id: "sabia",
  title: "Parque do Sabiá",
  build(ctx) {
    const high = ctx.quality === "high";
    const rand = seeded(1309);
    const S = ringSamples();
    const n = S.length;

    /* sky, haze */
    ctx.scene.background = skyTexture();
    ctx.scene.fog = new THREE.Fog("#d7e0e8", 90, 520);

    /* materials */
    const standMat = pbr(repeat(concrete("#d9d5cf"), 1, 1), {
      vertexColors: true,
      roughness: 0.95,
    });
    const plain = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.45,
      metalness: 0.6,
    });

    /* ---------------- the stands ---------------- */
    const stand = new Geo();
    const wuv = (p: THREE.Vector3) => (p.x + p.z) / 2.5;
    for (let r = 0; r < ROWS; r++) {
      const y = rowY(r);
      const yb = r === 0 ? YP : rowY(r - 1);
      const o0 = rowOff(r);
      const o1 = o0 + T;
      for (let j = 0; j < n; j++) {
        const a = S[j]!;
        const b = S[(j + 1) % n]!;
        const p00 = at(a, o0, y);
        const p01 = at(b, o0, y);
        const p11 = at(b, o1, y);
        const p10 = at(a, o1, y);
        const mx = (p00.x + p01.x) / 2;
        const base = standColor(a, mx, r).multiplyScalar(
          (0.88 + rand() * 0.16) * roofShade(a, mx, r),
        );
        const tv = (p: THREE.Vector3) => (p.x - p.z) / 2.5;
        stand.quad(p00, p01, p11, p10, v3(0, 1, 0), base, [
          wuv(p00),
          tv(p00),
          wuv(p01),
          tv(p01),
          wuv(p11),
          tv(p11),
          wuv(p10),
          tv(p10),
        ]);
        // riser (or the front wall for the first row)
        const rc =
          r === 0
            ? col("#5d6a5b").multiplyScalar(0.9 + rand() * 0.1)
            : base.clone().multiplyScalar(0.78);
        const ua = wuv(p00);
        const ub = wuv(p01);
        stand.quad(at(a, o0, yb), at(b, o0, yb), p01, p00, inwardOf(a, b), rc, [
          ua,
          yb / 2.5,
          ub,
          yb / 2.5,
          ub,
          y / 2.5,
          ua,
          y / 2.5,
        ]);
      }
    }
    // the rim wall (with a door opening behind the couple)
    const rimGreen = col("#66726a");
    for (let j = 0; j < n; j++) {
      const a = S[j]!;
      const b = S[(j + 1) % n]!;
      const inward = inwardOf(a, b);
      const pa = at(a, RIM, 0);
      const pb = at(b, RIM, 0);
      const wallQuad = (
        x0: number,
        x1: number,
        y0: number,
        y1: number,
        f = 1,
      ) =>
        stand.quad(
          v3(x0, y0, RIM),
          v3(x1, y0, RIM),
          v3(x1, y1, RIM),
          v3(x0, y1, RIM),
          inward,
          rimGreen.clone().multiplyScalar((0.92 + rand() * 0.1) * f),
          [
            x0 / 2.5,
            y0 / 2.5,
            x1 / 2.5,
            y0 / 2.5,
            x1 / 2.5,
            y1 / 2.5,
            x0 / 2.5,
            y1 / 2.5,
          ],
        );
      if (a.nz > 0.9 && pa.x < DOOR_X && pb.x > DOOR_X) {
        wallQuad(pa.x, DOOR_X - 0.95, RIM_BASE, RIM_TOP);
        wallQuad(DOOR_X + 0.95, pb.x, RIM_BASE, RIM_TOP);
        wallQuad(DOOR_X - 0.95, DOOR_X + 0.95, 4.45, RIM_TOP);
      } else if (a.nz > 0.9) {
        wallQuad(pa.x, pb.x, RIM_BASE, RIM_TOP, pa.x < ROOF_X1 ? 0.6 : 1);
      } else {
        stand.quad(
          at(a, RIM, RIM_BASE),
          at(b, RIM, RIM_BASE),
          at(b, RIM, RIM_TOP),
          at(a, RIM, RIM_TOP),
          inward,
          rimGreen.clone().multiplyScalar(0.9 + rand() * 0.12),
          [wuv(pa), 0.8, wuv(pb), 0.8, wuv(pb), 2.2, wuv(pa), 2.2],
        );
      }
    }
    const standMesh = new THREE.Mesh(stand.build(), standMat);
    standMesh.receiveShadow = true;
    standMesh.castShadow = true;
    ctx.scene.add(standMesh);

    /* eave, pillars, railing, aisle stairs, the tunnel, the main roof... */
    const struct = new Geo();
    const eaveUnder = col("#5a4535");
    const eaveFace = col("#3f413e");
    const railGreen = col("#2f4a35");
    for (let j = 0; j < n; j++) {
      const a = S[j]!;
      const b = S[(j + 1) % n]!;
      const o0 = RIM - 1.3;
      const o1 = RIM + 0.3;
      struct.quad(
        at(a, o0, RIM_TOP),
        at(b, o0, RIM_TOP),
        at(b, o1, RIM_TOP),
        at(a, o1, RIM_TOP),
        v3(0, -1, 0),
        eaveUnder,
      );
      struct.quad(
        at(a, o0, RIM_TOP),
        at(b, o0, RIM_TOP),
        at(b, o0, EAVE),
        at(a, o0, EAVE),
        inwardOf(a, b),
        eaveFace,
      );
      struct.quad(
        at(a, o0, EAVE),
        at(b, o0, EAVE),
        at(b, o1, EAVE),
        at(a, o1, EAVE),
        v3(0, 1, 0),
        col("#77756f"),
      );
      // railing on the front wall
      const yr = rowY(0) + 1.0;
      struct.beam(
        at(a, R0 + 0.1, yr),
        at(b, R0 + 0.1, yr),
        0.06,
        0.06,
        railGreen,
      );
    }
    // slats under the eave on the couple's side (the brown overhang in the selfies)
    for (let x = 8; x < 42; x += 0.6)
      struct.box(x, RIM_TOP - 0.05, RIM - 0.5, 0.08, 0.1, 1.5, col("#4a3628"));
    // things spaced along the ring: railing posts and the white rim pillars
    const along = (
      off: number,
      step: number,
      fn: (p: THREE.Vector3, rot: number, s: Sample) => void,
    ) => {
      let acc = 0;
      for (let j = 0; j < n; j++) {
        const a = S[j]!;
        const b = S[(j + 1) % n]!;
        const pa = at(a, off, 0);
        const pb = at(b, off, 0);
        const len = pa.distanceTo(pb);
        const rot = Math.atan2(pb.x - pa.x, pb.z - pa.z) + Math.PI / 2;
        for (; acc < len; acc += step)
          fn(pa.clone().lerp(pb, acc / len), rot, a);
        acc -= len;
      }
    };
    along(R0 + 0.1, 2.5, (p) =>
      struct.box(p.x, rowY(0) + 0.5, p.z, 0.05, 1.0, 0.05, railGreen),
    );
    along(RIM - 0.12, 8, (p, rot, s) => {
      if (s.nz > 0.9 && Math.abs(p.x - DOOR_X) < 4) return;
      struct.box(
        p.x,
        (RIM_BASE + RIM_TOP) / 2,
        p.z,
        0.6,
        RIM_TOP - RIM_BASE,
        0.25,
        col("#e6e3dc"),
        rot,
      );
    });
    // the two wide pillars framing the tunnel behind the couple
    for (const px of [DOOR_X - 1.4, DOOR_X + 1.4])
      struct.box(
        px,
        (RIM_BASE + RIM_TOP) / 2,
        RIM - 0.13,
        0.9,
        RIM_TOP - RIM_BASE,
        0.26,
        col("#ebe8e1"),
      );
    // the tunnel: dark walls going in, and stairs going down inside
    {
      const x0 = DOOR_X - 0.95;
      const x1 = DOOR_X + 0.95;
      const z0 = RIM;
      const z1 = RIM + 4;
      const top = 4.45;
      struct.quad(
        v3(x0, top, z0),
        v3(x1, top, z0),
        v3(x1, top, z1),
        v3(x0, top, z1),
        v3(0, -1, 0),
        col("#1b1c1b"),
      );
      struct.quad(
        v3(x0, RIM_BASE - 2, z0),
        v3(x0, RIM_BASE - 2, z1),
        v3(x0, top, z1),
        v3(x0, top, z0),
        v3(1, 0, 0),
        col("#2a2b29"),
      );
      struct.quad(
        v3(x1, RIM_BASE - 2, z0),
        v3(x1, RIM_BASE - 2, z1),
        v3(x1, top, z1),
        v3(x1, top, z0),
        v3(-1, 0, 0),
        col("#2a2b29"),
      );
      struct.quad(
        v3(x0, RIM_BASE - 2, z1),
        v3(x1, RIM_BASE - 2, z1),
        v3(x1, top, z1),
        v3(x0, top, z1),
        v3(0, 0, -1),
        col("#0e0e0e"),
      );
      for (let i = 0; i < 7; i++)
        struct.box(
          DOOR_X,
          RIM_BASE - 0.09 - i * 0.18,
          z0 + 0.15 + i * 0.3,
          1.88,
          0.18,
          0.3,
          col("#4a4945"),
        );
    }
    // the aisle stairs from the bottom row up to the tunnel: a half step on each tread
    const yellow = col("#d8b437");
    for (let r = 1; r < ROWS; r++) {
      const o = rowOff(r);
      struct.box(
        DOOR_X,
        rowY(r - 1) + H / 4,
        o - T / 4,
        1.2,
        H / 2,
        T / 2,
        col("#a9a49b").multiplyScalar(0.9 + rand() * 0.1),
      );
      struct.box(
        DOOR_X,
        rowY(r - 1) + H / 2 + 0.003,
        o - T / 2 + 0.03,
        1.2,
        0.006,
        0.06,
        yellow,
      );
      struct.box(DOOR_X, rowY(r) + 0.003, o + 0.03, 1.2, 0.006, 0.06, yellow);
    }
    // handrail up the aisle
    struct.beam(
      v3(DOOR_X, rowY(0) + 0.9, rowOff(0) + 0.2),
      v3(DOOR_X, rowY(ROWS - 1) + 0.9, rowOff(ROWS - 1) + 0.4),
      0.05,
      0.05,
      col("#b9bcbd"),
    );
    for (let r = 2; r < ROWS; r += 4)
      struct.box(
        DOOR_X,
        rowY(r) + 0.45,
        rowOff(r) + 0.45,
        0.05,
        0.9,
        0.05,
        col("#b9bcbd"),
      );

    // the main stand roof on the left: cantilevered concrete with ribs underneath
    {
      const zf = 54;
      const zb = RIM + 2.2;
      const yf = 10.2;
      const yb = 12.2;
      const len = Math.hypot(zb - zf, yb - yf);
      const tilt = -Math.atan2(yb - yf, zb - zf);
      const m = new THREE.Matrix4()
        .makeRotationX(tilt)
        .setPosition((ROOF_X0 + ROOF_X1) / 2, (yf + yb) / 2, (zf + zb) / 2);
      struct.add(
        new THREE.BoxGeometry(ROOF_X1 - ROOF_X0, 0.35, len),
        col("#a39f97"),
        m,
      );
      struct.box(
        (ROOF_X0 + ROOF_X1) / 2,
        yf - 0.3,
        zf,
        ROOF_X1 - ROOF_X0 + 0.2,
        0.9,
        0.3,
        col("#e4e1da"),
      );
      for (let x = ROOF_X0 + 1; x <= ROOF_X1 - 0.5; x += 3.8)
        struct.beam(
          v3(x, yf - 0.45, zf + 0.3),
          v3(x, yb - 1.2, zb - 0.3),
          0.3,
          1.0,
          col("#8e8a83"),
        );
      // back wall under the roof and its open ends
      struct.quad(
        v3(ROOF_X0, EAVE, RIM),
        v3(ROOF_X1, EAVE, RIM),
        v3(ROOF_X1, yb - 0.6, RIM),
        v3(ROOF_X0, yb - 0.6, RIM),
        v3(0, 0, -1),
        col("#4f564f"),
      );
      for (const x of [ROOF_X0, ROOF_X1])
        struct.quad(
          v3(x, EAVE, RIM - 1.3),
          v3(x, EAVE, RIM),
          v3(x, yb - 0.6, RIM),
          v3(x, yb - 0.9, RIM - 1.3),
          v3(x > 0 ? 1 : -1, 0, 0),
          col("#6a6f68"),
        );
      for (let x = ROOF_X0; x <= ROOF_X1; x += 11.5)
        struct.box(
          x,
          (OUTER + yb) / 2,
          zb - 0.5,
          0.7,
          yb - OUTER,
          0.7,
          col("#b8b4ac"),
        );
    }

    // scoreboard frame on the far rim
    const SB_Z = -RIM - 1.2;
    struct.box(-30, EAVE + 4.2, SB_Z, 15, 5.6, 0.8, col("#232425"));
    for (const dx of [-5, 5])
      struct.box(
        -30 + dx,
        (RIM_BASE + EAVE + 1.4) / 2,
        SB_Z - 0.3,
        0.5,
        EAVE + 1.4 - RIM_BASE,
        0.5,
        col("#5d5f60"),
      );

    // ambulance by the corner of the track (as in the video)
    {
      const ax = 49;
      const az = 40.2;
      const rot = -0.5;
      const m = (x: number, y: number, z: number) =>
        new THREE.Matrix4()
          .makeRotationY(rot)
          .setPosition(
            ax + x * Math.cos(rot) + z * Math.sin(rot),
            YP + y,
            az - x * Math.sin(rot) + z * Math.cos(rot),
          );
      const white = col("#f2f2ef");
      struct.add(new THREE.BoxGeometry(3.4, 2.3, 2.0), white, m(-0.4, 1.45, 0));
      struct.add(new THREE.BoxGeometry(1.4, 1.6, 1.95), white, m(1.9, 1.1, 0));
      struct.add(
        new THREE.BoxGeometry(5.0, 0.3, 2.04),
        col("#2f9e4a"),
        m(0.3, 1.15, 0),
      );
      struct.add(
        new THREE.BoxGeometry(0.1, 0.7, 1.7),
        col("#1e2a33"),
        m(2.62, 1.55, 0),
      );
      const wheels: [number, number][] = [
        [-1.4, 0.95],
        [-1.4, -0.95],
        [1.8, 0.95],
        [1.8, -0.95],
      ];
      for (const [wx, wz] of wheels)
        struct.add(
          new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12).rotateX(Math.PI / 2),
          col("#161616"),
          m(wx, 0.38, wz),
        );
    }

    const structMesh = new THREE.Mesh(struct.build(), standMat);
    structMesh.castShadow = true;
    structMesh.receiveShadow = true;
    ctx.scene.add(structMesh);

    /* seat numbers on the risers around the couple */
    {
      const geo = new Geo();
      let k = 0;
      for (let r = K - 1; r <= K + 3; r++) {
        for (let x = 23.6; x < 40; x += 4.1) {
          const i = (k++ * 3) % 8;
          const z = rowOff(r) - 0.004;
          const y0 = rowY(r) - 0.36;
          const y1 = rowY(r) - 0.06;
          const u0 = i / 8;
          const u1 = (i + 1) / 8;
          geo.quad(
            v3(x + 0.18, y0, z),
            v3(x - 0.18, y0, z),
            v3(x - 0.18, y1, z),
            v3(x + 0.18, y1, z),
            v3(0, 0, -1),
            col("#ffffff"),
            [u0, 0.05, u1, 0.05, u1, 0.95, u0, 0.95],
          );
        }
      }
      const mesh = new THREE.Mesh(
        geo.build(),
        new THREE.MeshStandardMaterial({
          map: numbersTexture(),
          transparent: true,
          roughness: 0.9,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          depthWrite: false,
        }),
      );
      mesh.receiveShadow = true;
      ctx.scene.add(mesh);
    }

    /* exit sign over the tunnel */
    {
      const t = textPanel(
        "SAÍDA",
        256,
        80,
        "#11803f",
        "#ffffff",
        "bold 56px Arial",
      );
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.32),
        new THREE.MeshStandardMaterial({
          map: t,
          emissive: 0xffffff,
          emissiveMap: t,
          emissiveIntensity: 1.6,
        }),
      );
      sign.position.set(DOOR_X, 4.9, RIM - 0.02);
      sign.rotation.y = Math.PI;
      ctx.scene.add(sign);
    }

    /* scoreboard screen */
    {
      const t = textPanel(
        "UBERLÂNDIA  ⚽  PARQUE DO SABIÁ",
        1024,
        256,
        "#07090a",
        "#d8f5dc",
        "bold 70px Arial",
      );
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 4.6),
        new THREE.MeshStandardMaterial({
          map: t,
          emissive: 0xffffff,
          emissiveMap: t,
          emissiveIntensity: 0.9,
        }),
      );
      screen.position.set(-30, EAVE + 4.2, SB_Z + 0.41);
      ctx.scene.add(screen);
    }

    /* ---------------- the field ---------------- */
    {
      // infield grass (a fan to the inner track edge), UVs over the pitch canvas
      const RI = 36.5;
      const pos: number[] = [0, YP, 0];
      const uv: number[] = [0.5, 0.5];
      for (let j = 0; j < n; j++) {
        const p = at(S[j]!, RI, YP);
        pos.push(p.x, p.y, p.z);
        uv.push((p.x + 80) / 160, 1 - (p.z + 40) / 80);
      }
      const idx: number[] = [];
      for (let j = 0; j < n; j++) idx.push(0, 1 + j, 1 + ((j + 1) % n));
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      // keep the triangles facing up
      const p1 = at(S[0]!, RI, 0);
      const p2 = at(S[1]!, RI, 0);
      if (p1.cross(p2).y < 0)
        for (let i = 0; i < idx.length; i += 3) {
          const t = idx[i + 1]!;
          idx[i + 1] = idx[i + 2]!;
          idx[i + 2] = t;
        }
      g.setIndex(idx);
      g.computeVertexNormals();
      const grass = new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({
          map: pitchTexture(),
          roughness: 0.95,
        }),
      );
      grass.receiveShadow = true;
      ctx.scene.add(grass);

      // track, its lane lines and the concrete ring to the wall
      const track = new Geo();
      const up = v3(0, 1, 0);
      for (let j = 0; j < n; j++) {
        const a = S[j]!;
        const b = S[(j + 1) % n]!;
        track.quad(
          at(a, RI, YP),
          at(b, RI, YP),
          at(b, 44, YP),
          at(a, 44, YP),
          up,
          col("#3c3e41").multiplyScalar(0.94 + rand() * 0.08),
        );
        track.quad(
          at(a, 44, YP),
          at(b, 44, YP),
          at(b, R0, YP),
          at(a, R0, YP),
          up,
          col("#9a958b").multiplyScalar(0.9 + rand() * 0.1),
        );
        for (let l = 0; l <= 6; l++) {
          const o = RI + l * 1.22;
          const y = YP + 0.005;
          track.quad(
            at(a, o, y),
            at(b, o, y),
            at(b, o + 0.05, y),
            at(a, o + 0.05, y),
            up,
            col("#a9a9a6"),
          );
        }
      }
      const tm = new THREE.Mesh(
        track.build(),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
      );
      tm.receiveShadow = true;
      ctx.scene.add(tm);

      // boards around the pitch (front printed, back dark)
      const front = new Geo();
      const backs = new Geo();
      const board = (
        ax: number,
        az: number,
        bx: number,
        bz: number,
        nx: number,
        nz: number,
      ) => {
        const len = Math.hypot(bx - ax, bz - az);
        const y0 = YP;
        const y1 = YP + 0.9;
        front.quad(
          v3(ax, y0, az),
          v3(bx, y0, bz),
          v3(bx, y1, bz),
          v3(ax, y1, az),
          v3(nx, 0, nz),
          col("#ffffff"),
          [0, 0, len / 16, 0, len / 16, 1, 0, 1],
        );
        const ox = -nx * 0.08;
        const oz = -nz * 0.08;
        backs.quad(
          v3(ax + ox, y0, az + oz),
          v3(bx + ox, y0, bz + oz),
          v3(bx + ox, y1, bz + oz),
          v3(ax + ox, y1, az + oz),
          v3(-nx, 0, -nz),
          col("#2a2c2e"),
        );
      };
      board(-52, 36, 52, 36, 0, -1);
      board(-52, -36, 52, -36, 0, 1);
      for (const s of [-1, 1]) {
        board(57.5 * s, -24, 57.5 * s, -5, -s, 0);
        board(57.5 * s, 5, 57.5 * s, 24, -s, 0);
      }
      const bt = boardsTexture();
      ctx.scene.add(
        new THREE.Mesh(
          front.build(),
          new THREE.MeshStandardMaterial({
            map: bt,
            emissive: 0xffffff,
            emissiveMap: bt,
            emissiveIntensity: 0.35,
            roughness: 0.5,
          }),
        ),
      );
      ctx.scene.add(new THREE.Mesh(backs.build(), plain));

      // goals: posts, crossbar, supports and nets
      const goalGeo: THREE.BufferGeometry[] = [];
      const netGeo: THREE.BufferGeometry[] = [];
      for (const s of [-1, 1]) {
        const gx = 52.5 * s;
        for (const z of [-3.66, 3.66]) {
          goalGeo.push(
            new THREE.CylinderGeometry(0.06, 0.06, 2.44, 10).translate(
              gx,
              YP + 1.22,
              z,
            ),
          );
          goalGeo.push(
            new THREE.CylinderGeometry(0.025, 0.025, 2.0, 6)
              .rotateZ(Math.PI / 2)
              .translate(gx + s * 1.0, YP + 2.0, z),
          );
          netGeo.push(
            new THREE.PlaneGeometry(2.0, 2.3).translate(
              gx + s * 1.0,
              YP + 1.15,
              z,
            ),
          );
        }
        goalGeo.push(
          new THREE.CylinderGeometry(0.06, 0.06, 7.44, 10)
            .rotateX(Math.PI / 2)
            .translate(gx, YP + 2.44, 0),
        );
        netGeo.push(
          new THREE.PlaneGeometry(2.0, 7.32)
            .rotateX(-Math.PI / 2)
            .translate(gx + s * 1.0, YP + 2.2, 0),
        );
        netGeo.push(
          new THREE.PlaneGeometry(7.32, 2.2)
            .rotateY(Math.PI / 2)
            .translate(gx + s * 2.0, YP + 1.1, 0),
        );
      }
      const goals = new THREE.Mesh(
        mergeGeometries(goalGeo),
        new THREE.MeshStandardMaterial({ color: "#f4f4f2", roughness: 0.35 }),
      );
      ctx.scene.add(goals);
      const nt = netTexture();
      nt.repeat.set(14, 14);
      ctx.scene.add(
        new THREE.Mesh(
          mergeGeometries(netGeo),
          new THREE.MeshStandardMaterial({
            map: nt,
            alphaTest: 0.35,
            side: THREE.DoubleSide,
            roughness: 0.8,
          }),
        ),
      );

      // corner flags, the curved bench shelters on the track (as in the video)
      const bits = new Geo();
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          bits.box(
            52.5 * sx,
            YP + 0.75,
            34 * sz,
            0.03,
            1.5,
            0.03,
            col("#f0f0f0"),
          );
          bits.box(
            52.7 * sx,
            YP + 1.35,
            34 * sz,
            0.4,
            0.28,
            0.01,
            col("#e2c22a"),
          );
        }
      const shellGeo: THREE.BufferGeometry[] = [];
      for (const bx of [-11, 11]) {
        shellGeo.push(
          new THREE.CylinderGeometry(
            1.15,
            1.15,
            6.5,
            14,
            1,
            true,
            0,
            Math.PI * 0.82,
          )
            .rotateZ(Math.PI / 2)
            .translate(bx, YP, 39),
        );
        bits.box(bx, YP + 0.25, 39.45, 6.2, 0.45, 0.5, col("#2b2d30"));
        for (const e of [-3.2, 3.2]) {
          const m = new THREE.Matrix4()
            .makeTranslation(bx + e, YP, 39)
            .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
          bits.add(
            new THREE.TorusGeometry(1.15, 0.04, 4, 12, Math.PI * 0.82),
            col("#e8e8e8"),
            m,
          );
        }
      }
      ctx.scene.add(new THREE.Mesh(bits.build(), plain));
      ctx.scene.add(
        new THREE.Mesh(
          mergeGeometries(shellGeo),
          new THREE.MeshStandardMaterial({
            color: "#dfe7ec",
            transparent: true,
            opacity: 0.45,
            roughness: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
    }

    /* ---------------- floodlight masts (red/white lattice) ---------------- */
    {
      const mast = new Geo();
      const red = col("#c23b2f");
      const white = col("#ecebe6");
      const band = (y: number) =>
        Math.floor((y - OUTER) / 5) % 2 === 0 ? red : white;
      const topY = 33;
      const spots: [number, number][] = [
        [100, 62],
        [-100, 62],
        [100, -62],
        [-100, -62],
      ];
      for (const [mx, mz] of spots) {
        const face = Math.atan2(-mx, -mz);
        const leg = (y: number, i: number) => {
          const half = 1.4 - ((y - OUTER) / (topY - OUTER)) * 0.75;
          const a = face + Math.PI / 4 + (i * Math.PI) / 2;
          return v3(
            mx + Math.sin(a) * half * 1.41,
            y,
            mz + Math.cos(a) * half * 1.41,
          );
        };
        for (let i = 0; i < 4; i++) {
          for (let y = OUTER; y < topY; y += 3) {
            const y1 = Math.min(topY, y + 3);
            const c = band(y);
            mast.beam(leg(y, i), leg(y1, i), 0.16, 0.16, c);
            mast.beam(leg(y1, i), leg(y1, (i + 1) % 4), 0.09, 0.09, c);
            mast.beam(leg(y, i), leg(y1, (i + 1) % 4), 0.07, 0.07, c);
          }
        }
        // the lamp head, tilted down toward the pitch
        const head = new THREE.Object3D();
        head.position.set(mx, topY + 2.2, mz);
        head.rotation.y = face;
        head.rotateX(0.25);
        head.updateMatrix();
        const hm = head.matrix;
        mast.add(new THREE.BoxGeometry(8.5, 4.4, 0.3), col("#5b5d5e"), hm);
        for (let i = 0; i < 6; i++)
          for (let k = 0; k < 3; k++)
            mast.add(
              new THREE.BoxGeometry(1.1, 1.05, 0.35),
              col("#cfd1cf"),
              hm
                .clone()
                .multiply(
                  new THREE.Matrix4().makeTranslation(
                    -3.5 + i * 1.4,
                    -1.35 + k * 1.35,
                    0.3,
                  ),
                ),
            );
      }
      ctx.scene.add(new THREE.Mesh(mast.build(), metalMat));
    }

    /* ---------------- trees above the rim ---------------- */
    {
      const count = high ? 150 : 90;
      const trees = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
        count,
      );
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      let i = 0;
      while (i < count) {
        const s = S[Math.floor(rand() * n)]!;
        if (s.nz > 0.6) continue; // behind the couple nothing shows over the rim
        const p = at(s, RIM + 5 + rand() * 9, OUTER + 7 + rand() * 6);
        const r = 3.5 + rand() * 3.5;
        m.compose(p, q, v3(r, r * (0.8 + rand() * 0.3), r));
        trees.setMatrixAt(i, m);
        trees.setColorAt(
          i,
          col(
            pick(rand, ["#3f5f2c", "#4b6b31", "#36522a", "#58743a", "#2f4a26"]),
          ),
        );
        i++;
      }
      ctx.scene.add(trees);
    }

    /* ---------------- the crowd ---------------- */
    // 3D figures around the couple, on their straight, rows R3A..R3B
    const R3A = high ? K - 7 : K - 4;
    const R3B = ROWS - 1;
    const X3A = 7.5;
    const X3B = 41.5;
    const in3D = (s: Sample, mx: number, r: number) =>
      s.nz > 0.9 && mx > X3A - 3.5 && mx < X3B + 3.5 && r >= R3A && r <= R3B;

    // far crowd: alpha cards (front toward the pitch, backs behind)
    {
      const geo = new Geo();
      for (let r = 0; r < ROWS; r++) {
        const o = rowOff(r) - 0.1;
        const y0 = rowY(r) - 0.42;
        const y1 = y0 + CARD_H;
        let u = rand() * 10;
        for (let j = 0; j < n; j++) {
          const a = S[j]!;
          const b = S[(j + 1) % n]!;
          const pa = at(a, o, 0);
          const pb = at(b, o, 0);
          const u0 = u;
          u += pa.distanceTo(pb) / TILE;
          const mx = (pa.x + pb.x) / 2;
          if (in3D(a, mx, r)) continue;
          // emptier lower rows across on the left (empty steps in the video)
          if (a.nz < -0.5 && mx < 0 && r < 5 && rand() < 0.7) continue;
          if (rand() < 0.03) continue;
          const c = col("#ffffff").multiplyScalar(
            (0.85 + rand() * 0.2) * roofShade(a, mx, r),
          );
          geo.quad(
            v3(pa.x, y0, pa.z),
            v3(pb.x, y0, pb.z),
            v3(pb.x, y1, pb.z),
            v3(pa.x, y1, pa.z),
            inwardOf(a, b, 0.35),
            c,
            [u0, 0, u, 0, u, 1, u0, 1],
          );
        }
      }
      const mat = new THREE.MeshStandardMaterial({
        map: crowdAtlas(),
        vertexColors: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.95,
      });
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
            vec2 cuv = vec2(vMapUv.x, (gl_FrontFacing ? 0.5 : 0.0) + clamp(vMapUv.y, 0.004, 0.996) * 0.5);
            vec4 sampledDiffuseColor = texture2D(map, cuv);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        );
      };
      ctx.scene.add(new THREE.Mesh(geo.build(), mat));
    }

    // near crowd: instanced low-poly fans sitting on the steps
    {
      // local frame: origin at the front edge of the step, y = tread, facing -Z
      const shirtG = mergeGeometries([
        new THREE.CylinderGeometry(0.16, 0.185, 0.52, 8, 1)
          .scale(1.2, 1, 0.68)
          .rotateX(-0.12)
          .translate(0, 0.38, 0.24),
        new THREE.BoxGeometry(0.1, 0.28, 0.1)
          .rotateX(0.3)
          .translate(-0.24, 0.47, 0.2),
        new THREE.BoxGeometry(0.1, 0.28, 0.1)
          .rotateX(0.3)
          .translate(0.24, 0.47, 0.2),
      ]);
      const skinG = mergeGeometries([
        new THREE.SphereGeometry(0.105, 7, 5)
          .scale(0.92, 1.12, 1)
          .translate(0, 0.81, 0.19),
        new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6, 1, true).translate(
          0,
          0.68,
          0.21,
        ),
        new THREE.BoxGeometry(0.075, 0.075, 0.3).translate(-0.2, 0.25, 0.06),
        new THREE.BoxGeometry(0.075, 0.075, 0.3).translate(0.2, 0.25, 0.06),
      ]);
      const hairG = mergeGeometries([
        new THREE.SphereGeometry(0.113, 7, 3, 0, Math.PI * 2, 0, Math.PI * 0.5)
          .scale(0.93, 1.12, 1)
          .translate(0, 0.83, 0.205),
        new THREE.BoxGeometry(0.11, 0.08, 0.25).translate(-0.1, -0.38, -0.2),
        new THREE.BoxGeometry(0.11, 0.08, 0.25).translate(0.1, -0.38, -0.2),
      ]);
      const pantsG = mergeGeometries([
        new THREE.BoxGeometry(0.36, 0.15, 0.44).translate(0, 0.075, 0.04),
        new THREE.BoxGeometry(0.12, 0.42, 0.12).translate(-0.1, -0.15, -0.15),
        new THREE.BoxGeometry(0.12, 0.42, 0.12).translate(0.1, -0.15, -0.15),
      ]);
      const spots: { x: number; r: number }[] = [];
      for (let r = R3A; r <= R3B; r++) {
        // thinner far from the couple on low-end devices
        const skip = high ? 0.12 : 0.3;
        for (let x = X3A + rand() * 0.3; x < X3B; x += 0.56 + rand() * 0.14) {
          if (rand() < skip) continue;
          if (Math.abs(x - DOOR_X) < 0.8) continue; // the aisle
          if (r === K && x > 20.4 && x < 39.2) continue; // the couple's stretch of step
          if (r === K + 1 && x > 26.4 && x < 29) continue; // around the pack
          spots.push({ x, r });
        }
      }
      const count = spots.length;
      const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.9 });
      const shirts = new THREE.InstancedMesh(shirtG, mat(), count);
      const skins = new THREE.InstancedMesh(skinG, mat(), count);
      const hairs = new THREE.InstancedMesh(hairG, mat(), count);
      const pants = new THREE.InstancedMesh(pantsG, mat(), count);
      const all = [shirts, skins, hairs, pants];
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      spots.forEach((s, i) => {
        const f = randomFan(rand);
        const sc = 0.92 + rand() * 0.14;
        e.set(
          (rand() - 0.5) * 0.08,
          (rand() - 0.5) * 0.5,
          (rand() - 0.5) * 0.06,
        );
        q.setFromEuler(e);
        m.compose(v3(s.x, rowY(s.r), rowOff(s.r)), q, v3(sc, sc, sc));
        for (const im of all) im.setMatrixAt(i, m);
        shirts.setColorAt(i, col(f.shirt));
        skins.setColorAt(i, col(f.skin));
        hairs.setColorAt(i, col(f.cap ?? f.hair));
        pants.setColorAt(i, col(f.shorts && rand() < 0.5 ? f.skin : f.pants));
      });
      for (const im of all) {
        im.castShadow = true;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        ctx.scene.add(im);
      }
    }

    // plastic beer cups on the steps (as in the video)
    {
      const cups: [number, number, number][] = [
        [28.6, 0, 71.3],
        [24.9, 0, 71.35],
        [34.2, 0, 71.3],
        [31.9, -H, rowOff(K - 1) + 0.25],
        [26.3, -H, rowOff(K - 1) + 0.3],
        [36.8, -2 * H, rowOff(K - 2) + 0.2],
        [33.1, H, rowOff(K + 1) + 0.6],
        [17.2, 0, 71.4],
      ];
      const im = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.042, 0.032, 0.11, 10).translate(
          0,
          0.055,
          0,
        ),
        new THREE.MeshStandardMaterial({
          color: "#e7c35a",
          roughness: 0.25,
          emissive: "#6b4b10",
          emissiveIntensity: 0.15,
        }),
        cups.length,
      );
      const m = new THREE.Matrix4();
      cups.forEach(([x, y, z], i) =>
        im.setMatrixAt(i, m.makeTranslation(x, y, z)),
      );
      im.castShadow = true;
      ctx.scene.add(im);
    }

    /* ---------------- the match: simple distant players ---------------- */
    {
      type P = {
        x: number;
        z: number;
        hx: number;
        hz: number;
        team: number;
        face: number;
      };
      const formation: [number, number][] = [
        [-48, 0],
        [-36, -22],
        [-38, -7],
        [-38, 7],
        [-36, 22],
        [-20, -12],
        [-22, 4],
        [-12, 18],
        [-6, -24],
        [-4, 2],
        [-2, 14],
      ];
      const players: P[] = [];
      for (const team of [0, 1]) {
        const s = team === 0 ? 1 : -1;
        for (const [hx, hz] of formation)
          players.push({
            x: hx * s,
            z: hz * s,
            hx: hx * s,
            hz: hz * s,
            team,
            face: 0,
          });
      }
      players.push({ x: 0, z: 10, hx: 0, hz: 10, team: 2, face: 0 }); // referee
      players.push({ x: 0, z: 34.6, hx: 0, hz: 34.6, team: 3, face: 0 }); // assistants
      players.push({ x: 0, z: -34.6, hx: 0, hz: -34.6, team: 3, face: 0 });
      const count = players.length;
      const shirtG = mergeGeometries([
        new THREE.BoxGeometry(0.42, 0.56, 0.24).translate(0, 1.25, 0),
        new THREE.BoxGeometry(0.1, 0.24, 0.1).translate(-0.27, 1.38, 0),
        new THREE.BoxGeometry(0.1, 0.24, 0.1).translate(0.27, 1.38, 0),
      ]);
      const lowG = mergeGeometries([
        new THREE.BoxGeometry(0.38, 0.24, 0.24).translate(0, 0.9, 0),
        new THREE.BoxGeometry(0.12, 0.36, 0.13).translate(-0.1, 0.2, 0),
        new THREE.BoxGeometry(0.12, 0.36, 0.13).translate(0.1, 0.2, 0),
      ]);
      const skinG = mergeGeometries([
        new THREE.SphereGeometry(0.11, 7, 5).translate(0, 1.67, 0),
        new THREE.BoxGeometry(0.12, 0.42, 0.13).translate(-0.1, 0.58, 0),
        new THREE.BoxGeometry(0.12, 0.42, 0.13).translate(0.1, 0.58, 0),
        new THREE.BoxGeometry(0.08, 0.3, 0.08).translate(-0.27, 1.1, 0),
        new THREE.BoxGeometry(0.08, 0.3, 0.08).translate(0.27, 1.1, 0),
      ]);
      const mat = () => new THREE.MeshStandardMaterial({ roughness: 0.7 });
      const shirts = new THREE.InstancedMesh(shirtG, mat(), count);
      const lows = new THREE.InstancedMesh(lowG, mat(), count);
      const skins = new THREE.InstancedMesh(skinG, mat(), count);
      const all = [shirts, lows, skins];
      const kit: [string, string][] = [
        ["#1f7a3d", "#f2f2f2"], // Uberlândia: green and white
        ["#f1f1f1", "#1d2b4f"], // the visitors
        ["#151515", "#151515"], // referee
        ["#151515", "#151515"],
      ];
      players.forEach((p, i) => {
        const k = kit[p.team]!;
        const keeper = i === 0 ? "#e8a020" : i === 11 ? "#7a3fb0" : null;
        shirts.setColorAt(i, col(keeper ?? k[0]));
        lows.setColorAt(i, col(k[1]));
        skins.setColorAt(i, col(pick(rand, SKINS)));
      });
      for (const im of all) {
        im.frustumCulled = false;
        ctx.scene.add(im);
      }
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 8),
        new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 }),
      );
      ctx.scene.add(ball);
      const bp = new THREE.Vector2(0, 0);
      let holder = 9;
      let hold = 0;
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const up = v3(0, 1, 0);
      const one = v3(1, 1, 1);
      const where = new THREE.Vector3();
      const prand = seeded(8);
      ctx.onUpdate((t, dt) => {
        const d = Math.min(dt, 0.1);
        const h = players[holder]!;
        // the ball rolls to its holder, who keeps it a moment and passes it on
        const dx = h.x - bp.x;
        const dz = h.z - bp.y;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.4) {
          const sp = Math.min(dist, 16 * d);
          bp.x += (dx / dist) * sp;
          bp.y += (dz / dist) * sp;
        } else {
          hold += d;
          if (hold > 1.2 + prand() * 1.5) {
            hold = 0;
            const sameTeam = prand() < 0.75;
            const pool: number[] = [];
            players.forEach((pl, i) => {
              if (pl.team > 1 || i === holder) return;
              if ((pl.team === h.team) === sameTeam) pool.push(i);
            });
            holder = pool[Math.floor(prand() * pool.length)] ?? holder;
          }
        }
        players.forEach((p, i) => {
          let gx: number;
          let gz: number;
          if (p.team === 2) {
            gx = bp.x * 0.8;
            gz = bp.y * 0.5 + 6;
          } else if (p.team === 3) {
            gx = THREE.MathUtils.clamp(bp.x, -50, 50);
            gz = p.hz;
          } else if (i === holder) {
            gx = p.x + (p.team === 0 ? 2 : -2);
            gz = p.z;
          } else {
            gx = p.hx + bp.x * 0.35 + Math.sin(t * 0.3 + i) * 2;
            gz = p.hz + (bp.y - p.hz) * 0.25 + Math.cos(t * 0.27 + i * 1.7) * 2;
          }
          gx = THREE.MathUtils.clamp(gx, -52, 52);
          gz = THREE.MathUtils.clamp(gz, -35, 35);
          const ex = gx - p.x;
          const ez = gz - p.z;
          const ed = Math.hypot(ex, ez);
          let bob = 0;
          if (ed > 0.3) {
            const speed = Math.min(ed, (i === holder ? 4 : 5.5) * d);
            p.x += (ex / ed) * speed;
            p.z += (ez / ed) * speed;
            p.face = Math.atan2(ex, ez);
            bob = Math.abs(Math.sin(t * 9 + i)) * 0.05;
          } else {
            p.face = Math.atan2(bp.x - p.x, bp.y - p.z);
          }
          q.setFromAxisAngle(up, p.face);
          m.compose(where.set(p.x, YP + bob, p.z), q, one);
          for (const im of all) im.setMatrixAt(i, m);
        });
        for (const im of all) im.instanceMatrix.needsUpdate = true;
        ball.position.set(bp.x, YP + 0.11, bp.y);
      });
    }

    /* ---------------- light: afternoon sun and sky ---------------- */
    ctx.scene.add(new THREE.HemisphereLight("#d3e2f2", "#8a7560", 1.15));
    const sun = new THREE.DirectionalLight("#fff0da", 3.1);
    const target = v3(24, 0, 64);
    sun.position
      .copy(target)
      .addScaledVector(v3(0.45, 0.85, 0.55).normalize(), 120);
    sun.target.position.copy(target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -22;
    sc.right = 22;
    sc.top = 22;
    sc.bottom = -22;
    sc.near = 60;
    sc.far = 190;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    ctx.scene.add(sun, sun.target);

    /* ---------------- the couple, the pack, the photo, the way out ---------------- */
    const line =
      ctx.player === "elena"
        ? "Vamo, Verdão! ⚽ Ainda bem que você veio comigo"
        : "Eu nem sei a regra direito, mas tô amando 😂";
    ctx.partner(30.9, ROW_Z, 40, "stand", OUTFITS, line);
    ctx.playerOutfit(OUTFITS);
    // on the step behind them, next to where they sat
    ctx.pack(27.6, H, rowOff(K + 1) + 0.35, 20);
    // on the white pillar beside the tunnel, facing the pitch
    ctx.photo(
      "sabia-1.webp",
      0.62,
      0.82,
      v3(DOOR_X + 1.4, 3.6, RIM - 0.27),
      180,
    );

    // the couple's step: the drop in front, the riser behind, the crowd at the ends
    ctx.wall(20.2, rowOff(K) - 0.8, 39.6, rowOff(K));
    ctx.wall(20.2, rowOff(K + 1), 39.6, rowOff(K + 1) + 0.8);
    ctx.wall(20.2, rowOff(K) - 0.8, 21.0, rowOff(K + 1) + 0.8);
    ctx.wall(38.8, rowOff(K) - 0.8, 39.6, rowOff(K + 1) + 0.8);

    ctx.spawn(29.9, ROW_Z, -35);
    // the aisle stairs up to the tunnel, just to the left
    ctx.exit(DOOR_X, ROW_Z, 0.6);
  },
};

export default scene;
