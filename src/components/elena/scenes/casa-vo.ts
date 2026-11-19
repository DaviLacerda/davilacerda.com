import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
 * Grandma's apartment (302), daytime: the entrance opens on a long living
 * room with polished beige tiles, two reclining sofas, a recliner, the TV
 * on an oak panel, a balcony door full of trees at the far end, and the
 * dining room with the aqua tablecloth to the left. Plan (meters, -Z = the
 * balcony): living x∈[-2, 2.2] z∈[-6.6, 0.5]; dining x∈[-5.6, -2]
 * z∈[-3.2, 0.5]; the entrance door in the back wall at x≈1.2, the hallway
 * at x≈-1.35. Ceiling 2.7 m.
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

function doorNumber() {
  return canvasTex(128, 320, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#2a2a2a");
    grad.addColorStop(0.5, "#3c3c3c");
    grad.addColorStop(1, "#262626");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f2f2f2";
    g.font = "bold 84px sans-serif";
    g.textAlign = "center";
    g.fillText("3", w / 2, 100);
    g.fillText("0", w / 2, 190);
    g.fillText("2", w / 2, 280);
  });
}

/* ---------------- the scene ---------------- */

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  elena: {
    top: "#2f4f8f",
    topStyle: "dress",
    bottom: "#2f4f8f",
    bottomStyle: "skirt",
    shoes: "#c49a72",
  },
  davi: {
    top: "#1fb7b2",
    topStyle: "jersey",
    print: "1",
    printColor: "#ff8a1f",
    bottom: "#2b3448",
    bottomStyle: "jeans",
    shoes: "#2a2a2a",
  },
};

function build(ctx: SceneCtx) {
  RectAreaLightUniformsLib.init();
  const hi = ctx.quality === "high";
  const root = new THREE.Group();
  ctx.scene.add(root);
  ctx.scene.background = new THREE.Color("#dfe9ef");

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
  const clothMat = pbr(repeat(fabric("#62cfc4", 54), 6, 6), { roughness: 1 });
  const seatRed = pbr(repeat(fabric("#7e1d24", 55), 2, 2), { roughness: 0.9 });
  const runnerRed = pbr(repeat(fabric("#8e1f2a", 56), 4, 1), {
    roughness: 0.9,
  });
  const porcelain = std("#fbfaf6", 0.2);
  const blackGloss = std("#121212", 0.25);
  const railMat = std("#7b3024", 0.45, { metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#dfeef0",
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });

  /* ---------- floor and ceiling ---------- */
  const fw = 8.2;
  const fd = 7.6;
  const floorMat = pbr(
    repeat(tiles("#e3dccf", "#cfc6b6", 4, 5, 0.22), fw / 2.4, fd / 2.4),
    { roughness: 1 },
  );
  const floor = add(
    new THREE.PlaneGeometry(fw, fd),
    floorMat,
    -1.7,
    0,
    -3.05,
    root,
    false,
  );
  floor.rotation.x = -Math.PI / 2;
  const ceil = add(
    new THREE.PlaneGeometry(fw, fd),
    ceilMat,
    -1.7,
    H,
    -3.05,
    root,
    false,
  );
  ceil.rotation.x = Math.PI / 2;

  /* ---------- walls (inner faces at the given coordinate) ---------- */
  type Hole = [a: number, b: number, bottom: number, top: number];
  /** A wall along X at z (inner face), thickness going toward +side*z. */
  const wallX = (
    z: number,
    x0: number,
    x1: number,
    side: 1 | -1,
    holes: Hole[] = [],
  ) => {
    const zc = z + (side * T) / 2;
    let cur = x0;
    const sorted = [...holes].sort((p, q) => p[0] - q[0]);
    for (const [a, b, bottom, top] of sorted) {
      if (a > cur) box(a - cur, H, T, wallMat, (cur + a) / 2, H / 2, zc);
      if (bottom > 0)
        box(b - a, bottom, T, wallMat, (a + b) / 2, bottom / 2, zc);
      if (top < H)
        box(b - a, H - top, T, wallMat, (a + b) / 2, (top + H) / 2, zc);
      cur = b;
    }
    if (x1 > cur) box(x1 - cur, H, T, wallMat, (cur + x1) / 2, H / 2, zc);
    const lo = Math.min(z, z + side * T);
    const hiZ = Math.max(z, z + side * T);
    let c2 = x0;
    for (const [a, b, bottom] of sorted) {
      if (a > c2) ctx.wall(c2, lo, a, hiZ);
      if (bottom > 0.5) ctx.wall(a, lo, b, hiZ);
      c2 = b;
    }
    if (x1 > c2) ctx.wall(c2, lo, x1, hiZ);
  };
  const wallZ = (
    x: number,
    z0: number,
    z1: number,
    side: 1 | -1,
    holes: Hole[] = [],
  ) => {
    const xc = x + (side * T) / 2;
    let cur = z0;
    const sorted = [...holes].sort((p, q) => p[0] - q[0]);
    for (const [a, b, bottom, top] of sorted) {
      if (a > cur) box(T, H, a - cur, wallMat, xc, H / 2, (cur + a) / 2);
      if (bottom > 0)
        box(T, bottom, b - a, wallMat, xc, bottom / 2, (a + b) / 2);
      if (top < H)
        box(T, H - top, b - a, wallMat, xc, (top + H) / 2, (a + b) / 2);
      cur = b;
    }
    if (z1 > cur) box(T, H, z1 - cur, wallMat, xc, H / 2, (cur + z1) / 2);
    const lo = Math.min(x, x + side * T);
    const hiX = Math.max(x, x + side * T);
    let c2 = z0;
    for (const [a, b, bottom] of sorted) {
      if (a > c2) ctx.wall(lo, c2, hiX, a);
      if (bottom > 0.5) ctx.wall(lo, a, hiX, b);
      c2 = b;
    }
    if (z1 > c2) ctx.wall(lo, c2, hiX, z1);
  };

  const HALL: [number, number] = [-1.75, -0.95];
  const ENTRY: [number, number] = [0.75, 1.65];
  const BALCONY: [number, number] = [-1.6, 0.55];
  wallX(0.5, -5.72, 2.32, 1, [
    [HALL[0], HALL[1], 0, 2.1],
    [ENTRY[0], ENTRY[1], 0, 2.1],
  ]);
  wallZ(2.2, -6.72, 0.5, 1);
  wallX(-6.6, -2.12, 2.32, -1, [
    [BALCONY[0], BALCONY[1], 0, 2.25],
    [0.68, 1.95, 1.02, 2.25],
  ]);
  wallZ(-2.0, -6.6, -3.2, -1);
  wallX(-3.2, -5.72, -2.0, -1, [[-4.55, -3.05, 1.0, 2.2]]);
  wallZ(-5.6, -3.32, 0.5, -1);

  // crown molding (two stepped profiles) and tile baseboards along every inner face
  const moldA = new THREE.BoxGeometry(1, 0.11, 0.035);
  const moldB = new THREE.BoxGeometry(1, 0.045, 0.085);
  const base = new THREE.BoxGeometry(1, 0.075, 0.012);
  const baseMat = std("#ddd5c7", 0.35);
  const moldParts: THREE.BufferGeometry[] = [];
  const baseParts: THREE.BufferGeometry[] = [];
  /** A run of trim along the wall from (x0,z0) to (x1,z1), inward normal angle `ny` (radians, 0 = +z). */
  const trimRun = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    ny: number,
    withBase = true,
  ) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const nx = Math.sin(ny);
    const nz = Math.cos(ny);
    const s = (g: THREE.BufferGeometry, off: number, y: number) => {
      const k = g.clone();
      k.scale(len, 1, 1);
      const p = geo(k, cx + nx * off, y, cz + nz * off, 0, ny, 0);
      return p;
    };
    moldParts.push(s(moldA, 0.0175, H - 0.055), s(moldB, 0.0425, H - 0.0225));
    if (withBase) baseParts.push(s(base, 0.006, 0.0375));
  };
  // living + dining perimeter (baseboards broken at the doors)
  trimRun(-5.6, 0.5, HALL[0], 0.5, Math.PI);
  trimRun(HALL[1], 0.5, ENTRY[0], 0.5, Math.PI);
  trimRun(ENTRY[1], 0.5, 2.2, 0.5, Math.PI);
  trimRun(HALL[0], 0.5, HALL[1], 0.5, Math.PI, false);
  trimRun(ENTRY[0], 0.5, ENTRY[1], 0.5, Math.PI, false);
  trimRun(2.2, 0.5, 2.2, -6.6, -Math.PI / 2);
  trimRun(2.2, -6.6, BALCONY[1], -6.6, 0);
  trimRun(BALCONY[0], -6.6, -2.0, -6.6, 0);
  trimRun(BALCONY[0], -6.6, BALCONY[1], -6.6, 0, false);
  trimRun(-2.0, -6.6, -2.0, -3.2, Math.PI / 2);
  trimRun(-2.0, -3.2, -5.6, -3.2, 0);
  trimRun(-5.6, -3.2, -5.6, 0.5, Math.PI / 2);
  add(merged(moldParts), trimMat, 0, 0, 0, root, false);
  add(merged(baseParts), baseMat, 0, 0, 0, root, false);

  // door casings (room side) for an opening in the back wall
  const casing = (
    a: number,
    b: number,
    z: number,
    top: number,
    dir: 1 | -1,
  ) => {
    const w = 0.07;
    box(
      w,
      top + w,
      0.02,
      trimMat,
      a - w / 2,
      (top + w) / 2,
      z + dir * 0.01,
      root,
      false,
    );
    box(
      w,
      top + w,
      0.02,
      trimMat,
      b + w / 2,
      (top + w) / 2,
      z + dir * 0.01,
      root,
      false,
    );
    box(
      b - a + w * 2,
      w,
      0.02,
      trimMat,
      (a + b) / 2,
      top + w / 2,
      z + dir * 0.01,
      root,
      false,
    );
    // jamb lining inside the wall thickness
    box(
      0.02,
      top,
      T,
      trimMat,
      a + 0.01,
      top / 2,
      z - dir * (T / 2),
      root,
      false,
    );
    box(
      0.02,
      top,
      T,
      trimMat,
      b - 0.01,
      top / 2,
      z - dir * (T / 2),
      root,
      false,
    );
    box(
      b - a,
      0.02,
      T,
      trimMat,
      (a + b) / 2,
      top - 0.01,
      z - dir * (T / 2),
      root,
      false,
    );
  };
  casing(HALL[0], HALL[1], 0.5, 2.1, -1);
  casing(ENTRY[0], ENTRY[1], 0.5, 2.1, -1);

  /* ---------- the entrance door (white, lever handle, 302 outside) ---------- */
  {
    const pivot = new THREE.Group();
    pivot.position.set(ENTRY[1] - 0.02, 0, 0.47);
    pivot.rotation.y = THREE.MathUtils.degToRad(-82);
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
    slab.name = "entry-door";
    // panel grooves
    for (const y of [0.55, 1.5])
      box(
        dw - 0.2,
        0.006,
        0.044,
        std("#e2dfd8", 0.5),
        -dw / 2,
        y,
        0,
        pivot,
        false,
      );
    const lever = metal("#c9c9c6", 0.25);
    for (const s of [1, -1]) {
      box(0.05, 0.2, 0.012, lever, -dw + 0.08, 1.02, s * 0.026, pivot, false);
      const handle = box(
        0.13,
        0.02,
        0.02,
        lever,
        -dw + 0.13,
        1.06,
        s * 0.045,
        pivot,
        false,
      );
      handle.castShadow = true;
      box(0.02, 0.02, 0.03, lever, -dw + 0.08, 1.06, s * 0.035, pivot, false);
    }
    // the number plate on the outer face (+z of the door)
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.25),
      new THREE.MeshStandardMaterial({
        map: doorNumber(),
        roughness: 0.35,
        metalness: 0.3,
      }),
    );
    plate.position.set(-dw / 2, 1.45, 0.0215);
    pivot.add(plate);
    pivot.updateMatrixWorld(true);
    ctx.solid(slab);
  }

  /* ---------- the landing outside (building corridor) ---------- */
  {
    const lmat = pbr(repeat(concrete("#d6cfc3", 61), 2, 2), { roughness: 0.5 });
    const lf = add(
      new THREE.PlaneGeometry(1.8, 2.2),
      lmat,
      1.2,
      0.001,
      1.72,
      root,
      false,
    );
    lf.rotation.x = -Math.PI / 2;
    const lc = add(
      new THREE.PlaneGeometry(1.8, 2.2),
      ceilMat,
      1.2,
      2.5,
      1.72,
      root,
      false,
    );
    lc.rotation.x = Math.PI / 2;
    const lwall = std("#e6e2d8", 0.9);
    box(0.1, 2.5, 2.2, lwall, 0.25, 1.25, 1.72);
    box(0.1, 2.5, 2.2, lwall, 2.15, 1.25, 1.72);
    box(1.8, 2.5, 0.1, lwall, 1.2, 1.25, 2.87);
    ctx.wall(0.2, 0.6, 0.3, 2.9);
    ctx.wall(2.1, 0.6, 2.2, 2.9);
    ctx.wall(0.2, 2.82, 2.2, 2.92);
    // neighbour's wooden door across the landing
    box(0.9, 2.1, 0.04, mahogany, 1.2, 1.05, 2.8);
    // louvred fluorescent fixture
    box(
      0.9,
      0.04,
      0.3,
      std("#ffffff", 0.3, { emissive: "#fff6e8", emissiveIntensity: 1.6 }),
      1.2,
      2.48,
      1.6,
      root,
      false,
    );
    for (let i = 0; i < 9; i++)
      box(0.012, 0.05, 0.32, aluminium, 0.8 + i * 0.1, 2.455, 1.6, root, false);
    const ll = new THREE.PointLight("#fff1dc", 1.2, 4, 2);
    ll.position.set(1.2, 2.3, 1.6);
    root.add(ll);
  }

  /* ---------- the hallway to the bedrooms ---------- */
  {
    const x0 = -1.95;
    const x1 = -0.75;
    const z0 = 0.62;
    const z1 = 3.4;
    const hf = add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      floorMat,
      (x0 + x1) / 2,
      0.001,
      (z0 + z1) / 2,
      root,
      false,
    );
    hf.rotation.x = -Math.PI / 2;
    const hc = add(
      new THREE.PlaneGeometry(x1 - x0, z1 - z0),
      ceilMat,
      (x0 + x1) / 2,
      H,
      (z0 + z1) / 2,
      root,
      false,
    );
    hc.rotation.x = Math.PI / 2;
    box(T, H, z1 - z0, wallMat, x0 - T / 2 + 0.2, H / 2, (z0 + z1) / 2);
    box(T, H, z1 - z0, wallMat, x1 + T / 2 - 0.2, H / 2, (z0 + z1) / 2);
    box(x1 - x0, H, T, wallMat, (x0 + x1) / 2, H / 2, z1 + T / 2);
    ctx.wall(x0, z0, x0 + 0.2 + T / 2, z1);
    ctx.wall(x1 - 0.2 - T / 2, z0, x1, z1);
    ctx.wall(x0, z1, x1, z1 + T);
    // closed bedroom doors
    const hd = (x: number, z: number, ry: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      root.add(g);
      box(0.8, 2.08, 0.04, doorWhite, 0, 1.04, 0, g, false);
      box(0.94, 0.07, 0.02, trimMat, 0, 2.12, 0.01, g, false);
      box(0.07, 2.12, 0.02, trimMat, -0.435, 1.06, 0.01, g, false);
      box(0.07, 2.12, 0.02, trimMat, 0.435, 1.06, 0.01, g, false);
      box(0.12, 0.02, 0.05, metal("#c9c9c6", 0.25), -0.28, 1.0, 0.04, g, false);
    };
    hd(-1.69, 1.6, Math.PI / 2);
    hd(-1.01, 2.5, -Math.PI / 2);
    hd(-1.35, 3.38, Math.PI);
    const hl = new THREE.PointLight("#fff0d8", 1.0, 4, 2);
    hl.position.set(-1.35, 2.4, 2.0);
    root.add(hl);
    const dome = add(
      new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      std("#ffffff", 0.3, { emissive: "#fff3e0", emissiveIntensity: 1.2 }),
      -1.35,
      H,
      2.0,
      root,
      false,
    );
    dome.rotation.x = Math.PI;
  }

  /* ---------- balcony door, railing, awning and the trees outside ---------- */
  {
    const [a, b] = BALCONY;
    const z = -6.66;
    // outer frame
    box(b - a, 0.05, 0.1, aluminium, (a + b) / 2, 2.225, z, root, false);
    box(0.05, 2.25, 0.1, aluminium, a + 0.025, 1.125, z, root, false);
    box(0.05, 2.25, 0.1, aluminium, b - 0.025, 1.125, z, root, false);
    box(b - a, 0.03, 0.1, aluminium, (a + b) / 2, 0.015, z, root, false);
    // four sliding leaves, two open behind the others
    const leaf = (cx: number, w: number, dz: number) => {
      box(w, 0.05, 0.04, aluminium, cx, 2.17, z + dz, root, false);
      box(w, 0.08, 0.04, aluminium, cx, 0.07, z + dz, root, false);
      box(
        0.045,
        2.15,
        0.04,
        aluminium,
        cx - w / 2 + 0.022,
        1.12,
        z + dz,
        root,
        false,
      );
      box(
        0.045,
        2.15,
        0.04,
        aluminium,
        cx + w / 2 - 0.022,
        1.12,
        z + dz,
        root,
        false,
      );
      box(w - 0.06, 0.03, 0.03, aluminium, cx, 1.05, z + dz, root, false);
      add(
        new THREE.PlaneGeometry(w - 0.08, 2.05),
        glassMat,
        cx,
        1.12,
        z + dz,
        root,
        false,
      );
    };
    const lw = (b - a) / 4 + 0.04;
    leaf(a + lw / 2, lw, 0.025);
    leaf(a + lw * 1.5 - 0.03, lw, -0.025);
    leaf(b - lw / 2, lw, 0.025);
    // side window above the sofa
    box(1.27, 0.04, 0.1, aluminium, 1.315, 1.04, z, root, false);
    box(1.27, 0.04, 0.1, aluminium, 1.315, 2.23, z, root, false);
    for (const x of [0.7, 1.315, 1.93])
      box(0.04, 1.23, 0.08, aluminium, x, 1.635, z, root, false);
    add(
      new THREE.PlaneGeometry(1.2, 1.15),
      glassMat,
      1.315,
      1.635,
      z,
      root,
      false,
    );
    ctx.wall(a, -6.72, b, -6.6);

    // balcony slab, side walls, ceiling
    const bfl = add(
      new THREE.PlaneGeometry(4.6, 1.3),
      floorMat,
      0.1,
      0,
      -7.37,
      root,
      false,
    );
    bfl.rotation.x = -Math.PI / 2;
    box(4.6, 0.12, 1.3, wallMat, 0.1, H + 0.06, -7.37, root, false);
    box(0.12, H, 1.3, wallMat, -2.06, H / 2, -7.37, root, false);
    box(0.12, H, 1.3, wallMat, 2.26, H / 2, -7.37, root, false);
    // red-brown railing: top rail, bottom rail and many bars (instanced)
    const rz = -7.95;
    box(4.3, 0.05, 0.06, railMat, 0.1, 1.05, rz);
    box(4.3, 0.04, 0.04, railMat, 0.1, 0.12, rz, root, false);
    box(4.3, 0.04, 0.04, railMat, 0.1, 0.62, rz, root, false);
    const nb = 36;
    const bars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.018, 0.92, 0.018),
      railMat,
      nb,
    );
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < nb; i++)
      bars.setMatrixAt(
        i,
        m4.makeTranslation(-2.0 + (i + 0.5) * (4.2 / nb), 0.58, rz),
      );
    bars.castShadow = true;
    root.add(bars);
    // parapet under the railing
    box(4.3, 0.1, 0.12, wallMat, 0.1, 0.05, rz, root, false);
    // maroon awning, rolled down a little at the top
    const awn = box(
      4.3,
      0.02,
      0.9,
      pbr(repeat(fabric("#6e2a2a", 62), 6, 2), { roughness: 0.9 }),
      0.1,
      2.48,
      -7.5,
    );
    awn.rotation.x = -0.22;
    for (let i = 0; i < 9; i++) {
      const v = box(
        0.46,
        0.18,
        0.01,
        std(i % 2 ? "#7a3030" : "#5f2424", 0.9),
        -2.0 + i * 0.47 + 0.23,
        2.3,
        -7.95,
        root,
        false,
      );
      v.rotation.x = 0.05;
    }
    // bright, blurred outside world
    const outMat = new THREE.MeshBasicMaterial({
      map: outsideView(3),
      color: new THREE.Color(1.05, 1.05, 1.02),
    });
    const back = add(
      new THREE.PlaneGeometry(34, 17),
      outMat,
      0,
      2.2,
      -16,
      root,
      false,
    );
    back.receiveShadow = false;
    const side = add(
      new THREE.PlaneGeometry(14, 17),
      outMat,
      -9,
      2.2,
      -10,
      root,
      false,
    );
    side.rotation.y = Math.PI / 2;
    side.receiveShadow = false;
  }

  /* ---------- dining-room window with a sheer curtain ---------- */
  {
    const z = -3.26;
    box(1.5, 0.04, 0.1, aluminium, -3.8, 1.02, z, root, false);
    box(1.5, 0.04, 0.1, aluminium, -3.8, 2.18, z, root, false);
    for (const x of [-4.53, -3.8, -3.07])
      box(0.04, 1.2, 0.08, aluminium, x, 1.6, z, root, false);
    const outMat = new THREE.MeshBasicMaterial({
      map: outsideView(9, false),
      color: new THREE.Color(1.0, 1.0, 0.98),
    });
    add(
      new THREE.PlaneGeometry(3.3, 3),
      outMat,
      -3.8,
      1.8,
      -4.6,
      root,
      false,
    ).receiveShadow = false;
    // sheer: a wavy plane hanging from a rod
    const sheerGeo = new THREE.PlaneGeometry(1.9, 1.75, 60, 1);
    const pos = sheerGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, Math.sin(pos.getX(i) * 22) * 0.025);
    sheerGeo.computeVertexNormals();
    const sheer = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.9,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      emissive: "#fffdf6",
      emissiveIntensity: 0.12,
      depthWrite: false,
    });
    add(sheerGeo, sheer, -3.8, 1.42, -3.1, root, false);
    add(
      new THREE.CylinderGeometry(0.012, 0.012, 2.2, 8),
      metal("#b9a27a", 0.3),
      -3.8,
      2.32,
      -3.1,
      root,
      false,
    ).rotation.z = Math.PI / 2;
  }

  /* ---------- light ---------- */
  ctx.scene.add(new THREE.HemisphereLight("#fbfaf6", "#d8cdb9", 0.42));
  const sun = new THREE.DirectionalLight("#fff3df", 2.6);
  sun.position.set(-2.2, 7.5, -15);
  sun.target.position.set(0.2, 0, -4.2);
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
  const sky = new THREE.RectAreaLight("#f2f7ff", 1.6, 3.4, 2.2);
  sky.position.set(-0.4, 1.15, -6.55);
  sky.lookAt(-0.4, 1.15, 0);
  ctx.scene.add(sky);
  const sky2 = new THREE.RectAreaLight("#f6f8ff", 1.4, 1.5, 1.15);
  sky2.position.set(-3.8, 1.6, -3.15);
  sky2.lookAt(-3.8, 1.6, 2);
  ctx.scene.add(sky2);
  // daylight bounced off the floor onto the ceiling
  const bounce = new THREE.RectAreaLight("#fff6ea", 0.35, 4, 5);
  bounce.position.set(0.1, 0.05, -3.6);
  bounce.lookAt(0.1, 3, -3.6);
  ctx.scene.add(bounce);
  const fill = new THREE.PointLight("#fff4e6", 1.5, 7, 2);
  fill.position.set(-3.6, 2.2, -1.2);
  ctx.scene.add(fill);

  /* ---------- ceiling fans with tulip light kits ---------- */
  const fans: THREE.Group[] = [];
  const fan = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, H, z);
    root.add(g);
    const brass = metal("#8a6a3e", 0.35);
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
    const rotor = new THREE.Group();
    rotor.position.y = -0.33;
    g.add(rotor);
    const bladeMat = pbr(repeat(woodPlanks("#5b3a22", 2, 21), 1, 1), {
      roughness: 0.6,
    });
    const bladeGeo = rbox(0.52, 0.01, 0.13, 0.004, 1);
    for (let i = 0; i < 5; i++) {
      const arm = new THREE.Group();
      arm.rotation.y = (i / 5) * Math.PI * 2;
      rotor.add(arm);
      add(
        new THREE.BoxGeometry(0.16, 0.012, 0.03),
        brass,
        0.17,
        0,
        0,
        arm,
        false,
      );
      const bl = add(bladeGeo, bladeMat, 0.48, 0.005, 0, arm);
      bl.rotation.x = 0.12;
    }
    add(
      new THREE.CylinderGeometry(0.05, 0.04, 0.08, 16),
      brass,
      0,
      -0.42,
      0,
      g,
      false,
    );
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
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const arm = add(
        new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6),
        brass,
        Math.cos(ang) * 0.07,
        -0.45,
        Math.sin(ang) * 0.07,
        g,
        false,
      );
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = -ang;
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
    }
    fans.push(rotor);
  };
  fan(0.1, -3.9);
  fan(-3.8, -1.75);
  ctx.onUpdate((_t, dt) => {
    for (const f of fans) f.rotation.y += dt * 2.6;
  });

  /* ---------- AC split unit ---------- */
  {
    const g = new THREE.Group();
    g.position.set(2.2 - 0.12, 2.28, -5.75);
    g.rotation.y = -Math.PI / 2;
    root.add(g);
    add(rbox(0.92, 0.3, 0.22, 0.04), std("#f6f6f3", 0.35), 0, 0, 0, g);
    box(0.84, 0.012, 0.02, std("#d8d8d4", 0.4), 0, -0.11, 0.105, g, false);
    box(0.84, 0.05, 0.01, std("#bdbdb8", 0.6), 0, -0.135, 0.07, g, false);
    box(
      0.05,
      0.012,
      0.005,
      std("#3d8bff", 0.3, { emissive: "#3d8bff", emissiveIntensity: 2 }),
      0.33,
      0.05,
      0.112,
      g,
      false,
    );
    // pipe going down behind the curtain
  }

  /* ---------- sofas and recliners ---------- */
  /** A reclining sofa facing +z locally; back at -z. n seats, length L. */
  const sofa = (
    n: number,
    L: number,
    fab: Mat,
    x: number,
    z: number,
    ry: number,
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
    const D = 0.98;
    add(rbox(L - 0.02, 0.2, D - 0.08, 0.04), sofaDark, 0, 0.12, 0.02, g);
    add(rbox(L - 0.3, 0.6, 0.22, 0.06), fab, 0, 0.5, -D / 2 + 0.11, g);
    for (const s of [-1, 1])
      add(rbox(0.2, 0.62, D, 0.08), fab, s * (L / 2 - 0.1), 0.33, 0, g);
    const w = (L - 0.4) / n;
    for (let i = 0; i < n; i++) {
      const cx = -L / 2 + 0.2 + w * (i + 0.5);
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
      // the footrest seam of a recliner
      box(w - 0.08, 0.008, 0.01, sofaDark, cx, 0.24, D / 2 - 0.02, g, false);
    }
    return g;
  };
  // big L of beige reclining sofas: along the right wall, and under the side window
  const sofaA = sofa(3, 2.6, sofaFab, 2.2 - 0.49, -4.33, -Math.PI / 2);
  const sofaB = sofa(2, 1.5, sofaFab, 1.43, -6.6 + 0.49, 0);
  ctx.solid(sofaA, 0.02);
  ctx.solid(sofaB, 0.02);
  // throw pillows and blankets
  {
    const pil = (
      x: number,
      y: number,
      z: number,
      ry: number,
      rz: number,
      color: string,
    ) => {
      const p = add(
        rbox(0.42, 0.42, 0.13, 0.08, 4),
        pbr(repeat(fabric(color, 70), 1, 1)),
        x,
        y,
        z,
      );
      p.rotation.set(-0.2, ry, rz);
    };
    pil(1.95, 0.72, -5.4, -Math.PI / 2, 0.15, "#e9e1d3");
    pil(1.93, 0.72, -4.9, -Math.PI / 2, -0.1, "#b7a58c");
    pil(1.9, 0.7, -6.25, 0, 0.12, "#e9e1d3");
    pil(1.15, 0.7, -6.25, 0, -0.2, "#c9b49a");
    // a white fluffy blanket folded over the arm of the sofa (the end near the recliner)
    const blanket = pbr(repeat(fabric("#f4f0e8", 71), 2, 2));
    const bk = add(rbox(0.75, 0.12, 0.62, 0.05, 3), blanket, 1.72, 0.66, -3.25);
    bk.rotation.set(0, 0.2, 0.05);
    const bk2 = add(
      rbox(0.5, 0.08, 0.55, 0.04, 3),
      std("#6f8f6a", 1),
      1.0,
      0.58,
      -6.05,
    );
    bk2.rotation.set(0, 0.4, 0);
  }
  /** A single recliner armchair. */
  const recliner = (x: number, z: number, ry: number) => {
    const g = sofa(1, 0.95, reclFab, x, z, ry);
    // the extended footrest, slightly open
    add(rbox(0.5, 0.08, 0.32, 0.03), reclFab, 0, 0.34, 0.6, g);
    return g;
  };
  const grandmaChair = recliner(1.62, -2.3, THREE.MathUtils.degToRad(-75));
  ctx.solid(grandmaChair, 0.02);
  const emptyChair = recliner(-1.05, -5.6, THREE.MathUtils.degToRad(25));
  ctx.solid(emptyChair, 0.02);

  /* ---------- TV wall: oak panel, TV, rack with toys ---------- */
  {
    const x = -2.0;
    box(0.04, 1.5, 2.0, oak, x + 0.02, 1.45, -4.45);
    const tv = add(
      rbox(0.05, 0.78, 1.36, 0.01, 2),
      blackGloss,
      x + 0.075,
      1.32,
      -4.45,
    );
    tv.castShadow = true;
    const pitch = tvPitch();
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.31, 0.735),
      new THREE.MeshStandardMaterial({
        map: pitch,
        emissive: "#ffffff",
        emissiveMap: pitch,
        emissiveIntensity: 0.9,
        roughness: 0.15,
      }),
    );
    screen.position.set(x + 0.101, 1.32, -4.45);
    screen.rotation.y = Math.PI / 2;
    root.add(screen);
    // rack: white lacquer top, oak drawers
    const rack = new THREE.Group();
    rack.position.set(x + 0.23, 0, -4.45);
    root.add(rack);
    add(rbox(0.44, 0.04, 1.9, 0.01, 2), std("#f3f1ec", 0.3), 0, 0.46, 0, rack);
    add(rbox(0.42, 0.34, 1.86, 0.01, 2), oak, 0, 0.27, 0, rack);
    for (const z of [-0.62, 0, 0.62])
      box(0.006, 0.005, 0.5, std("#2b2116", 0.6), 0.212, 0.3, z, rack, false);
    box(0.4, 0.08, 1.8, std("#2b2b2b", 0.8), 0, 0.04, 0, rack, false);
    ctx.solid(rack);
    // toys: balls, a pink plush, a box
    const toy = (r: number, c: string, px: number, py: number, pz: number) =>
      add(new THREE.SphereGeometry(r, 20, 14), std(c, 0.45), px, py, pz);
    toy(0.09, "#3fb34f", x + 0.25, 0.57, -3.8);
    toy(0.07, "#ff4fa0", x + 0.3, 0.55, -3.65);
    toy(0.08, "#4f8dff", x + 0.18, 0.56, -5.05);
    toy(0.12, "#f2a8c8", x + 0.22, 0.6, -5.25);
    toy(0.07, "#f2a8c8", x + 0.22, 0.75, -5.25);
    box(0.25, 0.18, 0.3, std("#c58cf0", 0.6), x + 0.22, 0.57, -4.95);
    box(0.12, 0.07, 0.08, std("#1a1a1a", 0.5), x + 0.24, 0.515, -4.45);
    // a couple of balls on the floor
    toy(0.11, "#ff8a1f", -1.55, 0.11, -5.9);
    toy(0.1, "#2fc8d8", -1.25, 0.1, -3.4);
  }

  /* ---------- turquoise bench with the kids' backpacks ---------- */
  {
    const g = new THREE.Group();
    g.position.set(2.2 - 0.19, 0, -0.65);
    root.add(g);
    box(0.36, 0.035, 1.75, turquoise, 0, 0.44, 0, g);
    for (const z of [-0.85, 0, 0.85])
      box(0.34, 0.42, 0.03, turquoise, 0, 0.21, z, g);
    box(0.34, 0.025, 1.7, turquoise, 0, 0.12, 0, g);
    box(0.3, 0.22, 0.32, std("#c79a62", 0.9), 0, 0.57, -0.45, g);
    box(0.16, 0.42, 0.1, std("#2a62b8", 0.5), 0.02, 0.67, 0.1, g);
    box(0.25, 0.012, 0.32, std("#fbfbfb", 0.8), 0.01, 0.465, 0.45, g, false);
    ctx.solid(g);
    // pink backpacks (one on wheels) leaning on the bench
    const pack = (px: number, pz: number, ry: number, c: string) => {
      const b = new THREE.Group();
      b.position.set(px, 0, pz);
      b.rotation.y = ry;
      root.add(b);
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
      return b;
    };
    pack(1.6, -1.25, -Math.PI / 2, "#f05aa0");
    pack(1.62, -0.9, -Math.PI / 2 + 0.3, "#e84d8f");
  }

  /* ---------- paintings, kids' drawings, small wall details ---------- */
  {
    // abstract canvas above the sofa
    const ap = add(
      new THREE.BoxGeometry(0.03, 0.82, 0.62),
      std("#f0e6c8", 0.8),
      2.2 - 0.016,
      1.72,
      -4.4,
    );
    ap.castShadow = false;
    const apf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.82),
      new THREE.MeshStandardMaterial({
        map: abstractPainting(),
        roughness: 0.7,
      }),
    );
    apf.position.set(2.2 - 0.032, 1.72, -4.4);
    apf.rotation.y = -Math.PI / 2;
    root.add(apf);
    // landscape in a gold frame (dining room)
    const gold = metal("#b08d4a", 0.4);
    const lx = -5.6 + 0.03;
    box(0.04, 0.6, 0.78, gold, lx, 1.62, -1.75);
    const lp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.48),
      new THREE.MeshStandardMaterial({
        map: landscapePainting(),
        roughness: 0.75,
      }),
    );
    lp.position.set(lx + 0.021, 1.62, -1.75);
    lp.rotation.y = Math.PI / 2;
    root.add(lp);
    // kids' drawings taped on the walls
    const sheet = (
      seed: number,
      x: number,
      y: number,
      z: number,
      ry: number,
      rz: number,
    ) => {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(0.21, 0.28),
        new THREE.MeshStandardMaterial({
          map: kidDrawing(seed),
          roughness: 0.9,
        }),
      );
      s.position.set(x, y, z);
      s.rotation.set(0, ry, rz);
      root.add(s);
    };
    sheet(1, -2.35, 1.45, 0.495, Math.PI, 0.04);
    sheet(2, -2.65, 1.62, 0.495, Math.PI, -0.06);
    sheet(3, -2.4, 1.1, 0.495, Math.PI, 0.02);
    sheet(4, 2.195, 1.55, -2.1, -Math.PI / 2, 0.05);
    sheet(5, 2.195, 1.25, -1.75, -Math.PI / 2, -0.04);
    // outlets and switches
    const wp = std("#f7f7f4", 0.4);
    box(0.08, 0.12, 0.012, wp, 0.55, 1.15, 0.494, root, false);
    box(0.08, 0.12, 0.012, wp, -0.75, 1.15, 0.494, root, false);
    box(0.012, 0.08, 0.12, wp, -1.994, 0.3, -3.6, root, false);
    box(0.012, 0.08, 0.12, wp, 2.194, 0.3, -2.9, root, false);
    // intercom by the entrance
    box(0.1, 0.2, 0.04, std("#e9e9e4", 0.4), 0.45, 1.4, 0.48);
  }

  /* ---------- dining room: table with the aqua cloth, carved chairs, sideboard ---------- */
  const tx = -3.8;
  const tz = -1.75;
  {
    const g = new THREE.Group();
    g.position.set(tx, 0, tz);
    root.add(g);
    const tw = 2.0;
    const td = 1.0;
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
    // tablecloth: a top and a hanging skirt with soft folds
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
      const m = add(
        pg,
        pbr(repeat(fabric("#62cfc4", 54), 6, 2), { side: THREE.DoubleSide }),
        0,
        0.605,
        0,
        g,
      );
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
    ctx.solid(g, 0.05);
    // place settings
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
      const side = px === -0.85 || px === 0.85 ? 0 : Math.sign(pz);
      const fx = side === 0 ? px : px - 0.16;
      add(
        cup,
        gl,
        side === 0 ? px - Math.sign(px) * 0.05 : px + 0.15,
        0.757,
        side === 0 ? pz - 0.18 : pz - side * 0.13,
        g,
        false,
      );
      box(
        0.012,
        0.004,
        0.18,
        cutlery,
        fx,
        0.76,
        pz + (side === 0 ? 0.16 : 0),
        g,
        false,
      );
      box(
        0.012,
        0.004,
        0.19,
        cutlery,
        side === 0 ? px : px + 0.16,
        0.76,
        pz - (side === 0 ? 0.16 : 0),
        g,
        false,
      );
    }
    // a centrepiece: a fruit bowl and a napkin holder
    add(
      new THREE.LatheGeometry(
        [0.02, 0.1, 0.14, 0.15].map((r, i) => new THREE.Vector2(r, i * 0.03)),
        24,
      ),
      std("#d9c9a8", 0.4),
      0.0,
      0.757,
      0,
      g,
    );
    const fruit = ["#f2a03a", "#d93a2a", "#f5d33a", "#e66b2a"];
    fruit.forEach((c, i) =>
      add(
        new THREE.SphereGeometry(0.045, 14, 10),
        std(c, 0.5),
        Math.cos(i * 1.6) * 0.06,
        0.82,
        Math.sin(i * 1.6) * 0.06,
        g,
        false,
      ),
    );
    box(0.12, 0.08, 0.05, std("#f3f3ef", 0.8), 0.32, 0.8, 0, g, false);
  }
  // carved dining chairs (merged per material, reused)
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
    // crest rail and carved vase-shaped splat
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
    const chair = (x: number, z: number, ry: number) => {
      const c = new THREE.Group();
      c.position.set(x, 0, z);
      c.rotation.y = ry;
      root.add(c);
      add(woodGeo, mahogany, 0, 0, 0, c);
      add(seatGeo, seatRed, 0, 0, 0, c);
      ctx.solid(c, -0.03);
    };
    chair(tx - 0.5, tz + 0.82, Math.PI);
    chair(tx + 0.5, tz + 0.8, Math.PI + 0.06);
    chair(tx - 0.5, tz - 0.82, 0);
    chair(tx + 0.45, tz - 0.8, 0.05);
    chair(tx - 1.25, tz, Math.PI / 2);
    chair(tx + 1.27, tz + 0.05, -Math.PI / 2 - 0.1);
  }
  // the dark wood sideboard with glass doors, a red runner and the family's things
  const sbx = -4.3;
  {
    const g = new THREE.Group();
    g.position.set(sbx, 0, 0.5 - 0.24);
    root.add(g);
    const L = 1.8;
    add(rbox(L, 0.78, 0.46, 0.01, 2), mahogany, 0, 0.47, 0, g);
    add(
      rbox(L + 0.04, 0.03, 0.5, 0.008, 2),
      std("#1d1714", 0.25),
      0,
      0.875,
      0,
      g,
    );
    box(L - 0.04, 0.08, 0.44, std("#2a1610", 0.7), 0, 0.04, 0, g);
    // three glass doors with frames, two drawers on top
    for (let i = 0; i < 3; i++) {
      const cx = -L / 2 + L / 6 + (i * L) / 3;
      box(
        L / 3 - 0.04,
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
        L / 3 - 0.14,
        0.38,
        0.006,
        std("#141010", 0.08, { metalness: 0.3 }),
        cx,
        0.38,
        0.237,
        g,
        false,
      );
      box(L / 3 - 0.04, 0.14, 0.012, mahogany, cx, 0.74, 0.232, g, false);
      box(0.08, 0.015, 0.02, metal("#b49660", 0.3), cx, 0.74, 0.245, g, false);
    }
    // red runner
    box(1.3, 0.004, 0.3, runnerRed, 0, 0.893, 0, g, false);
    // decorations: vases, bottles, a paper towel, a little tray
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
    add(
      new THREE.SphereGeometry(0.035, 12, 10),
      std("#d23a3a", 0.4),
      -0.2,
      0.95,
      0.02,
      g,
      false,
    );
    add(
      new THREE.SphereGeometry(0.03, 12, 10),
      std("#f2c84a", 0.4),
      -0.1,
      0.945,
      0.03,
      g,
      false,
    );
    ctx.solid(g);
  }

  /* ---------- the framed portraits (uncovered by the pack) and the pack ---------- */
  ctx.photo(
    "elena-p3.webp",
    0.34,
    0.45,
    new THREE.Vector3(sbx - 0.48, 1.55, 0.485),
    180,
  );
  ctx.photo(
    "davi-p1.webp",
    0.34,
    0.45,
    new THREE.Vector3(sbx + 0.42, 1.55, 0.485),
    180,
  );
  ctx.pack(sbx + 0.05, 0.897, 0.3, 200);

  /* ---------- the family ---------- */
  const elenaWaiting = ctx.player === "davi";
  // grandma, relaxed on her recliner
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
    1.55,
    -2.28,
    -75,
    "sit",
    "Seja bem-vinda, Elena! 💚",
  );
  // aunt: blonde bob, glasses, black dress
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
    -0.95,
    -2.35,
    55,
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
    -1.3,
    -0.85,
    80,
    "wave",
    "Fica à vontade, a casa é sua!",
  );
  // cousin in the light-green t-shirt, chatting by the table
  ctx.person(
    { skin: "#d9a37f", hair: "#18110c", hairStyle: "short", height: 1.76 },
    {
      top: "#9fd8b4",
      topStyle: "tshirt",
      bottom: "#2f3a52",
      bottomStyle: "shorts",
      shoes: "#1e1e1e",
    },
    -2.35,
    -0.35,
    110,
    "talk",
  );
  // girl in the maroon top on the sofa
  const girl = ctx.person(
    {
      skin: "#c98f6c",
      hair: "#140d0a",
      hairStyle: "long",
      height: 1.55,
      female: true,
    },
    {
      top: "#7a2238",
      topStyle: "tshirt",
      bottom: "#8fb0d6",
      bottomStyle: "jeans",
      shoes: "#f0f0f0",
    },
    1.75,
    -3.75,
    -90,
    "sit",
  );
  grandma.position.y = 0.07;
  girl.position.y = 0.09;
  // the partner, greeting in the middle of the living room
  ctx.partner(
    -0.05,
    -3.1,
    28,
    "stand",
    OUTFITS,
    elenaWaiting
      ? "Sua família é um amor, eu já me sinto em casa 💚"
      : "Eles já te amam. Eu avisei! 💚",
  );
  ctx.playerOutfit(OUTFITS);

  /* ---------- spawn and exit ---------- */
  ctx.spawn(1.2, -0.55, 0);
  ctx.exit(1.2, 1.25, 0.6);
}

const scene: SceneModule = {
  id: "casa-vo",
  title: "Casa da vó",
  build,
};

export default scene;
