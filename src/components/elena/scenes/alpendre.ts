import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  bricks,
  emissive,
  metal,
  pbr,
  plaster,
  repeat,
  seeded,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneModule } from "../fp/types";

/*
 * Alpendre (Uberlândia), 16/10/2026, night: the night Elena sang on the
 * small stage. Built from the couple's video (IMG_6086) and selfies
 * (IMG_6087–6105):
 *  - a big hall under a dark exposed ceiling (black steel beams and joists),
 *    festoon bulbs strung across, a few white linear LED bars;
 *  - walls painted with big geometric triangles (teal, mint, yellow, orange,
 *    red, pink, purple);
 *  - the bar at the back left (dark wood front, wooden stools with black
 *    legs, bottles on the back shelves, vines with fairy lights over it,
 *    wicker pendant lamps);
 *  - behind the singer: a wooden WC door with a "WC FEMININO" plate, a TV on
 *    an arm, a small white wall speaker, a fire extinguisher, and a black
 *    pipe railing on her right closing a staff corner with a counter of
 *    green beer buckets;
 *  - the small stage with two mic stands, the sound desk (a black road case
 *    with a cable coil, a laptop and a plastic cup) in front of it and a
 *    hanging pothos above it;
 *  - wooden tables with black-frame chairs on a dark Portuguese-stone floor,
 *    a white-brick planter with plants along the left wall, and an open
 *    terrace on the right with plants and the city at night.
 *
 * Plan (meters): x ∈ [-7, 7], z ∈ [-10, 6], ceiling 4.4 (beams from 3.95).
 * Entrance on the front wall z = 6 at x = -4.5. Stage x ∈ [-1, 2.2],
 * z ∈ [-7.2, -4.8], 0.25 high.
 */

const X0 = -7;
const X1 = 7;
const Z0 = -10;
const Z1 = 6;
const H = 4.4;
const BEAM = 3.95;
const SH = 0.25; // stage height
const STAGE = { x0: -1.0, x1: 2.2, z0: -7.2, z1: -4.8 };
const SINGER = { x: 0.5, z: -6.05 };
const DOOR_X = -4.5;
const TABLE_TOP = 0.76;

/* ---------------- geometry helpers ---------------- */

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

/** A transform: position, rotation (radians, YXZ) and scale. */
function M(
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
  rx = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx,
) {
  _e.set(rx, ry, rz, "YXZ");
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    _q.clone(),
    new THREE.Vector3(sx, sy, sz),
  );
}

/** A unit cylinder (height along Y) stretched between two points. */
function between(a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
  return new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    q,
    new THREE.Vector3(r, len, r),
  );
}

/** Non-indexed copy with only position/normal/uv, transformed; optional world-projected UVs (meters per tile). */
function prep(geo: THREE.BufferGeometry, m: THREE.Matrix4, uvScale = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes))
    if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
  g.clearGroups();
  g.applyMatrix4(m);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  if (uvScale > 0 || !g.getAttribute("uv")) {
    const s = uvScale > 0 ? 1 / uvScale : 1;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(nor.getX(i));
      const ny = Math.abs(nor.getY(i));
      const nz = Math.abs(nor.getZ(i));
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (ny >= nx && ny >= nz) {
        uv[i * 2] = x * s;
        uv[i * 2 + 1] = z * s;
      } else if (nx >= nz) {
        uv[i * 2] = z * s;
        uv[i * 2 + 1] = y * s;
      } else {
        uv[i * 2] = x * s;
        uv[i * 2 + 1] = y * s;
      }
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  }
  return g;
}

/** Collects static geometry per material and merges it into one mesh per material. */
class Batch {
  private groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    m: THREE.Matrix4,
    uvScale = 0,
  ) {
    const list = this.groups.get(mat) ?? [];
    list.push(prep(geo, m, uvScale));
    this.groups.set(mat, list);
  }
  flush(parent: THREE.Object3D) {
    for (const [mat, list] of this.groups) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.userData.noCast;
      mesh.receiveShadow = !mat.userData.noReceive;
      parent.add(mesh);
      for (const g of list) g.dispose();
    }
    this.groups.clear();
  }
}

function mergedLocal(parts: [THREE.BufferGeometry, THREE.Matrix4][]) {
  const g = mergeGeometries(
    parts.map(([geo, m]) => prep(geo, m)),
    false,
  );
  if (!g) throw new Error("merge failed");
  return g;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 16);
const lowCyl = new THREE.CylinderGeometry(1, 1, 1, 8);
const rbCache = new Map<string, THREE.BufferGeometry>();
function rbox(w: number, h: number, d: number, r: number, seg = 2) {
  const k = `${w}:${h}:${d}:${r}:${seg}`;
  let g = rbCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    rbCache.set(k, g);
  }
  return g;
}
function lathe(pts: [number, number][], seg = 24) {
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
}

/* ---------------- painted textures ---------------- */

function canvas2d(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

function toTex(c: HTMLCanvasElement, srgb = true, wrap = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Tangent-space normal map from a grey height canvas (Sobel). */
function normalFromHeight(src: HTMLCanvasElement, strength = 2) {
  const w = src.width;
  const h = src.height;
  const sg = src.getContext("2d");
  if (!sg) throw new Error("2d canvas unavailable");
  const d = sg.getImageData(0, 0, w, h).data;
  const { c, g } = canvas2d(w, h);
  const o = g.createImageData(w, h);
  const at = (x: number, y: number) =>
    (d[(((y + h) % h) * w + ((x + w) % w)) * 4] ?? 0) / 255;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      o.data[i] = (-dx / len) * 127.5 + 127.5;
      o.data[i + 1] = (dy / len) * 127.5 + 127.5;
      o.data[i + 2] = (1 / len) * 127.5 + 127.5;
      o.data[i + 3] = 255;
    }
  g.putImageData(o, 0, 0);
  return toTex(c, false);
}

/** Portuguese-stone pavement: small irregular black basalt cubes in light grout (1 texture ≈ 1.2 m). */
function stoneFloor() {
  const S = 1024;
  const alb = canvas2d(S, S);
  const hei = canvas2d(S, S);
  const rough = canvas2d(S, S);
  const rand = seeded(61);
  alb.g.fillStyle = "#6f6a62";
  alb.g.fillRect(0, 0, S, S);
  hei.g.fillStyle = "#202020";
  hei.g.fillRect(0, 0, S, S);
  rough.g.fillStyle = "#f2f2f2";
  rough.g.fillRect(0, 0, S, S);
  const n = 30;
  const cell = S / n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const cx = (i + 0.5 + (rand() - 0.5) * 0.25) * cell;
      const cy = (j + 0.5 + (rand() - 0.5) * 0.25) * cell;
      const pts: [number, number][] = [];
      const k = 5 + Math.floor(rand() * 3);
      const a0 = rand() * Math.PI;
      for (let p = 0; p < k; p++) {
        const a = a0 + (p / k) * Math.PI * 2 + (rand() - 0.5) * 0.4;
        const r = cell * (0.4 + rand() * 0.12);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      const v = 22 + rand() * 22;
      const light = rand() < 0.03;
      for (const [ctx, fill] of [
        [
          alb.g,
          light
            ? `rgb(${170 + v},${165 + v},${155 + v})`
            : `rgb(${v},${v - 2},${v - 4})`,
        ],
        [hei.g, `rgb(${170 + rand() * 60},${170},${170})`],
        [rough.g, `rgb(${120 + rand() * 60},0,0)`],
      ] as [CanvasRenderingContext2D, string][]) {
        for (const ox of [-S, 0, S])
          for (const oy of [-S, 0, S]) {
            if (ox && cx > cell * 2 && cx < S - cell * 2) continue;
            if (oy && cy > cell * 2 && cy < S - cell * 2) continue;
            ctx.fillStyle = fill;
            ctx.beginPath();
            pts.forEach(([x, y], idx) =>
              idx ? ctx.lineTo(x + ox, y + oy) : ctx.moveTo(x + ox, y + oy),
            );
            ctx.closePath();
            ctx.fill();
          }
      }
      // a worn highlight on each stone
      alb.g.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.04})`;
      alb.g.beginPath();
      alb.g.arc(
        cx - cell * 0.08,
        cy - cell * 0.08,
        cell * 0.22,
        0,
        Math.PI * 2,
      );
      alb.g.fill();
    }
  // copy roughness red into green (three reads G)
  const rd = rough.g.getImageData(0, 0, S, S);
  for (let i = 0; i < rd.data.length; i += 4) {
    const r = rd.data[i] ?? 255;
    rd.data[i + 1] = r;
    rd.data[i + 2] = r;
  }
  rough.g.putImageData(rd, 0, 0);
  return {
    map: toTex(alb.c),
    normalMap: normalFromHeight(hei.c, 3),
    roughnessMap: toTex(rough.c, false),
  };
}

const MURAL = [
  "#2fbfb1",
  "#93dccf",
  "#f6b51f",
  "#f2841c",
  "#e2253d",
  "#ea3d84",
  "#7b4bc3",
  "#5b3aa6",
];

/** A wall painted with big flat triangles, like the murals behind the stage. */
function muralTex(widthM: number, heightM: number, seed: number) {
  const pxPerM = 96;
  const W = Math.min(2048, Math.round(widthM * pxPerM));
  const Hh = Math.round((W / widthM) * heightM);
  const { c, g } = canvas2d(W, Hh);
  const rand = seeded(seed);
  const cols = Math.max(3, Math.round(widthM / 2.2));
  const rows = 2;
  const pts: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: [number, number][] = [];
    for (let i = 0; i <= cols; i++) {
      const jx = i === 0 || i === cols ? 0 : (rand() - 0.5) * 0.8;
      const jy = j === 0 || j === rows ? 0 : (rand() - 0.5) * 0.9;
      row.push([((i + jx) / cols) * W, (1 - (j + jy) / rows) * Hh]);
    }
    pts.push(row);
  }
  let last = -1;
  const pick = () => {
    let k = Math.floor(rand() * MURAL.length);
    if (k === last) k = (k + 3) % MURAL.length;
    last = k;
    return MURAL[k] ?? "#7b4bc3";
  };
  const tri = (
    a: [number, number],
    b: [number, number],
    d: [number, number],
  ) => {
    g.fillStyle = pick();
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.lineTo(d[0], d[1]);
    g.closePath();
    g.fill();
    g.strokeStyle = g.fillStyle;
    g.lineWidth = 1.5;
    g.stroke();
  };
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = pts[j]?.[i];
      const b = pts[j]?.[i + 1];
      const d = pts[j + 1]?.[i];
      const e = pts[j + 1]?.[i + 1];
      if (!a || !b || !d || !e) continue;
      if (rand() < 0.5) {
        tri(a, b, e);
        tri(a, e, d);
      } else {
        tri(a, b, d);
        tri(b, e, d);
      }
    }
  // painted plaster: faint mottling and grime near the floor
  for (let k = 0; k < 2500; k++) {
    g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.035})`;
    g.fillRect(rand() * W, rand() * Hh, 3 + rand() * 14, 3 + rand() * 14);
  }
  const grime = g.createLinearGradient(0, Hh, 0, Hh * 0.8);
  grime.addColorStop(0, "rgba(20,10,10,0.35)");
  grime.addColorStop(1, "rgba(20,10,10,0)");
  g.fillStyle = grime;
  g.fillRect(0, Hh * 0.8, W, Hh * 0.2);
  const t = toTex(c, true, false);
  return t;
}

/** Dark corrugated ceiling deck (height for the normal map). */
function ceilingMaps() {
  const S = 256;
  const h = canvas2d(S, S);
  for (let x = 0; x < S; x++) {
    const v = 128 + Math.sin((x / S) * Math.PI * 2 * 8) * 90;
    h.g.fillStyle = `rgb(${v},${v},${v})`;
    h.g.fillRect(x, 0, 1, S);
  }
  return normalFromHeight(h.c, 1.5);
}

/** A TV picture: a football match, blurred as a phone video sees it. */
function tvTex() {
  const { c, g } = canvas2d(512, 288);
  const rand = seeded(5);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? "#2f8a3a" : "#35963f";
    g.fillRect(0, 70 + i * 28, 512, 28);
  }
  g.fillStyle = "#1b2a4a";
  g.fillRect(0, 0, 512, 70);
  for (let i = 0; i < 300; i++) {
    g.fillStyle =
      ["#e8d3b0", "#d33", "#36c", "#fff", "#222"][Math.floor(rand() * 5)] ??
      "#fff";
    g.fillRect(rand() * 512, rand() * 66, 3, 4);
  }
  g.strokeStyle = "rgba(255,255,255,0.8)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(40, 280);
  g.lineTo(200, 76);
  g.lineTo(500, 76);
  g.stroke();
  g.beginPath();
  g.ellipse(330, 170, 70, 30, 0, 0, Math.PI * 2);
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const x = 60 + rand() * 420;
    const y = 110 + rand() * 150;
    g.fillStyle = i < 6 ? "#e8e8f0" : "#c62828";
    g.fillRect(x, y, 6, 16);
    g.fillStyle = "#2b1a12";
    g.fillRect(x + 1, y - 5, 4, 5);
  }
  g.fillStyle = "rgba(0,0,0,0.75)";
  g.fillRect(16, 14, 150, 24);
  g.fillStyle = "#fff";
  g.font = "bold 16px sans-serif";
  g.fillText("FLA 1 x 0 PAL  67'", 24, 32);
  return toTex(c, true, false);
}

/** The small "WC FEMININO" plate above the door. */
function wcTex() {
  const { c, g } = canvas2d(256, 160);
  g.fillStyle = "#18302b";
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#e9f2ec";
  g.textAlign = "center";
  g.font = "bold 40px sans-serif";
  g.fillText("WC", 128, 50);
  g.beginPath();
  g.arc(128, 74, 9, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(128, 84);
  g.lineTo(146, 120);
  g.lineTo(110, 120);
  g.closePath();
  g.fill();
  g.font = "bold 22px sans-serif";
  g.fillText("FEMININO", 128, 148);
  return toTex(c, true, false);
}

/** Wicker weave with holes (alpha). */
function weaveTex() {
  const { c, g } = canvas2d(256, 256);
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = "#b98b55";
  g.lineWidth = 7;
  for (let i = -256; i < 512; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 256, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(i + 256, 0);
    g.lineTo(i, 256);
    g.stroke();
  }
  const t = toTex(c);
  t.repeat.set(6, 2);
  return t;
}

/** The city at night seen from the terrace. */
function cityTex() {
  const W = 2048;
  const Hh = 1024;
  const { c, g } = canvas2d(W, Hh);
  const rand = seeded(77);
  const sky = g.createLinearGradient(0, 0, 0, Hh * 0.5);
  sky.addColorStop(0, "#05070f");
  sky.addColorStop(0.7, "#141a33");
  sky.addColorStop(1, "#3a2a3a");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, Hh * 0.5);
  g.fillStyle = "#07080c";
  g.fillRect(0, Hh * 0.5, W, Hh * 0.5);
  // buildings
  let x = 0;
  while (x < W) {
    const bw = 30 + rand() * 90;
    const bh = 20 + rand() * (rand() < 0.15 ? 260 : 120);
    const top = Hh * 0.5 - bh;
    g.fillStyle = `rgb(${10 + rand() * 10},${12 + rand() * 10},${20 + rand() * 12})`;
    g.fillRect(x, top, bw, bh + 4);
    for (let wy = top + 6; wy < Hh * 0.5 - 4; wy += 9)
      for (let wx = x + 4; wx < x + bw - 4; wx += 8)
        if (rand() < 0.28) {
          g.fillStyle =
            rand() < 0.7 ? "rgba(255,214,150,0.9)" : "rgba(200,225,255,0.85)";
          g.fillRect(wx, wy, 3, 4);
        }
    if (bh > 150 && rand() < 0.6) {
      g.fillStyle = "#ff3030";
      g.fillRect(x + bw / 2 - 2, top - 4, 4, 4);
    }
    x += bw + rand() * 6;
  }
  // the lit city spreading below (street lights and houses)
  for (let i = 0; i < 9000; i++) {
    const y = Hh * 0.5 + Math.pow(rand(), 1.6) * Hh * 0.5;
    const s = 1 + ((y - Hh * 0.5) / (Hh * 0.5)) * 3;
    g.fillStyle =
      rand() < 0.6
        ? `rgba(255,170,80,${0.5 + rand() * 0.5})`
        : `rgba(255,236,200,${0.4 + rand() * 0.5})`;
    g.fillRect(rand() * W, y, s, s);
  }
  return toTex(c, true, false);
}

/* ---------------- plants ---------------- */

/** One pothos leaf (heart shape, pointing +Y, folded along the midrib). */
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.05, 0.005, -0.05, 0.06, 0, 0.095);
  s.bezierCurveTo(0.05, 0.06, 0.05, 0.005, 0, 0);
  const g = new THREE.ShapeGeometry(s, 3);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++)
    p.setZ(i, -Math.abs(p.getX(i)) * 0.45 + Math.sin(p.getY(i) * 20) * 0.003);
  g.computeVertexNormals();
  return g;
}

type Leaf = { m: THREE.Matrix4; c: THREE.Color };

const GREENS = [
  "#3f7d2c",
  "#4f9535",
  "#5fa83c",
  "#6cb648",
  "#3a6e28",
  "#86b84a",
];

function leafAt(
  leaves: Leaf[],
  rand: () => number,
  p: THREE.Vector3,
  scale: number,
  out?: THREE.Vector3,
) {
  const ry = out
    ? Math.atan2(out.x, out.z) + (rand() - 0.5) * 1.2
    : rand() * Math.PI * 2;
  const rx = 0.5 + rand() * 1.6;
  const c = new THREE.Color(
    GREENS[Math.floor(rand() * GREENS.length)] ?? "#4f9535",
  );
  if (rand() < 0.25) c.lerp(new THREE.Color("#d8e27a"), 0.25); // marbled pothos
  leaves.push({ m: M(p.x, p.y, p.z, ry, rx, (rand() - 0.5) * 0.8, scale), c });
}

/** A hanging vine: stem as a thin tube, leaves along it. */
function vine(
  B: Batch,
  stemMat: THREE.Material,
  leaves: Leaf[],
  rand: () => number,
  top: THREE.Vector3,
  length: number,
  dir: THREE.Vector3,
  leafEvery = 0.06,
  leafScale = 1,
) {
  const n = 6;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(
      new THREE.Vector3(
        top.x +
          dir.x * Math.sin(t * 1.4) * 0.25 +
          Math.sin(t * 7 + top.x * 3) * 0.03,
        top.y - t * length,
        top.z +
          dir.z * Math.sin(t * 1.4) * 0.25 +
          Math.cos(t * 6 + top.z * 3) * 0.03,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  B.add(
    new THREE.TubeGeometry(curve, 10, 0.0035, 3),
    stemMat,
    new THREE.Matrix4(),
  );
  const count = Math.max(2, Math.floor(length / leafEvery));
  for (let i = 1; i <= count; i++) {
    const p = curve.getPointAt(i / count);
    leafAt(
      leaves,
      rand,
      p,
      leafScale * (0.7 + rand() * 0.6) * (1 - (i / count) * 0.35),
      dir,
    );
  }
}

/** A leafy clump growing up from a planter (arching stems covered in leaves). */
function bush(
  B: Batch,
  stemMat: THREE.Material,
  leaves: Leaf[],
  rand: () => number,
  base: THREE.Vector3,
  size: number,
  stems: number,
) {
  for (let s = 0; s < stems; s++) {
    const a = rand() * Math.PI * 2;
    const reach = size * (0.4 + rand() * 0.6);
    const h = size * (0.5 + rand() * 0.7);
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const curve = new THREE.QuadraticBezierCurve3(
      base.clone(),
      base
        .clone()
        .add(new THREE.Vector3(out.x * reach * 0.2, h, out.z * reach * 0.2)),
      base
        .clone()
        .add(new THREE.Vector3(out.x * reach, h * 0.75, out.z * reach)),
    );
    B.add(
      new THREE.TubeGeometry(curve, 6, 0.004, 3),
      stemMat,
      new THREE.Matrix4(),
    );
    const k = 4 + Math.floor(rand() * 4);
    for (let i = 1; i <= k; i++)
      leafAt(
        leaves,
        rand,
        curve.getPointAt(0.3 + (0.7 * i) / k),
        1.6 + rand() * 1.2,
        out,
      );
  }
}

/* ---------------- the scene ---------------- */

const scene: SceneModule = {
  id: "alpendre",
  title: "Alpendre",
  build(ctx) {
    const low = ctx.quality === "low";
    const rand = seeded(2026);
    const root = new THREE.Group();
    ctx.scene.add(root);
    const B = new Batch();
    const leaves: Leaf[] = [];

    /* ---------- materials ---------- */
    const floorMaps = stoneFloor();
    const floorMat = new THREE.MeshStandardMaterial({
      ...floorMaps,
      roughness: 1,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      color: "#121215",
      roughness: 0.75,
      metalness: 0.3,
      normalMap: ceilingMaps(),
    });
    ceilMat.normalMap?.repeat.set(4, 1);
    const steel = new THREE.MeshStandardMaterial({
      color: "#16161a",
      roughness: 0.55,
      metalness: 0.55,
    });
    const blackPaint = new THREE.MeshStandardMaterial({
      color: "#0d0d0f",
      roughness: 0.45,
      metalness: 0.3,
    });
    const plasterN = repeat(plaster("#d8d0c4", 41), 5, 2).normalMap;
    const muralMat = (w: number, h: number, seed: number) =>
      new THREE.MeshStandardMaterial({
        map: muralTex(w, h, seed),
        normalMap: plasterN,
        normalScale: new THREE.Vector2(0.4, 0.4),
        roughness: 0.88,
      });
    const darkBrick = pbr(repeat(bricks("#4b4541", "#2c2927", 8, 31), 1, 1));
    const whiteBrick = pbr(repeat(bricks("#e6e1d8", "#bdb6aa", 8, 37), 1, 1));
    const barWood = pbr(woodPlanks("#3b2719", 5, 43), { roughness: 0.8 });
    const topWood = pbr(woodPlanks("#6e4526", 4, 47), { roughness: 0.55 });
    const tableWood = pbr(woodPlanks("#8a5631", 3, 53), { roughness: 0.5 });
    const doorWood = pbr(woodPlanks("#c78840", 6, 59), { roughness: 0.6 });
    const stageWood = pbr(woodPlanks("#5d4330", 8, 67), { roughness: 0.7 });
    const chrome = metal("#c9ccd1", 0.22);
    const alu = metal("#a8abb0", 0.35);
    const soil = new THREE.MeshStandardMaterial({
      color: "#2a1d14",
      roughness: 1,
    });
    const stemMat = new THREE.MeshStandardMaterial({
      color: "#4f7a2a",
      roughness: 0.8,
    });
    const rope = new THREE.MeshStandardMaterial({
      color: "#a98b62",
      roughness: 1,
    });
    const potMat = new THREE.MeshStandardMaterial({
      color: "#151515",
      roughness: 0.6,
    });
    const whitePlastic = new THREE.MeshStandardMaterial({
      color: "#e9e7e2",
      roughness: 0.45,
    });
    const redPaint = new THREE.MeshStandardMaterial({
      color: "#c4161c",
      roughness: 0.35,
      metalness: 0.2,
    });
    const greenBucket = new THREE.MeshStandardMaterial({
      color: "#1e6b30",
      roughness: 0.35,
      metalness: 0.2,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: "#0b0b0b",
      roughness: 0.5,
    });
    const redCable = new THREE.MeshStandardMaterial({
      color: "#8e1c22",
      roughness: 0.5,
    });
    const caseMat = new THREE.MeshStandardMaterial({
      color: "#1a1a1c",
      roughness: 0.7,
    });
    const warmBulb = emissive("#ffc477", 5);
    const ledWhite = emissive("#fff4e6", 3.2);
    const fairy = emissive("#ffb85c", 6);
    for (const m of [warmBulb, ledWhite, fairy]) m.userData.noCast = true;
    stemMat.userData.noCast = true;
    rope.userData.noCast = true;

    /* ---------- shell: floor, ceiling, walls ---------- */
    const W = X1 - X0;
    const L = Z1 - Z0;
    B.add(
      new THREE.PlaneGeometry(W, L),
      floorMat,
      M(0, 0, (Z0 + Z1) / 2, 0, -Math.PI / 2),
      1.2,
    );
    B.add(
      new THREE.PlaneGeometry(W, L),
      ceilMat,
      M(0, H, (Z0 + Z1) / 2, 0, Math.PI / 2),
      3,
    );

    // back wall (behind the stage and the bar): one big mural
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      muralMat(W, H, 3),
    );
    back.position.set(0, H / 2, Z0);
    back.receiveShadow = true;
    root.add(back);
    // left wall: mural over the white-brick planter
    const left = new THREE.Mesh(
      new THREE.PlaneGeometry(L, H),
      muralMat(L, H, 11),
    );
    left.position.set(X0, H / 2, (Z0 + Z1) / 2);
    left.rotation.y = Math.PI / 2;
    left.receiveShadow = true;
    root.add(left);
    // right wall: mural up to the terrace opening, then the open terrace
    const TER0 = -4.6;
    const rightLen = TER0 - Z0;
    const right = new THREE.Mesh(
      new THREE.PlaneGeometry(rightLen, H),
      muralMat(rightLen, H, 19),
    );
    right.position.set(X1, H / 2, (Z0 + TER0) / 2);
    right.rotation.y = -Math.PI / 2;
    right.receiveShadow = true;
    root.add(right);
    // front wall: dark brick, with the entrance
    const fw = (a: number, b: number, y0: number, y1: number) =>
      B.add(
        new THREE.BoxGeometry(b - a, y1 - y0, 0.2),
        darkBrick,
        M((a + b) / 2, (y0 + y1) / 2, Z1 + 0.1),
        1.0,
      );
    fw(X0, DOOR_X - 0.55, 0, H);
    fw(DOOR_X + 0.55, X1, 0, H);
    fw(DOOR_X - 0.55, DOOR_X + 0.55, 2.2, H);
    // entrance: black steel frame, glass door, the night outside
    for (const s of [-1, 1])
      B.add(
        unitBox,
        blackPaint,
        M(DOOR_X + s * 0.53, 1.1, Z1 + 0.02, 0, 0, 0, 0.05, 2.2, 0.12),
      );
    B.add(
      unitBox,
      blackPaint,
      M(DOOR_X, 2.18, Z1 + 0.02, 0, 0, 0, 1.1, 0.05, 0.12),
    );
    const outside = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 2.2),
      new THREE.MeshBasicMaterial({ color: "#0b0d16" }),
    );
    outside.position.set(DOOR_X, 1.1, Z1 + 0.19);
    outside.rotation.y = Math.PI;
    root.add(outside);
    const doorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 2.12),
      new THREE.MeshStandardMaterial({
        color: "#20262c",
        roughness: 0.05,
        metalness: 0.6,
        transparent: true,
        opacity: 0.35,
      }),
    );
    doorGlass.position.set(DOOR_X, 1.1, Z1 + 0.05);
    doorGlass.rotation.y = Math.PI;
    root.add(doorGlass);
    B.add(
      unitBox,
      chrome,
      M(DOOR_X + 0.35, 1.05, Z1 + 0.0, 0, 0, 0, 0.025, 0.6, 0.025),
    );

    // baseboard (dark) along the painted walls
    B.add(unitBox, blackPaint, M(0, 0.05, Z0 + 0.01, 0, 0, 0, W, 0.1, 0.02));
    B.add(
      unitBox,
      blackPaint,
      M(X0 + 0.01, 0.05, (Z0 + Z1) / 2, 0, 0, 0, 0.02, 0.1, L),
    );

    /* ---------- exposed ceiling structure ---------- */
    for (const z of [-8, -4, 0, 4])
      B.add(unitBox, steel, M(0, BEAM + 0.2, z, 0, 0, 0, W, 0.4, 0.16));
    for (let x = X0 + 0.4; x < X1; x += 0.8)
      B.add(
        unitBox,
        steel,
        M(x, H - 0.1, (Z0 + Z1) / 2, 0, 0, 0, 0.06, 0.18, L),
      );
    // grey electrical conduit and a couple of small black spots on the beams
    B.add(
      lowCyl,
      alu,
      M(-2.6, BEAM + 0.05, (Z0 + Z1) / 2, 0, Math.PI / 2, 0, 0.012, L, 0.012),
    );
    const spotGeo = mergedLocal([
      [lowCyl, M(0, -0.06, 0, 0, 0, 0, 0.04, 0.12, 0.04)],
      [unitBox, M(0, 0, 0, 0, 0, 0, 0.05, 0.02, 0.05)],
    ]);
    for (const [x, z] of [
      [-5, -4],
      [-2, -4],
      [3.5, -4],
      [-5, 0],
      [2, 0],
      [5, 4],
      [-3, 4],
    ] as const)
      B.add(spotGeo, blackPaint, M(x, BEAM, z + 0.1));

    // white linear LED bars (seen above them in the selfies)
    for (const [x, z, len] of [
      [-4.2, -2, 3.2],
      [-4.2, 1.2, 3.2],
      [3.6, 2.6, 3.0],
      [3.6, -1.4, 3.0],
    ] as const) {
      B.add(
        unitBox,
        blackPaint,
        M(x, BEAM - 0.02, z, 0, 0, 0, len + 0.04, 0.03, 0.06),
      );
      B.add(
        unitBox,
        ledWhite,
        M(x, BEAM - 0.04, z, 0, 0, 0, len, 0.012, 0.035),
      );
    }

    // festoon strings of warm bulbs across the hall
    const bulbs: THREE.Matrix4[] = [];
    const strings = low ? [-2.4, 1.8] : [-3.2, -0.6, 1.8, 4.4];
    for (const z of strings) {
      const a = new THREE.Vector3(X0 + 0.3, BEAM - 0.05, z);
      const b = new THREE.Vector3(X1 - 0.3, BEAM - 0.05, z + 0.4);
      const pts: THREE.Vector3[] = [];
      const segs = 3;
      for (let s = 0; s <= segs * 8; s++) {
        const t = s / (segs * 8);
        const local = (t * segs) % 1;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(local * Math.PI) * 0.35;
        pts.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      B.add(
        new THREE.TubeGeometry(curve, 96, 0.004, 3),
        cableMat,
        new THREE.Matrix4(),
      );
      const n = Math.floor(curve.getLength() / 0.6);
      for (let i = 1; i < n; i++) {
        const p = curve.getPointAt(i / n);
        bulbs.push(M(p.x, p.y - 0.07, p.z, 0, 0, 0, 1));
      }
    }
    {
      const bulbGeo = mergedLocal([
        [
          new THREE.SphereGeometry(0.03, 10, 8),
          M(0, 0, 0, 0, 0, 0, 1, 1.25, 1),
        ],
      ]);
      const socketGeo = mergedLocal([
        [lowCyl, M(0, 0.045, 0, 0, 0, 0, 0.014, 0.05, 0.014)],
      ]);
      const bi = new THREE.InstancedMesh(bulbGeo, warmBulb, bulbs.length);
      const si = new THREE.InstancedMesh(socketGeo, cableMat, bulbs.length);
      bulbs.forEach((m, i) => {
        bi.setMatrixAt(i, m);
        si.setMatrixAt(i, m);
      });
      root.add(bi, si);
    }

    /* ---------- the bar (back left) ---------- */
    const BAR = { x0: -6.85, x1: -2.6, z0: -8.6, z1: -7.95, h: 1.08 };
    const barW = BAR.x1 - BAR.x0;
    const barCx = (BAR.x0 + BAR.x1) / 2;
    B.add(
      unitBox,
      barWood,
      M(
        barCx,
        BAR.h / 2 - 0.02,
        (BAR.z0 + BAR.z1) / 2,
        0,
        0,
        0,
        barW,
        BAR.h - 0.04,
        BAR.z1 - BAR.z0,
      ),
      0.9,
    );
    B.add(
      rbox(barW + 0.08, 0.05, 0.78, 0.015),
      topWood,
      M(barCx, BAR.h, (BAR.z0 + BAR.z1) / 2 + 0.04),
      1.5,
    );
    B.add(
      unitBox,
      blackPaint,
      M(barCx, 0.06, BAR.z1 + 0.01, 0, 0, 0, barW, 0.12, 0.03),
    );
    // foot rail
    B.add(
      unitCyl,
      chrome,
      M(barCx, 0.22, BAR.z1 + 0.12, 0, 0, Math.PI / 2, 0.02, barW - 0.2, 0.02),
    );
    // back bar: low cabinet, two shelves, bottles
    B.add(
      unitBox,
      barWood,
      M(barCx, 0.45, Z0 + 0.28, 0, 0, 0, barW, 0.9, 0.55),
      0.9,
    );
    B.add(
      unitBox,
      topWood,
      M(barCx, 0.92, Z0 + 0.28, 0, 0, 0, barW + 0.02, 0.04, 0.58),
      1.5,
    );
    for (const y of [1.45, 1.9])
      B.add(
        unitBox,
        topWood,
        M(barCx, y, Z0 + 0.15, 0, 0, 0, barW - 0.4, 0.04, 0.28),
        1.5,
      );
    const bottleGeo = lathe(
      [
        [0, 0],
        [0.034, 0],
        [0.035, 0.006],
        [0.035, 0.19],
        [0.03, 0.22],
        [0.014, 0.25],
        [0.013, 0.31],
        [0.016, 0.315],
        [0.0, 0.318],
      ],
      14,
    );
    const bottleMat = new THREE.MeshStandardMaterial({
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const BOTTLES = [
      "#3f6b2a",
      "#7a4a12",
      "#d8d2c0",
      "#2b2116",
      "#9b2f1d",
      "#b8c9b0",
      "#5a3a10",
    ];
    const bottles: Leaf[] = [];
    for (const y of [0.94, 1.47, 1.92])
      for (let x = BAR.x0 + 0.3; x < BAR.x1 - 0.25; x += 0.11 + rand() * 0.06)
        bottles.push({
          m: M(
            x,
            y,
            Z0 + 0.15 + (rand() - 0.5) * 0.08,
            rand() * 6,
            0,
            0,
            1,
            0.85 + rand() * 0.35,
            1,
          ),
          c: new THREE.Color(
            BOTTLES[Math.floor(rand() * BOTTLES.length)] ?? "#3f6b2a",
          ),
        });
    // a few on the counter, and on the tables later
    for (const x of [-6.2, -5.1, -3.3])
      bottles.push({
        m: M(x, BAR.h + 0.025, -8.3),
        c: new THREE.Color("#3f6b2a"),
      });

    // stools with wooden seats and black legs
    const stoolWood = mergedLocal([
      [unitCyl, M(0, 0.75, 0, 0, 0, 0, 0.17, 0.04, 0.17)],
    ]);
    const stoolMetalParts: [THREE.BufferGeometry, THREE.Matrix4][] = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      stoolMetalParts.push([
        lowCyl,
        between(
          new THREE.Vector3(Math.cos(a) * 0.12, 0.73, Math.sin(a) * 0.12),
          new THREE.Vector3(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2),
          0.012,
        ),
      ]);
    }
    stoolMetalParts.push([
      new THREE.TorusGeometry(0.165, 0.009, 4, 20),
      M(0, 0.28, 0, 0, Math.PI / 2),
    ]);
    const stoolMetal = mergedLocal(stoolMetalParts);
    const stools: THREE.Matrix4[] = [];
    for (let x = BAR.x0 + 0.5; x < BAR.x1 - 0.2; x += 0.75)
      stools.push(M(x, 0, BAR.z1 + 0.42, rand()));

    // the vine curtain with fairy lights hanging over the bar front
    B.add(unitBox, topWood, M(barCx, 2.7, -8.25, 0, 0, 0, barW, 0.08, 0.12));
    for (const x of [BAR.x0 + 0.2, BAR.x1 - 0.2])
      B.add(
        unitBox,
        steel,
        M(x, (2.7 + BEAM) / 2, -8.25, 0, 0, 0, 0.03, BEAM - 2.7, 0.03),
      );
    const fairyPts: THREE.Matrix4[] = [];
    for (let x = BAR.x0 + 0.1; x < BAR.x1 - 0.05; x += low ? 0.24 : 0.16) {
      const len = 0.35 + rand() * 0.6;
      vine(
        B,
        stemMat,
        leaves,
        rand,
        new THREE.Vector3(x, 2.66, -8.25 + (rand() - 0.5) * 0.08),
        len,
        new THREE.Vector3(0, 0, 1),
        0.07,
        0.9,
      );
      for (let k = 0; k < 3; k++)
        fairyPts.push(
          M(
            x + (rand() - 0.5) * 0.08,
            2.66 - rand() * len,
            -8.2 + rand() * 0.08,
          ),
        );
    }
    {
      const fi = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.008, 6, 4),
        fairy,
        fairyPts.length,
      );
      fairyPts.forEach((m, i) => fi.setMatrixAt(i, m));
      root.add(fi);
    }

    // wicker pendant lamps in front of the bar
    const wicker = new THREE.MeshStandardMaterial({
      color: "#c79a60",
      map: weaveTex(),
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    wicker.map?.repeat.set(6, 2);
    for (const x of [-6.0, -4.7, -3.4]) {
      const y = 2.35;
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.3, 0.32, 24, 1, true),
        wicker,
      );
      shade.position.set(x, y, -7.6);
      shade.castShadow = false;
      root.add(shade);
      B.add(
        new THREE.SphereGeometry(0.05, 12, 8),
        warmBulb,
        M(x, y - 0.04, -7.6),
      );
      B.add(
        lowCyl,
        cableMat,
        M(
          x,
          (y + BEAM) / 2 + 0.08,
          -7.6,
          0,
          0,
          0,
          0.004,
          BEAM - y - 0.16,
          0.004,
        ),
      );
    }

    /* ---------- the wall behind the stage ---------- */
    // wooden WC door, its frame and the plate above it
    const DX = 1.65;
    B.add(
      unitBox,
      doorWood,
      M(DX, 1.05, Z0 + 0.03, 0, 0, 0, 0.9, 2.1, 0.04),
      0.9,
    );
    for (const s of [-1, 1])
      B.add(
        unitBox,
        doorWood,
        M(DX + s * 0.49, 1.1, Z0 + 0.04, 0, 0, 0, 0.08, 2.2, 0.06),
        0.9,
      );
    B.add(
      unitBox,
      doorWood,
      M(DX, 2.2, Z0 + 0.04, 0, 0, 0, 1.06, 0.08, 0.06),
      0.9,
    );
    B.add(
      unitCyl,
      chrome,
      M(DX - 0.33, 1.02, Z0 + 0.08, 0, 0, Math.PI / 2, 0.01, 0.12, 0.01),
    );
    const wc = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.22),
      new THREE.MeshStandardMaterial({ map: wcTex(), roughness: 0.5 }),
    );
    wc.position.set(DX - 0.65, 2.45, Z0 + 0.012);
    root.add(wc);
    // TV on an articulated arm, angled toward the room
    const tvMat = new THREE.MeshStandardMaterial({
      color: "#000",
      emissive: "#ffffff",
      emissiveMap: tvTex(),
      emissiveIntensity: 1.3,
      roughness: 0.25,
    });
    const addTv = (
      x: number,
      y: number,
      z: number,
      yaw: number,
      pitch: number,
      arm: number,
    ) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.set(pitch, yaw, 0, "YXZ");
      const body = new THREE.Mesh(rbox(1.12, 0.66, 0.05, 0.01), blackPaint);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.61), tvMat);
      scr.position.z = 0.026;
      g.add(body, scr);
      root.add(g);
      if (arm > 0) {
        const back = new THREE.Vector3(0, 0, -0.04)
          .applyEuler(g.rotation)
          .add(g.position);
        B.add(
          lowCyl,
          steel,
          between(back, new THREE.Vector3(x, y, z - arm), 0.025),
        );
        B.add(unitBox, steel, M(x, y, z - arm, 0, 0, 0, 0.16, 0.22, 0.02));
      }
    };
    addTv(DX + 0.9, 2.8, Z0 + 0.45, -0.45, 0.12, 0.43);
    addTv(X0 + 0.06, 2.75, -1.5, Math.PI / 2, 0.08, 0);
    addTv(1.6, 2.75, Z1 - 0.06, Math.PI, 0.08, 0);
    // small white wall speaker
    B.add(
      rbox(0.16, 0.24, 0.15, 0.02),
      whitePlastic,
      M(0.25, 2.9, Z0 + 0.1, -0.2, 0.15),
    );
    B.add(unitBox, steel, M(0.25, 2.9, Z0 + 0.03, 0, 0, 0, 0.05, 0.08, 0.06));
    // fire extinguisher and its red sign
    {
      const ex = lathe(
        [
          [0, 0],
          [0.075, 0],
          [0.078, 0.02],
          [0.078, 0.5],
          [0.06, 0.56],
          [0.02, 0.58],
          [0, 0.58],
        ],
        16,
      );
      B.add(ex, redPaint, M(2.62, 0.62, Z0 + 0.12));
      B.add(
        unitBox,
        blackPaint,
        M(2.62, 1.24, Z0 + 0.1, 0, 0, 0, 0.1, 0.06, 0.06),
      );
      B.add(
        new THREE.TorusGeometry(0.1, 0.008, 4, 12, Math.PI * 1.2),
        cableMat,
        M(2.7, 1.05, Z0 + 0.16, 0, 0, -0.6),
      );
      B.add(
        unitBox,
        redPaint,
        M(2.62, 1.62, Z0 + 0.01, 0, 0, 0, 0.22, 0.3, 0.005),
      );
    }

    /* ---------- black pipe railing and the staff corner behind it ---------- */
    const RX = 2.95;
    const RZ = -5.15;
    const railRuns: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(RX, 0, Z0 + 0.05), new THREE.Vector3(RX, 0, RZ)],
      [new THREE.Vector3(RX, 0, RZ), new THREE.Vector3(X1 - 0.05, 0, RZ)],
    ];
    for (const [a, b] of railRuns) {
      const len = a.distanceTo(b);
      const posts = Math.ceil(len / 1.2);
      for (let i = 0; i <= posts; i++) {
        const p = a.clone().lerp(b, i / posts);
        B.add(
          lowCyl,
          blackPaint,
          M(p.x, 0.52, p.z, 0, 0, 0, 0.022, 1.04, 0.022),
        );
      }
      for (const y of [0.35, 0.68, 1.02])
        B.add(
          lowCyl,
          blackPaint,
          between(a.clone().setY(y), b.clone().setY(y), 0.02),
        );
    }
    // counter with green beer buckets and two menu sheets
    B.add(
      unitBox,
      topWood,
      M((RX + X1) / 2 + 0.2, 0.5, Z0 + 0.35, 0, 0, 0, X1 - RX - 0.4, 1.0, 0.6),
      1.2,
    );
    const bucket = lathe(
      [
        [0, 0],
        [0.1, 0],
        [0.12, 0.24],
        [0.125, 0.25],
        [0.11, 0.25],
        [0.09, 0.01],
        [0, 0.01],
      ],
      20,
    );
    for (let i = 0; i < 7; i++)
      B.add(
        bucket,
        greenBucket,
        M(3.45 + i * 0.27, 1.0, Z0 + 0.3 + (i % 2) * 0.12),
      );
    const paper = new THREE.MeshStandardMaterial({
      color: "#efece4",
      roughness: 0.9,
    });
    B.add(
      unitBox,
      paper,
      M(5.55, 1.18, Z0 + 0.58, 0, -0.25, 0, 0.22, 0.32, 0.004),
    );
    B.add(
      unitBox,
      paper,
      M(5.85, 1.18, Z0 + 0.58, 0, -0.25, 0, 0.22, 0.32, 0.004),
    );

    /* ---------- the stage ---------- */
    const sw = STAGE.x1 - STAGE.x0;
    const sd = STAGE.z1 - STAGE.z0;
    const scx = (STAGE.x0 + STAGE.x1) / 2;
    const scz = (STAGE.z0 + STAGE.z1) / 2;
    B.add(
      unitBox,
      blackPaint,
      M(scx, SH / 2 - 0.01, scz, 0, 0, 0, sw, SH - 0.02, sd),
    );
    B.add(
      unitBox,
      stageWood,
      M(scx, SH - 0.01, scz, 0, 0, 0, sw + 0.02, 0.02, sd + 0.02),
      1.0,
    );
    // a black carpet square where she stands
    B.add(
      unitBox,
      new THREE.MeshStandardMaterial({ color: "#1d1b1e", roughness: 1 }),
      M(SINGER.x, SH + 0.003, SINGER.z + 0.2, 0, 0, 0, 1.4, 0.006, 1.2),
    );

    // mic stands
    const micGeo = {
      handle: lathe(
        [
          [0, 0],
          [0.012, 0],
          [0.019, 0.13],
          [0.021, 0.16],
          [0, 0.16],
        ],
        14,
      ),
      grille: new THREE.SphereGeometry(0.026, 14, 10),
    };
    const micStand = (
      x: number,
      z: number,
      top: THREE.Vector3,
      head: THREE.Vector3,
    ) => {
      const y0 = SH;
      // tripod base
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.4;
        B.add(
          lowCyl,
          blackPaint,
          between(
            new THREE.Vector3(x, y0 + 0.2, z),
            new THREE.Vector3(
              x + Math.cos(a) * 0.3,
              y0 + 0.01,
              z + Math.sin(a) * 0.3,
            ),
            0.009,
          ),
        );
      }
      B.add(lowCyl, blackPaint, M(x, y0 + 0.1, z, 0, 0, 0, 0.018, 0.2, 0.018));
      B.add(
        lowCyl,
        blackPaint,
        between(new THREE.Vector3(x, y0 + 0.2, z), top, 0.011),
      );
      B.add(
        lowCyl,
        blackPaint,
        M(top.x, top.y - 0.25, top.z, 0, 0, 0, 0.02, 0.05, 0.02),
      ); // clutch
      // boom to the clip, then the mic toward the head point
      const dir = head.clone().sub(top).normalize();
      const clip = head.clone().addScaledVector(dir, -0.2);
      B.add(lowCyl, blackPaint, between(top, clip, 0.008));
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
      B.add(
        micGeo.handle,
        blackPaint,
        new THREE.Matrix4().compose(clip, q, new THREE.Vector3(1, 1, 1)),
      );
      B.add(micGeo.grille, chrome, M(head.x, head.y, head.z));
    };
    micStand(
      SINGER.x,
      SINGER.z + 0.62,
      new THREE.Vector3(SINGER.x, SH + 1.42, SINGER.z + 0.62),
      new THREE.Vector3(SINGER.x, SH + 1.56, SINGER.z + 0.27),
    );
    micStand(
      -0.45,
      -5.55,
      new THREE.Vector3(-0.45, SH + 1.35, -5.55),
      new THREE.Vector3(-0.38, SH + 1.52, -5.7),
    );
    // cables across the stage to the sound desk (one black, one red)
    const DESK = { x: -1.85, z: -4.05 };
    for (const [mat, dx] of [
      [cableMat, 0],
      [redCable, 0.06],
    ] as const) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(SINGER.x + dx, SH + 0.012, SINGER.z + 0.62),
        new THREE.Vector3(0.0 + dx, SH + 0.012, -5.0),
        new THREE.Vector3(-0.6, SH + 0.012, STAGE.z1 - 0.05),
        new THREE.Vector3(-1.05, 0.012, -4.6),
        new THREE.Vector3(DESK.x + 0.3, 0.012, DESK.z - 0.2 + dx),
      ]);
      B.add(new THREE.TubeGeometry(c, 40, 0.006, 4), mat, new THREE.Matrix4());
    }

    // lighting truss with PAR cans over the stage front
    const TY = 3.62;
    const TZ = STAGE.z1 - 0.05;
    B.add(unitBox, blackPaint, M(scx, TY, TZ, 0, 0, 0, sw + 0.8, 0.05, 0.05));
    B.add(
      unitBox,
      blackPaint,
      M(scx, TY + 0.16, TZ, 0, 0, 0, sw + 0.8, 0.03, 0.03),
    );
    for (let x = STAGE.x0 - 0.3; x <= STAGE.x1 + 0.35; x += 0.4)
      B.add(
        lowCyl,
        blackPaint,
        between(
          new THREE.Vector3(x, TY, TZ),
          new THREE.Vector3(x + 0.2, TY + 0.16, TZ),
          0.008,
        ),
      );
    for (const x of [STAGE.x0, STAGE.x1])
      B.add(
        lowCyl,
        steel,
        M(x, (TY + BEAM + 0.1) / 2, TZ, 0, 0, 0, 0.01, BEAM + 0.1 - TY, 0.01),
      );
    const aim = new THREE.Vector3(SINGER.x, SH + 1.1, SINGER.z);
    const cans: { x: number; color: string }[] = [
      { x: -0.75, color: "#4a8dff" },
      { x: -0.05, color: "#ff4fa8" },
      { x: 0.6, color: "#ffe2b8" },
      { x: 1.3, color: "#ffb04a" },
      { x: 2.0, color: "#ff4fa8" },
    ];
    const canBody = lathe(
      [
        [0, 0],
        [0.07, 0],
        [0.09, 0.05],
        [0.095, 0.24],
        [0.1, 0.25],
        [0, 0.25],
      ],
      16,
    );
    for (const can of cans) {
      const p = new THREE.Vector3(can.x, TY - 0.17, TZ);
      const d = aim.clone().sub(p).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
      B.add(
        canBody,
        blackPaint,
        new THREE.Matrix4().compose(
          p.clone().addScaledVector(d, -0.12),
          q,
          new THREE.Vector3(1, 1, 1),
        ),
      );
      B.add(
        new THREE.TorusGeometry(0.11, 0.008, 4, 12, Math.PI),
        blackPaint,
        new THREE.Matrix4().compose(
          p,
          q
            .clone()
            .multiply(
              new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1, 0, 0),
                Math.PI / 2,
              ),
            ),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      B.add(
        lowCyl,
        blackPaint,
        M(can.x, TY - 0.06, TZ, 0, 0, 0, 0.012, 0.12, 0.012),
      );
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.088, 20),
        emissive(can.color, 7),
      );
      lens.position.copy(p).addScaledVector(d, 0.131);
      lens.lookAt(lens.position.clone().add(d));
      root.add(lens);
      // a faint beam in the hazy air
      const len = p.distanceTo(aim) + 0.6;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.55, len, 20, 1, true),
        new THREE.MeshBasicMaterial({
          color: can.color,
          transparent: true,
          opacity: low ? 0.035 : 0.05,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      beam.position.copy(p).addScaledVector(d, len / 2 + 0.13);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
      root.add(beam);
    }

    /* ---------- the sound desk: road case, cable coil, laptop, cup ---------- */
    {
      const g = new THREE.Group();
      g.position.set(DESK.x, 0, DESK.z);
      g.rotation.y = -0.35;
      root.add(g);
      const local = new Batch();
      local.add(rbox(1.0, 1.0, 0.62, 0.012), caseMat, M(0, 0.5, 0));
      // aluminium edge extrusions and steel corners
      for (const y of [0.02, 0.985]) {
        local.add(unitBox, alu, M(0, y, 0.31, 0, 0, 0, 1.0, 0.025, 0.012));
        local.add(unitBox, alu, M(0, y, -0.31, 0, 0, 0, 1.0, 0.025, 0.012));
        local.add(unitBox, alu, M(0.5, y, 0, 0, 0, 0, 0.012, 0.025, 0.62));
        local.add(unitBox, alu, M(-0.5, y, 0, 0, 0, 0, 0.012, 0.025, 0.62));
      }
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          local.add(
            unitBox,
            alu,
            M(sx * 0.5, 0.5, sz * 0.31, 0, 0, 0, 0.02, 1.0, 0.02),
          );
          local.add(
            unitBox,
            chrome,
            M(sx * 0.49, 0.97, sz * 0.3, 0, 0, 0, 0.05, 0.05, 0.05),
          );
        }
      // butterfly latches and handles
      for (const sx of [-0.3, 0.3])
        local.add(
          unitBox,
          chrome,
          M(sx, 0.9, 0.318, 0, 0, 0, 0.07, 0.06, 0.012),
        );
      local.add(unitBox, chrome, M(0.508, 0.6, 0, 0, 0, 0, 0.012, 0.05, 0.16));
      // cable coil (black, with a white label)
      for (let k = 0; k < 4; k++)
        local.add(
          new THREE.TorusGeometry(0.15 - k * 0.006, 0.012, 6, 28),
          cableMat,
          M(-0.22, 1.015 + k * 0.018, -0.03, 0, Math.PI / 2),
        );
      local.add(
        unitBox,
        whitePlastic,
        M(-0.08, 1.06, -0.03, 0, 0, 0, 0.04, 0.03, 0.02),
      );
      // laptop
      local.add(
        rbox(0.33, 0.016, 0.23, 0.006),
        alu,
        M(0.27, 1.008, 0.04, 0.15),
      );
      const lid = new THREE.Group();
      lid.position.set(
        0.27 - 0.115 * Math.sin(0.15),
        1.016,
        0.04 - 0.115 * Math.cos(0.15),
      );
      lid.rotation.set(-0.3, 0.15, 0, "YXZ");
      const shell = new THREE.Mesh(rbox(0.33, 0.22, 0.008, 0.004), alu);
      shell.position.y = 0.11;
      const scr = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.19),
        emissive("#cfe2ff", 1.6),
      );
      scr.position.set(0, 0.11, 0.0045);
      lid.add(shell, scr);
      g.add(lid);
      // plastic cup with water
      const cup = lathe(
        [
          [0, 0],
          [0.03, 0],
          [0.042, 0.11],
          [0.044, 0.112],
          [0.041, 0.112],
          [0.028, 0.004],
          [0, 0.004],
        ],
        16,
      );
      local.add(
        cup,
        new THREE.MeshStandardMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.3,
          roughness: 0.1,
        }),
        M(0.45, 1.0, 0.2),
      );
      local.flush(g);
    }
    ctx.wall(DESK.x - 0.6, DESK.z - 0.5, DESK.x + 0.6, DESK.z + 0.5);

    /* ---------- hanging plants (black pots on ropes, pothos spilling down) ---------- */
    const potGeo = lathe(
      [
        [0, 0],
        [0.09, 0],
        [0.14, 0.1],
        [0.16, 0.2],
        [0.17, 0.21],
        [0.155, 0.21],
        [0, 0.19],
      ],
      18,
    );
    const hanging = (
      x: number,
      z: number,
      y: number,
      vines: number,
      len: number,
    ) => {
      B.add(potGeo, potMat, M(x, y, z));
      B.add(
        new THREE.CircleGeometry(0.15, 14),
        soil,
        M(x, y + 0.195, z, 0, -Math.PI / 2),
      );
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        B.add(
          lowCyl,
          rope,
          between(
            new THREE.Vector3(
              x + Math.cos(a) * 0.15,
              y + 0.15,
              z + Math.sin(a) * 0.15,
            ),
            new THREE.Vector3(x, y + 0.75, z),
            0.005,
          ),
        );
      }
      B.add(
        lowCyl,
        rope,
        M(x, (y + 0.75 + BEAM) / 2, z, 0, 0, 0, 0.007, BEAM - y - 0.75, 0.007),
      );
      // fringe of loose rope under the pot (the macramé tassel)
      for (let k = 0; k < 8; k++)
        B.add(
          lowCyl,
          rope,
          M(
            x + (rand() - 0.5) * 0.05,
            y - 0.15,
            z + (rand() - 0.5) * 0.05,
            0,
            (rand() - 0.5) * 0.2,
            (rand() - 0.5) * 0.2,
            0.005,
            0.3,
            0.005,
          ),
        );
      for (let k = 0; k < vines; k++) {
        const a = rand() * Math.PI * 2;
        const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        vine(
          B,
          stemMat,
          leaves,
          rand,
          new THREE.Vector3(x + d.x * 0.15, y + 0.2, z + d.z * 0.15),
          len * (0.5 + rand() * 0.7),
          d,
          0.07,
          1.4,
        );
      }
      // a crown of leaves on top
      for (let k = 0; k < 14; k++) {
        const a = rand() * Math.PI * 2;
        leafAt(
          leaves,
          rand,
          new THREE.Vector3(
            x + Math.cos(a) * 0.12,
            y + 0.24 + rand() * 0.1,
            z + Math.sin(a) * 0.12,
          ),
          1.6,
          new THREE.Vector3(Math.cos(a), 0, Math.sin(a)),
        );
      }
    };
    const hv = low ? 5 : 9;
    hanging(DESK.x + 0.2, DESK.z + 0.35, 2.45, hv, 1.0);
    hanging(-5.6, -2.6, 2.35, hv, 0.9);
    hanging(-5.6, 0.3, 2.35, hv, 0.9);
    hanging(-5.6, 3.2, 2.35, hv, 0.9);
    hanging(6.2, -1.2, 2.4, hv, 0.8);
    hanging(6.2, 2.4, 2.4, hv, 0.8);

    /* ---------- left white-brick planter with plants ---------- */
    const PL = { x0: X0, x1: X0 + 0.55, z0: -6.4, z1: 5.0, h: 0.85 };
    B.add(
      unitBox,
      whiteBrick,
      M(
        (PL.x0 + PL.x1) / 2,
        PL.h / 2,
        (PL.z0 + PL.z1) / 2,
        0,
        0,
        0,
        PL.x1 - PL.x0,
        PL.h,
        PL.z1 - PL.z0,
      ),
      0.6,
    );
    B.add(
      unitBox,
      soil,
      M(
        (PL.x0 + PL.x1) / 2,
        PL.h + 0.005,
        (PL.z0 + PL.z1) / 2,
        0,
        0,
        0,
        PL.x1 - PL.x0 - 0.08,
        0.01,
        PL.z1 - PL.z0 - 0.08,
      ),
    );
    for (let z = PL.z0 + 0.4; z < PL.z1 - 0.2; z += low ? 1.1 : 0.7) {
      if (Math.abs(z - 1.0) < 0.5) continue; // keep the photo visible
      bush(
        B,
        stemMat,
        leaves,
        rand,
        new THREE.Vector3(X0 + 0.28, PL.h, z),
        0.55,
        low ? 5 : 8,
      );
      for (let k = 0; k < (low ? 1 : 2); k++)
        vine(
          B,
          stemMat,
          leaves,
          rand,
          new THREE.Vector3(
            PL.x1 - 0.02,
            PL.h + 0.02,
            z + (rand() - 0.5) * 0.4,
          ),
          0.4 + rand() * 0.4,
          new THREE.Vector3(1, 0, 0),
          0.07,
          1.3,
        );
    }
    ctx.wall(PL.x0, PL.z0, PL.x1, PL.z1);

    /* ---------- the terrace on the right: parapet, planters, posts, the city ---------- */
    const TP = { z0: TER0, z1: Z1, h: 1.0 };
    B.add(
      unitBox,
      whiteBrick,
      M(
        X1 + 0.1,
        TP.h / 2,
        (TP.z0 + TP.z1) / 2,
        0,
        0,
        0,
        0.3,
        TP.h,
        TP.z1 - TP.z0,
      ),
      0.6,
    );
    B.add(
      unitBox,
      topWood,
      M(
        X1 + 0.1,
        TP.h + 0.02,
        (TP.z0 + TP.z1) / 2,
        0,
        0,
        0,
        0.36,
        0.04,
        TP.z1 - TP.z0,
      ),
      1.5,
    );
    B.add(
      unitBox,
      blackPaint,
      M(
        X1 + 0.1,
        H - 0.4,
        (TP.z0 + TP.z1) / 2,
        0,
        0,
        0,
        0.3,
        0.8,
        TP.z1 - TP.z0,
      ),
    );
    for (const z of [TP.z0 + 0.1, -1.0, 2.5, TP.z1 - 0.1])
      B.add(unitBox, steel, M(X1 + 0.05, H / 2, z, 0, 0, 0, 0.14, H, 0.14));
    // planter boxes along the parapet top, overflowing with plants
    for (let z = TP.z0 + 0.6; z < TP.z1 - 0.4; z += low ? 1.3 : 0.9) {
      B.add(
        unitBox,
        potMat,
        M(X1 - 0.22, TP.h + 0.13, z, 0, 0, 0, 0.3, 0.22, 0.6),
      );
      bush(
        B,
        stemMat,
        leaves,
        rand,
        new THREE.Vector3(X1 - 0.22, TP.h + 0.22, z),
        0.5,
        low ? 5 : 8,
      );
      vine(
        B,
        stemMat,
        leaves,
        rand,
        new THREE.Vector3(X1 - 0.38, TP.h + 0.22, z),
        0.5 + rand() * 0.4,
        new THREE.Vector3(-1, 0, 0),
        0.07,
        1.3,
      );
    }
    const city = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 75),
      new THREE.MeshBasicMaterial({ map: cityTex() }),
    );
    city.position.set(48, 0, 0);
    city.rotation.y = -Math.PI / 2;
    root.add(city);
    // the terrace floor outside the parapet, a little lower, so the view down isn't empty
    const outFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 40),
      new THREE.MeshStandardMaterial({ color: "#0e0e10", roughness: 0.9 }),
    );
    outFloor.rotation.x = -Math.PI / 2;
    outFloor.position.set(X1 + 3.2, -3, 0);
    root.add(outFloor);

    /* ---------- tables and chairs ---------- */
    const chairWood = mergedLocal([
      [rbox(0.42, 0.03, 0.42, 0.01), M(0, 0.45, 0)],
      [rbox(0.4, 0.075, 0.02, 0.008), M(0, 0.72, -0.205, 0, -0.08)],
      [rbox(0.4, 0.075, 0.02, 0.008), M(0, 0.85, -0.215, 0, -0.08)],
    ]);
    const chairMetalParts: [THREE.BufferGeometry, THREE.Matrix4][] = [];
    for (const sx of [-1, 1]) {
      chairMetalParts.push([
        unitBox,
        M(sx * 0.19, 0.22, 0.19, 0, 0, 0, 0.02, 0.44, 0.02),
      ]);
      chairMetalParts.push([
        unitBox,
        M(sx * 0.19, 0.46, -0.2, 0, -0.04, 0, 0.02, 0.92, 0.02),
      ]);
      chairMetalParts.push([
        unitBox,
        M(sx * 0.19, 0.15, 0, 0, 0, 0, 0.015, 0.015, 0.4),
      ]);
    }
    chairMetalParts.push([
      unitBox,
      M(0, 0.43, 0.19, 0, 0, 0, 0.4, 0.025, 0.02),
    ]);
    chairMetalParts.push([
      unitBox,
      M(0, 0.43, -0.19, 0, 0, 0, 0.4, 0.025, 0.02),
    ]);
    const chairMetal = mergedLocal(chairMetalParts);
    const tableWoodGeo = mergedLocal([
      [rbox(1.3, 0.04, 0.78, 0.01), M(0, TABLE_TOP - 0.02, 0)],
    ]);
    const tableMetalParts: [THREE.BufferGeometry, THREE.Matrix4][] = [];
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        tableMetalParts.push([
          unitBox,
          M(
            sx * 0.58,
            (TABLE_TOP - 0.04) / 2,
            sz * 0.32,
            0,
            0,
            0,
            0.04,
            TABLE_TOP - 0.04,
            0.04,
          ),
        ]);
    tableMetalParts.push([
      unitBox,
      M(0, TABLE_TOP - 0.07, 0.32, 0, 0, 0, 1.16, 0.05, 0.02),
    ]);
    tableMetalParts.push([
      unitBox,
      M(0, TABLE_TOP - 0.07, -0.32, 0, 0, 0, 1.16, 0.05, 0.02),
    ]);
    const tableMetal = mergedLocal(tableMetalParts);

    const TABLES: [number, number][] = [
      [-4.6, -2.9],
      [0.5, -2.9],
      [4.3, -2.9],
      [-4.6, 0.2],
      [-1.6, 0.2],
      [1.4, 0.2],
      [4.3, 0.2],
      [-1.9, 3.1],
      [1.1, 3.1],
      [4.1, 3.4],
    ];
    const FRONT = { x: 0.5, z: -2.9 };
    const DAVI = { x: FRONT.x - 0.33, z: FRONT.z + 0.63 };
    const tableMs: THREE.Matrix4[] = [];
    const chairMs: THREE.Matrix4[] = [];
    const glassMs: THREE.Matrix4[] = [];
    const drinks: Leaf[] = [];
    const napkins: THREE.Matrix4[] = [];
    for (const [tx, tz] of TABLES) {
      tableMs.push(M(tx, 0, tz));
      for (const sx of [-0.33, 0.33])
        for (const sz of [-1, 1]) {
          const skew = (rand() - 0.5) * 0.12;
          chairMs.push(
            M(
              tx + sx + skew * 0.3,
              0,
              tz + sz * (0.63 + Math.abs(skew) * 0.3),
              sz > 0 ? Math.PI + skew : skew,
            ),
          );
        }
      ctx.wall(tx - 0.68, tz - 0.88, tx + 0.68, tz + 0.88);
      const isFront = tx === FRONT.x && tz === FRONT.z;
      const n = isFront ? 2 : 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const gx = isFront ? tx - 0.33 + k * 0.62 : tx + (rand() - 0.5) * 0.9;
        const gz = isFront ? tz + 0.18 : tz + (rand() - 0.5) * 0.4;
        glassMs.push(M(gx, TABLE_TOP, gz));
        drinks.push({
          m: M(gx, TABLE_TOP + 0.006, gz, 0, 0, 0, 1, 0.5 + rand() * 0.4, 1),
          c: new THREE.Color(
            ["#d9901c", "#e8b33a", "#5a1d10", "#c6402a"][
              Math.floor(rand() * 4)
            ] ?? "#d9901c",
          ),
        });
        napkins.push(M(gx + 0.02, TABLE_TOP + 0.001, gz + 0.03, rand() * 0.6));
      }
      if (rand() < 0.6 || isFront)
        bottles.push({
          m: M(
            tx + (isFront ? -0.05 : (rand() - 0.5) * 0.6),
            TABLE_TOP,
            tz - 0.12,
          ),
          c: new THREE.Color(rand() < 0.5 ? "#3f6b2a" : "#7a4a12"),
        });
    }
    const inst = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      ms: THREE.Matrix4[],
      shadow = true,
    ) => {
      if (!ms.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = shadow;
      im.receiveShadow = true;
      root.add(im);
      return im;
    };
    const instColored = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      list: Leaf[],
      shadow = false,
    ) => {
      const im = inst(
        geo,
        mat,
        list.map((l) => l.m),
        shadow,
      );
      if (im) {
        list.forEach((l, i) => im.setColorAt(i, l.c));
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      }
    };
    const chairWoodMat = pbr(woodPlanks("#7a4a29", 2, 71), { roughness: 0.55 });
    inst(chairWood, chairWoodMat, chairMs);
    inst(chairMetal, blackPaint, chairMs);
    inst(tableWoodGeo, tableWood, tableMs);
    inst(tableMetal, blackPaint, tableMs);
    inst(stoolWood, chairWoodMat, stools);
    inst(stoolMetal, blackPaint, stools);
    const glassGeo = lathe(
      [
        [0, 0],
        [0.032, 0],
        [0.033, 0.004],
        [0.038, 0.14],
        [0.036, 0.14],
        [0.031, 0.008],
        [0, 0.008],
      ],
      16,
    );
    inst(
      glassGeo,
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.28,
        roughness: 0.05,
        metalness: 0.1,
        depthWrite: false,
      }),
      glassMs,
      false,
    );
    instColored(
      new THREE.CylinderGeometry(0.033, 0.03, 0.12, 14).translate(0, 0.06, 0),
      new THREE.MeshStandardMaterial({
        roughness: 0.15,
        transparent: true,
        opacity: 0.85,
      }),
      drinks,
    );
    inst(
      new THREE.PlaneGeometry(0.15, 0.15).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.95 }),
      napkins,
      false,
    );
    instColored(bottleGeo, bottleMat, bottles);
    instColored(
      leafGeometry(),
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.55,
      }),
      leaves,
    );

    B.flush(root);

    /* ---------- lights (8) ---------- */
    root.add(new THREE.HemisphereLight("#ffd7b0", "#2a1c26", 0.55));
    // key spot from the truss onto the singer (the only shadow caster)
    const key = new THREE.SpotLight("#ffd9b0", 140, 0, 0.42, 0.6, 2);
    key.position.set(0.6, TY - 0.2, TZ);
    key.target.position.copy(aim).setY(SH + 0.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 12;
    root.add(key, key.target);
    for (const [x, color, power] of [
      [2.0, "#ff3f9a", 70],
      [-0.75, "#3f8cff", 55],
    ] as const) {
      const s = new THREE.SpotLight(color, power, 0, 0.55, 0.7, 2);
      s.position.set(x, TY - 0.2, TZ);
      s.target.position.set(SINGER.x, SH + 0.5, SINGER.z - 0.6);
      root.add(s, s.target);
    }
    const point = (
      x: number,
      y: number,
      z: number,
      color: string,
      intensity: number,
      dist: number,
    ) => {
      const p = new THREE.PointLight(color, intensity, dist, 2);
      p.position.set(x, y, z);
      root.add(p);
    };
    point(-4.7, 2.2, -7.2, "#ffb46a", 22, 9); // bar pendants
    point(-2.6, 3.2, 0.2, "#ffc58a", 30, 13); // festoons, left
    point(3.2, 3.2, 0.8, "#ffc58a", 26, 13); // festoons, right
    point(6.1, 2.6, 1.0, "#ffd1a0", 10, 6); // terrace

    /* ---------- photo, people, pack, sound, spawn ---------- */
    ctx.photo(
      "alpendre-1.webp",
      0.5,
      0.66,
      new THREE.Vector3(X0 + 0.03, 1.95, 1.0),
      90,
    );

    const outfits: { davi: Outfit; elena: Outfit } = {
      davi: {
        top: "#5a3b2b",
        topStyle: "tshirt",
        bottom: "#2f3542",
        bottomStyle: "jeans",
        shoes: "#1c1c1c",
      },
      elena: {
        top: "#f6f1ea",
        topStyle: "dress",
        bottom: "#f6f1ea",
        shoes: "#e9e2d6",
      },
    };
    ctx.playerOutfit(outfits);
    if (ctx.player === "davi") {
      const elena = ctx.partner(
        SINGER.x,
        SINGER.z,
        0,
        "talk",
        outfits,
        "Essa música é pra você 🎤💗",
      );
      elena.position.y = SH;
      ctx.spawn(DOOR_X, Z1 - 1.2, -25);
    } else {
      ctx.partner(
        DAVI.x,
        DAVI.z,
        180,
        "sit",
        outfits,
        "Você canta demais! Tô todo bobo aqui 😍",
      );
      ctx.spawn(-2.85, -5.3, -135);
    }

    // background: the bartender and a couple at a table
    ctx.person(
      {
        skin: "#c98e6b",
        hair: "#1a120c",
        hairStyle: "short",
        height: 1.76,
        beard: true,
      },
      {
        top: "#151515",
        topStyle: "tshirt",
        bottom: "#1d1d22",
        bottomStyle: "pants",
        shoes: "#111",
      },
      -4.4,
      -9.1,
      0,
      "stand",
    );
    if (!low) {
      ctx.person(
        {
          skin: "#e0b08f",
          hair: "#3a2416",
          hairStyle: "long",
          height: 1.64,
          female: true,
        },
        {
          top: "#2c2c34",
          topStyle: "blouse",
          bottom: "#1f2633",
          bottomStyle: "jeans",
          shoes: "#222",
        },
        -1.93,
        0.83,
        180,
        "sit",
      );
      ctx.person(
        {
          skin: "#b97f5c",
          hair: "#140d09",
          hairStyle: "short",
          height: 1.78,
          beard: true,
        },
        {
          top: "#4d5a4a",
          topStyle: "tshirt",
          bottom: "#c9b79a",
          bottomStyle: "shorts",
          shoes: "#eee",
        },
        -1.27,
        -0.43,
        0,
        "sit",
      );
    }

    ctx.pack(FRONT.x + 0.3, TABLE_TOP, FRONT.z - 0.12, 20);
    ctx.ambient("amb-alpendre.m4a", 0.5);
    ctx.exit(DOOR_X, Z1 - 0.25, 0.6);

    /* ---------- collisions ---------- */
    ctx.wall(X0 - 0.5, Z0 - 0.5, X1 + 0.5, Z0); // back
    ctx.wall(X0 - 0.5, Z1, X1 + 0.5, Z1 + 0.5); // front
    ctx.wall(X0 - 0.5, Z0, X0, Z1); // left
    ctx.wall(X1 - 0.08, Z0, X1 + 0.5, Z1); // right + parapet
    ctx.wall(BAR.x0 - 0.2, Z0, BAR.x1 + 0.05, BAR.z1 + 0.65); // bar, back bar, stools
    ctx.wall(STAGE.x0, STAGE.z0, STAGE.x1, STAGE.z1); // stage
    ctx.wall(STAGE.x0, Z0, RX, STAGE.z0); // behind the stage (door, speaker)
    ctx.wall(RX - 0.05, Z0, X1, RZ + 0.05); // railing and the staff corner

    // the stage lights breathe a little with the song
    const lensMats = root.children
      .filter(
        (o): o is THREE.Mesh =>
          o instanceof THREE.Mesh && o.geometry instanceof THREE.CircleGeometry,
      )
      .map((o) => o.material as THREE.MeshStandardMaterial);
    ctx.onUpdate((t) => {
      lensMats.forEach(
        (m, i) => (m.emissiveIntensity = 6 + Math.sin(t * 1.3 + i * 1.7) * 1.5),
      );
      key.intensity = 135 + Math.sin(t * 0.9) * 8;
    });
  },
};

export default scene;
