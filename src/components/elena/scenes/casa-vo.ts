import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { WARDROBE } from "../fp/humans";
import {
  concrete,
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
 * Grandma's apartment (302), daytime, rebuilt from the walk-in video: one
 * long white room with polished beige tiles and crown molding, the dining
 * table by the entrance, the TV and the hallway on the left wall, the
 * recliners and beige sofas on the right wall, and the balcony full of
 * trees at the far end. The plan is detailed above `build`.
 */

const H = 2.7;
const T = 0.12;

/* ---------------- small helpers ---------------- */

type Mat = THREE.Material;

function std(
  color: THREE.ColorRepresentation,
  roughness = 0.6,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A transformed geometry, for merging. */
function geo(
  g: THREE.BufferGeometry,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(1, 1, 1),
  );
  const out = g.index ? g.toNonIndexed() : g.clone();
  out.applyMatrix4(m);
  out.deleteAttribute("uv1");
  return out;
}

function merged(parts: THREE.BufferGeometry[]) {
  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const m = mergeGeometries(nonIndexed, false);
  if (!m) throw new Error("merge failed");
  return m;
}

function rbox(w: number, h: number, d: number, r = 0.03, seg = 3) {
  return new RoundedBoxGeometry(
    w,
    h,
    d,
    seg,
    Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001),
  );
}

/* ---------------- procedural pictures ---------------- */

/** The view from the balcony: bright sky, a few buildings, lots of trees (slightly out of focus). */
function outsideView(seed: number, wide = true) {
  const rand = seeded(seed);
  return canvasTex(1024, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, "#cfe3f2");
    sky.addColorStop(1, "#f4f7f5");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // distant buildings
    if (wide) {
      for (let i = 0; i < 9; i++) {
        const bw = 40 + rand() * 80;
        const bh = 60 + rand() * 110;
        const bx = rand() * w;
        const by = h * 0.55 - bh;
        const tone = 220 + Math.floor(rand() * 30);
        g.fillStyle = `rgb(${tone},${tone - 6},${tone - 14})`;
        g.fillRect(bx, by, bw, bh + 200);
        g.fillStyle = "rgba(90,100,110,0.35)";
        for (let wy = by + 7; wy < by + bh; wy += 13)
          for (let wx = bx + 5; wx < bx + bw - 7; wx += 11)
            g.fillRect(wx, wy, 5, 6);
      }
    }
    // tree canopies: layered blobs, darker at the bottom
    const greens = [
      "#3f7a2e",
      "#5a9a3a",
      "#76b04a",
      "#2f5f25",
      "#8cbf5a",
      "#4d8a34",
    ];
    for (let i = 0; i < 2600; i++) {
      const x = rand() * w;
      const y = h * (0.35 + rand() * 0.75);
      const r = 4 + rand() * 16;
      g.fillStyle = greens[Math.floor(rand() * greens.length)] ?? "#4d8a34";
      g.globalAlpha = 0.55 + rand() * 0.45;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // sunlit highlights
    for (let i = 0; i < 260; i++) {
      g.fillStyle = rand() < 0.5 ? "#c8e08a" : "#e9f2c0";
      g.globalAlpha = 0.25 + rand() * 0.35;
      g.beginPath();
      g.arc(
        rand() * w,
        h * (0.38 + rand() * 0.5),
        3 + rand() * 9,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    // a couple of trunks
    g.globalAlpha = 0.6;
    g.fillStyle = "#4a3a2a";
    for (let i = 0; i < 6; i++)
      g.fillRect(rand() * w, h * (0.6 + rand() * 0.2), 4 + rand() * 4, h * 0.4);
    g.globalAlpha = 1;
    // out of focus: one blur pass of the whole picture
    const copy = document.createElement("canvas");
    copy.width = w;
    copy.height = h;
    copy.getContext("2d")?.drawImage(g.canvas, 0, 0);
    g.filter = "blur(2px)";
    g.drawImage(copy, 0, 0);
    g.filter = "none";
  });
}

/** The colorful abstract painting above the sofa. */
function abstractPainting() {
  const rand = seeded(42);
  return canvasTex(512, 680, (g, w, h) => {
    g.fillStyle = "#f3e4b0";
    g.fillRect(0, 0, w, h);
    const cols = [
      "#e8452c",
      "#2c6fd1",
      "#f5b51e",
      "#3aa66b",
      "#e86aa6",
      "#1d2b5a",
      "#ffffff",
    ];
    g.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = cols[i % cols.length] ?? "#e8452c";
      g.lineWidth = 8 + rand() * 40;
      g.globalAlpha = 0.75 + rand() * 0.25;
      g.beginPath();
      const x0 = rand() * w;
      const y0 = rand() * h;
      g.moveTo(x0, y0);
      g.bezierCurveTo(
        rand() * w,
        rand() * h,
        rand() * w,
        rand() * h,
        rand() * w,
        rand() * h,
      );
      g.stroke();
    }
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cols[Math.floor(rand() * cols.length)] ?? "#2c6fd1";
      g.globalAlpha = 0.85;
      g.beginPath();
      g.ellipse(
        rand() * w,
        rand() * h,
        10 + rand() * 50,
        10 + rand() * 30,
        rand() * 3,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

/** The landscape oil painting (a farmhouse) in the dining room. */
function landscapePainting() {
  const rand = seeded(7);
  return canvasTex(640, 480, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, "#8fb3c9");
    sky.addColorStop(1, "#e6dcc0");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6f8a4a";
    g.fillRect(0, h * 0.55, w, h);
    g.fillStyle = "#8c9a5a";
    g.beginPath();
    g.moveTo(0, h * 0.6);
    g.quadraticCurveTo(w * 0.4, h * 0.45, w, h * 0.58);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    // house
    g.fillStyle = "#efe6d3";
    g.fillRect(w * 0.35, h * 0.38, w * 0.3, h * 0.2);
    g.fillStyle = "#9a4a2a";
    g.beginPath();
    g.moveTo(w * 0.32, h * 0.39);
    g.lineTo(w * 0.5, h * 0.27);
    g.lineTo(w * 0.68, h * 0.39);
    g.fill();
    g.fillStyle = "#4a3a2a";
    for (let i = 0; i < 4; i++)
      g.fillRect(w * (0.38 + i * 0.07), h * 0.44, w * 0.03, h * 0.06);
    // trees and brush strokes
    for (let i = 0; i < 220; i++) {
      g.fillStyle = rand() < 0.5 ? "#3c5a2a" : "#5c7a3a";
      g.globalAlpha = 0.5;
      g.beginPath();
      const left = rand() < 0.5;
      g.arc(
        left ? rand() * w * 0.28 : w * 0.74 + rand() * w * 0.26,
        h * (0.25 + rand() * 0.35),
        6 + rand() * 14,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

/** Football on TV. */
function tvPitch() {
  return canvasTex(512, 288, (g, w, h) => {
    for (let i = 0; i < 10; i++) {
      g.fillStyle = i % 2 ? "#3f9a3a" : "#4aa845";
      g.fillRect((i * w) / 10, 0, w / 10, h);
    }
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 3;
    g.strokeRect(20, 30, w - 40, h - 60);
    g.beginPath();
    g.moveTo(w / 2, 30);
    g.lineTo(w / 2, h - 30);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
    g.stroke();
    const rand = seeded(5);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i < 8 ? "#d42a2a" : "#f2f2f2";
      g.fillRect(60 + rand() * (w - 120), 50 + rand() * (h - 100), 5, 10);
    }
    g.fillStyle = "rgba(10,20,40,0.85)";
    g.fillRect(16, 10, 120, 18);
    g.fillStyle = "#fff";
    g.font = "bold 12px sans-serif";
    g.fillText("FLA 1 x 0 VAS", 22, 23);
  });
}

/** A child's crayon drawing on a sheet of paper. */
function kidDrawing(seed: number) {
  const rand = seeded(seed);
  return canvasTex(256, 340, (g, w, h) => {
    g.fillStyle = "#fbfaf5";
    g.fillRect(0, 0, w, h);
    g.lineCap = "round";
    const cols = [
      "#f04a8a",
      "#3a8ef0",
      "#f5c400",
      "#37b24d",
      "#ff7a1a",
      "#9b4dff",
    ];
    // sun
    g.fillStyle = "#f5c400";
    g.beginPath();
    g.arc(w * 0.8, h * 0.15, 22, 0, Math.PI * 2);
    g.fill();
    // a person or a flower
    const c = cols[Math.floor(rand() * cols.length)] ?? "#f04a8a";
    g.strokeStyle = c;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(w * 0.45, h * 0.4, 28, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(w * 0.45, h * 0.48);
    g.lineTo(w * 0.45, h * 0.72);
    g.moveTo(w * 0.3, h * 0.56);
    g.lineTo(w * 0.6, h * 0.56);
    g.moveTo(w * 0.45, h * 0.72);
    g.lineTo(w * 0.35, h * 0.88);
    g.moveTo(w * 0.45, h * 0.72);
    g.lineTo(w * 0.55, h * 0.88);
    g.stroke();
    // scribbles
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = cols[i % cols.length] ?? "#3a8ef0";
      g.lineWidth = 3;
      g.beginPath();
      let x = rand() * w;
      let y = h * 0.9 + rand() * 20;
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (rand() - 0.5) * 40;
        y += (rand() - 0.5) * 12;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = "#3a8ef0";
    g.fillRect(0, h * 0.95, w, h * 0.05);
  });
}

/** The small "302" in metal digits on the front door. */
function doorNumber() {
  return canvasTex(256, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#3a3a3a";
    g.font = "bold 72px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("302", w / 2, h / 2 + 4);
  });
}

/* ---------------- static batching ---------------- */

/**
 * Bakes every static mesh under `root` into one merged mesh per material
 * (split by shadow casting), so the whole apartment costs a few dozen draw
 * calls. Meshes under any object in `keep` (moving parts) stay as they are.
 */
function bakeStatic(root: THREE.Object3D, keep: Set<THREE.Object3D>) {
  root.updateMatrixWorld(true);
  const buckets = new Map<
    THREE.Material,
    { cast: THREE.BufferGeometry[]; still: THREE.BufferGeometry[] }
  >();
  const done: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (
      !(o instanceof THREE.Mesh) ||
      o instanceof THREE.InstancedMesh ||
      Array.isArray(o.material)
    )
      return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent)
      if (keep.has(p)) return;
    const src = o.geometry as THREE.BufferGeometry;
    const g = src.index ? src.toNonIndexed() : src.clone();
    for (const k of Object.keys(g.attributes))
      if (k !== "position" && k !== "normal" && k !== "uv")
        g.deleteAttribute(k);
    if (!g.attributes.normal || !g.attributes.uv) return;
    g.clearGroups();
    g.applyMatrix4(o.matrixWorld);
    const m = o.material as THREE.Material;
    let b = buckets.get(m);
    if (!b) {
      b = { cast: [], still: [] };
      buckets.set(m, b);
    }
    (o.castShadow ? b.cast : b.still).push(g);
    done.push(o);
  });
  for (const o of done) o.removeFromParent();
  for (const [m, b] of buckets) {
    for (const [list, cast] of [
      [b.cast, true],
      [b.still, false],
    ] as const) {
      if (!list.length) continue;
      const g = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!g) continue;
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
    }
  }
}

/* ---------------- the scene ---------------- */

// LEIA-ME 02 (30/08): Davi in the turquoise Dolphins #1 jersey and black
// glasses; Elena in the navy/beige leaf-print dress.
const OUTFITS: { davi: Outfit; elena: Outfit } = {
  elena: WARDROBE.elenaLeafDress,
  davi: WARDROBE.dolphins1,
};

/*
 * Plan (from the walk-in video, one frame per second). One long room, the
 * balcony at -Z. Inner faces: left wall x = -2.3, right wall x = 2.3,
 * entrance wall z = 0.5, balcony wall z = -8.
 *  - entrance wall: the front door in the right corner, the landscape
 *    painting over the dining table, a door to the study in the left corner;
 *  - left wall (entrance → balcony): dark sideboard (portraits above),
 *    hallway doorway, oak TV panel with the white rack, an empty recliner
 *    in the corner by the glass;
 *  - right wall: turquoise bench with backpacks and kids' drawings, grandma's
 *    recliner, a side table, two beige reclining sofas in a row under the
 *    abstract canvas, the split AC by the balcony;
 *  - middle: the dining table (aqua cloth) along the left side by the
 *    entrance, two ceiling fans.
 */
const L = -2.3;
const R = 2.3;
const E = 0.5;
const W = -8;

function build(ctx: SceneCtx) {
  RectAreaLightUniformsLib.init();
  const hi = ctx.quality === "high";
  const root = new THREE.Group();
  ctx.scene.add(root);
  ctx.scene.background = new THREE.Color("#dfe9ef");
  const keep = new Set<THREE.Object3D>();

  const add = (
    g: THREE.BufferGeometry,
    m: Mat,
    x = 0,
    y = 0,
    z = 0,
    parent: THREE.Object3D = root,
    shadow = true,
  ) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    m: Mat,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
    shadow = true,
  ) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent, shadow);
  const group = (x: number, z: number, ryDeg: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = THREE.MathUtils.degToRad(ryDeg);
    root.add(g);
    g.updateMatrixWorld(true);
    return g;
  };

  /* ---------- materials ---------- */
  const wallMat = pbr(repeat(plaster("#e9e6df", 31), 3, 2), {
    roughness: 0.95,
    map: null,
    color: "#e6e3dc",
    normalScale: new THREE.Vector2(0.25, 0.25),
  });
  const ceilMat = pbr(repeat(plaster("#f3f1ec", 32), 4, 4), {
    roughness: 0.95,
    map: null,
    color: "#f1efea",
    normalScale: new THREE.Vector2(0.2, 0.2),
  });
  const trimMat = std("#f4f2ed", 0.55);
  const doorWhite = std("#f1efea", 0.45);
  const aluminium = std("#eceae4", 0.35, { metalness: 0.2 });
  const darkWood = pbr(repeat(woodPlanks("#4b2516", 3, 8), 1, 1), {
    roughness: 0.55,
  });
  const mahogany = pbr(repeat(woodPlanks("#5a2a18", 2, 4), 1, 1), {
    roughness: 0.45,
  });
  const oak = pbr(repeat(woodPlanks("#c39257", 5, 12), 1, 1), {
    roughness: 0.6,
  });
  const sofaFab = pbr(repeat(fabric("#bcac95", 51), 3, 3), { roughness: 1 });
  const sofaDark = pbr(repeat(fabric("#8f806c", 52), 3, 3), { roughness: 1 });
  const reclFab = pbr(repeat(fabric("#d2c5b0", 53), 3, 3), { roughness: 1 });
  const turquoise = std("#3fb3a2", 0.5);
  const clothMat = pbr(repeat(fabric("#7fd6cc", 54), 6, 6), { roughness: 1 });
  const clothSkirt = pbr(repeat(fabric("#7fd6cc", 54), 6, 2), {
    side: THREE.DoubleSide,
  });
  const seatRed = pbr(repeat(fabric("#7e1d24", 55), 2, 2), { roughness: 0.9 });
  const runnerRed = pbr(repeat(fabric("#8e1f2a", 56), 4, 1), {
    roughness: 0.9,
  });
  const porcelain = std("#fbfaf6", 0.2);
  const blackGloss = std("#121212", 0.25);
  const railMat = std("#7b3024", 0.45, { metalness: 0.5 });
  const lever = metal("#c9c9c6", 0.25);
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#dfeef0",
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });

  /* ---------- floor and ceiling ---------- */
  const fw = R - L;
  const fd = E - W;
  const floorMat = pbr(
    repeat(tiles("#e3dccf", "#cfc6b6", 4, 5, 0.22), fw / 2.4, fd / 2.4),
    { roughness: 1 },
  );
  add(
    new THREE.PlaneGeometry(fw, fd),
    floorMat,
    0,
    0,
    (E + W) / 2,
    root,
    false,
  ).rotation.x = -Math.PI / 2;
  add(
    new THREE.PlaneGeometry(fw, fd),
    ceilMat,
    0,
    H,
    (E + W) / 2,
    root,
    false,
  ).rotation.x = Math.PI / 2;

  /* ---------- walls (inner faces at the given coordinate) ---------- */
  type Hole = [a: number, b: number, bottom: number, top: number];
  const wallX = (
    z: number,
    x0: number,
    x1: number,
    side: 1 | -1,
    holes: Hole[] = [],
  ) => {
    const zc = z + (side * T) / 2;
    const lo = Math.min(z, z + side * T);
    const hiZ = Math.max(z, z + side * T);
    let cur = x0;
    for (const [a, b, bottom, top] of [...holes].sort((p, q) => p[0] - q[0])) {
      if (a > cur) {
        box(a - cur, H, T, wallMat, (cur + a) / 2, H / 2, zc);
        ctx.wall(cur, lo, a, hiZ);
      }
      if (bottom > 0)
        box(b - a, bottom, T, wallMat, (a + b) / 2, bottom / 2, zc);
      if (top < H)
        box(b - a, H - top, T, wallMat, (a + b) / 2, (top + H) / 2, zc);
      if (bottom > 0.5) ctx.wall(a, lo, b, hiZ);
      cur = b;
    }
    if (x1 > cur) {
      box(x1 - cur, H, T, wallMat, (cur + x1) / 2, H / 2, zc);
      ctx.wall(cur, lo, x1, hiZ);
    }
  };
  const wallZ = (
    x: number,
    z0: number,
    z1: number,
    side: 1 | -1,
    holes: Hole[] = [],
  ) => {
    const xc = x + (side * T) / 2;
    const lo = Math.min(x, x + side * T);
    const hiX = Math.max(x, x + side * T);
    let cur = z0;
    for (const [a, b, bottom, top] of [...holes].sort((p, q) => p[0] - q[0])) {
      if (a > cur) {
        box(T, H, a - cur, wallMat, xc, H / 2, (cur + a) / 2);
        ctx.wall(lo, cur, hiX, a);
      }
      if (bottom > 0)
        box(T, bottom, b - a, wallMat, xc, bottom / 2, (a + b) / 2);
      if (top < H)
        box(T, H - top, b - a, wallMat, xc, (top + H) / 2, (a + b) / 2);
      if (bottom > 0.5) ctx.wall(lo, a, hiX, b);
      cur = b;
    }
    if (z1 > cur) {
      box(T, H, z1 - cur, wallMat, xc, H / 2, (cur + z1) / 2);
      ctx.wall(lo, cur, hiX, z1);
    }
  };

  const ENTRY: [number, number] = [1.22, 2.12];
  const STUDY: [number, number] = [-2.18, -1.4];
  const HALL: [number, number] = [-3.85, -3.0];
  const BALC: [number, number] = [-1.95, 1.6];
  wallX(E, L - T, R + T, 1, [
    [STUDY[0], STUDY[1], 0, 2.1],
    [ENTRY[0], ENTRY[1], 0, 2.1],
  ]);
  wallX(W, L - T, R + T, -1, [[BALC[0], BALC[1], 0, 2.3]]);
  wallZ(L, W, E, -1, [[HALL[0], HALL[1], 0, 2.1]]);
  wallZ(R, W, E, 1);

  // crown molding (two stepped profiles) and tile baseboards
  const moldA = new THREE.BoxGeometry(1, 0.11, 0.035);
  const moldB = new THREE.BoxGeometry(1, 0.045, 0.085);
  const base = new THREE.BoxGeometry(1, 0.075, 0.012);
  const baseMat = std("#ddd5c7", 0.35);
  const moldParts: THREE.BufferGeometry[] = [];
  const baseParts: THREE.BufferGeometry[] = [];
  /** Trim along a wall from (x0,z0) to (x1,z1); `ny` = inward normal angle (0 = +z). */
  const trimRun = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    ny: number,
    withBase = true,
    withMold = true,
  ) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const nx = Math.sin(ny);
    const nz = Math.cos(ny);
    const s = (g: THREE.BufferGeometry, off: number, y: number) => {
      const k = g.clone();
      k.scale(len, 1, 1);
      return geo(k, cx + nx * off, y, cz + nz * off, 0, ny, 0);
    };
    if (withMold)
      moldParts.push(s(moldA, 0.0175, H - 0.055), s(moldB, 0.0425, H - 0.0225));
    if (withBase) baseParts.push(s(base, 0.006, 0.0375));
  };
  trimRun(L, E, R, E, Math.PI, false);
  trimRun(L, E, STUDY[0], E, Math.PI, true, false);
  trimRun(STUDY[1], E, ENTRY[0], E, Math.PI, true, false);
  trimRun(ENTRY[1], E, R, E, Math.PI, true, false);
  trimRun(R, E, R, W, -Math.PI / 2);
  trimRun(R, W, L, W, 0, false);
  trimRun(R, W, BALC[1], W, 0, true, false);
  trimRun(BALC[0], W, L, W, 0, true, false);
  trimRun(L, W, L, E, Math.PI / 2, false);
  trimRun(L, W, L, HALL[0], Math.PI / 2, true, false);
  trimRun(L, HALL[1], L, E, Math.PI / 2, true, false);
  add(merged(moldParts), trimMat, 0, 0, 0, root, false);
  add(merged(baseParts), baseMat, 0, 0, 0, root, false);

  /** White casing + jamb lining around a door opening, in a wall-aligned frame (opening along local x, room at local -z). */
  const casing = (
    cx: number,
    cz: number,
    ryDeg: number,
    width: number,
    top = 2.1,
  ) => {
    const g = group(cx, cz, ryDeg);
    const w = 0.07;
    const a = -width / 2;
    const b = width / 2;
    box(w, top + w, 0.02, trimMat, a - w / 2, (top + w) / 2, -0.01, g, false);
    box(w, top + w, 0.02, trimMat, b + w / 2, (top + w) / 2, -0.01, g, false);
    box(width + w * 2, w, 0.02, trimMat, 0, top + w / 2, -0.01, g, false);
    box(0.02, top, T, trimMat, a + 0.01, top / 2, T / 2, g, false);
    box(0.02, top, T, trimMat, b - 0.01, top / 2, T / 2, g, false);
    box(width, 0.02, T, trimMat, 0, top - 0.01, T / 2, g, false);
  };
  casing((ENTRY[0] + ENTRY[1]) / 2, E, 0, ENTRY[1] - ENTRY[0]);
  casing((STUDY[0] + STUDY[1]) / 2, E, 0, STUDY[1] - STUDY[0]);
  casing(L, (HALL[0] + HALL[1]) / 2, -90, HALL[1] - HALL[0]);

  /* ---------- the front door: white, lever handle, small "302" up top ---------- */
  {
    const pivot = new THREE.Group();
    pivot.position.set(ENTRY[1] - 0.02, 0, E - 0.03);
    pivot.rotation.y = THREE.MathUtils.degToRad(-84);
    root.add(pivot);
    const dw = ENTRY[1] - ENTRY[0] - 0.04;
    const slab = add(
      rbox(dw, 2.07, 0.04, 0.008, 2),
      doorWhite,
      -dw / 2,
      1.04,
      0,
      pivot,
    );
    for (const s of [1, -1]) {
      box(0.05, 0.22, 0.012, lever, -dw + 0.08, 1.02, s * 0.026, pivot, false);
      box(0.13, 0.02, 0.02, lever, -dw + 0.14, 1.07, s * 0.045, pivot);
      box(0.02, 0.02, 0.03, lever, -dw + 0.08, 1.07, s * 0.035, pivot, false);
      add(
        new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12),
        lever,
        -dw + 0.08,
        0.92,
        s * 0.025,
        pivot,
        false,
      ).rotation.x = Math.PI / 2;
    }
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 0.04),
      new THREE.MeshStandardMaterial({
        map: doorNumber(),
        roughness: 0.4,
        metalness: 0.4,
        transparent: true,
      }),
    );
    plate.position.set(-dw / 2 - 0.18, 1.62, 0.021);
    pivot.add(plate);
    root.updateMatrixWorld(true);
    ctx.solid(slab);
  }

  /* ---------- the landing: beige tiles with a granite border, the lift's wooden door ---------- */
  {
    const x0 = 0.75;
    const x1 = 2.75;
    const z0 = E + T;
    const z1 = 2.7;
    const lmat = pbr(repeat(tiles("#e6dfd2", "#cbc2b2", 3, 9, 0.3), 2, 2), {
      roughness: 1,
    });
    add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      lmat,
      (x0 + x1) / 2,
      0.001,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = -Math.PI / 2;
    const granite = pbr(repeat(concrete("#b9b2a6", 61), 2, 2), {
      roughness: 0.4,
    });
    add(
      new THREE.PlaneGeometry(x1 - x0, 0.25),
      granite,
      (x0 + x1) / 2,
      0.002,
      z0 + 0.125,
      root,
      false,
    ).rotation.x = -Math.PI / 2;
    add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      ceilMat,
      (x0 + x1) / 2,
      2.5,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = Math.PI / 2;
    const lwall = std("#e8e4da", 0.9);
    box(0.1, 2.5, z1 - z0, lwall, x0 - 0.05, 1.25, (z0 + z1) / 2);
    box(0.1, 2.5, z1 - z0, lwall, x1 + 0.05, 1.25, (z0 + z1) / 2);
    box(x1 - x0, 2.5, 0.1, lwall, (x0 + x1) / 2, 1.25, z1 + 0.05);
    ctx.wall(x0 - 0.1, z0, x0, z1);
    ctx.wall(x1, z0, x1 + 0.1, z1);
    ctx.wall(x0, z1, x1, z1 + 0.1);
    // the lift: wooden door with a narrow glass strip, steel frame
    box(1.0, 2.1, 0.05, mahogany, 1.75, 1.05, z1 - 0.03);
    box(
      0.08,
      0.9,
      0.06,
      std("#1c1c1c", 0.1),
      1.95,
      1.25,
      z1 - 0.04,
      root,
      false,
    );
    box(
      1.1,
      0.05,
      0.06,
      metal("#9a9a96", 0.3),
      1.75,
      2.12,
      z1 - 0.03,
      root,
      false,
    );
    // louvred fluorescent fixture
    box(
      0.9,
      0.04,
      0.3,
      std("#ffffff", 0.3, { emissive: "#fff6e8", emissiveIntensity: 1.6 }),
      1.75,
      2.48,
      1.6,
      root,
      false,
    );
    for (let i = 0; i < 9; i++)
      box(
        0.012,
        0.05,
        0.32,
        aluminium,
        1.35 + i * 0.1,
        2.455,
        1.6,
        root,
        false,
      );
    const ll = new THREE.PointLight("#fff1dc", 1.2, 4, 2);
    ll.position.set(1.75, 2.3, 1.6);
    root.add(ll);
  }

  /* ---------- the study behind the left door of the entrance wall ---------- */
  {
    const x0 = -2.6;
    const x1 = -0.7;
    const z0 = E + T;
    const z1 = 2.6;
    add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      floorMat,
      (x0 + x1) / 2,
      0.001,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = -Math.PI / 2;
    add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      ceilMat,
      (x0 + x1) / 2,
      H,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = Math.PI / 2;
    box(0.1, H, z1 - z0, wallMat, x0 - 0.05, H / 2, (z0 + z1) / 2);
    box(0.1, H, z1 - z0, wallMat, x1 + 0.05, H / 2, (z0 + z1) / 2);
    box(x1 - x0, H, 0.1, wallMat, (x0 + x1) / 2, H / 2, z1 + 0.05);
    ctx.wall(x0 - 0.1, z0, x0, z1);
    ctx.wall(x1, z0, x1 + 0.1, z1);
    ctx.wall(x0, z1, x1, z1 + 0.1);
    // white desk with papers, a wooden chair and a shelf
    box(1.2, 0.03, 0.55, std("#f2f0ea", 0.4), -1.75, 0.74, z1 - 0.3);
    for (const sx of [-0.57, 0.57])
      box(0.03, 0.73, 0.5, std("#f2f0ea", 0.4), -1.75 + sx, 0.365, z1 - 0.3);
    box(
      0.3,
      0.02,
      0.22,
      std("#fdfdfb", 0.9),
      -1.9,
      0.765,
      z1 - 0.32,
      root,
      false,
    );
    box(0.42, 0.04, 0.4, darkWood, -1.75, 0.46, z1 - 0.85);
    box(0.4, 0.5, 0.03, darkWood, -1.75, 0.72, z1 - 1.05);
    box(0.6, 0.02, 0.25, std("#f2f0ea", 0.4), -1.0, 1.5, z1 - 0.13);
    box(0.08, 0.22, 0.18, std("#4a6a9a", 0.6), -1.15, 1.62, z1 - 0.13);
    box(0.08, 0.2, 0.18, std("#9a4a4a", 0.6), -1.05, 1.61, z1 - 0.13);
  }

  /* ---------- the hallway to the bedrooms (off the left wall) ---------- */
  {
    const x0 = -5.6;
    const x1 = L - T;
    const [z0, z1] = HALL;
    add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      floorMat,
      (x0 + x1) / 2,
      0.001,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = -Math.PI / 2;
    add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      ceilMat,
      (x0 + x1) / 2,
      H,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = Math.PI / 2;
    box(x1 - x0, H, 0.1, wallMat, (x0 + x1) / 2, H / 2, z0 - 0.05);
    box(x1 - x0, H, 0.1, wallMat, (x0 + x1) / 2, H / 2, z1 + 0.05);
    box(0.1, H, z1 - z0, wallMat, x0 - 0.05, H / 2, (z0 + z1) / 2);
    ctx.wall(x0, z0 - 0.1, x1, z0);
    ctx.wall(x0, z1, x1, z1 + 0.1);
    ctx.wall(x0 - 0.1, z0, x0, z1);
    const hd = (x: number, z: number, ry: number) => {
      const g = group(x, z, ry);
      box(0.78, 2.08, 0.04, doorWhite, 0, 1.04, 0, g, false);
      box(0.92, 0.07, 0.02, trimMat, 0, 2.12, 0.02, g, false);
      box(0.07, 2.12, 0.02, trimMat, -0.425, 1.06, 0.02, g, false);
      box(0.07, 2.12, 0.02, trimMat, 0.425, 1.06, 0.02, g, false);
      box(0.12, 0.02, 0.05, lever, 0.28, 1.0, 0.04, g, false);
    };
    hd(-3.6, z1 - 0.02, 180);
    hd(-4.8, z0 + 0.02, 0);
    hd(x0 + 0.02, (z0 + z1) / 2 - 0.02, 90);
    add(
      new THREE.SphereGeometry(0.14, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      std("#ffffff", 0.3, { emissive: "#fff3e0", emissiveIntensity: 1.2 }),
      -4.0,
      H,
      (z0 + z1) / 2,
      root,
      false,
    ).rotation.x = Math.PI;
  }

  /* ---------- balcony: sliding glass doors, red-brown railing, awning, trees ---------- */
  {
    const [a, b] = BALC;
    const z = W - 0.06;
    box(b - a, 0.05, 0.1, aluminium, (a + b) / 2, 2.275, z, root, false);
    box(0.05, 2.3, 0.1, aluminium, a + 0.025, 1.15, z, root, false);
    box(0.05, 2.3, 0.1, aluminium, b - 0.025, 1.15, z, root, false);
    box(b - a, 0.03, 0.1, aluminium, (a + b) / 2, 0.015, z, root, false);
    const leaf = (cx: number, w: number, dz: number) => {
      box(w, 0.05, 0.04, aluminium, cx, 2.22, z + dz, root, false);
      box(w, 0.08, 0.04, aluminium, cx, 0.07, z + dz, root, false);
      box(
        0.045,
        2.2,
        0.04,
        aluminium,
        cx - w / 2 + 0.022,
        1.15,
        z + dz,
        root,
        false,
      );
      box(
        0.045,
        2.2,
        0.04,
        aluminium,
        cx + w / 2 - 0.022,
        1.15,
        z + dz,
        root,
        false,
      );
      box(w - 0.06, 0.03, 0.03, aluminium, cx, 1.85, z + dz, root, false);
      add(
        new THREE.PlaneGeometry(w - 0.08, 2.1),
        glassMat,
        cx,
        1.15,
        z + dz,
        root,
        false,
      );
    };
    const lw = (b - a) / 4 + 0.03;
    leaf(a + lw / 2, lw, 0.025);
    leaf(a + lw * 1.5 - 0.03, lw, -0.025);
    leaf(b - lw * 1.5 + 0.03, lw, -0.025);
    leaf(b - lw / 2, lw, 0.025);

    const bz0 = W - T;
    const bz1 = W - 1.4;
    add(
      new THREE.PlaneGeometry(R - L, bz0 - bz1),
      floorMat,
      0,
      0,
      (bz0 + bz1) / 2,
      root,
      false,
    ).rotation.x = -Math.PI / 2;
    box(
      R - L + 0.2,
      0.12,
      bz0 - bz1,
      wallMat,
      0,
      H + 0.06,
      (bz0 + bz1) / 2,
      root,
      false,
    );
    box(
      0.12,
      H,
      bz0 - bz1,
      wallMat,
      L - 0.06,
      H / 2,
      (bz0 + bz1) / 2,
      root,
      false,
    );
    box(
      0.12,
      H,
      bz0 - bz1,
      wallMat,
      R + 0.06,
      H / 2,
      (bz0 + bz1) / 2,
      root,
      false,
    );
    const rz = bz1 + 0.05;
    box(R - L, 0.05, 0.06, railMat, 0, 1.05, rz);
    box(R - L, 0.04, 0.04, railMat, 0, 0.62, rz, root, false);
    box(R - L, 0.12, 0.12, wallMat, 0, 0.06, rz, root, false);
    const nb = 38;
    const bars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.018, 0.92, 0.018),
      railMat,
      nb,
    );
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < nb; i++)
      bars.setMatrixAt(
        i,
        m4.makeTranslation(L + (i + 0.5) * ((R - L) / nb), 0.58, rz),
      );
    bars.castShadow = true;
    root.add(bars);
    // maroon striped awning
    const awnA = std("#7a3030", 0.9, { side: THREE.DoubleSide });
    const awnB = std("#5f2424", 0.9, { side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const s = box(
        (R - L) / 10,
        0.015,
        1.0,
        i % 2 ? awnA : awnB,
        L + ((i + 0.5) * (R - L)) / 10,
        2.45,
        bz1 + 0.55,
      );
      s.rotation.x = -0.25;
      const v = box(
        (R - L) / 10,
        0.2,
        0.01,
        i % 2 ? awnA : awnB,
        L + ((i + 0.5) * (R - L)) / 10,
        2.22,
        bz1 + 0.06,
        root,
        false,
      );
      v.rotation.x = 0.05;
    }
    // bright, out-of-focus outside world
    const outMat = new THREE.MeshBasicMaterial({
      map: outsideView(3),
      color: new THREE.Color(1.05, 1.05, 1.02),
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(34, 17), outMat);
    back.position.set(0, 2.2, W - 10);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(14, 17), outMat);
    side.position.set(-9, 2.2, W - 4);
    side.rotation.y = Math.PI / 2;
    const side2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 17), outMat);
    side2.position.set(9, 2.2, W - 4);
    side2.rotation.y = -Math.PI / 2;
    root.add(back, side, side2);
  }

  /* ---------- light (6 lights, 1 shadow) ---------- */
  ctx.scene.add(new THREE.HemisphereLight("#fbfaf6", "#d8cdb9", 0.45));
  const sun = new THREE.DirectionalLight("#fff3df", 2.6);
  sun.position.set(-2.2, 7.5, W - 9);
  sun.target.position.set(0.2, 0, W + 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 4;
  sun.shadow.camera.far = 26;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  ctx.scene.add(sun, sun.target);
  const sky = new THREE.RectAreaLight("#f2f7ff", 1.7, BALC[1] - BALC[0], 2.3);
  sky.position.set((BALC[0] + BALC[1]) / 2, 1.15, W + 0.05);
  sky.lookAt((BALC[0] + BALC[1]) / 2, 1.15, 0);
  ctx.scene.add(sky);
  const bounce = new THREE.RectAreaLight("#fff6ea", 0.35, 4, 7.5);
  bounce.position.set(0, 0.05, (E + W) / 2);
  bounce.lookAt(0, 3, (E + W) / 2);
  ctx.scene.add(bounce);
  const fill = new THREE.PointLight("#fff4e6", 1.6, 7, 2);
  fill.position.set(-0.6, 2.2, -1.6);
  ctx.scene.add(fill);

  /* ---------- ceiling fans with tulip light kits ---------- */
  const rotors: THREE.Group[] = [];
  const brass = metal("#8a6a3e", 0.35);
  const bladeMat = pbr(repeat(woodPlanks("#5b3a22", 2, 21), 1, 1), {
    roughness: 0.6,
  });
  const bladeGeo = rbox(0.52, 0.01, 0.13, 0.004, 1);
  const shade = std("#fbf6ec", 0.25, {
    transparent: true,
    opacity: 0.92,
    emissive: "#fff2dc",
    emissiveIntensity: 0.15,
  });
  const tulip = new THREE.LatheGeometry(
    [0.0, 0.03, 0.055, 0.07, 0.072, 0.065].map(
      (r, i) => new THREE.Vector2(r, -i * 0.025),
    ),
    16,
  );
  const fan = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, H, z);
    root.add(g);
    add(
      new THREE.CylinderGeometry(0.06, 0.08, 0.06, 20),
      brass,
      0,
      -0.03,
      0,
      g,
      false,
    );
    add(
      new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8),
      brass,
      0,
      -0.15,
      0,
      g,
      false,
    );
    add(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 24), brass, 0, -0.3, 0, g);
    const blades: THREE.BufferGeometry[] = [];
    const arms: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      arms.push(
        geo(
          new THREE.BoxGeometry(0.16, 0.012, 0.03),
          Math.cos(a) * 0.17,
          0,
          -Math.sin(a) * 0.17,
          0,
          a,
          0,
        ),
      );
      blades.push(
        geo(
          bladeGeo,
          Math.cos(a) * 0.48,
          0.005,
          -Math.sin(a) * 0.48,
          0.12,
          a,
          0,
        ),
      );
    }
    const rotor = new THREE.Group();
    rotor.position.y = -0.33;
    g.add(rotor);
    add(merged(blades), bladeMat, 0, 0, 0, rotor);
    add(merged(arms), brass, 0, 0, 0, rotor, false);
    keep.add(rotor);
    rotors.push(rotor);
    add(
      new THREE.CylinderGeometry(0.05, 0.04, 0.08, 16),
      brass,
      0,
      -0.42,
      0,
      g,
      false,
    );
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const s = add(
        tulip,
        shade,
        Math.cos(ang) * 0.14,
        -0.43,
        Math.sin(ang) * 0.14,
        g,
        false,
      );
      s.rotation.x = Math.PI;
      const arm = add(
        new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6),
        brass,
        Math.cos(ang) * 0.07,
        -0.45,
        Math.sin(ang) * 0.07,
        g,
        false,
      );
      arm.rotation.set(0, -ang, Math.PI / 2);
    }
  };
  fan(0.0, -5.2);
  fan(-0.6, -1.8);
  ctx.onUpdate((_t, dt) => {
    for (const f of rotors) f.rotation.y += dt * 2.6;
  });

  /* ---------- AC split unit by the balcony ---------- */
  {
    const g = group(R - 0.12, W + 0.75, -90);
    g.position.y = 2.3;
    add(rbox(0.92, 0.3, 0.22, 0.04), std("#f6f6f3", 0.35), 0, 0, 0, g);
    box(0.84, 0.012, 0.02, std("#d8d8d4", 0.4), 0, -0.11, 0.105, g, false);
    box(0.84, 0.05, 0.01, std("#bdbdb8", 0.6), 0, -0.135, 0.07, g, false);
  }

  /* ---------- sofas and recliners ---------- */
  /** A reclining sofa facing +z locally; back at -z. n seats, length len. */
  const sofa = (
    n: number,
    len: number,
    fab: Mat,
    x: number,
    z: number,
    ryDeg: number,
  ) => {
    const g = group(x, z, ryDeg);
    const D = 0.98;
    add(rbox(len - 0.02, 0.2, D - 0.08, 0.04), sofaDark, 0, 0.12, 0.02, g);
    add(rbox(len - 0.3, 0.6, 0.22, 0.06), fab, 0, 0.5, -D / 2 + 0.11, g);
    for (const s of [-1, 1])
      add(rbox(0.2, 0.62, D, 0.08), fab, s * (len / 2 - 0.1), 0.33, 0, g);
    const w = (len - 0.4) / n;
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + 0.2 + w * (i + 0.5);
      add(rbox(w - 0.02, 0.2, D - 0.3, 0.07, 4), fab, cx, 0.36, 0.1, g);
      const back = add(
        rbox(w - 0.03, 0.56, 0.26, 0.1, 4),
        fab,
        cx,
        0.82,
        -D / 2 + 0.25,
        g,
      );
      back.rotation.x = -0.18;
      box(w - 0.08, 0.008, 0.01, sofaDark, cx, 0.24, D / 2 - 0.02, g, false);
    }
    g.updateMatrixWorld(true);
    return g;
  };
  // two beige reclining sofas in a row along the right wall, under the canvas
  ctx.solid(sofa(2, 1.9, sofaFab, R - 0.49, -4.85, -90), 0.02);
  ctx.solid(sofa(3, 2.15, sofaFab, R - 0.49, -6.88, -90), 0.02);
  const fabricCache = new Map<string, Mat>();
  const fab = (c: string) => {
    let m = fabricCache.get(c);
    if (!m) {
      m = pbr(repeat(fabric(c, 70), 1, 1));
      fabricCache.set(c, m);
    }
    return m;
  };
  const pil = (
    x: number,
    y: number,
    z: number,
    ry: number,
    rz: number,
    color: string,
  ) => {
    const p = add(rbox(0.42, 0.42, 0.13, 0.08, 4), fab(color), x, y, z);
    p.rotation.set(-0.2, ry, rz);
  };
  pil(R - 0.3, 0.72, -7.55, -Math.PI / 2, 0.15, "#e9e1d3");
  pil(R - 0.32, 0.72, -7.1, -Math.PI / 2, -0.1, "#b7a58c");
  pil(R - 0.3, 0.72, -4.2, -Math.PI / 2, 0.12, "#e9e1d3");
  // white fluffy blanket over the near sofa's arm (by grandma's chair)
  const bk = add(
    rbox(0.7, 0.12, 0.6, 0.05, 3),
    fab("#f4f0e8"),
    R - 0.55,
    0.66,
    -3.95,
  );
  bk.rotation.set(0, 0.2, 0.05);
  const bk2 = add(
    rbox(0.6, 0.08, 0.55, 0.04, 3),
    fab("#d9cbb6"),
    R - 0.6,
    0.58,
    -6.3,
  );
  bk2.rotation.set(0, 0.4, 0);
  const recliner = (x: number, z: number, ryDeg: number) => {
    const g = sofa(1, 0.95, reclFab, x, z, ryDeg);
    add(rbox(0.5, 0.08, 0.32, 0.03), reclFab, 0, 0.34, 0.6, g);
    g.updateMatrixWorld(true);
    return g;
  };
  ctx.solid(recliner(R - 0.5, -2.95, -90), 0.02);
  ctx.solid(recliner(-1.5, -7.15, 35), 0.02);
  // dark side table between grandma's recliner and the sofa, with a pink fluffy bundle
  {
    const t = box(0.38, 0.55, 0.45, darkWood, R - 0.22, 0.275, -3.62);
    ctx.solid(t);
    add(
      new THREE.SphereGeometry(0.16, 16, 10),
      std("#f2a8c8", 1),
      R - 0.22,
      0.62,
      -3.62,
    ).scale.set(1, 0.45, 1.1);
    box(0.12, 0.02, 0.06, std("#222", 0.4), R - 0.3, 0.56, -3.5, root, false);
  }

  /* ---------- TV wall: oak panel, TV, white rack with oak drawers, toys ---------- */
  {
    const tz = -5.0;
    box(0.04, 1.5, 1.9, oak, L + 0.02, 1.5, tz);
    add(rbox(0.05, 0.78, 1.36, 0.01, 2), blackGloss, L + 0.075, 1.35, tz);
    const pitch = tvPitch();
    const screen = add(
      new THREE.PlaneGeometry(1.31, 0.735),
      new THREE.MeshStandardMaterial({
        map: pitch,
        emissive: "#ffffff",
        emissiveMap: pitch,
        emissiveIntensity: 0.9,
        roughness: 0.15,
      }),
      L + 0.101,
      1.35,
      tz,
      root,
      false,
    );
    screen.rotation.y = Math.PI / 2;
    const rack = group(L + 0.23, tz, 90);
    add(rbox(1.9, 0.04, 0.44, 0.01, 2), std("#f3f1ec", 0.3), 0, 0.46, 0, rack);
    add(rbox(1.86, 0.34, 0.42, 0.01, 2), oak, 0, 0.27, 0, rack);
    for (const x of [-0.62, 0, 0.62])
      box(0.5, 0.005, 0.006, std("#2b2116", 0.6), x, 0.3, 0.212, rack, false);
    box(1.8, 0.08, 0.4, std("#2b2b2b", 0.8), 0, 0.04, 0, rack, false);
    rack.updateMatrixWorld(true);
    ctx.solid(rack);
    const toy = (r: number, c: string, px: number, py: number, pz: number) =>
      add(new THREE.SphereGeometry(r, 18, 12), std(c, 0.45), px, py, pz);
    toy(0.09, "#3fb34f", L + 0.25, 0.57, tz + 0.55);
    toy(0.07, "#ff4fa0", L + 0.3, 0.55, tz + 0.7);
    toy(0.12, "#f2a8c8", L + 0.22, 0.6, tz - 0.75);
    toy(0.07, "#f2a8c8", L + 0.22, 0.75, tz - 0.75);
    box(0.25, 0.18, 0.3, std("#c58cf0", 0.6), L + 0.22, 0.57, tz - 0.45);
    // toys on the floor around the empty recliner
    toy(0.11, "#ff8a1f", -0.95, 0.11, -7.6);
    toy(0.1, "#2fc8d8", -2.0, 0.1, -6.4);
    toy(0.08, "#ff4fa0", -0.8, 0.08, -6.9);
    box(0.3, 0.2, 0.22, std("#4f8dff", 0.6), -1.95, 0.1, -7.75);
  }

  /* ---------- turquoise bench with the kids' backpacks ---------- */
  {
    const g = group(R - 0.19, -1.5, 0);
    box(0.36, 0.035, 1.7, turquoise, 0, 0.44, 0, g);
    for (const z of [-0.82, 0, 0.82])
      box(0.34, 0.42, 0.03, turquoise, 0, 0.21, z, g);
    box(0.34, 0.025, 1.66, turquoise, 0, 0.12, 0, g);
    box(0.3, 0.22, 0.32, std("#c79a62", 0.9), 0, 0.57, -0.45, g);
    box(0.16, 0.42, 0.1, std("#2a62b8", 0.5), 0.02, 0.67, 0.1, g);
    box(0.25, 0.012, 0.32, std("#fbfbfb", 0.8), 0.01, 0.465, 0.45, g, false);
    add(
      new THREE.CylinderGeometry(0.2, 0.17, 0.12, 20),
      std("#6b4a2e", 0.9),
      0,
      0.2,
      0.42,
      g,
    );
    g.updateMatrixWorld(true);
    ctx.solid(g);
    const pack = (px: number, pz: number, ry: number, c: string) => {
      const b = group(px, pz, ry);
      add(rbox(0.32, 0.42, 0.18, 0.07, 3), std(c, 0.7), 0, 0.3, 0, b);
      add(
        rbox(0.26, 0.18, 0.08, 0.05, 3),
        std("#a95ad8", 0.6),
        0,
        0.22,
        0.11,
        b,
      );
      add(
        new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI),
        std("#333", 0.6),
        0,
        0.51,
        0,
        b,
        false,
      );
      for (const s of [-1, 1])
        add(
          new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12),
          std("#222", 0.6),
          s * 0.12,
          0.035,
          -0.06,
          b,
          false,
        ).rotation.z = Math.PI / 2;
    };
    pack(R - 0.48, -1.75, -90, "#f05aa0");
    pack(R - 0.46, -2.15, -75, "#e84d8f");
  }

  /* ---------- pictures on the walls ---------- */
  {
    // abstract canvas above the sofa
    box(
      0.03,
      0.82,
      0.62,
      std("#f0e6c8", 0.8),
      R - 0.016,
      1.72,
      -4.85,
      root,
      false,
    );
    const apf = add(
      new THREE.PlaneGeometry(0.62, 0.82),
      new THREE.MeshStandardMaterial({
        map: abstractPainting(),
        roughness: 0.7,
      }),
      R - 0.032,
      1.72,
      -4.85,
      root,
      false,
    );
    apf.rotation.y = -Math.PI / 2;
    // landscape in a gold frame over the dining table (entrance wall)
    box(0.78, 0.6, 0.04, metal("#b08d4a", 0.4), -0.75, 1.68, E - 0.02);
    const lp = add(
      new THREE.PlaneGeometry(0.66, 0.48),
      new THREE.MeshStandardMaterial({
        map: landscapePainting(),
        roughness: 0.75,
      }),
      -0.75,
      1.68,
      E - 0.042,
      root,
      false,
    );
    lp.rotation.y = Math.PI;
    // kids' drawings and a paper doll over the bench and the recliner
    const sheet = (seed: number, z: number, y: number, rz: number) => {
      const s = add(
        new THREE.PlaneGeometry(0.21, 0.28),
        new THREE.MeshStandardMaterial({
          map: kidDrawing(seed),
          roughness: 0.9,
        }),
        R - 0.005,
        y,
        z,
        root,
        false,
      );
      s.rotation.set(0, -Math.PI / 2, rz);
    };
    sheet(1, -1.1, 1.5, 0.04);
    sheet(2, -1.45, 1.7, -0.06);
    sheet(3, -2.75, 1.85, 0.03);
    const doll = add(
      new THREE.PlaneGeometry(0.2, 0.38),
      new THREE.MeshStandardMaterial({
        map: kidDrawing(9),
        roughness: 0.9,
        color: "#f3d6df",
      }),
      R - 0.005,
      1.55,
      -3.2,
      root,
      false,
    );
    doll.rotation.y = -Math.PI / 2;
    // switches and outlets
    const wp = std("#f7f7f4", 0.4);
    box(0.08, 0.12, 0.012, wp, ENTRY[0] - 0.2, 1.15, E - 0.006, root, false);
    box(0.08, 0.12, 0.012, wp, STUDY[1] + 0.2, 1.15, E - 0.006, root, false);
    box(0.012, 0.12, 0.08, wp, L + 0.006, 1.15, HALL[1] + 0.2, root, false);
    box(0.012, 0.08, 0.12, wp, L + 0.006, 0.3, -6.2, root, false);
    box(0.012, 0.08, 0.12, wp, R - 0.006, 0.3, -3.3, root, false);
    box(0.1, 0.2, 0.04, std("#e9e9e4", 0.4), ENTRY[0] - 0.45, 1.4, E - 0.02);
  }

  /* ---------- dining table (aqua cloth) along the left side, carved chairs ---------- */
  // big table, its head pushed against the entrance wall under the painting
  // (Davi: "essa mesa é grudada na parede e maior")
  const tx = -0.75;
  const tz = E - 1.27;
  {
    const g = group(tx, tz, 90);
    const tw = 2.4;
    const td = 1.05;
    add(new THREE.BoxGeometry(tw, 0.04, td), darkWood, 0, 0.73, 0, g);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(
          0.07,
          0.71,
          0.07,
          darkWood,
          sx * (tw / 2 - 0.08),
          0.355,
          sz * (td / 2 - 0.08),
          g,
        );
    add(
      new THREE.BoxGeometry(tw + 0.12, 0.006, td + 0.12),
      clothMat,
      0,
      0.754,
      0,
      g,
    );
    const skirt = (len: number, along: "x" | "z", off: number) => {
      const pg = new THREE.PlaneGeometry(len, 0.3, Math.round(len * 30), 1);
      const p = pg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++)
        p.setZ(i, Math.sin(p.getX(i) * 18) * 0.012 * (0.5 - p.getY(i) / 0.3));
      pg.computeVertexNormals();
      const m = add(pg, clothSkirt, 0, 0.605, 0, g);
      if (along === "x") m.position.z = off;
      else {
        m.rotation.y = Math.PI / 2;
        m.position.x = off;
      }
    };
    skirt(tw + 0.12, "x", td / 2 + 0.06);
    skirt(tw + 0.12, "x", -td / 2 - 0.06);
    skirt(td + 0.12, "z", tw / 2 + 0.06);
    skirt(td + 0.12, "z", -tw / 2 - 0.06);
    g.updateMatrixWorld(true);
    ctx.solid(g, 0.05);
    const plate = new THREE.LatheGeometry(
      [0, 0.07, 0.1, 0.12, 0.125].map(
        (r, i) => new THREE.Vector2(r, [0, 0.002, 0.008, 0.018, 0.02][i] ?? 0),
      ),
      28,
    );
    const cup = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.03, 0),
        new THREE.Vector2(0.035, 0.06),
        new THREE.Vector2(0.038, 0.11),
      ],
      18,
    );
    const gl = new THREE.MeshStandardMaterial({
      color: "#eef6f6",
      roughness: 0.05,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const cutlery = metal("#d0d0cc", 0.2);
    const seats: [number, number][] = [
      [-0.5, 0.33],
      [0.5, 0.33],
      [-0.5, -0.33],
      [0.5, -0.33],
      [-0.85, 0],
      [0.85, 0],
    ];
    for (const [px, pz] of seats) {
      add(plate, porcelain, px, 0.757, pz, g, false);
      const end = px === -0.85 || px === 0.85;
      const side = end ? 0 : Math.sign(pz);
      add(
        cup,
        gl,
        end ? px - Math.sign(px) * 0.05 : px + 0.15,
        0.757,
        end ? pz - 0.18 : pz - side * 0.13,
        g,
        false,
      );
      box(
        0.012,
        0.004,
        0.18,
        cutlery,
        end ? px : px - 0.16,
        0.76,
        pz + (end ? 0.16 : 0),
        g,
        false,
      );
      box(
        0.012,
        0.004,
        0.19,
        cutlery,
        end ? px : px + 0.16,
        0.76,
        pz - (end ? 0.16 : 0),
        g,
        false,
      );
    }
    // a pink placemat and a napkin holder, as on the table in the video
    box(0.3, 0.004, 0.22, std("#e86a9a", 0.8), 0.1, 0.759, 0.05, g, false);
    box(0.12, 0.08, 0.05, std("#f3f3ef", 0.8), -0.25, 0.8, 0, g, false);
  }
  // carved dining chairs (one merged geometry per material)
  {
    const wood: THREE.BufferGeometry[] = [];
    const legG = new THREE.BoxGeometry(0.04, 0.45, 0.04);
    for (const sx of [-1, 1]) {
      wood.push(geo(legG, sx * 0.2, 0.225, 0.19));
      wood.push(
        geo(
          new THREE.BoxGeometry(0.045, 1.1, 0.045),
          sx * 0.2,
          0.55,
          -0.2,
          -0.06,
        ),
      );
    }
    wood.push(geo(new THREE.BoxGeometry(0.44, 0.06, 0.44), 0, 0.42, 0));
    const crest = new THREE.Shape();
    crest.moveTo(-0.22, 0);
    crest.quadraticCurveTo(0, 0.12, 0.22, 0);
    crest.lineTo(0.22, -0.07);
    crest.quadraticCurveTo(0, 0.04, -0.22, -0.07);
    crest.closePath();
    wood.push(
      geo(
        new THREE.ExtrudeGeometry(crest, { depth: 0.035, bevelEnabled: false }),
        0,
        1.04,
        -0.225,
        -0.06,
      ),
    );
    const splat = new THREE.Shape();
    splat.moveTo(-0.04, 0);
    splat.bezierCurveTo(-0.12, 0.12, -0.02, 0.22, -0.07, 0.36);
    splat.bezierCurveTo(-0.11, 0.46, -0.05, 0.5, 0, 0.52);
    splat.bezierCurveTo(0.05, 0.5, 0.11, 0.46, 0.07, 0.36);
    splat.bezierCurveTo(0.02, 0.22, 0.12, 0.12, 0.04, 0);
    splat.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, 0.36, 0.025, 0.06, 0, Math.PI * 2, false, 0);
    splat.holes.push(hole);
    wood.push(
      geo(
        new THREE.ExtrudeGeometry(splat, {
          depth: 0.025,
          bevelEnabled: true,
          bevelSize: 0.006,
          bevelThickness: 0.006,
          bevelSegments: 1,
        }),
        0,
        0.5,
        -0.215,
        -0.06,
      ),
    );
    wood.push(geo(new THREE.BoxGeometry(0.4, 0.04, 0.03), 0, 0.5, -0.2));
    const woodGeo = merged(wood);
    const seatGeo = rbox(0.42, 0.06, 0.42, 0.025, 2);
    seatGeo.translate(0, 0.475, 0.01);
    const chair = (x: number, z: number, ryDeg: number) => {
      const c = group(x, z, ryDeg);
      add(woodGeo, mahogany, 0, 0, 0, c);
      add(seatGeo, seatRed, 0, 0, 0, c);
      c.updateMatrixWorld(true);
      ctx.solid(c, -0.03);
    };
    // three on each long side, one at the free end (the head is on the wall)
    for (const dz of [-0.78, 0, 0.78]) {
      chair(tx - 0.76, tz + dz, 90);
      chair(tx + 0.76, tz + dz, dz === 0 ? -95 : -90);
    }
    chair(tx + 0.05, tz - 1.48, 3);
  }
  // the dark sideboard against the left wall: glass doors, red runner, the family's things
  // long, flush against the left wall (four glass doors, as in the video)
  const sbz = -1.85;
  {
    const g = group(L + 0.235, sbz, 90);
    const len = 2.3;
    const doors = 4;
    add(rbox(len, 0.78, 0.46, 0.01, 2), mahogany, 0, 0.47, 0, g);
    add(
      rbox(len + 0.04, 0.03, 0.5, 0.008, 2),
      std("#1d1714", 0.25),
      0,
      0.875,
      0,
      g,
    );
    box(len - 0.04, 0.08, 0.44, std("#2a1610", 0.7), 0, 0.04, 0, g);
    for (let i = 0; i < doors; i++) {
      const cx = -len / 2 + len / (2 * doors) + (i * len) / doors;
      box(
        len / doors - 0.04,
        0.48,
        0.01,
        std("#2a1810", 0.3, { metalness: 0.1 }),
        cx,
        0.38,
        0.231,
        g,
        false,
      );
      box(
        len / doors - 0.14,
        0.38,
        0.006,
        std("#141010", 0.08, { metalness: 0.3 }),
        cx,
        0.38,
        0.237,
        g,
        false,
      );
      box(len / doors - 0.04, 0.14, 0.012, mahogany, cx, 0.74, 0.232, g, false);
      box(0.08, 0.015, 0.02, metal("#b49660", 0.3), cx, 0.74, 0.245, g, false);
    }
    box(1.7, 0.004, 0.3, runnerRed, 0, 0.893, 0, g, false);
    const vase = (px: number, h: number, c: string, r: number) =>
      add(
        new THREE.LatheGeometry(
          [0.02, r * 0.7, r, r * 0.8, r * 0.35, r * 0.4].map(
            (rr, i) => new THREE.Vector2(rr, (i / 5) * h),
          ),
          20,
        ),
        std(c, 0.25),
        px,
        0.892,
        -0.05,
        g,
      );
    vase(-0.75, 0.24, "#e9e4da", 0.06);
    vase(-0.6, 0.16, "#7a8fb0", 0.05);
    vase(0.55, 0.3, "#d8c7a8", 0.055);
    add(
      new THREE.CylinderGeometry(0.055, 0.055, 0.26, 20),
      std("#fafafa", 0.9),
      0.78,
      1.02,
      0.02,
      g,
    );
    add(
      new THREE.CylinderGeometry(0.03, 0.03, 0.22, 16),
      std("#5a3a7a", 0.2, { transparent: true, opacity: 0.85 }),
      0.66,
      1.0,
      -0.08,
      g,
    );
    add(
      new THREE.CylinderGeometry(0.025, 0.03, 0.16, 16),
      std("#d8d8d8", 0.2),
      0.7,
      0.97,
      0.08,
      g,
    );
    box(
      0.32,
      0.03,
      0.2,
      std("#b9a27a", 0.4, { metalness: 0.5 }),
      -0.15,
      0.91,
      0.02,
      g,
    );
    g.updateMatrixWorld(true);
    ctx.solid(g);
  }

  /* ---------- portraits above the sideboard (uncovered by the pack) and the pack ---------- */
  ctx.photo(
    "elena-p3.webp",
    0.34,
    0.45,
    new THREE.Vector3(L + 0.015, 1.58, sbz + 0.45),
    90,
  );
  ctx.photo(
    "davi-p1.webp",
    0.34,
    0.45,
    new THREE.Vector3(L + 0.015, 1.58, sbz - 0.45),
    90,
  );
  ctx.pack(L + 0.26, 0.897, sbz + 0.2, 110);

  bakeStatic(root, keep);

  /* ---------- the family (4) and the partner ---------- */
  // grandma, relaxed on her recliner by the bench
  const grandma = ctx.person(
    {
      skin: "#e6b591",
      hair: "#6b4a30",
      hairStyle: "long",
      height: 1.6,
      female: true,
    },
    {
      top: "#2f7d4a",
      topStyle: "tshirt",
      bottom: "#151515",
      bottomStyle: "pants",
      shoes: "#d9c3a8",
    },
    R - 0.52,
    -2.95,
    -90,
    "sit",
    "Seja bem-vinda, Elena! 💚",
  );
  grandma.position.y = 0.07;
  // aunt: blonde bob, glasses, black dress, coming from the hallway
  ctx.person(
    {
      skin: "#f0c6a6",
      hair: "#c9ad7e",
      hairStyle: "long",
      height: 1.66,
      female: true,
      glasses: true,
    },
    {
      top: "#141414",
      topStyle: "dress",
      bottom: "#141414",
      bottomStyle: "skirt",
      shoes: "#2a2a2a",
    },
    -1.3,
    -3.55,
    43,
    "wave",
    "Que alegria te conhecer! 😊",
  );
  // uncle: black t-shirt, light shorts
  ctx.person(
    { skin: "#e8b48f", hair: "#3a2516", hairStyle: "short", height: 1.76 },
    {
      top: "#1c1c1e",
      topStyle: "tshirt",
      bottom: "#ece6d8",
      bottomStyle: "shorts",
      shoes: "#1e1e1e",
    },
    0.55,
    -3.45,
    20,
    "wave",
    "Fica à vontade, a casa é sua!",
  );
  // cousin in the light-green t-shirt, by the TV
  ctx.person(
    { skin: "#d9a37f", hair: "#18110c", hairStyle: "short", height: 1.76 },
    {
      top: "#9fd8b4",
      topStyle: "tshirt",
      bottom: "#2f3a52",
      bottomStyle: "shorts",
      shoes: "#1e1e1e",
    },
    -1.25,
    -5.1,
    46,
    "talk",
  );
  const elenaWaiting = ctx.player === "davi";
  ctx.partner(
    0.95,
    -1.95,
    27,
    "stand",
    OUTFITS,
    elenaWaiting
      ? "Sua família é um amor, eu já me sinto em casa 💚"
      : "Eles já te amam. Eu avisei! 💚",
  );
  ctx.playerOutfit(OUTFITS);

  /* ---------- spawn and exit ---------- */
  ctx.spawn((ENTRY[0] + ENTRY[1]) / 2, -0.45, 0);
  ctx.exit((ENTRY[0] + ENTRY[1]) / 2, E + 0.75, 0.6);
}

const scene: SceneModule = {
  id: "casa-vo",
  title: "Casa da vó",
  build,
};

export default scene;
