import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
 * Famiglia Crosara – Cantina Italiana & Bar (Uberlândia Shopping), where Davi
 * and Elena celebrated one month together while a violinist played for them.
 *
 * Floor plan (meters): the dining hall spans x ∈ [-7, 7], z ∈ [-10, 5] under a
 * tall, almost black ceiling. Back wall (z = -10): the white stone wall with a
 * red-brick arch into a small blue-lit room. Left wall: warm beige plaster.
 * Right wall: bamboo screens between wooden pillars, the kitchen doors, the
 * blue drinks fridge and the green-tiled bar. Entrance from the mall at the
 * front (z = 5). Woven wicker lanterns hang at different heights everywhere.
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

const X0 = -7;
const X1 = 7;
const Z0 = -10;
const Z1 = 5;
const H = 5.0;
const ARCH_X = 2.5;

async function build(ctx: SceneCtx) {
  const high = ctx.quality === "high";
  const root = new THREE.Group();
  ctx.scene.add(root);
  ctx.scene.background = new THREE.Color("#0b0d0d");
  RectAreaLightUniformsLib.init();
  const rand = seeded(1909);

  const S: Kit = new Map(); // structure: receives shadows only
  const F: Kit = new Map(); // furniture: casts shadows

  /* ---------- materials ---------- */
  const stoneTex = ctx.tex("tex-stone.webp");
  const bambooTex = ctx.tex("tex-bamboo.webp");
  const [stoneImg] = await Promise.all([loaded(stoneTex), loaded(bambooTex)]);
  const stone = new THREE.MeshStandardMaterial({
    color: "#f2eee8",
    roughness: 0.95,
  });
  {
    const maps = stoneMaps(stoneImg);
    for (const t of [maps.map, maps.normalMap, maps.roughnessMap])
      t.repeat.set(1 / 3.4, 1 / 2.55);
    Object.assign(stone, maps);
    stone.color.set("#ffffff");
    stone.normalScale.set(1.4, 1.4);
  }
  const brick = pbr(repeat(bricks("#b4643e", "#7e6150", 9, 31), 1.9, 1.9), {
    roughness: 0.9,
  });
  const beige = pbr(repeat(plaster("#d7bc9a", 41), 0.6, 0.6));
  const darkWall = new THREE.MeshStandardMaterial({
    color: "#1d2322",
    roughness: 0.95,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: "#121a19",
    roughness: 0.92,
  });
  const floorMat = pbr(
    repeat(tiles("#6a655e", "#45413c", 4, 51, 0.28), 14 / 2.4, 18 / 2.4),
    { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 1.6 },
  );
  const woodLight = pbr(repeat(woodPlanks("#c18a52", 2, 61), 0.6, 0.6), {
    roughness: 0.75,
  });
  const woodTop = pbr(repeat(woodPlanks("#bf8650", 5, 62), 0.8, 0.8), {
    roughness: 0.55,
  });
  const woodDark = pbr(repeat(woodPlanks("#6e4326", 6, 63), 0.5, 2));
  const woodPillar = pbr(repeat(woodPlanks("#8d5a33", 3, 64), 0.4, 3), {
    roughness: 0.6,
  });
  const upholstery = pbr(repeat(fabric("#a08d76", 71), 3, 3), {
    side: THREE.DoubleSide,
  });
  const bench = pbr(repeat(fabric("#a8957e", 72), 3, 3));
  const cloth = pbr(repeat(fabric("#a3937f", 73), 4, 4), { roughness: 0.95 });
  const cushion = pbr(repeat(fabric("#c9b8a0", 74), 3, 3));
  const greenTile = pbr(
    repeat(tiles("#2e5a4b", "#1a2c26", 6, 81, 0.15), 10, 0.75),
    { envMapIntensity: 2 },
  );
  const charger = new THREE.MeshStandardMaterial({
    color: "#26332d",
    roughness: 0.55,
  });
  const napkin = pbr(repeat(fabric("#b89a8c", 75), 1, 1));
  const porcelain = new THREE.MeshStandardMaterial({
    color: "#e4e0d8",
    roughness: 0.25,
  });
  const steel = metal("#d4d4d0", 0.25);
  const black = new THREE.MeshStandardMaterial({
    color: "#121212",
    roughness: 0.6,
  });
  const whitePlastic = new THREE.MeshStandardMaterial({
    color: "#e9e7e2",
    roughness: 0.5,
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
  const wine = new THREE.MeshStandardMaterial({
    color: "#4a0710",
    roughness: 0.08,
    transparent: true,
    opacity: 0.92,
  });
  const water = new THREE.MeshStandardMaterial({
    color: "#cfe3ea",
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
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
  const bottleClear = new THREE.MeshStandardMaterial({
    color: "#a8b4a8",
    roughness: 0.08,
    transparent: true,
    opacity: 0.55,
    envMapIntensity: 2,
  });
  const label = new THREE.MeshStandardMaterial({
    color: "#e8dcc4",
    roughness: 0.7,
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
  const pasta = new THREE.MeshStandardMaterial({
    color: "#e9c770",
    roughness: 0.45,
  });
  const bacon = new THREE.MeshStandardMaterial({
    color: "#8c4a2a",
    roughness: 0.6,
  });
  const gnocchi = new THREE.MeshStandardMaterial({
    color: "#ecd398",
    roughness: 0.55,
  });
  const sauce = new THREE.MeshStandardMaterial({
    color: "#9b2a17",
    roughness: 0.3,
  });
  const basil = new THREE.MeshStandardMaterial({
    color: "#2f6b22",
    roughness: 0.5,
  });
  const bread = new THREE.MeshStandardMaterial({
    color: "#c58b4a",
    roughness: 0.8,
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
  const warmLed = emissive("#ffc073", 3);
  const downlight = emissive("#fff1d8", 2.2);
  const flame = emissive("#ffb347", 10);

  /* ---------- shell: floor, ceiling, walls ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -3.5);
  floor.receiveShadow = true;
  root.add(floor);
  put(S, ceilingMat, new THREE.PlaneGeometry(14, 15), 0, H, -2.5, Math.PI / 2);

  // back wall: the white stone, with the arch cut out
  const wallShape = new THREE.Shape();
  wallShape.moveTo(X0, 0);
  wallShape.lineTo(X1, 0);
  wallShape.lineTo(X1, H);
  wallShape.lineTo(X0, H);
  wallShape.lineTo(X0, 0);
  const hole = new THREE.Path();
  archPath(hole, ARCH_X, 1.25, 2.0, true);
  wallShape.holes.push(hole);
  put(S, stone, new THREE.ShapeGeometry(wallShape, 24), 0, 0, Z0);

  // the brick arch: surround and deep reveal in one extrusion
  const archShape = new THREE.Shape();
  archPath(archShape, ARCH_X, 1.25, 2.0, false);
  const inner = new THREE.Path();
  archPath(inner, ARCH_X, 0.8, 1.95, true);
  archShape.holes.push(inner);
  put(
    F,
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
  // left wall: warm beige plaster, dark band above
  put(
    S,
    beige,
    new THREE.PlaneGeometry(15, 3.9),
    X0,
    1.95,
    -2.5,
    0,
    Math.PI / 2,
  );
  put(
    S,
    darkWall,
    new THREE.PlaneGeometry(15, H - 3.9),
    X0,
    3.9 + (H - 3.9) / 2,
    -2.5,
    0,
    Math.PI / 2,
  );
  put(
    F,
    woodDark,
    new THREE.BoxGeometry(0.03, 0.1, 15),
    X0 + 0.015,
    0.05,
    -2.5,
  );
  // right wall (mostly hidden behind bamboo, bar and doors)
  put(
    S,
    darkWall,
    new THREE.PlaneGeometry(15, H),
    X1,
    H / 2,
    -2.5,
    0,
    -Math.PI / 2,
  );
  // front wall with the entrance from the mall (x ∈ [-2.1, 0.1])
  const front = new THREE.Shape();
  front.moveTo(X0, 0);
  front.lineTo(X1, 0);
  front.lineTo(X1, H);
  front.lineTo(X0, H);
  front.lineTo(X0, 0);
  const door = new THREE.Path();
  // the wall is turned to face the room, so the opening is mirrored in shape space
  door.moveTo(-0.1, 0);
  door.lineTo(-0.1, 2.9);
  door.lineTo(2.1, 2.9);
  door.lineTo(2.1, 0);
  door.lineTo(-0.1, 0);
  front.holes.push(door);
  put(
    S,
    pbr(repeat(plaster("#d7bc9a", 41), 0.09, 0.09)),
    new THREE.ShapeGeometry(front),
    0,
    0,
    Z1,
    0,
    Math.PI,
  );
  // the entrance portal (dark wood) and the mall beyond
  put(F, woodDark, new THREE.BoxGeometry(0.12, 2.95, 0.3), -2.16, 1.475, Z1);
  put(F, woodDark, new THREE.BoxGeometry(0.12, 2.95, 0.3), 0.16, 1.475, Z1);
  put(F, woodDark, new THREE.BoxGeometry(2.44, 0.12, 0.3), -1, 2.95, Z1);
  const mall = new THREE.Group();
  root.add(mall);
  const mallFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshStandardMaterial({ color: "#c9c3b9", roughness: 0.2 }),
  );
  mallFloor.rotation.x = -Math.PI / 2;
  mallFloor.position.set(-1, 0, Z1 + 2.5);
  mall.add(mallFloor);
  const mallBack = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 4),
    new THREE.MeshStandardMaterial({
      color: "#d9d2c6",
      emissive: "#d9d2c6",
      emissiveIntensity: 0.1,
    }),
  );
  mallBack.position.set(-1, 2, Z1 + 5);
  mallBack.rotation.y = Math.PI;
  mall.add(mallBack);
  mallBack.rotation.y = 0;
  mallBack.position.z = Z1 + 5;
  mallBack.lookAt(-1, 2, 0);
  const mallCeil = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 5),
    new THREE.MeshStandardMaterial({
      color: "#efe9df",
      emissive: "#fff6e8",
      emissiveIntensity: 0.25,
    }),
  );
  mallCeil.rotation.x = Math.PI / 2;
  mallCeil.position.set(-1, 3.4, Z1 + 2.5);
  mall.add(mallCeil);
  // across the mall corridor: a lit shop window and a dark storefront
  const shop = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.2),
    new THREE.MeshStandardMaterial({
      color: "#f3dcb8",
      emissive: "#ffd9a6",
      emissiveIntensity: 0.9,
    }),
  );
  shop.position.set(-1.3, 1.5, Z1 + 4.98);
  shop.rotation.y = Math.PI;
  mall.add(shop);
  const shopFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 0.5, 0.1),
    new THREE.MeshStandardMaterial({ color: "#2b2b2b", roughness: 0.4 }),
  );
  shopFrame.position.set(-1.3, 2.85, Z1 + 4.95);
  mall.add(shopFrame);
  for (const x of [-3.2, -1, 1.2]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, 4),
      emissive("#fff6e8", 2),
    );
    strip.position.set(x, 3.39, Z1 + 2.5);
    mall.add(strip);
  }

  // the Famiglia sign on the left wall, near the entrance
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
    new THREE.PlaneGeometry(1.9, 0.71),
    new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.6,
      emissive: "#ffffff",
      emissiveMap: signTex,
      emissiveIntensity: 0.35,
    }),
  );
  sign.position.set(X0 + 0.03, 2.3, 2.6);
  sign.rotation.y = Math.PI / 2;
  root.add(sign);
  put(
    F,
    woodDark,
    new THREE.BoxGeometry(0.04, 0.79, 1.98),
    X0 + 0.01,
    2.3,
    2.6,
  );

  /* ---------- the back room through the arch (blue light) ---------- */
  const BR = { x0: 0.6, x1: 4.4, z0: -13, z1: Z0 - 0.55, h: 3.0 };
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
      darkWall,
      new THREE.PlaneGeometry(w, BR.h),
      cx,
      BR.h / 2,
      BR.z1 + 0.001,
      0,
      Math.PI,
    );
    // open kitchen pass glowing blue
    put(
      S,
      emissive("#2766d8", 0.8),
      new THREE.PlaneGeometry(2.4, 0.9),
      cx,
      1.55,
      BR.z0 + 0.01,
    );
    put(
      F,
      black,
      new THREE.BoxGeometry(2.6, 0.08, 0.3),
      cx,
      1.06,
      BR.z0 + 0.15,
    );
    put(
      F,
      woodDark,
      new THREE.BoxGeometry(2.6, 0.12, 0.12),
      cx,
      2.06,
      BR.z0 + 0.06,
    );
    const blue = new THREE.RectAreaLight("#4f9cff", 3, 2.4, 0.9);
    blue.position.set(cx, 1.55, BR.z0 + 0.05);
    blue.lookAt(cx, 1.4, BR.z1);
    root.add(blue);
    const warm = new THREE.PointLight("#ffb46a", 1.2, 0, 2);
    warm.position.set(cx, 2.6, cz);
    root.add(warm);
    // string of small bulbs under the vault
    for (let i = 0; i < 9; i++) {
      const x = BR.x0 + 0.3 + (i / 8) * (w - 0.6);
      put(
        F,
        bulb,
        new THREE.SphereGeometry(0.025, 8, 6),
        x,
        2.7 - Math.sin((i / 8) * Math.PI) * 0.18,
        BR.z1 - 0.4,
      );
    }
    // little framed pictures on the brick
    for (let i = 0; i < 3; i++) {
      put(
        F,
        black,
        new THREE.BoxGeometry(0.03, 0.3, 0.24),
        BR.x1 - 0.02,
        1.7 + (i % 2) * 0.35,
        BR.z1 - 0.5 - i * 0.4,
      );
      put(
        F,
        label,
        new THREE.PlaneGeometry(0.19, 0.25),
        BR.x1 - 0.04,
        1.7 + (i % 2) * 0.35,
        BR.z1 - 0.5 - i * 0.4,
        0,
        -Math.PI / 2,
      );
    }
  }

  /* ---------- prototypes ---------- */

  // upholstered beige armchair with a wooden A-frame (faces +Z, seat top 0.43)
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
    const back = new THREE.CylinderGeometry(
      0.29,
      0.29,
      0.3,
      18,
      1,
      true,
      Math.PI - 1.15,
      2.3,
    );
    put(k, upholstery, back, 0, 0.68, 0.04);
    put(
      k,
      upholstery,
      new THREE.CylinderGeometry(
        0.31,
        0.31,
        0.3,
        18,
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
      new THREE.TorusGeometry(0.3, 0.012, 4, 18, 2.3),
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
      beam(k, woodLight, v3(x, 0.33, -0.2), v3(x, 0.33, 0.2), 0.03, 0.04);
    }
    beam(k, woodLight, v3(-0.27, 0.33, 0), v3(0.27, 0.33, 0), 0.03, 0.04);
    return bake(k);
  })();

  // wooden cross-back bistro chair with a beige cushion (faces +Z, seat top 0.42)
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
      );
      rod(
        k,
        woodLight,
        v3(s * 0.19, 0, -0.21),
        v3(s * 0.175, 0.92, -0.245),
        0.018,
      );
    }
    // curved top rail and a thinner lower rail
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
          12,
          r,
          6,
          false,
        ),
      );
    }
    // the X
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
    // stretchers and bentwood ring
    put(
      k,
      woodLight,
      new THREE.TorusGeometry(0.2, 0.012, 6, 24),
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
      new THREE.CircleGeometry(0.665, 64),
      0,
      0.766,
      0,
      -Math.PI / 2,
    );
    const pts = [
      v3(0.66, 0.765, 0),
      v3(0.7, 0.75, 0),
      v3(0.715, 0.7, 0),
      v3(0.725, 0.4, 0),
      v3(0.745, 0.05, 0),
      v3(0.75, 0.0, 0),
    ].map((p) => new THREE.Vector2(p.x, p.y));
    const geo = new THREE.LatheGeometry(pts.reverse(), 72);
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

  // square wooden table (0.8 × 0.8) on four splayed legs
  const woodTable = (() => {
    const k: Kit = new Map();
    put(
      k,
      woodTop,
      new RoundedBoxGeometry(0.8, 0.04, 0.8, 2, 0.012),
      0,
      0.73,
      0,
    );
    put(k, woodLight, new THREE.BoxGeometry(0.66, 0.07, 0.66), 0, 0.675, 0);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        beam(
          k,
          woodLight,
          v3(sx * 0.36, 0, sz * 0.36),
          v3(sx * 0.29, 0.66, sz * 0.29),
          0.045,
        );
    beam(k, woodLight, v3(-0.33, 0.18, 0), v3(0.33, 0.18, 0), 0.03);
    return bake(k);
  })();

  // rectangular cloth table for the banquettes
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

  // wine glass, water tumbler, plates
  const wineGlassGeo = new THREE.LatheGeometry(
    [
      [0, 0.002],
      [0.034, 0.002],
      [0.034, 0.006],
      [0.006, 0.012],
      [0.0045, 0.09],
      [0.02, 0.102],
      [0.036, 0.125],
      [0.042, 0.158],
      [0.039, 0.205],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    20,
  );
  const wineFill = new THREE.LatheGeometry(
    [
      [0.0, 0.103],
      [0.019, 0.105],
      [0.033, 0.124],
      [0.037, 0.14],
      [0.0, 0.14],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    16,
  );
  const tumbler = new THREE.LatheGeometry(
    [
      [0, 0.001],
      [0.032, 0.001],
      [0.037, 0.11],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    18,
  );
  const deepPlate = new THREE.LatheGeometry(
    [
      [0, 0.005],
      [0.075, 0.005],
      [0.1, 0.03],
      [0.15, 0.042],
      [0.152, 0.046],
      [0.1, 0.034],
      [0.075, 0.01],
      [0, 0.01],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    32,
  );
  const bottleGeo = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.036, 0],
      [0.037, 0.2],
      [0.03, 0.24],
      [0.013, 0.27],
      [0.013, 0.32],
      [0.015, 0.33],
      [0, 0.33],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    18,
  );

  /** A place setting at a seat: charger, folded napkin, cutlery, glasses. `yaw` faces the diner. */
  const setting = (
    x: number,
    y: number,
    z: number,
    yaw: number,
    full = true,
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
      rx = 0,
    ) => {
      const l = new THREE.Matrix4().compose(
        v3(lx, ly, lz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)),
        v3(1, 1, 1),
      );
      putM(F, mat, geo, m.clone().multiply(l));
    };
    at(new THREE.CylinderGeometry(0.16, 0.16, 0.006, 32), charger, 0, 0.003, 0);
    at(
      new RoundedBoxGeometry(0.12, 0.02, 0.2, 1, 0.006),
      napkin,
      0,
      0.016,
      0,
      0.5,
    );
    at(new THREE.BoxGeometry(0.013, 0.003, 0.2), steel, 0.2, 0.002, 0);
    at(new THREE.BoxGeometry(0.012, 0.003, 0.13), steel, -0.2, 0.002, 0.03);
    at(new THREE.BoxGeometry(0.024, 0.003, 0.06), steel, -0.2, 0.002, -0.06);
    if (full) {
      at(wineGlassGeo, glassMat, 0.17, 0, -0.2);
      at(tumbler, glassMat, 0.07, 0, -0.24);
    }
  };

  const placeArmchairsRound = (
    cx: number,
    cz: number,
    n: number,
    start: number,
  ) => {
    for (let i = 0; i < n; i++) {
      const a = start + (i / n) * Math.PI * 2;
      const x = cx + Math.sin(a) * 0.95;
      const z = cz + Math.cos(a) * 0.95;
      stamp(F, armchair, x, 0, z, a + Math.PI + (rand() - 0.5) * 0.25);
      setting(
        cx + Math.sin(a) * 0.5,
        0.768,
        cz + Math.cos(a) * 0.5,
        a + Math.PI,
      );
    }
  };

  /* ---------- dining room furniture ---------- */

  // round clothed tables with beige armchairs
  const rounds: [number, number][] = [
    [-4.6, -6.2],
    [-1.6, -6.0],
    [-4.7, -2.8],
    [-1.5, -2.5],
    [-4.7, 1.5],
    [-2.0, 0.2],
  ];
  rounds.forEach(([x, z], i) => {
    stamp(F, roundTable, x, 0, z);
    placeArmchairsRound(x, z, 4, Math.PI / 4 + i * 0.3);
    ctx.wall(x - 1.15, z - 1.15, x + 1.15, z + 1.15);
  });

  // wooden square tables with cross-back chairs
  const COUPLE = { x: 2.6, z: -3.4 };
  const woods: [number, number, number][] = [
    [COUPLE.x, COUPLE.z, 0],
    [5.45, -6.7, 0],
    [0.9, 0.9, 0.2],
    [2.7, 1.9, -0.15],
  ];
  woods.forEach(([x, z, r], i) => {
    stamp(F, woodTable, x, 0, z, r);
    if (i === 0) return;
    for (let s = 0; s < 4; s++) {
      if (i === 1 && s === 1) continue;
      const a = r + (s * Math.PI) / 2;
      stamp(
        F,
        crossChair,
        x + Math.sin(a) * 0.55,
        0,
        z + Math.cos(a) * 0.55,
        a + Math.PI + (rand() - 0.5) * 0.2,
      );
      setting(
        x + Math.sin(a) * 0.24,
        0.75,
        z + Math.cos(a) * 0.24,
        a + Math.PI,
        s % 2 === 0,
      );
    }
    ctx.wall(x - 0.85, z - 0.85, x + 0.85, z + 0.85);
  });

  // the couple's table: her chair on the far side, the empty one for the player
  stamp(F, crossChair, COUPLE.x, 0, COUPLE.z - 0.58, 0);
  stamp(F, crossChair, COUPLE.x + 0.05, 0, COUPLE.z + 0.66, Math.PI + 0.12);
  ctx.wall(COUPLE.x - 0.45, COUPLE.z - 0.85, COUPLE.x + 0.45, COUPLE.z + 0.45);
  ctx.wall(COUPLE.x - 0.25, COUPLE.z + 0.45, COUPLE.x + 0.3, COUPLE.z + 0.9);

  // banquettes along the stone wall, with the warm LED ledge and plants above
  const banquette = (xa: number, xb: number) => {
    const len = xb - xa;
    const cx = (xa + xb) / 2;
    put(F, woodDark, new THREE.BoxGeometry(len, 0.3, 0.6), cx, 0.15, Z0 + 0.32);
    put(
      F,
      bench,
      new RoundedBoxGeometry(len, 0.13, 0.56, 2, 0.04),
      cx,
      0.37,
      Z0 + 0.34,
    );
    const n = Math.round(len / 0.19);
    for (let i = 0; i < n; i++) {
      const x = xa + (i + 0.5) * (len / n);
      put(
        F,
        bench,
        new RoundedBoxGeometry(len / n - 0.008, 0.62, 0.12, 2, 0.045),
        x,
        0.76,
        Z0 + 0.12,
        -0.09,
      );
    }
    put(F, woodDark, new THREE.BoxGeometry(len, 0.06, 0.2), cx, 1.1, Z0 + 0.1);
    put(
      F,
      warmLed,
      new THREE.BoxGeometry(len, 0.012, 0.02),
      cx,
      1.135,
      Z0 + 0.03,
    );
    const glow = new THREE.RectAreaLight("#ffb766", 5, len, 0.06);
    glow.position.set(cx, 1.16, Z0 + 0.05);
    glow.lookAt(cx, 3.4, Z0 - 0.4);
    root.add(glow);
    ctx.wall(xa, Z0, xb, Z0 + 0.65);
  };
  banquette(X0 + 0.05, 1.15);
  banquette(3.85, X1 - 0.05);
  const benchTables = [-5.8, -3.9, -2.0, -0.1, 4.6, 6.05];
  for (const x of benchTables) {
    stamp(F, benchTable, x, 0, Z0 + 1.05);
    stamp(F, armchair, x, 0, Z0 + 1.85, Math.PI + (rand() - 0.5) * 0.2);
    setting(x, 0.765, Z0 + 1.32, Math.PI);
    setting(x, 0.765, Z0 + 0.82, 0, false);
  }
  ctx.wall(-6.4, Z0 + 0.6, 0.45, Z0 + 2.15);
  ctx.wall(4.05, Z0 + 0.6, 6.95, Z0 + 2.15);

  /* ---------- the right side: bamboo screens, doors, fridge, bar ---------- */
  const bambooBack = new THREE.MeshStandardMaterial({
    map: bambooTex,
    roughness: 0.8,
    color: "#c7a57a",
    emissive: "#ffffff",
    emissiveMap: bambooTex,
    emissiveIntensity: 0.12,
  });
  bambooTex.repeat.set(4, 1);
  put(
    S,
    bambooBack,
    new THREE.PlaneGeometry(4.8, 4.0),
    X1 - 0.02,
    2.0,
    -7.55,
    0,
    -Math.PI / 2,
  );
  const bambooMat = pbr(repeat(woodPlanks("#c7a265", 1, 91), 1, 1), {
    roughness: 0.55,
  });
  const bambooDark = pbr(repeat(woodPlanks("#8f6a3c", 1, 92), 1, 1), {
    roughness: 0.6,
  });
  for (const z of [-9.85, -7.55, -5.2]) {
    put(F, woodPillar, new THREE.BoxGeometry(0.3, 4.4, 0.3), X1 - 0.2, 2.2, z);
  }
  put(
    F,
    woodPillar,
    new THREE.BoxGeometry(0.35, 0.18, 4.9),
    X1 - 0.2,
    4.1,
    -7.55,
  );
  put(
    S,
    warmLed,
    new THREE.BoxGeometry(0.03, 0.04, 4.6),
    X1 - 0.38,
    4.2,
    -7.55,
  );
  put(
    F,
    woodDark,
    new THREE.BoxGeometry(0.4, 0.35, 4.4),
    X1 - 0.22,
    0.175,
    -7.55,
  );
  // the wooden soffit and LED cove continue along the whole right wall
  put(
    F,
    woodPillar,
    new THREE.BoxGeometry(0.35, 0.18, 8.2),
    X1 - 0.2,
    4.1,
    -1.0,
  );
  put(S, warmLed, new THREE.BoxGeometry(0.03, 0.04, 8.0), X1 - 0.38, 4.2, -1.0);
  put(
    S,
    woodPillar,
    new THREE.PlaneGeometry(8.2, 1.2),
    X1 - 0.03,
    3.45,
    -1.0,
    0,
    -Math.PI / 2,
  );
  for (const z of [-2.35, 2.75])
    put(
      F,
      woodPillar,
      new THREE.BoxGeometry(0.3, 4.1, 0.3),
      X1 - 0.18,
      2.05,
      z,
    );
  {
    const poleGeo = new THREE.CylinderGeometry(1, 1, 1, 7, 1);
    let z = -9.65;
    while (z < -5.4) {
      const r = 0.017 + rand() * 0.014;
      const hgt = 3.1 + rand() * 0.95;
      const x = X1 - 0.12 - rand() * 0.12;
      put(
        F,
        rand() < 0.3 ? bambooDark : bambooMat,
        poleGeo,
        x,
        0.35 + hgt / 2,
        z,
        0,
        0,
        (rand() - 0.5) * 0.02,
        r,
        hgt,
        r,
      );
      // nodes
      for (let y = 0.6 + rand() * 0.3; y < hgt; y += 0.35 + rand() * 0.15)
        put(
          F,
          bambooDark,
          poleGeo,
          x,
          0.35 + y,
          z,
          0,
          0,
          0,
          r * 1.15,
          0.012,
          r * 1.15,
        );
      z += r * 2 + 0.012 + rand() * 0.03;
    }
  }
  const bambooLight = new THREE.RectAreaLight("#ffb35c", 4, 4.6, 0.08);
  bambooLight.position.set(X1 - 0.4, 4.15, -7.55);
  bambooLight.lookAt(X1 - 0.3, 0, -7.55);
  root.add(bambooLight);
  ctx.wall(X1 - 0.45, Z0, X1, -5.0);

  // kitchen doors with the split AC above
  {
    const dz = -4.3;
    put(
      F,
      woodDark,
      new THREE.BoxGeometry(0.12, 2.5, 1.65),
      X1 - 0.06,
      1.25,
      dz,
    );
    for (const s of [-1, 1]) {
      put(
        F,
        woodTop,
        new THREE.BoxGeometry(0.05, 2.36, 0.7),
        X1 - 0.1,
        1.18,
        dz + s * 0.36,
      );
      put(
        F,
        steel,
        new THREE.BoxGeometry(0.03, 0.3, 0.025),
        X1 - 0.14,
        1.1,
        dz + s * 0.07,
      );
    }
    put(
      F,
      whitePlastic,
      new RoundedBoxGeometry(0.24, 0.3, 0.95, 2, 0.05),
      X1 - 0.13,
      3.15,
      dz,
    );
    put(
      F,
      black,
      new THREE.BoxGeometry(0.01, 0.025, 0.8),
      X1 - 0.255,
      3.04,
      dz,
    );
    put(
      S,
      emissive("#46b3ff", 3),
      new THREE.BoxGeometry(0.005, 0.01, 0.03),
      X1 - 0.255,
      3.22,
      dz + 0.38,
    );
  }

  // the drinks fridge, glowing blue
  {
    const fz = -2.85;
    const fx = X1 - 0.38;
    put(
      F,
      metal("#9da2a6", 0.4),
      new THREE.BoxGeometry(0.72, 2.05, 0.8),
      fx,
      1.025,
      fz,
    );
    put(
      S,
      emissive("#3f9cff", 1.1),
      new THREE.PlaneGeometry(0.66, 1.62),
      fx - 0.362,
      1.05,
      fz,
      0,
      -Math.PI / 2,
    );
    for (let i = 0; i < 4; i++) {
      const y = 0.38 + i * 0.4;
      put(F, black, new THREE.BoxGeometry(0.04, 0.012, 0.66), fx - 0.35, y, fz);
      for (let b = 0; b < 7; b++)
        put(
          F,
          i % 2 ? bottleAmber : bottleGreen,
          bottleGeo,
          fx - 0.2,
          y + 0.006,
          fz - 0.27 + b * 0.09,
          0,
          0,
          0,
          0.9,
          0.95,
          0.9,
        );
    }
    put(
      F,
      emissive("#e2251b", 2.5),
      new THREE.BoxGeometry(0.02, 0.18, 0.62),
      fx - 0.37,
      1.95,
      fz,
    );
    const fl = new THREE.PointLight("#58aaff", 1.5, 5, 2);
    fl.position.set(fx - 0.8, 1.1, fz);
    root.add(fl);
    ctx.wall(X1 - 0.8, -3.3, X1, -2.4);
  }

  // the bar: green-tiled counter, wooden top, back bar with bottles
  const BAR = { x: 5.05, z0: -2.15, z1: 2.6 };
  {
    const len = BAR.z1 - BAR.z0;
    const cz = (BAR.z0 + BAR.z1) / 2;
    put(F, greenTile, new THREE.BoxGeometry(0.6, 1.0, len), BAR.x, 0.5, cz);
    put(
      F,
      woodTop,
      new RoundedBoxGeometry(0.78, 0.05, len + 0.12, 2, 0.015),
      BAR.x - 0.05,
      1.03,
      cz,
    );
    put(
      S,
      emissive("#5ee0d0", 2.4),
      new THREE.BoxGeometry(0.015, 0.015, len),
      BAR.x - 0.3,
      0.98,
      cz,
    );
    put(F, black, new THREE.BoxGeometry(0.62, 0.08, len), BAR.x, 0.04, cz);
    // back bar
    put(
      F,
      woodDark,
      new THREE.BoxGeometry(0.5, 0.95, len),
      X1 - 0.25,
      0.475,
      cz,
    );
    put(
      S,
      emissive("#ffe2b8", 0.9),
      new THREE.PlaneGeometry(len, 1.25),
      X1 - 0.02,
      1.95,
      cz,
      0,
      -Math.PI / 2,
    );
    const bottleMats = [
      bottleGreen,
      bottleAmber,
      bottleClear,
      bottleGreen,
      bottleAmber,
    ];
    for (let s = 0; s < 3; s++) {
      const y = 1.35 + s * 0.42;
      put(F, woodTop, new THREE.BoxGeometry(0.3, 0.03, len), X1 - 0.16, y, cz);
      for (let z = BAR.z0 + 0.15; z < BAR.z1 - 0.1; z += 0.1 + rand() * 0.05) {
        put(
          F,
          bottleMats[Math.floor(rand() * bottleMats.length)]!,
          bottleGeo,
          X1 - 0.15 + (rand() - 0.5) * 0.08,
          y + 0.015,
          z,
          0,
          0,
          0,
          0.85 + rand() * 0.3,
          0.85 + rand() * 0.25,
          0.85 + rand() * 0.3,
        );
      }
    }
    for (let i = 0; i < 6; i++)
      put(
        F,
        glassMat,
        wineGlassGeo,
        X1 - 0.35,
        0.95,
        BAR.z0 + 0.4 + i * 0.12,
        Math.PI,
        0,
        0,
      );
    // stools
    for (let i = 0; i < 4; i++) {
      const z = BAR.z0 + 0.6 + i * 1.1;
      put(
        F,
        woodLight,
        new THREE.CylinderGeometry(0.19, 0.18, 0.05, 20),
        BAR.x - 0.75,
        0.76,
        z,
      );
      for (let l = 0; l < 4; l++) {
        const a = (l / 4) * Math.PI * 2 + 0.4;
        rod(
          F,
          woodLight,
          v3(BAR.x - 0.75 + Math.sin(a) * 0.2, 0, z + Math.cos(a) * 0.2),
          v3(BAR.x - 0.75 + Math.sin(a) * 0.13, 0.74, z + Math.cos(a) * 0.13),
          0.016,
        );
      }
      put(
        F,
        steel,
        new THREE.TorusGeometry(0.17, 0.008, 5, 20),
        BAR.x - 0.75,
        0.28,
        z,
        Math.PI / 2,
      );
    }
    ctx.wall(BAR.x - 0.42, BAR.z0, X1, BAR.z1 + 0.1);
  }

  // host stand near the entrance
  put(
    F,
    woodDark,
    new RoundedBoxGeometry(0.6, 1.1, 0.45, 2, 0.02),
    -3.0,
    0.55,
    3.9,
  );
  put(
    F,
    woodTop,
    new THREE.BoxGeometry(0.66, 0.03, 0.5),
    -3.0,
    1.115,
    3.9,
    0.12,
  );
  ctx.wall(-3.35, 3.65, -2.65, 4.15);

  // "Lotação máxima" plaque on the front pillar of the bamboo
  {
    const t = labelTexture(
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
      "#161616",
    );
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.16),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }),
    );
    m.position.set(X1 - 0.2, 2.6, -5.04);
    root.add(m);
  }

  /* ---------- the couple's table setting ---------- */
  {
    const y = 0.75;
    const { x, z } = COUPLE;
    // her place (far side) and the player's place (near side)
    for (const s of [-1, 1]) {
      const pz = z + s * 0.2;
      const yaw = s < 0 ? 0 : Math.PI;
      put(
        F,
        charger,
        new THREE.CylinderGeometry(0.17, 0.17, 0.006, 32),
        x,
        y + 0.003,
        pz,
      );
      put(F, porcelain, deepPlate, x, y + 0.006, pz);
      put(
        F,
        steel,
        new THREE.BoxGeometry(0.013, 0.003, 0.2),
        x + 0.21,
        y + 0.003,
        pz,
        0,
        yaw,
      );
      put(
        F,
        steel,
        new THREE.BoxGeometry(0.012, 0.003, 0.18),
        x - 0.21,
        y + 0.003,
        pz,
        0,
        yaw,
      );
      put(
        F,
        napkin,
        new RoundedBoxGeometry(0.13, 0.02, 0.2, 1, 0.006),
        x - 0.28,
        y + 0.01,
        pz + s * 0.02,
        0,
        0.2,
      );
      // red wine
      const gx = x + (s < 0 ? -0.2 : 0.22);
      const gz = z + s * 0.02;
      put(F, glassMat, wineGlassGeo, gx, y, gz);
      put(F, wine, wineFill, gx, y, gz);
      put(F, glassMat, tumbler, gx + (s < 0 ? -0.09 : 0.09), y, gz - s * 0.05);
      put(
        F,
        water,
        new THREE.CylinderGeometry(0.032, 0.03, 0.07, 16),
        gx + (s < 0 ? -0.09 : 0.09),
        y + 0.037,
        gz - s * 0.05,
      );
    }
    // carbonara (hers)
    {
      const r = seeded(5);
      const pz = z - 0.2;
      for (let i = 0; i < 16; i++) {
        const pts: THREE.Vector3[] = [];
        let a = r() * Math.PI * 2;
        let rad = 0.01 + r() * 0.05;
        for (let k = 0; k < 7; k++) {
          a += 0.8 + r() * 0.6;
          rad = Math.min(0.075, Math.max(0.005, rad + (r() - 0.5) * 0.04));
          pts.push(
            v3(
              x + Math.cos(a) * rad,
              y + 0.012 + (0.05 - rad * 0.55) * (0.6 + r() * 0.5),
              pz + Math.sin(a) * rad,
            ),
          );
        }
        put(
          F,
          pasta,
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(pts),
            40,
            0.0024,
            4,
            false,
          ),
        );
      }
      for (let i = 0; i < 12; i++) {
        const a = r() * Math.PI * 2;
        const rr = r() * 0.05;
        put(
          F,
          bacon,
          new THREE.BoxGeometry(0.012, 0.007, 0.01),
          x + Math.cos(a) * rr,
          y + 0.04 + r() * 0.02,
          pz + Math.sin(a) * rr,
          r(),
          r(),
          r(),
        );
      }
    }
    // gnocchi al pomodoro (the player's)
    {
      const r = seeded(9);
      const pz = z + 0.2;
      put(
        F,
        sauce,
        new THREE.CylinderGeometry(0.075, 0.08, 0.012, 24),
        x,
        y + 0.018,
        pz,
      );
      for (let i = 0; i < 18; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * 0.06;
        put(
          F,
          gnocchi,
          new THREE.CapsuleGeometry(0.009, 0.014, 3, 8),
          x + Math.cos(a) * rr,
          y + 0.03 + r() * 0.01,
          pz + Math.sin(a) * rr,
          Math.PI / 2,
          r() * 3,
          0,
        );
      }
      put(
        F,
        basil,
        new THREE.SphereGeometry(0.018, 8, 4),
        x + 0.01,
        y + 0.045,
        pz,
        0,
        0,
        0,
        1,
        0.2,
        0.6,
      );
    }
    // wine bottle, candle, bread, the table card
    put(F, bottleGreen, bottleGeo, x + 0.3, y, z - 0.03);
    put(
      F,
      label,
      new THREE.CylinderGeometry(0.0375, 0.0375, 0.09, 18, 1, true),
      x + 0.3,
      y + 0.11,
      z - 0.03,
    );
    put(
      F,
      glassMat,
      new THREE.CylinderGeometry(0.03, 0.03, 0.06, 16, 1, true),
      x - 0.05,
      y + 0.03,
      z,
    );
    put(
      F,
      whitePlastic,
      new THREE.CylinderGeometry(0.019, 0.019, 0.02, 12),
      x - 0.05,
      y + 0.01,
      z,
    );
    put(
      F,
      flame,
      new THREE.SphereGeometry(0.006, 8, 6),
      x - 0.05,
      y + 0.032,
      z,
      0,
      0,
      0,
      1,
      2.2,
      1,
    );
    put(
      F,
      woodTop,
      new THREE.CylinderGeometry(0.08, 0.07, 0.04, 16),
      x - 0.3,
      y + 0.02,
      z - 0.04,
    );
    for (let i = 0; i < 4; i++)
      put(
        F,
        bread,
        new THREE.CapsuleGeometry(0.018, 0.05, 3, 8),
        x - 0.3 + (i - 1.5) * 0.025,
        y + 0.05,
        z - 0.04,
        Math.PI / 2,
        0.3 * i,
        0,
      );
    const card = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.12),
      new THREE.MeshStandardMaterial({
        map: tableCardTexture(),
        roughness: 0.3,
      }),
    );
    card.position.set(x + 0.08, y + 0.065, z + 0.02);
    card.rotation.y = Math.PI;
    card.rotation.x = 0;
    root.add(card);
    const card2 = card.clone();
    card2.rotation.y = 0;
    card2.position.z = z + 0.024;
    root.add(card2);
    put(
      F,
      glassMat,
      new THREE.BoxGeometry(0.09, 0.13, 0.008),
      x + 0.08,
      y + 0.065,
      z + 0.022,
    );
    put(
      F,
      woodTop,
      new THREE.BoxGeometry(0.1, 0.012, 0.04),
      x + 0.08,
      y + 0.006,
      z + 0.022,
    );
  }

  /* ---------- plants (one instanced mesh of leaves) ---------- */
  const leafGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 2, 4);
    const p = g.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + 0.5;
      const x = p.getX(i) * Math.sin(Math.PI * Math.min(1, y * 1.05)) * 0.9;
      p.setXYZ(i, x, y, -y * y * 0.35 + Math.abs(x) * 0.15);
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
    const m = new THREE.Matrix4().compose(
      v3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ")),
      v3(wid, len, wid),
    );
    leaves.push({ m, c: color });
  };
  const green = (l = 0) =>
    new THREE.Color().setHSL(
      0.27 + rand() * 0.06,
      0.45 + rand() * 0.2,
      0.2 + rand() * 0.1 + l,
    );
  const pot = (x: number, z: number, r: number, h: number, y = 0) => {
    put(
      F,
      terracotta,
      new THREE.LatheGeometry(
        [
          v3(0, 0, 0),
          v3(r * 0.72, 0, 0),
          v3(r, h * 0.92, 0),
          v3(r * 1.06, h, 0),
          v3(r * 0.97, h, 0),
        ].map((p) => new THREE.Vector2(p.x, p.y)),
        20,
      ),
      x,
      y,
      z,
    );
    put(
      F,
      soil,
      new THREE.CircleGeometry(r * 0.96, 16),
      x,
      y + h * 0.94,
      z,
      -Math.PI / 2,
    );
  };
  const fern = (x: number, y: number, z: number, size: number) => {
    for (let i = 0; i < 26; i++)
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
      const r = Math.sqrt(rand());
      const yy = (rand() * 2 - 1) * ry;
      const rr = rx * r * Math.sqrt(1 - (yy / ry) ** 2);
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
    for (let d = 0; d < len; d += 0.035) {
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
    rod(F, woodDark, v3(x, 0.35, z), v3(x + 0.03, h * 0.6, z - 0.02), 0.022);
    bush(x, h * 0.62, z, 0.45, h * 0.35, high ? 520 : 260, flowers);
  };

  // ferns on the LED ledges, along the stone wall
  for (let x = X0 + 0.7; x < X1 - 0.3; x += 1.25 + rand() * 0.5) {
    if (x > 1.0 && x < 4.0) continue;
    pot(x, Z0 + 0.12, 0.09, 0.15, 1.13);
    fern(x, 1.27, Z0 + 0.12, 0.3);
  }
  // potted trees: by the arch, by the left wall (bougainvillea), near the entrance
  tree(0.95, Z0 + 0.95, 2.0);
  tree(4.1, Z0 + 1.0, 1.8);
  tree(-6.35, -4.3, 2.4, 0.3);
  tree(-6.4, 0.2, 2.1);
  tree(-6.2, 4.2, 2.0);
  tree(0.9, 4.3, 1.9);
  // bamboo planter
  for (let z = -9.4; z < -5.6; z += 0.55) fern(X1 - 0.25, 0.35, z, 0.38);
  ctx.wall(0.6, Z0 + 0.6, 1.3, Z0 + 1.3);
  ctx.wall(3.75, Z0 + 0.65, 4.45, Z0 + 1.35);
  for (const [x, z] of [
    [-6.35, -4.3],
    [-6.4, 0.2],
    [-6.2, 4.2],
    [0.9, 4.3],
  ] as const)
    ctx.wall(x - 0.3, z - 0.3, x + 0.3, z + 0.3);

  /* ---------- wicker lanterns ---------- */
  type Lamp = {
    x: number;
    z: number;
    y: number;
    kind: "pill" | "dome" | "drop";
    R: number;
    L: number;
    light?: number;
    ivy?: number;
  };
  // (the first ones get real lights first: the couple's lamp always does)
  const lamps: Lamp[] = [
    {
      x: COUPLE.x,
      z: COUPLE.z,
      y: 1.75,
      kind: "drop",
      R: 0.2,
      L: 0.4,
      light: 9,
    },
    { x: -0.9, z: -6.9, y: 3.15, kind: "pill", R: 0.2, L: 0.75, light: 14 },
    { x: -0.3, z: -7.6, y: 3.55, kind: "pill", R: 0.22, L: 0.8 },
    { x: -1.6, z: -6.0, y: 2.6, kind: "pill", R: 0.17, L: 0.6 },
    { x: -4.4, z: -6.6, y: 2.9, kind: "pill", R: 0.2, L: 0.7, light: 12 },
    { x: -4.0, z: -7.3, y: 3.4, kind: "pill", R: 0.2, L: 0.75 },
    { x: 1.25, z: -8.7, y: 2.45, kind: "dome", R: 0.2, L: 0.36, ivy: 0.6 },
    { x: 2.5, z: -8.95, y: 2.3, kind: "drop", R: 0.2, L: 0.42, ivy: 0.8 },
    { x: 3.8, z: -8.55, y: 2.0, kind: "dome", R: 0.18, L: 0.34, ivy: 0.5 },
    {
      x: -6.25,
      z: -2.6,
      y: 2.2,
      kind: "drop",
      R: 0.19,
      L: 0.38,
      ivy: 0.7,
      light: 8,
    },
    { x: -6.0, z: -3.3, y: 1.95, kind: "dome", R: 0.15, L: 0.3, ivy: 0.4 },
    { x: -6.3, z: -1.9, y: 2.55, kind: "pill", R: 0.15, L: 0.55 },
    { x: -4.7, z: -2.8, y: 2.6, kind: "pill", R: 0.18, L: 0.7, light: 10 },
    { x: -1.5, z: -2.5, y: 2.75, kind: "pill", R: 0.2, L: 0.75, light: 10 },
    { x: 5.45, z: -6.7, y: 2.0, kind: "drop", R: 0.19, L: 0.38, ivy: 0.6 },
    { x: 5.9, z: -8.6, y: 2.6, kind: "dome", R: 0.2, L: 0.36, ivy: 0.7 },
    { x: 4.5, z: -0.6, y: 2.2, kind: "dome", R: 0.2, L: 0.36, light: 8 },
    { x: 4.5, z: 1.3, y: 2.2, kind: "dome", R: 0.2, L: 0.36 },
    { x: 0.9, z: 0.9, y: 2.3, kind: "drop", R: 0.19, L: 0.38, light: 8 },
    { x: -4.7, z: 1.5, y: 2.7, kind: "pill", R: 0.2, L: 0.75, light: 9 },
    { x: -2.0, z: 0.2, y: 3.0, kind: "pill", R: 0.21, L: 0.8 },
    { x: -2.4, z: -0.4, y: 3.5, kind: "pill", R: 0.2, L: 0.75 },
    { x: 2.7, z: 1.9, y: 2.3, kind: "dome", R: 0.18, L: 0.34 },
  ];
  let lights = 0;
  const maxLights = high ? 8 : 4;
  for (const l of lamps) {
    put(
      F,
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
      F,
      wicker,
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12, 1, true),
      l.x,
      l.y + l.L,
      l.z,
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
      new THREE.CylinderGeometry(0.06, 0.06, 0.025, 16),
      l.x,
      H - 0.0125,
      l.z,
    );
    const by = l.y + (l.kind === "dome" ? l.L * 0.45 : l.L * 0.45);
    put(
      F,
      bulb,
      new THREE.SphereGeometry(0.03, 10, 8),
      l.x,
      by,
      l.z,
      0,
      0,
      0,
      1,
      1.35,
      1,
    );
    if (l.ivy && high) ivy(l.x + l.R * 0.6, l.y + l.L * 0.6, l.z, l.ivy);
    if (l.light && lights < maxLights) {
      lights++;
      const p = new THREE.PointLight("#ff9f50", l.light * 0.38, 0, 2);
      p.position.set(l.x, by - 0.05, l.z);
      root.add(p);
    }
  }

  /* ---------- ceiling fixtures ---------- */
  for (let x = -5.2; x <= 5.2; x += 3.4) {
    for (let z = -7.2; z <= 3.6; z += 3.6) {
      const cx = x + (rand() - 0.5) * 0.2;
      put(
        S,
        black,
        new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12),
        cx,
        H - 0.01,
        z,
      );
      put(
        S,
        downlight,
        new THREE.CircleGeometry(0.035, 12),
        cx,
        H - 0.021,
        z,
        Math.PI / 2,
      );
    }
  }
  // grazing downlights along the top of the stone wall
  const graze = high ? [-5.6, -3.2, -0.9, 5.4] : [-3.2, 5.4];
  for (let x = -6.3; x <= 6.4; x += 1.15) {
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
  for (const x of graze) {
    const sp = new THREE.SpotLight("#ffd8a8", 22, 0, 0.55, 0.85, 2);
    sp.position.set(x, H - 0.05, Z0 + 0.4);
    sp.target.position.set(x, 0.8, Z0 - 0.05);
    root.add(sp, sp.target);
  }
  // double square spots and AC grilles
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
    [-3.5, -5],
    [1.8, -4.5],
    [-2.5, 0.5],
    [3.0, 2.8],
  ] as const) {
    put(
      S,
      grilleMat,
      new THREE.PlaneGeometry(0.9, 0.5),
      x,
      H - 0.012,
      z,
      Math.PI / 2,
    );
  }
  for (const [x, z] of [
    [-1.0, -3.7],
    [3.6, -6.3],
    [-5.2, -0.7],
    [1.9, -0.2],
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

  /* ---------- key lights (shadows) and fill ---------- */
  const key = new THREE.SpotLight("#ffcf98", 13, 0, 0.4, 0.85, 2);
  key.position.set(COUPLE.x - 0.4, H - 0.1, COUPLE.z + 0.6);
  key.target.position.set(COUPLE.x, 0.75, COUPLE.z);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 7;
  root.add(key, key.target);
  const hall = new THREE.SpotLight("#ffc890", 22, 0, 0.75, 0.9, 2);
  hall.position.set(-3.0, H - 0.1, -4.4);
  hall.target.position.set(-3.0, 0.5, -4.6);
  if (high) {
    hall.castShadow = true;
    hall.shadow.mapSize.set(1024, 1024);
    hall.shadow.bias = -0.0005;
    hall.shadow.normalBias = 0.03;
  }
  root.add(hall, hall.target);
  const front2 = new THREE.SpotLight("#ffc890", 12, 0, 0.8, 0.9, 2);
  front2.position.set(-1.5, H - 0.1, 1.6);
  front2.target.position.set(-1.5, 0, 1.2);
  root.add(front2, front2.target);
  root.add(new THREE.HemisphereLight("#ffd2a0", "#2a1f17", 0.08));

  /* ---------- flush the batches ---------- */
  flush(root, S, false);
  flush(root, F, true);
  if (leaves.length) {
    const lm = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const inst = new THREE.InstancedMesh(leafGeo, lm, leaves.length);
    leaves.forEach((l, i) => {
      inst.setMatrixAt(i, l.m);
      inst.setColorAt(i, l.c);
    });
    inst.receiveShadow = true;
    root.add(inst);
  }

  /* ---------- photos of the couple ---------- */
  ctx.photo("famiglia-1.webp", 0.48, 0.64, v3(X0 + 0.04, 1.65, -1.1), 90);
  ctx.photo("famiglia-3.webp", 0.42, 0.56, v3(5.1, 2.05, Z0 + 0.03), 0);

  /* ---------- people ---------- */
  const outfits: { davi: Outfit; elena: Outfit } = {
    elena: {
      top: "#1d1d1d",
      topStyle: "blouse",
      bottom: "#23283a",
      bottomStyle: "jeans",
      shoes: "#1a1a1a",
    },
    davi: {
      top: "#5a3b2b",
      topStyle: "tshirt",
      bottom: "#262c3a",
      bottomStyle: "jeans",
      shoes: "#efefef",
    },
  };
  ctx.playerOutfit(outfits);
  const line =
    ctx.player === "elena"
      ? "Um mês que pareceu uma vida inteira (no bom sentido!) 🎻"
      : "Um violino tocando pra gente? Você caprichou! 🎻";
  ctx.partner(COUPLE.x, COUPLE.z - 0.6, 0, "sit", outfits, line);

  // the violinist, in a black suit, playing for them
  const suit: Outfit = {
    top: "#141414",
    topStyle: "tshirt",
    bottom: "#141414",
    bottomStyle: "pants",
    shoes: "#0b0b0b",
  };
  const vx = COUPLE.x + 1.05;
  const vz = COUPLE.z - 0.55;
  // (the "violin" pose brings its own violin and bow)
  ctx.person(
    {
      skin: "#6e452d",
      hair: "#121010",
      hairStyle: "short",
      height: 1.8,
      beard: true,
    },
    suit,
    vx,
    vz,
    -62,
    "violin",
    "🎻 ♪ ♫",
  );

  // staff: the bartender and two waiters
  const waiterBlack: Outfit = {
    top: "#151515",
    topStyle: "tshirt",
    bottom: "#151515",
    bottomStyle: "pants",
    shoes: "#0b0b0b",
  };
  ctx.person(
    { skin: "#c98f6a", hair: "#1c130d", hairStyle: "short", height: 1.76 },
    {
      top: "#e79c86",
      topStyle: "tshirt",
      bottom: "#161616",
      bottomStyle: "pants",
      shoes: "#111",
    },
    X1 - 0.95,
    0.3,
    -90,
    "stand",
  );
  ctx.person(
    {
      skin: "#8a5a3c",
      hair: "#0f0b09",
      hairStyle: "bun",
      height: 1.66,
      female: true,
    },
    waiterBlack,
    -0.2,
    -4.25,
    -120,
    "talk",
  );

  // a few other diners
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
    1.75,
    -11.85,
    90,
    "sit",
  );
  stamp(F, crossChair, 1.7, 0, -11.85, Math.PI / 2);
  stamp(F, woodTable, 2.5, 0, -11.85);
  stamp(F, crossChair, 3.1, 0, -11.85, -Math.PI / 2);
  setting(2.28, 0.75, -11.85, Math.PI / 2);
  if (high) {
    const [rx, rz] = rounds[0]!;
    const a1 = Math.PI / 4 + Math.PI / 2;
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
      rx + Math.sin(a1) * 0.92,
      rz + Math.cos(a1) * 0.92,
      (a1 + Math.PI) * (180 / Math.PI),
      "sit",
    );
    const a2 = a1 + Math.PI;
    ctx.person(
      {
        skin: "#d39b74",
        hair: "#1a120c",
        hairStyle: "short",
        height: 1.8,
        glasses: true,
      },
      {
        top: "#d9d4ca",
        topStyle: "tshirt",
        bottom: "#2b2f38",
        bottomStyle: "pants",
      },
      rx + Math.sin(a2) * 0.92,
      rz + Math.cos(a2) * 0.92,
      (a2 + Math.PI) * (180 / Math.PI),
      "sit",
    );
  }
  flush(root, F, true);

  /* ---------- place registration ---------- */
  // room bounds, the arch passage and the back room
  ctx.wall(X0 - 1, Z0 - 4, X0 + 0.05, Z1 + 4);
  ctx.wall(X1 - 0.05, Z0 - 4, X1 + 1, Z1 + 4);
  ctx.wall(X0, Z0 - 0.6, ARCH_X - 0.8, Z0 + 0.02);
  ctx.wall(ARCH_X + 0.8, Z0 - 0.6, X1, Z0 + 0.02);
  ctx.wall(X0, Z0 - 4, BR.x0 + 0.05, Z0 - 0.5);
  ctx.wall(BR.x1 - 0.05, Z0 - 4, X1, Z0 - 0.5);
  ctx.wall(X0, BR.z0 - 1, X1, BR.z0 + 0.05);
  ctx.wall(1.95, -12.2, 2.85, -11.3);
  ctx.wall(X0, Z1 - 0.05, -2.1, Z1 + 4);
  ctx.wall(0.1, Z1 - 0.05, X1, Z1 + 4);
  ctx.wall(-2.1, Z1 + 0.6, 0.1, Z1 + 4);

  ctx.spawn(-1.0, 3.7, -8);
  ctx.exit(-1.0, Z1 + 0.15, 0.6);
  ctx.pack(BAR.x - 0.12, 1.055, 1.55, 70);
  ctx.ambient("amb-famiglia.m4a", 0.5);

  // the candle flickers
  ctx.onUpdate((t) => {
    flame.emissiveIntensity = 9 + Math.sin(t * 13) * 1.5 + Math.sin(t * 29) * 1;
  });
}

const scene: SceneModule = {
  id: "famiglia",
  title: "Famiglia Crosara",
  build,
};

export default scene;
