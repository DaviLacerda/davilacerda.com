import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { WARDROBE } from "../fp/humans";
import {
  bricks,
  emissive,
  fabric,
  metal,
  pbr,
  plaster,
  repeat,
  seeded,
  tiles,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneCtx, SceneModule } from "../fp/types";

/*
 * Famiglia Crosara – Cantina Italiana & Bar (Uberlândia Shopping), their night
 * of 19/09, rebuilt from their photos and videos of that night (see the layout
 * notes above `build`). Lanterns are emissive only; 8 lights, 1 shadow caster;
 * static geometry is merged per material.
 */

/* ---------------- geometry batching ---------------- */

type Kit = Map<THREE.Material, THREE.BufferGeometry[]>;
type Baked = { mat: THREE.Material; geo: THREE.BufferGeometry }[];

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function norm(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes))
    if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv)
    g.setAttribute(
      "uv",
      new THREE.BufferAttribute(
        new Float32Array(g.attributes.position!.count * 2),
        2,
      ),
    );
  return g;
}

function putM(
  kit: Kit,
  mat: THREE.Material,
  geo: THREE.BufferGeometry,
  m: THREE.Matrix4,
) {
  const g = norm(geo);
  g.applyMatrix4(m);
  const list = kit.get(mat);
  if (list) list.push(g);
  else kit.set(mat, [g]);
}

function put(
  kit: Kit,
  mat: THREE.Material,
  geo: THREE.BufferGeometry,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  _m.compose(
    _p.set(x, y, z),
    _q.setFromEuler(_e.set(rx, ry, rz)),
    _s.set(sx, sy, sz),
  );
  putM(kit, mat, geo, _m);
}

/** A box stretched between two points (legs, rails, frames). */
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

/** A cylinder between two points. */
function rod(
  kit: Kit,
  mat: THREE.Material,
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  seg = 8,
) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    new THREE.Vector3(1, 1, 1),
  );
  putM(kit, mat, new THREE.CylinderGeometry(r, r, len, seg), m);
}

function bake(kit: Kit): Baked {
  const out: Baked = [];
  for (const [mat, geos] of kit) {
    const geo = mergeGeometries(geos, false);
    if (geo) out.push({ mat, geo });
  }
  return out;
}

/** Copies a baked prototype into a kit at a position and rotation. */
function stamp(
  kit: Kit,
  proto: Baked,
  x: number,
  y: number,
  z: number,
  ry = 0,
  s = 1,
) {
  _m.compose(
    _p.set(x, y, z),
    _q.setFromEuler(_e.set(0, ry, 0)),
    _s.set(s, s, s),
  );
  for (const { mat, geo } of proto) {
    const g = geo.clone();
    g.applyMatrix4(_m);
    const list = kit.get(mat);
    if (list) list.push(g);
    else kit.set(mat, [g]);
  }
}

function flush(parent: THREE.Object3D, kit: Kit, cast: boolean) {
  for (const { mat, geo } of bake(kit)) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = cast && !(mat as THREE.MeshStandardMaterial).transparent;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  kit.clear();
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ---------------- textures ---------------- */

function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D) => void,
  srgb = true,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Resolves once a texture from ctx.tex has its image (or after a timeout). */
function loaded(t: THREE.Texture, ms = 12000) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      const img = t.image as HTMLImageElement | undefined;
      if (img && img.complete && img.naturalWidth) resolve(img);
      else if (performance.now() - t0 > ms) resolve(null);
      else setTimeout(tick, 60);
    };
    tick();
  });
}

/**
 * The white stone wall as PBR maps: irregular rounded stones (a jittered
 * Voronoi pattern, tileable) with deep mortar joints, and the real photo of
 * the wall (tex-stone.webp) as the surface grain of each stone.
 */
function stoneMaps(img: HTMLImageElement | null) {
  const w = 768;
  const h = 576;
  const cols = 12;
  const rows = 9;
  const rand = seeded(4242);
  const cw = w / cols;
  const ch = h / rows;
  const seeds: { x: number; y: number; tone: number; tilt: number }[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      seeds.push({
        x: (i + 0.12 + 0.76 * rand()) * cw,
        y: (j + 0.12 + 0.76 * rand()) * ch,
        tone: 0.88 + rand() * 0.12,
        tilt: rand() * Math.PI,
      });
  // photo grain, scaled to the texture
  let grain: Float32Array | null = null;
  if (img) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    grain = new Float32Array(w * h);
    let mean = 0;
    for (let i = 0; i < w * h; i++) {
      grain[i] =
        (0.3 * d[i * 4]! + 0.55 * d[i * 4 + 1]! + 0.15 * d[i * 4 + 2]!) / 255;
      mean += grain[i]!;
    }
    mean /= w * h;
    for (let i = 0; i < w * h; i++) grain[i] = grain[i]! - mean;
  }
  const height = new Float32Array(w * h);
  const tone = new Float32Array(w * h);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      // domain warp (periodic, so it still tiles) rounds the stone outlines
      const x =
        xx +
        7 *
          Math.sin(
            (yy / h) * Math.PI * 2 * 5 + Math.sin((xx / w) * Math.PI * 2 * 3),
          ) +
        3 * Math.sin((yy / h) * Math.PI * 2 * 13);
      const y =
        yy +
        7 *
          Math.sin(
            (xx / w) * Math.PI * 2 * 6 + Math.cos((yy / h) * Math.PI * 2 * 4),
          ) +
        3 * Math.cos((xx / w) * Math.PI * 2 * 11);
      const ci = Math.floor(x / cw);
      const cj = Math.floor(y / ch);
      let d1 = 1e9;
      let d2 = 1e9;
      let a = seeds[0]!;
      let ax = 0;
      let ay = 0;
      let b = seeds[0]!;
      let bx = 0;
      let by = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const ii = ci + di;
          const jj = cj + dj;
          const sd = seeds[((jj + rows) % rows) * cols + ((ii + cols) % cols)]!;
          const sx = sd.x + Math.floor(ii / cols) * w;
          const sy = sd.y + Math.floor(jj / rows) * h;
          const dd = (sx - x) ** 2 + (sy - y) ** 2;
          if (dd < d1) {
            d2 = d1;
            b = a;
            bx = ax;
            by = ay;
            d1 = dd;
            a = sd;
            ax = sx;
            ay = sy;
          } else if (dd < d2) {
            d2 = dd;
            b = sd;
            bx = sx;
            by = sy;
          }
        }
      }
      void b;
      const edge = (d2 - d1) / (2 * Math.hypot(bx - ax, by - ay) || 1);
      const i = yy * w + xx;
      const gr = grain ? grain[i]! : 0;
      const e = Math.min(1, Math.max(0, (edge - 1.2) / 24));
      const pillow = 1 - (1 - e) * (1 - e);
      const wob =
        Math.sin((x - ax) * 0.09 + a.tilt) *
        Math.cos((y - ay) * 0.08 + a.tilt) *
        0.06;
      height[i] = pillow * (0.85 + wob) + gr * 0.35 * pillow;
      tone[i] =
        edge < 2 ? 0.38 : a.tone * (0.94 + gr * 0.5) - (1 - pillow) * 0.3;
    }
  }
  const mk = () => {
    const k = document.createElement("canvas");
    k.width = w;
    k.height = h;
    const kg = k.getContext("2d")!;
    return { k, kg, data: kg.createImageData(w, h) };
  };
  const alb = mk();
  const nrm = mk();
  const rgh = mk();
  const at = (x: number, y: number) =>
    height[((y + h) % h) * w + ((x + w) % w)]!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = Math.min(1, Math.max(0.2, tone[i]!));
      alb.data.data[i * 4] = t * 244;
      alb.data.data[i * 4 + 1] = t * 239;
      alb.data.data[i * 4 + 2] = t * 230;
      alb.data.data[i * 4 + 3] = 255;
      const s = 2.6;
      const dx = (at(x + 1, y) - at(x - 1, y)) * s;
      const dy = (at(x, y + 1) - at(x, y - 1)) * s;
      const len = Math.hypot(dx, dy, 1);
      nrm.data.data[i * 4] = ((-dx / len) * 0.5 + 0.5) * 255;
      nrm.data.data[i * 4 + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      nrm.data.data[i * 4 + 2] = (1 / len) * 255;
      nrm.data.data[i * 4 + 3] = 255;
      const r = 215 + (1 - height[i]!) * 40;
      rgh.data.data[i * 4] =
        rgh.data.data[i * 4 + 1] =
        rgh.data.data[i * 4 + 2] =
          Math.min(255, r);
      rgh.data.data[i * 4 + 3] = 255;
    }
  }
  const tex = (o: ReturnType<typeof mk>, srgb: boolean) => {
    o.kg.putImageData(o.data, 0, 0);
    const t = new THREE.CanvasTexture(o.k);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return {
    map: tex(alb, true),
    normalMap: tex(nrm, false),
    roughnessMap: tex(rgh, false),
  };
}

/** Woven rattan lattice with open gaps (alpha), for the lanterns. */
function wickerTexture() {
  return canvasTex(512, 512, (g) => {
    const rand = seeded(77);
    g.clearRect(0, 0, 512, 512);
    g.lineCap = "round";
    const strand = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      w: number,
    ) => {
      const tone = 150 + rand() * 50;
      g.strokeStyle = `rgb(${tone + 50},${tone - 10},${tone - 75})`;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
      g.strokeStyle = "rgba(255,230,190,0.35)";
      g.lineWidth = w * 0.3;
      g.stroke();
    };
    for (let k = -512; k < 1024; k += 42) {
      strand(k, 0, k + 512, 512, 6);
      strand(k + 512, 0, k, 512, 6);
      strand(k + 3, 0, k + 515, 512, 2.5);
      strand(k + 509, 0, k - 3, 512, 2.5);
    }
    for (let y = 0; y <= 512; y += 128) {
      g.fillStyle = "#c0844c";
      g.fillRect(0, y - 6, 512, 12);
      g.fillStyle = "rgba(255,220,170,0.4)";
      g.fillRect(0, y - 6, 512, 3);
    }
  });
}

function labelTexture(
  lines: { text: string; font: string; color: string; y: number }[],
  w: number,
  h: number,
  bg: string,
) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const l of lines) {
      g.font = l.font;
      g.fillStyle = l.color;
      g.fillText(l.text, w / 2, l.y);
    }
  });
}

/** The acrylic table card: "Mediterrâneo" header, table number and a QR code. */
function tableCardTexture() {
  return canvasTex(256, 384, (g) => {
    const rand = seeded(108);
    g.fillStyle = "#f4f1ea";
    g.fillRect(0, 0, 256, 384);
    g.fillStyle = "#2b2b2b";
    g.textAlign = "center";
    g.font = "600 26px Georgia, serif";
    g.fillText("FAMIGLIA", 128, 50);
    g.font = "italic 18px Georgia, serif";
    g.fillText("Crosara", 128, 76);
    g.font = "500 64px Georgia, serif";
    g.fillText("108", 128, 150);
    const q = 6;
    const x0 = 68;
    const y0 = 196;
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++)
        if (rand() < 0.5) g.fillRect(x0 + x * q, y0 + y * q, q, q);
    for (const [cx, cy] of [
      [0, 0],
      [14, 0],
      [0, 14],
    ] as const) {
      g.fillStyle = "#2b2b2b";
      g.fillRect(x0 + cx * q, y0 + cy * q, 6 * q, 6 * q);
      g.fillStyle = "#f4f1ea";
      g.fillRect(x0 + (cx + 1) * q, y0 + (cy + 1) * q, 4 * q, 4 * q);
      g.fillStyle = "#2b2b2b";
      g.fillRect(x0 + (cx + 2) * q, y0 + (cy + 2) * q, 2 * q, 2 * q);
    }
    g.font = "14px sans-serif";
    g.fillText("cardápio digital", 128, 350);
  });
}

/* ---------------- shapes ---------------- */

/** Profile of a lantern (radius by height), revolved into a lathe. */
function lanternGeo(kind: "pill" | "dome" | "drop", R: number, L: number) {
  const pts: THREE.Vector2[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let r: number;
    if (kind === "pill")
      r = R * Math.pow(Math.sin(Math.PI * (0.04 + 0.92 * t)), 0.45);
    else if (kind === "dome")
      r = R * Math.pow(Math.cos((t * Math.PI) / 2), 0.55);
    else
      r =
        R * Math.pow(Math.sin(Math.PI * Math.pow(0.04 + 0.96 * t, 0.62)), 0.8);
    pts.push(new THREE.Vector2(Math.max(0.025, r), t * L));
  }
  return new THREE.LatheGeometry(pts, 28);
}

/** Arch outline (opening of half-width w, springing at height s). */
function archPath(
  path: THREE.Path | THREE.Shape,
  cx: number,
  w: number,
  s: number,
  clockwise: boolean,
) {
  if (!clockwise) {
    path.moveTo(cx - w, 0);
    path.lineTo(cx + w, 0);
    path.lineTo(cx + w, s);
    path.absarc(cx, s, w, 0, Math.PI, false);
    path.lineTo(cx - w, 0);
  } else {
    path.moveTo(cx - w, 0);
    path.lineTo(cx - w, s);
    path.absarc(cx, s, w, Math.PI, 0, true);
    path.lineTo(cx + w, 0);
    path.lineTo(cx - w, 0);
  }
}

/* ---------------- the scene ---------------- */

/*
 * Layout, as seen from their table (#108) on the night of 19/09, facing the
 * stone wall (−Z):
 * - straight ahead, ~12 m away, the tall white stone wall with its LED-lit
 *   banquette and ferns; the brick arch (blue-lit room behind it) sits right of
 *   centre, the round clothed tables with taupe armchairs in between;
 * - left of the stone wall a white plaster pier, then a recessed warm-beige
 *   corner with a cluster of small lanterns, a bougainvillea and a bare round
 *   wooden table;
 * - right of the arch a tall wooden pillar with a rounded, lit top, the
 *   "lotação máxima" sign and a speaker, and built-in wooden shelves;
 * - on their left, the glass wine cellar wall with backlit coloured glass on
 *   top, and little wooden tables with cross-back chairs;
 * - behind them, the banquette backs onto a screen of rustic horizontal
 *   branches with plants on top; the green-tiled bar is on the right, toward
 *   the entrance from the mall.
 * They sat side by side on the banquette (Elena on Davi's left), two empty
 * cross-back chairs across the table; the violinist played in front of the arch.
 */

const X0 = -7;
const X1 = 7;
const Z0 = -10;
const Z1 = 6;
const H = 5.4;
const ARCH_X = 2.3;
const STONE_X0 = -3.4;
const STONE_X1 = 4.3;
/** Their table (#108): a long light-wood table in front of the banquette. */
const T = { x: -0.4, z: 2.5, w: 1.5, d: 0.8, y: 0.75 };
const BENCH_Z = 3.55;

async function build(ctx: SceneCtx) {
  const high = ctx.quality === "high";
  const root = new THREE.Group();
  ctx.scene.add(root);
  ctx.scene.background = new THREE.Color("#0b0d0d");
  RectAreaLightUniformsLib.init();
  const rand = seeded(1909);

  // S: everything static, merged per material, no shadow casting.
  // C: the few things around their table that cast into the one shadow map.
  const S: Kit = new Map();
  const C: Kit = new Map();

  /* ---------- materials ---------- */
  const stoneTex = ctx.tex("tex-stone.webp");
  const stoneImg = await loaded(stoneTex);
  const stone = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.95,
  });
  {
    const maps = stoneMaps(stoneImg);
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap])
      t.repeat.set(1 / 3.4, 1 / 2.55);
    Object.assign(stone, maps);
    stone.normalScale.set(1.4, 1.4);
  }
  const brick = pbr(repeat(bricks("#b4643e", "#7e6150", 9, 31), 1.9, 1.9), {
    roughness: 0.9,
  });
  const beige = pbr(repeat(plaster("#d2b48e", 41), 0.12, 0.12));
  const whitePlaster = pbr(repeat(plaster("#e8e2d6", 42), 0.3, 0.3));
  const darkWall = new THREE.MeshStandardMaterial({
    color: "#1b2120",
    roughness: 0.95,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: "#1a2422",
    roughness: 0.92,
  });
  const floorMat = pbr(
    repeat(tiles("#77726b", "#4d4943", 4, 51, 0.25), 14 / 2.4, 17 / 2.4),
    { normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.8 },
  );
  const woodLight = pbr(repeat(woodPlanks("#c18a52", 2, 61), 0.6, 0.6), {
    roughness: 0.7,
  });
  const woodTop = pbr(repeat(woodPlanks("#c79457", 4, 62), 0.7, 0.7), {
    roughness: 0.45,
  });
  const woodDark = pbr(repeat(woodPlanks("#6e4326", 6, 63), 0.5, 2));
  const woodPanel = pbr(repeat(woodPlanks("#9a6438", 8, 64), 0.25, 1.2), {
    roughness: 0.55,
  });
  const branchMat = pbr(repeat(woodPlanks("#8a6040", 1, 65), 0.2, 1), {
    roughness: 0.8,
  });
  const upholstery = pbr(repeat(fabric("#9c8b76", 71), 3, 3), {
    side: THREE.DoubleSide,
  });
  const bench = pbr(repeat(fabric("#a39079", 72), 3, 3));
  const cloth = pbr(repeat(fabric("#a3937f", 73), 4, 4), { roughness: 0.95 });
  const cushion = pbr(repeat(fabric("#b9a68e", 74), 3, 3));
  const greenTile = pbr(
    repeat(tiles("#2e5a4b", "#1a2c26", 6, 81, 0.15), 10, 0.75),
    { envMapIntensity: 2 },
  );
  const placemat = new THREE.MeshStandardMaterial({
    color: "#1f2422",
    roughness: 0.6,
  });
  const napkin = pbr(repeat(fabric("#8f8273", 75), 1, 1));
  const steel = metal("#d4d4d0", 0.25);
  const black = new THREE.MeshStandardMaterial({
    color: "#111111",
    roughness: 0.5,
  });
  const whitePorcelain = new THREE.MeshStandardMaterial({
    color: "#ece9e2",
    roughness: 0.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.04,
    metalness: 0.1,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 3,
  });
  const ice = new THREE.MeshStandardMaterial({
    color: "#e8f2f4",
    roughness: 0.05,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const coke = new THREE.MeshStandardMaterial({
    color: "#3a160a",
    roughness: 0.05,
    transparent: true,
    opacity: 0.88,
  });
  const lime = new THREE.MeshStandardMaterial({
    color: "#8fbf3a",
    roughness: 0.5,
  });
  const redBottle = new THREE.MeshStandardMaterial({
    color: "#d01a1e",
    roughness: 0.1,
    transparent: true,
    opacity: 0.88,
    envMapIntensity: 2,
  });
  const bottleGreen = new THREE.MeshStandardMaterial({
    color: "#183722",
    roughness: 0.12,
    envMapIntensity: 2,
  });
  const bottleAmber = new THREE.MeshStandardMaterial({
    color: "#6b3510",
    roughness: 0.12,
    envMapIntensity: 2,
  });
  const terracotta = pbr(repeat(fabric("#a4583a", 76), 2, 2), {
    roughness: 0.85,
  });
  const soil = new THREE.MeshStandardMaterial({
    color: "#2a1d14",
    roughness: 1,
  });
  const cable = new THREE.MeshStandardMaterial({
    color: "#151515",
    roughness: 0.5,
  });
  const brass = metal("#b08a52", 0.35);
  const castIron = new THREE.MeshStandardMaterial({
    color: "#1c1c1c",
    roughness: 0.55,
    metalness: 0.4,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: "#e6dcc0",
    roughness: 0.4,
  });
  const spaghetti = new THREE.MeshStandardMaterial({
    color: "#ead9a6",
    roughness: 0.4,
  });
  const bacon = new THREE.MeshStandardMaterial({
    color: "#8c3f26",
    roughness: 0.6,
  });
  const sauce = new THREE.MeshStandardMaterial({
    color: "#962413",
    roughness: 0.3,
  });
  const breaded = new THREE.MeshStandardMaterial({
    color: "#a8692f",
    roughness: 0.8,
  });
  const cheese = new THREE.MeshStandardMaterial({
    color: "#efdca0",
    roughness: 0.35,
  });
  const greyPlate = new THREE.MeshStandardMaterial({
    color: "#7a7f83",
    roughness: 0.45,
    map: canvasTex(256, 256, (g) => {
      g.fillStyle = "#8a8e91";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "rgba(40,44,48,0.35)";
      g.lineWidth = 1.2;
      for (let a = 0; a < Math.PI * 2; a += 0.045) {
        g.beginPath();
        g.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40);
        g.lineTo(128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128);
        g.stroke();
      }
    }),
  });
  const wickerMap = wickerTexture();
  wickerMap.repeat.set(3, 1.5);
  // lit from inside: an unlit, over-bright lattice so it glows (and blooms) orange
  const wicker = new THREE.MeshBasicMaterial({
    map: wickerMap,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    color: new THREE.Color("#ff9a48").multiplyScalar(1.35),
  });
  const bulb = emissive("#ffd49a", 6);
  const warmLed = emissive("#ffc073", 3.2);
  const downlight = emissive("#fff1d8", 2.2);

  /* ---------- shell ---------- */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(X1 - X0, Z1 - Z0 + 1),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, (Z0 - 1 + Z1) / 2);
  floor.receiveShadow = true;
  root.add(floor);
  put(
    S,
    ceilingMat,
    new THREE.PlaneGeometry(X1 - X0, Z1 - Z0 + 1),
    0,
    H,
    (Z0 - 1 + Z1) / 2,
    Math.PI / 2,
  );

  // the white stone wall with the arch cut out
  const wallShape = new THREE.Shape();
  wallShape.moveTo(STONE_X0, 0);
  wallShape.lineTo(STONE_X1, 0);
  wallShape.lineTo(STONE_X1, H);
  wallShape.lineTo(STONE_X0, H);
  wallShape.lineTo(STONE_X0, 0);
  const hole = new THREE.Path();
  archPath(hole, ARCH_X, 1.2, 2.0, true);
  wallShape.holes.push(hole);
  put(S, stone, new THREE.ShapeGeometry(wallShape, 24), 0, 0, Z0);
  // the brick arch: surround and deep reveal in one extrusion
  const archShape = new THREE.Shape();
  archPath(archShape, ARCH_X, 1.2, 2.0, false);
  const inner = new THREE.Path();
  archPath(inner, ARCH_X, 0.78, 1.95, true);
  archShape.holes.push(inner);
  put(
    S,
    brick,
    new THREE.ExtrudeGeometry(archShape, {
      depth: 0.62,
      bevelEnabled: false,
      curveSegments: 24,
    }),
    0,
    0,
    Z0 - 0.55,
  );

  // left of the stone: the white plaster pier, then the recessed beige corner
  put(
    S,
    whitePlaster,
    new THREE.BoxGeometry(0.55, H, 1.4),
    STONE_X0 - 0.275,
    H / 2,
    Z0 + 0.7,
  );
  put(
    S,
    beige,
    new THREE.PlaneGeometry(STONE_X0 - 0.55 - X0, H),
    (X0 + STONE_X0 - 0.55) / 2,
    H / 2,
    Z0 - 0.6,
  );
  put(
    S,
    beige,
    new THREE.PlaneGeometry(0.6, H),
    STONE_X0 - 0.55,
    H / 2,
    Z0 - 0.3,
    0,
    -Math.PI / 2,
  );
  put(
    S,
    woodDark,
    new THREE.BoxGeometry(STONE_X0 - 0.55 - X0, 0.1, 0.03),
    (X0 + STONE_X0 - 0.55) / 2,
    0.05,
    Z0 - 0.585,
  );
  // a small black plaque on the beige wall
  put(S, black, new THREE.BoxGeometry(0.32, 0.12, 0.02), -5.0, 1.6, Z0 - 0.59);

  // right of the arch: wooden wall, the tall pillar with its lit rounded top
  put(
    S,
    woodPanel,
    new THREE.PlaneGeometry(X1 - STONE_X1, H),
    (STONE_X1 + X1) / 2,
    H / 2,
    Z0,
  );
  {
    const px = STONE_X1 + 0.3;
    put(S, woodPanel, new THREE.BoxGeometry(0.6, H, 0.7), px, H / 2, Z0 + 0.35);
    // the warm downlit glow on its face, rounded at the top as in the photos
    const glowShape = new THREE.Shape();
    archPath(glowShape, 0, 0.28, 3.6, false);
    const glowTex = canvasTex(64, 256, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, "rgba(255,214,160,1)");
      grd.addColorStop(0.35, "rgba(200,140,80,0.55)");
      grd.addColorStop(1, "rgba(120,70,30,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 256);
    });
    glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;
    const glowGeo = new THREE.ShapeGeometry(glowShape, 16);
    const uv = glowGeo.attributes.uv!;
    const pos = glowGeo.attributes.position!;
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, pos.getX(i) / 0.56 + 0.5, pos.getY(i) / 3.9);
    put(
      S,
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        depthWrite: false,
        color: new THREE.Color("#ffffff").multiplyScalar(0.9),
      }),
      glowGeo,
      px,
      0,
      Z0 + 0.705,
    );
    put(
      S,
      downlight,
      new THREE.CircleGeometry(0.04, 12),
      px,
      H - 0.02,
      Z0 + 1.0,
      Math.PI / 2,
    );
    // speaker and the capacity sign
    put(
      S,
      black,
      new RoundedBoxGeometry(0.18, 0.28, 0.16, 2, 0.02),
      px - 0.38,
      3.2,
      Z0 + 0.9,
    );
    const signTex = labelTexture(
      [
        {
          text: "LOTAÇÃO MÁXIMA:",
          font: "600 30px sans-serif",
          color: "#e9e9e9",
          y: 38,
        },
        {
          text: "375 Pessoas",
          font: "600 38px sans-serif",
          color: "#e9e9e9",
          y: 88,
        },
      ],
      320,
      128,
      "#163a2a",
    );
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.17),
      new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.5,
        emissive: "#ffffff",
        emissiveMap: signTex,
        emissiveIntensity: 0.25,
      }),
    );
    sign.position.set(px - 0.31, 2.75, Z0 + 0.6);
    sign.rotation.y = -Math.PI / 2;
    root.add(sign);
    // built-in wooden shelves along the right wall, with vases and glasses
    const sz0 = Z0 + 0.8;
    const sz1 = Z0 + 3.6;
    const smid = (sz0 + sz1) / 2;
    put(
      S,
      darkWall,
      new THREE.BoxGeometry(0.06, 3.4, sz1 - sz0),
      X1 - 0.03,
      1.7,
      smid,
    );
    put(
      S,
      woodPanel,
      new THREE.BoxGeometry(0.42, 0.9, sz1 - sz0),
      X1 - 0.21,
      0.45,
      smid,
    );
    put(
      S,
      woodPanel,
      new THREE.BoxGeometry(0.42, 0.06, sz1 - sz0),
      X1 - 0.21,
      3.4,
      smid,
    );
    for (let k = 0; k <= 3; k++)
      put(
        S,
        woodPanel,
        new THREE.BoxGeometry(0.42, 2.5, 0.05),
        X1 - 0.21,
        2.15,
        sz0 + 0.02 + k * ((sz1 - sz0 - 0.04) / 3),
      );
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 3; k++) {
        const z = sz0 + 0.5 + k * 0.92;
        const y = 1.0 + row * 0.82;
        put(
          S,
          woodPanel,
          new THREE.BoxGeometry(0.4, 0.03, 0.9),
          X1 - 0.22,
          y,
          z,
        );
        if ((row + k) % 2)
          put(
            S,
            glassMat,
            new THREE.CylinderGeometry(0.035, 0.03, 0.2, 12),
            X1 - 0.3,
            y + 0.1,
            z - 0.1,
          );
        else
          put(
            S,
            new THREE.MeshStandardMaterial({
              color: "#3e5f7a",
              roughness: 0.3,
            }),
            new THREE.LatheGeometry(
              [0, 0.06, 0.08, 0.05, 0.03, 0.035].map(
                (r, i) => new THREE.Vector2(r, i * 0.05),
              ),
              14,
            ),
            X1 - 0.3,
            y + 0.015,
            z,
          );
      }
    }
    put(
      S,
      emissive("#ffd9a8", 1.2),
      new THREE.BoxGeometry(0.02, 0.02, sz1 - sz0 - 0.2),
      X1 - 0.42,
      3.38,
      (sz0 + sz1) / 2,
    );
  }

  // left wall: the glass wine cellar, with backlit coloured glass on top
  {
    const za = -7.2;
    const zb = 1.2;
    const len = zb - za;
    const zc = (za + zb) / 2;
    put(
      S,
      beige,
      new THREE.PlaneGeometry(Z1 - Z0 + 1, H),
      X0,
      H / 2,
      (Z0 - 1 + Z1) / 2,
      0,
      Math.PI / 2,
    );
    const racks = canvasTex(1024, 256, (g) => {
      const r = seeded(33);
      g.fillStyle = "#17110d";
      g.fillRect(0, 0, 1024, 256);
      for (let y = 10; y < 256; y += 21) {
        for (let x = 10; x < 1024; x += 21) {
          const c = r();
          g.fillStyle = c < 0.5 ? "#1f3a26" : c < 0.8 ? "#4a1e14" : "#2b2a22";
          g.beginPath();
          g.arc(x, y, 8, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "rgba(255,240,210,0.35)";
          g.beginPath();
          g.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.fillStyle = "#5a3c24";
      for (let x = 0; x < 1024; x += 128) g.fillRect(x, 0, 6, 256);
    });
    racks.repeat.set(len / 4, 1);
    put(
      S,
      new THREE.MeshStandardMaterial({
        map: racks,
        roughness: 0.4,
        emissive: "#ffffff",
        emissiveMap: racks,
        emissiveIntensity: 0.35,
      }),
      new THREE.PlaneGeometry(len, 2.2),
      X0 + 0.25,
      1.25,
      zc,
      0,
      Math.PI / 2,
    );
    put(
      S,
      glassMat,
      new THREE.PlaneGeometry(len, 2.3),
      X0 + 0.45,
      1.25,
      zc,
      0,
      Math.PI / 2,
    );
    const stained = canvasTex(1024, 128, (g) => {
      const r = seeded(77);
      const cols = [
        "#2f6bd8",
        "#d83a2f",
        "#f2c230",
        "#3fa85a",
        "#f4efe4",
        "#e9852b",
        "#8a3fc0",
      ];
      for (let x = 0; x < 1024; x += 64) {
        for (let y = 0; y < 128; y += 64) {
          g.fillStyle = cols[Math.floor(r() * cols.length)]!;
          g.fillRect(x, y, 64, 64);
        }
      }
      g.strokeStyle = "#1a1612";
      g.lineWidth = 5;
      for (let x = 0; x <= 1024; x += 64) g.strokeRect(x, 0, 64, 128);
      g.beginPath();
      g.moveTo(0, 64);
      g.lineTo(1024, 64);
      g.stroke();
    });
    stained.repeat.set(len / 5, 1);
    put(
      S,
      new THREE.MeshBasicMaterial({
        map: stained,
        color: new THREE.Color("#ffffff").multiplyScalar(1.15),
      }),
      new THREE.PlaneGeometry(len, 0.9),
      X0 + 0.25,
      2.95,
      zc,
      0,
      Math.PI / 2,
    );
    // wooden frame of the cellar
    for (let z = za; z <= zb + 0.01; z += len / 6)
      put(
        S,
        woodDark,
        new THREE.BoxGeometry(0.12, 3.5, 0.08),
        X0 + 0.48,
        1.75,
        z,
      );
    for (const y of [0.1, 2.42, 3.45])
      put(
        S,
        woodDark,
        new THREE.BoxGeometry(0.12, 0.08, len),
        X0 + 0.48,
        y,
        zc,
      );
    ctx.wall(X0, za - 0.1, X0 + 0.55, zb + 0.1);
  }

  // the back room through the arch (blue light from the kitchen pass)
  const BR = {
    x0: ARCH_X - 1.9,
    x1: ARCH_X + 1.9,
    z0: Z0 - 3.0,
    z1: Z0 - 0.55,
    h: 3.0,
  };
  {
    const w = BR.x1 - BR.x0;
    const d = BR.z1 - BR.z0;
    const cx = (BR.x0 + BR.x1) / 2;
    const cz = (BR.z0 + BR.z1) / 2;
    put(
      S,
      floorMat,
      new THREE.PlaneGeometry(w, d),
      cx,
      0.001,
      cz,
      -Math.PI / 2,
    );
    put(S, darkWall, new THREE.PlaneGeometry(w, d), cx, BR.h, cz, Math.PI / 2);
    put(
      S,
      brick,
      new THREE.PlaneGeometry(d, BR.h),
      BR.x0,
      BR.h / 2,
      cz,
      0,
      Math.PI / 2,
    );
    put(
      S,
      brick,
      new THREE.PlaneGeometry(d, BR.h),
      BR.x1,
      BR.h / 2,
      cz,
      0,
      -Math.PI / 2,
    );
    put(S, darkWall, new THREE.PlaneGeometry(w, BR.h), cx, BR.h / 2, BR.z0);
    put(
      S,
      emissive("#2766d8", 0.9),
      new THREE.PlaneGeometry(2.4, 0.9),
      cx,
      1.55,
      BR.z0 + 0.01,
    );
    put(
      S,
      black,
      new THREE.BoxGeometry(2.6, 0.08, 0.3),
      cx,
      1.06,
      BR.z0 + 0.15,
    );
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(2.6, 0.3, 0.2),
      cx,
      2.15,
      BR.z0 + 0.1,
    );
    for (let i = 0; i < 7; i++) {
      const x = BR.x0 + 0.4 + (i / 6) * (w - 0.8);
      put(
        S,
        bulb,
        new THREE.SphereGeometry(0.025, 8, 6),
        x,
        2.75 - Math.sin((i / 6) * Math.PI) * 0.15,
        BR.z1 - 0.4,
      );
    }
    // small framed pictures on the brick, right of the opening (inside)
    for (let i = 0; i < 3; i++) {
      put(
        S,
        black,
        new THREE.BoxGeometry(0.03, 0.3, 0.24),
        BR.x1 - 0.02,
        1.6 + (i % 2) * 0.35,
        BR.z1 - 0.4 - i * 0.4,
      );
      put(
        S,
        cream,
        new THREE.PlaneGeometry(0.19, 0.25),
        BR.x1 - 0.04,
        1.6 + (i % 2) * 0.35,
        BR.z1 - 0.4 - i * 0.4,
        0,
        -Math.PI / 2,
      );
    }
    const blue = new THREE.PointLight("#4f8dff", 4, 6, 2);
    blue.position.set(cx, 1.8, BR.z0 + 0.8);
    root.add(blue);
  }

  /* ---------- prototypes ---------- */

  // taupe upholstered armchair with a wooden A-frame (faces +Z)
  const armchair = (() => {
    const k: Kit = new Map();
    put(
      k,
      upholstery,
      new RoundedBoxGeometry(0.5, 0.08, 0.46, 2, 0.035),
      0,
      0.39,
      0.02,
    );
    put(
      k,
      upholstery,
      new THREE.CylinderGeometry(
        0.29,
        0.29,
        0.3,
        14,
        1,
        true,
        Math.PI - 1.15,
        2.3,
      ),
      0,
      0.68,
      0.04,
    );
    put(
      k,
      upholstery,
      new THREE.CylinderGeometry(
        0.31,
        0.31,
        0.3,
        14,
        1,
        true,
        Math.PI - 1.15,
        2.3,
      ),
      0,
      0.68,
      0.04,
    );
    put(
      k,
      upholstery,
      new THREE.TorusGeometry(0.3, 0.012, 4, 14, 2.3),
      0,
      0.83,
      0.04,
      Math.PI / 2,
      0,
      -Math.PI / 2 - 1.15,
    );
    for (const s of [-1, 1]) {
      const x = s * 0.27;
      beam(k, woodLight, v3(x, 0, 0.25), v3(x, 0.6, 0.13), 0.035, 0.05);
      beam(k, woodLight, v3(x, 0, -0.27), v3(x, 0.6, -0.12), 0.035, 0.05);
      beam(k, woodLight, v3(x, 0.6, -0.24), v3(x, 0.6, 0.2), 0.04, 0.06);
    }
    beam(k, woodLight, v3(-0.27, 0.33, 0), v3(0.27, 0.33, 0), 0.03, 0.04);
    return bake(k);
  })();

  // light-wood cross-back chair with a beige cushion (faces +Z)
  const crossChair = (() => {
    const k: Kit = new Map();
    put(
      k,
      woodLight,
      new RoundedBoxGeometry(0.44, 0.035, 0.42, 2, 0.012),
      0,
      0.37,
      0,
    );
    put(
      k,
      cushion,
      new RoundedBoxGeometry(0.41, 0.045, 0.38, 2, 0.018),
      0,
      0.405,
      0.01,
    );
    for (const s of [-1, 1]) {
      rod(
        k,
        woodLight,
        v3(s * 0.19, 0, 0.19),
        v3(s * 0.185, 0.36, 0.18),
        0.017,
        6,
      );
      rod(
        k,
        woodLight,
        v3(s * 0.19, 0, -0.21),
        v3(s * 0.175, 0.92, -0.245),
        0.018,
        6,
      );
    }
    for (const [y, r] of [
      [0.88, 0.03],
      [0.82, 0.012],
    ] as const) {
      put(
        k,
        woodLight,
        new THREE.TubeGeometry(
          new THREE.QuadraticBezierCurve3(
            v3(-0.19, y, -0.24),
            v3(0, y + 0.01, -0.29),
            v3(0.19, y, -0.24),
          ),
          8,
          r,
          5,
          false,
        ),
      );
    }
    beam(
      k,
      woodLight,
      v3(-0.17, 0.42, -0.22),
      v3(0.17, 0.84, -0.24),
      0.03,
      0.018,
    );
    beam(
      k,
      woodLight,
      v3(0.17, 0.42, -0.22),
      v3(-0.17, 0.84, -0.24),
      0.03,
      0.018,
    );
    put(
      k,
      woodLight,
      new THREE.TorusGeometry(0.2, 0.012, 5, 20),
      0,
      0.16,
      -0.01,
      Math.PI / 2,
    );
    return bake(k);
  })();

  // round table with a floor-length linen cloth (Ø 1.4)
  const roundTable = (() => {
    const k: Kit = new Map();
    put(
      k,
      cloth,
      new THREE.CircleGeometry(0.665, 48),
      0,
      0.766,
      0,
      -Math.PI / 2,
    );
    const pts = [
      [0.66, 0.765],
      [0.7, 0.75],
      [0.715, 0.7],
      [0.725, 0.4],
      [0.745, 0.05],
      [0.75, 0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(pts.reverse(), 56);
    const pos = geo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y < 0.74) {
        const a = Math.atan2(z, x);
        const f =
          1 +
          (0.022 * Math.sin(a * 11) + 0.01 * Math.sin(a * 23 + 1)) *
            (1 - y / 0.76);
        pos.setXYZ(i, x * f, y, z * f);
      }
    }
    geo.computeVertexNormals();
    put(k, cloth, geo);
    return bake(k);
  })();

  // light-wood table (w × d) on four splayed legs
  const woodTable = (w: number, d: number) => {
    const k: Kit = new Map();
    put(k, woodTop, new RoundedBoxGeometry(w, 0.04, d, 2, 0.012), 0, 0.73, 0);
    put(
      k,
      woodLight,
      new THREE.BoxGeometry(w - 0.14, 0.07, d - 0.14),
      0,
      0.675,
      0,
    );
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        beam(
          k,
          woodLight,
          v3(sx * (w / 2 - 0.04), 0, sz * (d / 2 - 0.04)),
          v3(sx * (w / 2 - 0.11), 0.66, sz * (d / 2 - 0.11)),
          0.045,
        );
    return bake(k);
  };
  const smallTable = woodTable(0.75, 0.75);
  const longTable = woodTable(T.w, T.d);

  const benchTable = (() => {
    const k: Kit = new Map();
    put(
      k,
      cloth,
      new RoundedBoxGeometry(0.95, 0.04, 0.72, 2, 0.015),
      0,
      0.745,
      0,
    );
    put(k, cloth, new THREE.BoxGeometry(0.97, 0.73, 0.74), 0, 0.365, 0);
    return bake(k);
  })();

  const goblet = new THREE.LatheGeometry(
    [
      [0, 0.002],
      [0.035, 0.002],
      [0.035, 0.006],
      [0.006, 0.012],
      [0.005, 0.07],
      [0.025, 0.085],
      [0.04, 0.12],
      [0.041, 0.175],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    18,
  );
  const gobletFill = (h: number) =>
    new THREE.LatheGeometry(
      [
        [0, 0.086],
        [0.024, 0.088],
        [0.037, 0.115],
        [0.039, h],
        [0, h],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      14,
    );

  /** A place setting: dark round placemat, folded taupe napkin with cutlery, an empty goblet. */
  const setting = (
    kit: Kit,
    x: number,
    y: number,
    z: number,
    yaw: number,
    glass = true,
  ) => {
    const m = new THREE.Matrix4().compose(
      v3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(UP, yaw),
      v3(1, 1, 1),
    );
    const at = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      lx: number,
      ly: number,
      lz: number,
      ry = 0,
      sx = 1,
    ) => {
      const l = new THREE.Matrix4().compose(
        v3(lx, ly, lz),
        new THREE.Quaternion().setFromAxisAngle(UP, ry),
        v3(sx, 1, 1),
      );
      putM(kit, mat, geo, m.clone().multiply(l));
    };
    at(
      new THREE.CylinderGeometry(0.17, 0.17, 0.005, 28),
      placemat,
      0,
      0.003,
      0,
      0,
      1.2,
    );
    at(
      new RoundedBoxGeometry(0.11, 0.02, 0.2, 1, 0.006),
      napkin,
      0.13,
      0.014,
      0.02,
    );
    at(new THREE.BoxGeometry(0.012, 0.003, 0.19), steel, 0.11, 0.026, 0.02);
    at(new THREE.BoxGeometry(0.014, 0.003, 0.19), steel, 0.15, 0.026, 0.02);
    if (glass) at(goblet, glassMat, -0.12, 0, -0.2);
  };

  /* ---------- the dining room (round tables before the stone wall) ---------- */
  const rounds: [number, number][] = [
    [-1.7, -6.5],
    [1.0, -5.3],
    [-2.3, -3.2],
    [4.6, -6.0],
    [1.6, -1.6],
  ];
  rounds.forEach(([x, z], i) => {
    stamp(S, roundTable, x, 0, z);
    for (let s = 0; s < 4; s++) {
      const a = Math.PI / 4 + i * 0.3 + (s * Math.PI) / 2;
      stamp(
        S,
        armchair,
        x + Math.sin(a) * 0.95,
        0,
        z + Math.cos(a) * 0.95,
        a + Math.PI + (rand() - 0.5) * 0.25,
      );
      setting(
        S,
        x + Math.sin(a) * 0.5,
        0.768,
        z + Math.cos(a) * 0.5,
        a + Math.PI,
      );
    }
    ctx.wall(x - 1.15, z - 1.15, x + 1.15, z + 1.15);
  });

  // banquette along the stone wall, LED strip and ferns on the ledge
  const benchSeg = (xa: number, xb: number) => {
    const len = xb - xa;
    const cx = (xa + xb) / 2;
    put(S, woodDark, new THREE.BoxGeometry(len, 0.3, 0.6), cx, 0.15, Z0 + 0.32);
    put(
      S,
      bench,
      new RoundedBoxGeometry(len, 0.13, 0.56, 2, 0.04),
      cx,
      0.37,
      Z0 + 0.34,
    );
    const n = Math.round(len / 0.2);
    put(
      S,
      bench,
      new RoundedBoxGeometry(len, 0.62, 0.12, 2, 0.045),
      cx,
      0.76,
      Z0 + 0.1,
      -0.09,
    );
    for (let i = 1; i < n; i++)
      put(
        S,
        darkWall,
        new THREE.BoxGeometry(0.012, 0.56, 0.02),
        xa + (i * len) / n,
        0.77,
        Z0 + 0.17,
        -0.09,
      );
    put(S, woodDark, new THREE.BoxGeometry(len, 0.06, 0.2), cx, 1.1, Z0 + 0.1);
    put(
      S,
      warmLed,
      new THREE.BoxGeometry(len, 0.012, 0.02),
      cx,
      1.135,
      Z0 + 0.03,
    );
    ctx.wall(xa, Z0, xb, Z0 + 0.65);
  };
  const benchL = [STONE_X0 + 0.05, ARCH_X - 1.25] as const;
  benchSeg(benchL[0], benchL[1]);
  benchSeg(ARCH_X + 1.25, STONE_X1 - 0.02);
  {
    const len = benchL[1] - benchL[0];
    const glow = new THREE.RectAreaLight("#ffb766", 7, len + 1.5, 0.06);
    glow.position.set((benchL[0] + benchL[1]) / 2 + 0.7, 1.16, Z0 + 0.05);
    glow.lookAt((benchL[0] + benchL[1]) / 2 + 0.7, 3.4, Z0 - 0.4);
    root.add(glow);
  }
  for (const x of [-2.6, -0.8]) {
    stamp(S, benchTable, x, 0, Z0 + 1.05);
    stamp(S, armchair, x, 0, Z0 + 1.85, Math.PI + (rand() - 0.5) * 0.2);
    setting(S, x, 0.765, Z0 + 1.3, Math.PI);
    setting(S, x, 0.765, Z0 + 0.82, 0);
  }
  ctx.wall(STONE_X0, Z0 + 0.6, 0.0, Z0 + 2.15);

  // right of the arch: two small wooden tables with cross-back chairs
  for (const [x, z] of [
    [5.7, -8.6],
    [5.7, -4.1],
  ] as const) {
    stamp(S, smallTable, x, 0, z);
    stamp(S, crossChair, x, 0, z - 0.52, 0);
    stamp(S, crossChair, x, 0, z + 0.52, Math.PI);
    setting(S, x, 0.75, z - 0.2, 0);
    setting(S, x, 0.75, z + 0.2, Math.PI);
    ctx.wall(x - 0.45, z - 0.85, x + 0.45, z + 0.85);
  }

  // the beige corner: a bare round wooden table and two armchairs
  {
    const x = -5.4;
    const z = -8.7;
    put(
      S,
      woodTop,
      new THREE.CylinderGeometry(0.4, 0.4, 0.035, 32),
      x,
      0.74,
      z,
    );
    for (let i = 0; i < 4; i++)
      beam(
        S,
        woodLight,
        v3(
          x + Math.cos(i * 1.571 + 0.78) * 0.32,
          0,
          z + Math.sin(i * 1.571 + 0.78) * 0.32,
        ),
        v3(x, 0.72, z),
        0.04,
      );
    stamp(S, armchair, x - 0.7, 0, z + 0.1, Math.PI / 2);
    stamp(S, armchair, x + 0.7, 0, z + 0.1, -Math.PI / 2);
    ctx.wall(x - 1.0, z - 0.5, x + 1.0, z + 0.55);
  }

  // little wooden tables along the wine cellar
  for (const z of [-5.6, -2.9, -0.2]) {
    const x = -5.6;
    stamp(S, smallTable, x, 0, z);
    stamp(S, crossChair, x - 0.55, 0, z, Math.PI / 2);
    stamp(S, crossChair, x + 0.55, 0, z, -Math.PI / 2);
    setting(S, x - 0.2, 0.75, z, Math.PI / 2);
    setting(S, x + 0.2, 0.75, z, -Math.PI / 2);
    ctx.wall(x - 0.85, z - 0.45, x + 0.85, z + 0.45);
  }

  /* ---------- their banquette and the branch screen behind them ---------- */
  const PX0 = -2.6;
  const PX1 = 1.9;
  {
    const len = PX1 - PX0;
    const cx = (PX0 + PX1) / 2;
    // banquette (facing −Z), seat top at 0.43
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(len, 0.3, 0.58),
      cx,
      0.15,
      BENCH_Z - 0.29,
    );
    put(
      C,
      bench,
      new RoundedBoxGeometry(len, 0.13, 0.56, 2, 0.04),
      cx,
      0.37,
      BENCH_Z - 0.3,
    );
    put(
      C,
      bench,
      new RoundedBoxGeometry(len, 0.62, 0.12, 2, 0.045),
      cx,
      0.76,
      BENCH_Z - 0.06,
      0.09,
    );
    const n = Math.round(len / 0.2);
    for (let i = 1; i < n; i++)
      put(
        S,
        darkWall,
        new THREE.BoxGeometry(0.012, 0.56, 0.02),
        PX0 + (i * len) / n,
        0.77,
        BENCH_Z - 0.13,
        0.09,
      );
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(len, 1.1, 0.1),
      cx,
      0.55,
      BENCH_Z + 0.03,
    );
    // rustic horizontal branches between wooden posts, plants on top
    for (let x = PX0; x <= PX1 + 0.01; x += len / 3)
      put(
        S,
        woodDark,
        new THREE.BoxGeometry(0.09, 2.5, 0.09),
        x,
        1.25,
        BENCH_Z + 0.03,
      );
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(len, 0.08, 0.32),
      cx,
      2.5,
      BENCH_Z + 0.03,
    );
    for (let y = 1.2; y < 2.42; y += 0.095) {
      for (let s = 0; s < 3; s++) {
        const xa = PX0 + (s * len) / 3 + 0.05;
        const xb = xa + len / 3 - 0.1;
        const r = 0.018 + rand() * 0.016;
        rod(
          S,
          branchMat,
          v3(
            xa - rand() * 0.05,
            y + (rand() - 0.5) * 0.03,
            BENCH_Z + (rand() - 0.5) * 0.04,
          ),
          v3(
            xb + rand() * 0.05,
            y + (rand() - 0.5) * 0.03,
            BENCH_Z + (rand() - 0.5) * 0.04,
          ),
          r,
          5,
        );
      }
    }
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(len, 0.22, 0.3),
      cx,
      2.65,
      BENCH_Z + 0.03,
    );
    ctx.wall(PX0 - 0.05, BENCH_Z - 0.6, PX1 + 0.05, BENCH_Z + 0.2);
  }
  // the neighbouring table on the same banquette
  stamp(S, longTable, 1.2, 0, T.z);
  for (const x of [0.85, 1.55]) {
    stamp(S, crossChair, x, 0, T.z - 0.62, 0);
    setting(S, x, T.y, T.z - 0.2, 0);
    setting(S, x, T.y, T.z + 0.22, Math.PI);
  }
  ctx.wall(0.45, T.z - 0.95, 1.95, T.z + 0.42);

  /* ---------- their table (#108) ---------- */
  const ELENA_X = T.x - 0.38;
  const DAVI_X = T.x + 0.36;
  {
    const y = T.y;
    stamp(C, longTable, T.x, 0, T.z);
    // the two empty cross-back chairs across from them
    stamp(C, crossChair, T.x - 0.38, 0, T.z - 0.62, 0.05);
    stamp(C, crossChair, T.x + 0.36, 0, T.z - 0.64, -0.06);
    setting(C, T.x - 0.38, y, T.z - 0.22, 0);
    setting(C, T.x + 0.36, y, T.z - 0.22, 0);
    ctx.wall(T.x - T.w / 2, T.z - 0.95, T.x + T.w / 2, T.z + T.d / 2);

    // their places: placemat, ribbed grey plate with carbonara and parmigiana
    const r = seeded(19);
    for (const px of [ELENA_X, DAVI_X]) {
      const pz = T.z + 0.2;
      put(
        C,
        placemat,
        new THREE.CylinderGeometry(0.17, 0.17, 0.005, 28),
        px,
        y + 0.003,
        pz,
        0,
        0,
        0,
        1.2,
        1,
        1,
      );
      put(
        C,
        greyPlate,
        new THREE.CylinderGeometry(0.135, 0.12, 0.018, 36),
        px,
        y + 0.014,
        pz,
      );
      for (let i = 0; i < 11; i++) {
        const pts: THREE.Vector3[] = [];
        let a = r() * Math.PI * 2;
        let rad = 0.01 + r() * 0.04;
        for (let k = 0; k < 6; k++) {
          a += 0.8 + r() * 0.6;
          rad = Math.min(0.06, Math.max(0.005, rad + (r() - 0.5) * 0.035));
          pts.push(
            v3(
              px + 0.03 + Math.cos(a) * rad,
              y + 0.026 + (0.035 - rad * 0.45) * (0.6 + r() * 0.5),
              pz + Math.sin(a) * rad,
            ),
          );
        }
        put(
          C,
          spaghetti,
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(pts),
            28,
            0.0024,
            4,
            false,
          ),
        );
      }
      for (let i = 0; i < 6; i++)
        put(
          C,
          bacon,
          new THREE.BoxGeometry(0.01, 0.006, 0.008),
          px + 0.03 + (r() - 0.5) * 0.08,
          y + 0.05,
          pz + (r() - 0.5) * 0.08,
          r(),
          r(),
          r(),
        );
      // a piece of parmigiana: breaded, tomato sauce and melted cheese
      put(
        C,
        breaded,
        new RoundedBoxGeometry(0.08, 0.02, 0.1, 2, 0.008),
        px - 0.05,
        y + 0.033,
        pz - 0.01,
        0,
        0.4,
        0,
      );
      put(
        C,
        sauce,
        new THREE.SphereGeometry(0.05, 14, 8),
        px - 0.05,
        y + 0.04,
        pz - 0.01,
        0,
        0.4,
        0,
        0.85,
        0.16,
        1.05,
      );
      put(
        C,
        cheese,
        new THREE.SphereGeometry(0.03, 12, 6),
        px - 0.05,
        y + 0.046,
        pz - 0.015,
        0,
        0,
        0,
        1,
        0.12,
        0.9,
      );
      // fork and knife resting on the plate
      put(
        C,
        steel,
        new THREE.BoxGeometry(0.012, 0.004, 0.19),
        px + 0.08,
        y + 0.03,
        pz + 0.02,
        0,
        0,
        0.04,
      );
      put(
        C,
        steel,
        new THREE.BoxGeometry(0.014, 0.004, 0.2),
        px - 0.09,
        y + 0.03,
        pz + 0.02,
        0,
        0.3,
        0.04,
      );
    }
    // the shared dishes on wooden boards: carbonara in a black cast-iron oval
    // dish, parmigiana in a terracotta bowl with two serving spoons
    const cz = T.z - 0.08;
    put(
      C,
      woodDark,
      new RoundedBoxGeometry(0.62, 0.025, 0.3, 2, 0.01),
      T.x,
      y + 0.0125,
      cz,
    );
    put(
      C,
      castIron,
      new THREE.CylinderGeometry(0.1, 0.092, 0.05, 28, 1, true),
      T.x + 0.12,
      y + 0.05,
      cz,
      0,
      0,
      0,
      1.55,
      1,
      1,
    );
    put(
      C,
      castIron,
      new THREE.CircleGeometry(0.092, 28),
      T.x + 0.12,
      y + 0.027,
      cz,
      -Math.PI / 2,
      0,
      0,
      1.55,
      1,
      1,
    );
    for (const s of [-1, 1])
      put(
        C,
        castIron,
        new THREE.BoxGeometry(0.05, 0.015, 0.06),
        T.x + 0.12 + s * 0.17,
        y + 0.07,
        cz,
      );
    put(
      C,
      cream,
      new THREE.CircleGeometry(0.094, 28),
      T.x + 0.12,
      y + 0.064,
      cz,
      -Math.PI / 2,
      0,
      0,
      1.52,
      1,
      1,
    );
    for (let i = 0; i < 9; i++) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 5; k++)
        pts.push(
          v3(
            T.x + 0.12 + (r() - 0.5) * 0.25,
            y + 0.066 + r() * 0.008,
            cz + (r() - 0.5) * 0.14,
          ),
        );
      put(
        C,
        spaghetti,
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          20,
          0.0024,
          4,
          false,
        ),
      );
    }
    for (let i = 0; i < 10; i++)
      put(
        C,
        bacon,
        new THREE.BoxGeometry(0.01, 0.005, 0.008),
        T.x + 0.12 + (r() - 0.5) * 0.24,
        y + 0.07,
        cz + (r() - 0.5) * 0.12,
        0,
        r() * 3,
        0,
      );
    put(
      C,
      terracotta,
      new THREE.LatheGeometry(
        [0, 0.07, 0.085, 0.09, 0.087].map(
          (rr, i) => new THREE.Vector2(rr, i * 0.013),
        ),
        22,
      ),
      T.x - 0.17,
      y + 0.025,
      cz,
    );
    put(
      C,
      sauce,
      new THREE.CircleGeometry(0.082, 22),
      T.x - 0.17,
      y + 0.068,
      cz,
      -Math.PI / 2,
    );
    put(
      C,
      cheese,
      new THREE.SphereGeometry(0.035, 12, 6),
      T.x - 0.18,
      y + 0.069,
      cz + 0.01,
      0,
      0,
      0,
      1,
      0.15,
      0.8,
    );
    for (const s of [-1, 1]) {
      put(
        C,
        steel,
        new THREE.BoxGeometry(0.012, 0.004, 0.17),
        T.x - 0.17 + s * 0.025,
        y + 0.11,
        cz + 0.06,
        0.55,
        s * 0.15,
        0,
      );
      put(
        C,
        steel,
        new THREE.SphereGeometry(0.02, 10, 6),
        T.x - 0.17 + s * 0.025,
        y + 0.075,
        cz - 0.01,
        0,
        0,
        0,
        0.8,
        0.25,
        1.1,
      );
    }
    // the starter: bolinhos with aioli on a white rectangular plate
    put(
      C,
      whitePorcelain,
      new RoundedBoxGeometry(0.34, 0.014, 0.12, 2, 0.006),
      T.x - 0.55,
      y + 0.007,
      cz + 0.02,
      0,
      0.25,
      0,
    );
    for (let i = 0; i < 3; i++) {
      const bx = T.x - 0.55 + (i - 1) * 0.095 * Math.cos(0.25);
      const bz = cz + 0.02 - (i - 1) * 0.095 * Math.sin(0.25);
      put(
        C,
        breaded,
        new THREE.SphereGeometry(0.03, 14, 10),
        bx,
        y + 0.04,
        bz,
        0,
        0,
        0,
        1,
        0.85,
        1,
      );
      put(
        C,
        cream,
        new THREE.SphereGeometry(0.015, 10, 6),
        bx,
        y + 0.066,
        bz,
        0,
        0,
        0,
        1,
        0.45,
        1,
      );
    }
    // drinks: Coca-Cola can and a goblet of coke on ice (Davi), water with
    // ice and lime (Elena), the red glass bottle
    const canTex = canvasTex(256, 128, (g) => {
      g.fillStyle = "#c8101a";
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = "#ffffff";
      g.font = "italic 700 34px Georgia, serif";
      g.fillText("Coca-Cola", 40, 76);
      g.fillRect(0, 100, 256, 4);
    });
    put(
      C,
      new THREE.MeshStandardMaterial({
        map: canTex,
        roughness: 0.3,
        metalness: 0.5,
      }),
      new THREE.CylinderGeometry(0.033, 0.033, 0.122, 20, 1, true),
      DAVI_X + 0.3,
      y + 0.061,
      T.z - 0.02,
    );
    put(
      C,
      metal("#cfcfcf", 0.3),
      new THREE.CircleGeometry(0.031, 18),
      DAVI_X + 0.3,
      y + 0.122,
      T.z - 0.02,
      -Math.PI / 2,
    );
    const drink = (
      x: number,
      z: number,
      fill: THREE.Material,
      withLime: boolean,
    ) => {
      put(C, glassMat, goblet, x, y, z);
      put(C, fill, gobletFill(0.15), x, y, z);
      for (let i = 0; i < 3; i++)
        put(
          C,
          ice,
          new RoundedBoxGeometry(0.03, 0.028, 0.03, 1, 0.006),
          x + (i - 1) * 0.018,
          y + 0.14 + (i % 2) * 0.01,
          z + (i % 2) * 0.012,
          0.3 * i,
          0.5 * i,
          0,
        );
      if (withLime)
        put(
          C,
          lime,
          new THREE.CylinderGeometry(
            0.025,
            0.025,
            0.006,
            16,
            1,
            false,
            0,
            Math.PI,
          ),
          x + 0.01,
          y + 0.155,
          z,
          Math.PI / 2,
          0,
          0.2,
        );
    };
    drink(DAVI_X + 0.18, T.z - 0.05, coke, false);
    drink(
      ELENA_X - 0.2,
      T.z - 0.03,
      new THREE.MeshStandardMaterial({
        color: "#d9ecf0",
        roughness: 0.05,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
      true,
    );
    put(
      C,
      redBottle,
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.032, 0],
          [0.033, 0.13],
          [0.028, 0.17],
          [0.013, 0.2],
          [0.012, 0.235],
          [0, 0.235],
        ].map(([x, yy]) => new THREE.Vector2(x, yy)),
        18,
      ),
      ELENA_X - 0.3,
      y,
      T.z - 0.15,
    );
    // her phone and the table card "108"
    put(
      C,
      black,
      new RoundedBoxGeometry(0.075, 0.008, 0.155, 2, 0.006),
      ELENA_X - 0.05,
      y + 0.004,
      T.z - 0.25,
      0,
      0.35,
      0,
    );
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.12),
      new THREE.MeshStandardMaterial({
        map: tableCardTexture(),
        roughness: 0.3,
      }),
    );
    card.position.set(T.x + T.w / 2 - 0.1, y + 0.075, T.z - 0.3);
    card.rotation.y = Math.PI;
    root.add(card);
    const card2 = card.clone();
    card2.rotation.y = 0;
    card2.position.z -= 0.006;
    root.add(card2);
    put(
      C,
      glassMat,
      new THREE.BoxGeometry(0.09, 0.13, 0.008),
      card.position.x,
      y + 0.075,
      T.z - 0.303,
    );
    put(
      C,
      whitePlaster,
      new THREE.BoxGeometry(0.1, 0.02, 0.05),
      card.position.x,
      y + 0.01,
      T.z - 0.303,
    );
  }

  /* ---------- the bar (right side, toward the entrance) ---------- */
  const BAR = { x: 5.25, z0: 1.6, z1: 5.0 };
  {
    const len = BAR.z1 - BAR.z0;
    const cz = (BAR.z0 + BAR.z1) / 2;
    put(S, greenTile, new THREE.BoxGeometry(0.6, 1.0, len), BAR.x, 0.5, cz);
    put(
      S,
      woodTop,
      new RoundedBoxGeometry(0.78, 0.05, len + 0.12, 2, 0.015),
      BAR.x - 0.05,
      1.03,
      cz,
    );
    put(
      S,
      emissive("#5ee0d0", 2.2),
      new THREE.BoxGeometry(0.015, 0.015, len),
      BAR.x - 0.3,
      0.98,
      cz,
    );
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(0.5, 0.95, len),
      X1 - 0.25,
      0.475,
      cz,
    );
    put(
      S,
      emissive("#ffe2b8", 0.8),
      new THREE.PlaneGeometry(len, 1.25),
      X1 - 0.02,
      1.95,
      cz,
      0,
      -Math.PI / 2,
    );
    for (let s = 0; s < 3; s++) {
      const y = 1.35 + s * 0.42;
      put(S, woodTop, new THREE.BoxGeometry(0.3, 0.03, len), X1 - 0.16, y, cz);
      for (let z = BAR.z0 + 0.15; z < BAR.z1 - 0.1; z += 0.14 + rand() * 0.06)
        put(
          S,
          rand() < 0.5 ? bottleGreen : bottleAmber,
          new THREE.CylinderGeometry(0.035, 0.037, 0.3, 8),
          X1 - 0.15,
          y + 0.165,
          z,
        );
    }
    // the blue drinks fridge and the kitchen doors, with bamboo above
    put(
      S,
      metal("#9da2a6", 0.4),
      new THREE.BoxGeometry(0.72, 2.05, 0.8),
      X1 - 0.38,
      1.025,
      0.6,
    );
    put(
      S,
      emissive("#3f9cff", 1.1),
      new THREE.PlaneGeometry(0.66, 1.62),
      X1 - 0.745,
      1.05,
      0.6,
      0,
      -Math.PI / 2,
    );
    put(
      S,
      woodDark,
      new THREE.BoxGeometry(0.12, 2.5, 1.65),
      X1 - 0.06,
      1.25,
      -1.0,
    );
    for (const s of [-1, 1])
      put(
        S,
        woodTop,
        new THREE.BoxGeometry(0.05, 2.36, 0.7),
        X1 - 0.1,
        1.18,
        -1.0 + s * 0.36,
      );
    put(
      S,
      woodPanel,
      new THREE.BoxGeometry(0.35, 0.18, 8.0),
      X1 - 0.2,
      4.1,
      1.0,
    );
    put(
      S,
      warmLed,
      new THREE.BoxGeometry(0.03, 0.04, 7.8),
      X1 - 0.38,
      4.2,
      1.0,
    );
    const pole = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
    for (let z = -2.6; z < 4.9; z += 0.06 + rand() * 0.04) {
      if (z > -1.9 && z < 1.1) continue;
      const r = 0.017 + rand() * 0.012;
      const hgt = 1.2 + rand() * 0.6;
      put(S, branchMat, pole, X1 - 0.08, 4.0 - hgt / 2, z, 0, 0, 0, r, hgt, r);
    }
    for (let i = 0; i < 3; i++) {
      const z = BAR.z0 + 0.6 + i * 1.1;
      put(
        S,
        woodLight,
        new THREE.CylinderGeometry(0.19, 0.18, 0.05, 18),
        BAR.x - 0.75,
        0.76,
        z,
      );
      for (let l = 0; l < 4; l++) {
        const a = (l / 4) * Math.PI * 2 + 0.4;
        rod(
          S,
          woodLight,
          v3(BAR.x - 0.75 + Math.sin(a) * 0.2, 0, z + Math.cos(a) * 0.2),
          v3(BAR.x - 0.75 + Math.sin(a) * 0.13, 0.74, z + Math.cos(a) * 0.13),
          0.016,
          6,
        );
      }
    }
    ctx.wall(BAR.x - 0.42, BAR.z0, X1, BAR.z1 + 0.1);
    ctx.wall(X1 - 0.8, 0.15, X1, 1.05);
  }

  /* ---------- front wall with the entrance from the mall ---------- */
  {
    const front = new THREE.Shape();
    front.moveTo(X0, 0);
    front.lineTo(X1, 0);
    front.lineTo(X1, H);
    front.lineTo(X0, H);
    front.lineTo(X0, 0);
    const door = new THREE.Path();
    // the wall is turned to face the room, so the opening is mirrored in shape space
    door.moveTo(3.4, 0);
    door.lineTo(3.4, 2.9);
    door.lineTo(5.6, 2.9);
    door.lineTo(5.6, 0);
    door.lineTo(3.4, 0);
    front.holes.push(door);
    put(S, beige, new THREE.ShapeGeometry(front), 0, 0, Z1, 0, Math.PI);
    put(S, woodDark, new THREE.BoxGeometry(0.12, 2.95, 0.3), -5.66, 1.475, Z1);
    put(S, woodDark, new THREE.BoxGeometry(0.12, 2.95, 0.3), -3.34, 1.475, Z1);
    put(S, woodDark, new THREE.BoxGeometry(2.44, 0.12, 0.3), -4.5, 2.95, Z1);
    put(
      S,
      new THREE.MeshStandardMaterial({ color: "#c9c3b9", roughness: 0.25 }),
      new THREE.PlaneGeometry(4, 4),
      -4.5,
      0.001,
      Z1 + 2,
      -Math.PI / 2,
    );
    put(
      S,
      emissive("#e9e1d3", 0.35),
      new THREE.PlaneGeometry(4, 3.4),
      -4.5,
      1.7,
      Z1 + 4,
      0,
      Math.PI,
    );
    put(
      S,
      emissive("#fff3e2", 0.6),
      new THREE.PlaneGeometry(4, 4),
      -4.5,
      3.3,
      Z1 + 2,
      Math.PI / 2,
    );
    const signTex = labelTexture(
      [
        {
          text: "Famiglia",
          font: "italic 700 120px Georgia, 'Times New Roman', serif",
          color: "#f3e3c4",
          y: 120,
        },
        {
          text: "CROSARA",
          font: "600 64px Georgia, serif",
          color: "#f3e3c4",
          y: 230,
        },
        {
          text: "Cantina Italiana & Bar",
          font: "italic 40px Georgia, serif",
          color: "#d9b98a",
          y: 310,
        },
      ],
      1024,
      384,
      "#2a1c14",
    );
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.6),
      new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.6,
        emissive: "#ffffff",
        emissiveMap: signTex,
        emissiveIntensity: 0.3,
      }),
    );
    sign.position.set(-1.8, 2.6, Z1 - 0.02);
    sign.rotation.y = Math.PI;
    root.add(sign);
  }

  /* ---------- plants (one instanced mesh of leaves) ---------- */
  const leafGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 3);
    const p = g.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const yy = p.getY(i) + 0.5;
      const x = p.getX(i) * Math.sin(Math.PI * Math.min(1, yy * 1.05)) * 0.9;
      p.setXYZ(i, x, yy, -yy * yy * 0.35 + Math.abs(x) * 0.15);
    }
    g.computeVertexNormals();
    return g;
  })();
  const leaves: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  const leaf = (
    x: number,
    y: number,
    z: number,
    yaw: number,
    tilt: number,
    len: number,
    wid: number,
    color: THREE.Color,
  ) => {
    leaves.push({
      m: new THREE.Matrix4().compose(
        v3(x, y, z),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(tilt, yaw, 0, "YXZ"),
        ),
        v3(wid, len, wid),
      ),
      c: color,
    });
  };
  const green = (l = 0) =>
    new THREE.Color().setHSL(
      0.27 + rand() * 0.06,
      0.45 + rand() * 0.2,
      0.2 + rand() * 0.1 + l,
    );
  const pot = (x: number, z: number, r: number, h: number, y = 0) => {
    put(
      S,
      terracotta,
      new THREE.LatheGeometry(
        [0, r * 0.72, r, r * 1.06, r * 0.97].map(
          (rr, i) =>
            new THREE.Vector2(
              rr,
              i === 0 || i === 1 ? 0 : i === 2 ? h * 0.92 : h,
            ),
        ),
        16,
      ),
      x,
      y,
      z,
    );
    put(
      S,
      soil,
      new THREE.CircleGeometry(r * 0.96, 12),
      x,
      y + h * 0.94,
      z,
      -Math.PI / 2,
    );
  };
  const fern = (x: number, y: number, z: number, size: number, n = 20) => {
    for (let i = 0; i < n; i++)
      leaf(
        x,
        y,
        z,
        rand() * Math.PI * 2,
        0.5 + rand() * 0.9,
        size * (0.7 + rand() * 0.5),
        size * 0.22,
        green(0.05),
      );
  };
  const bush = (
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    n: number,
    flowers = 0,
  ) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const rr0 = Math.sqrt(rand());
      const yy = (rand() * 2 - 1) * ry;
      const rr = rx * rr0 * Math.sqrt(1 - (yy / ry) ** 2);
      const c =
        rand() < flowers
          ? new THREE.Color().setHSL(
              0.9 + rand() * 0.04,
              0.65,
              0.45 + rand() * 0.1,
            )
          : green();
      leaf(
        x + Math.cos(a) * rr,
        y + yy,
        z + Math.sin(a) * rr,
        rand() * Math.PI * 2,
        rand() * 1.4 - 0.2,
        0.09 + rand() * 0.05,
        0.06,
        c,
      );
    }
  };
  const ivy = (x: number, y: number, z: number, len: number) => {
    let px = x;
    let pz = z;
    for (let d = 0; d < len; d += 0.04) {
      px += (rand() - 0.5) * 0.02;
      pz += (rand() - 0.5) * 0.02;
      leaf(
        px,
        y - d,
        pz,
        rand() * Math.PI * 2,
        1.2 + rand() * 0.8,
        0.05 + rand() * 0.02,
        0.045,
        green(0.04),
      );
    }
  };
  const tree = (x: number, z: number, h: number, flowers = 0) => {
    pot(x, z, 0.24, 0.42);
    rod(S, woodDark, v3(x, 0.35, z), v3(x + 0.03, h * 0.6, z - 0.02), 0.022, 6);
    bush(x, h * 0.62, z, 0.45, h * 0.35, high ? 380 : 200, flowers);
    ctx.wall(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
  };
  // ferns on the LED ledge of the stone-wall banquette
  for (let x = STONE_X0 + 0.5; x < STONE_X1 - 0.2; x += 1.0 + rand() * 0.35) {
    if (x > ARCH_X - 1.35 && x < ARCH_X + 1.35) continue;
    pot(x, Z0 + 0.12, 0.08, 0.14, 1.13);
    fern(x, 1.26, Z0 + 0.12, 0.28);
  }
  // trees flanking the arch, the bougainvillea in the beige corner
  tree(ARCH_X - 1.55, Z0 + 0.95, 2.0);
  tree(ARCH_X + 1.5, Z0 + 0.95, 1.8);
  tree(-4.3, Z0 - 0.2, 2.3, 0.35);
  tree(-6.5, Z0 - 0.15, 1.9);
  // plants along the top of the branch screen behind their banquette
  for (let x = PX0 + 0.2; x < PX1; x += 0.5)
    bush(x, 2.95, BENCH_Z + 0.03, 0.3, 0.25, high ? 70 : 40);
  for (let x = PX0 + 0.3; x < PX1; x += 0.9) ivy(x, 2.6, BENCH_Z + 0.15, 0.6);

  /* ---------- wicker lanterns: emissive only, no lights ---------- */
  type Lamp = {
    x: number;
    z: number;
    y: number;
    kind: "pill" | "dome" | "drop";
    R: number;
    L: number;
    ivy?: number;
  };
  const lamps: Lamp[] = [
    // the big cluster of long lanterns hanging high before the stone wall
    { x: -1.2, z: -6.8, y: 3.6, kind: "pill", R: 0.22, L: 0.85 },
    { x: -0.7, z: -7.4, y: 4.0, kind: "pill", R: 0.23, L: 0.9 },
    { x: -0.2, z: -6.6, y: 3.35, kind: "pill", R: 0.24, L: 0.95 },
    // smaller domes and drops near the wall and the arch, some with ivy
    { x: 0.6, z: -8.7, y: 3.0, kind: "dome", R: 0.2, L: 0.36, ivy: 0.6 },
    { x: 1.3, z: -8.8, y: 2.95, kind: "drop", R: 0.18, L: 0.36 },
    { x: ARCH_X, z: -9.0, y: 2.55, kind: "dome", R: 0.22, L: 0.42, ivy: 0.7 },
    { x: -2.2, z: -8.9, y: 2.6, kind: "drop", R: 0.16, L: 0.34, ivy: 0.5 },
    // the cluster in the beige corner
    { x: -5.6, z: -9.6, y: 2.6, kind: "dome", R: 0.17, L: 0.32, ivy: 0.6 },
    { x: -5.2, z: -9.8, y: 2.25, kind: "drop", R: 0.14, L: 0.28, ivy: 0.4 },
    { x: -4.9, z: -9.5, y: 2.85, kind: "pill", R: 0.13, L: 0.42 },
    { x: -4.6, z: -9.3, y: 1.95, kind: "drop", R: 0.18, L: 0.36 },
    // over the room and the bar
    { x: -2.3, z: -3.2, y: 3.2, kind: "pill", R: 0.2, L: 0.75 },
    { x: 1.6, z: -1.6, y: 3.0, kind: "pill", R: 0.2, L: 0.7 },
    { x: 4.6, z: -6.0, y: 3.1, kind: "pill", R: 0.2, L: 0.75 },
    { x: 4.6, z: 2.4, y: 2.3, kind: "dome", R: 0.2, L: 0.36 },
    { x: 4.6, z: 4.0, y: 2.3, kind: "dome", R: 0.2, L: 0.36 },
    { x: -5.6, z: -2.9, y: 2.4, kind: "drop", R: 0.18, L: 0.36 },
  ];
  for (const l of lamps) {
    put(
      S,
      wicker,
      lanternGeo(l.kind, l.R, l.L),
      l.x,
      l.y,
      l.z,
      0,
      rand() * 3,
      0,
    );
    put(
      S,
      cable,
      new THREE.CylinderGeometry(0.004, 0.004, H - l.y - l.L, 4),
      l.x,
      (H + l.y + l.L) / 2,
      l.z,
    );
    put(
      S,
      brass,
      new THREE.CylinderGeometry(0.06, 0.06, 0.025, 12),
      l.x,
      H - 0.0125,
      l.z,
    );
    put(
      S,
      bulb,
      new THREE.SphereGeometry(0.03, 8, 6),
      l.x,
      l.y + l.L * 0.45,
      l.z,
      0,
      0,
      0,
      1,
      1.35,
      1,
    );
    if (l.ivy && high) ivy(l.x + l.R * 0.6, l.y + l.L * 0.6, l.z, l.ivy);
  }

  /* ---------- ceiling fixtures ---------- */
  for (let x = STONE_X0 + 0.3; x <= STONE_X1 - 0.2; x += 0.9) {
    put(
      S,
      black,
      new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10),
      x,
      H - 0.01,
      Z0 + 0.35,
    );
    put(
      S,
      downlight,
      new THREE.CircleGeometry(0.028, 10),
      x,
      H - 0.021,
      Z0 + 0.35,
      Math.PI / 2,
    );
  }
  const grille = canvasTex(256, 256, (g) => {
    g.fillStyle = "#3b3f3e";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#0e1010";
    for (let y = 16; y < 240; y += 14) g.fillRect(14, y, 228, 7);
  });
  const grilleMat = new THREE.MeshStandardMaterial({
    map: grille,
    roughness: 0.7,
  });
  for (const [x, z] of [
    [-1.5, -6.0],
    [1.8, -4.5],
    [-2.5, 0.5],
    [3.0, 2.8],
  ] as const)
    put(
      S,
      grilleMat,
      new THREE.PlaneGeometry(0.9, 0.5),
      x,
      H - 0.012,
      z,
      Math.PI / 2,
    );
  for (const [x, z] of [
    [-0.3, -7.6],
    [3.4, -6.6],
    [-4.0, -4.4],
    [0.6, -3.0],
    [-1.4, 0.8],
    [3.8, 0.4],
  ] as const) {
    put(S, black, new THREE.BoxGeometry(0.42, 0.06, 0.24), x, H - 0.03, z);
    for (const s of [-1, 1])
      put(
        S,
        downlight,
        new THREE.CircleGeometry(0.05, 12),
        x + s * 0.1,
        H - 0.061,
        z,
        Math.PI / 2,
      );
  }

  /* ---------- lights: 8 in total, one casting shadows ---------- */
  // 1-2: the stone wall, grazed from the ceiling
  for (const x of [-1.6, 2.6]) {
    const sp = new THREE.SpotLight("#ffd8a8", 55, 0, 0.95, 0.9, 2);
    sp.position.set(x, H - 0.05, Z0 + 0.6);
    sp.target.position.set(x, 0.6, Z0 - 0.1);
    root.add(sp, sp.target);
  }
  // 3: (the banquette LED RectAreaLight above) · 4: (the blue back room above)
  // 5: their table, the only shadow caster
  const key = new THREE.SpotLight("#ffcf98", 12, 0, 0.45, 0.85, 2);
  key.position.set(T.x + 0.4, H - 0.1, T.z - 0.6);
  key.target.position.set(T.x, T.y, T.z);
  key.castShadow = true;
  key.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 7;
  root.add(key, key.target);
  // 6: warm fill over the round tables · 7: the wine cellar side
  const fill = new THREE.PointLight("#ffb874", 9, 0, 2);
  fill.position.set(0.0, 3.2, -5.0);
  root.add(fill);
  const side = new THREE.PointLight("#ffc890", 5, 0, 2);
  side.position.set(-4.5, 3.0, -2.0);
  root.add(side);
  // 8: soft ambient
  root.add(new THREE.HemisphereLight("#ffd2a0", "#2a1f17", 0.12));

  /* ---------- flush ---------- */
  flush(root, S, false);
  flush(root, C, true);
  if (leaves.length) {
    const inst = new THREE.InstancedMesh(
      leafGeo,
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.6,
        side: THREE.DoubleSide,
      }),
      leaves.length,
    );
    leaves.forEach((l, i) => {
      inst.setMatrixAt(i, l.m);
      inst.setColorAt(i, l.c);
    });
    root.add(inst);
  }

  /* ---------- photos of the couple ---------- */
  ctx.photo("famiglia-1.webp", 0.45, 0.6, v3(-5.9, 1.65, Z0 - 0.58), 0);
  ctx.photo(
    "famiglia-3.webp",
    0.42,
    0.56,
    v3(STONE_X1 + 0.3, 1.75, Z0 + 0.72),
    0,
  );

  /* ---------- people ---------- */
  // what they wore that night: her cream embroidered top, his brown "Nature Escape" tee
  // LEIA-ME 05: Davi in the brown "Nature Escape" tee with his black glasses;
  // Elena in the long white lace dress with the heart necklace.
  const outfits: { davi: Outfit; elena: Outfit } = {
    elena: WARDROBE.elenaLaceDress,
    davi: WARDROBE.daviTee,
  };
  ctx.playerOutfit(outfits);
  const partnerIsElena = ctx.player === "davi";
  const line = partnerIsElena
    ? "Um violino tocando pra gente? Você caprichou! 🎻"
    : "Um mês que pareceu uma vida inteira (no bom sentido!) 🎻";
  // side by side on the banquette, facing the stone wall: Elena on Davi's left
  ctx.partner(
    partnerIsElena ? ELENA_X : DAVI_X,
    BENCH_Z - 0.38,
    180,
    "sit",
    outfits,
    line,
  );

  // the violinist, black suit, playing in front of the arch toward their table
  ctx.person(
    {
      skin: "#5e3a26",
      hair: "#121010",
      hairStyle: "bald",
      height: 1.82,
      beard: true,
    },
    {
      top: "#121212",
      topStyle: "tshirt",
      bottom: "#121212",
      bottomStyle: "pants",
      shoes: "#3a2418",
    },
    ARCH_X - 0.5,
    Z0 + 2.6,
    -8,
    "violin",
    "🎻 ♪ ♫",
  );
  // two background diners: one in the blue room, one by the wine cellar
  ctx.person(
    {
      skin: "#d8a27c",
      hair: "#201812",
      hairStyle: "short",
      height: 1.78,
      beard: true,
    },
    {
      top: "#1f2a38",
      topStyle: "tshirt",
      bottom: "#c9b79c",
      bottomStyle: "pants",
    },
    ARCH_X - 0.35,
    Z0 - 1.9,
    90,
    "sit",
  );
  stamp(S, crossChair, ARCH_X - 0.4, 0, Z0 - 1.9, Math.PI / 2);
  stamp(S, smallTable, ARCH_X + 0.3, 0, Z0 - 1.9);
  ctx.person(
    {
      skin: "#efc6a8",
      hair: "#5a3a22",
      hairStyle: "long",
      height: 1.66,
      female: true,
    },
    {
      top: "#7a2338",
      topStyle: "blouse",
      bottom: "#1f2430",
      bottomStyle: "jeans",
    },
    -6.15,
    -2.9,
    90,
    "sit",
  );
  flush(root, S, false);

  /* ---------- place registration ---------- */
  ctx.wall(X0 - 1, Z0 - 4, X0 + 0.05, Z1 + 4);
  ctx.wall(X1 - 0.05, Z0 - 4, X1 + 1, Z1 + 4);
  ctx.wall(X0, Z0 - 0.7, STONE_X0, Z0 + 1.4);
  ctx.wall(STONE_X0, Z0 - 0.7, ARCH_X - 0.78, Z0 + 0.02);
  ctx.wall(ARCH_X + 0.78, Z0 - 0.7, X1, Z0 + 0.02);
  ctx.wall(STONE_X1, Z0, STONE_X1 + 0.6, Z0 + 0.7);
  ctx.wall(X1 - 0.4, Z0, X1, Z0 + 3.8);
  ctx.wall(X0, Z0 - 4, BR.x0 + 0.05, Z0 - 0.5);
  ctx.wall(BR.x1 - 0.05, Z0 - 4, X1, Z0 - 0.5);
  ctx.wall(X0, BR.z0 - 1, X1, BR.z0 + 0.05);
  ctx.wall(ARCH_X - 0.7, Z0 - 2.35, ARCH_X + 0.7, Z0 - 1.45);
  ctx.wall(X0, Z1 - 0.05, -5.6, Z1 + 4);
  ctx.wall(-3.4, Z1 - 0.05, X1, Z1 + 4);
  ctx.wall(-5.6, Z1 + 0.6, -3.4, Z1 + 4);

  ctx.spawn(-4.5, Z1 - 0.8, 0);
  ctx.exit(-4.5, Z1 + 0.15, 0.6);
  ctx.pack(BAR.x - 0.1, 1.055, 3.4, 70);
  ctx.ambient("amb-famiglia.m4a", 0.5);
}

const scene: SceneModule = {
  id: "famiglia",
  title: "Famiglia Crosara",
  build,
};

export default scene;
