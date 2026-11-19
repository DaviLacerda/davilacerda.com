import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  emissive,
  fabric,
  metal,
  pbr,
  plaster,
  seeded,
  tiles,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneCtx, SceneModule } from "../fp/types";

/*
 * Caldas Novas (GO), Hot Springs Aparthotel: the couple's room, at night,
 * rebuilt from their own mirror selfies (IMG_5137/5138 at night, IMG_5300,
 * 5301, 5307, 5308 by day). Only the room: the entrance door is the way out.
 *
 * What the photos show, facing the mirror: a tall frameless mirror with four
 * chrome clips on a blush wall, a split air conditioner above it, and on its
 * right a set-back kitchenette niche with beige 10 cm tiles, a white upper
 * cabinet and a dark granite top. In the reflection (behind the camera): an
 * aluminium sliding window on the left wall right next to the mirror wall,
 * looking at a lilac textured wall very close outside, with a sheer and a
 * beige curtain on a rail under the ceiling band; the far wall in a dark
 * taupe/olive with a light-wood headboard panel, a double bed on a brown base
 * with white rumpled sheets, a small wooden bedside table on its left, a light
 * switch at the panel's right end, and a framed sunflower-field panorama;
 * a tray ceiling (lowered band all around, recessed center, small downlights);
 * large light porcelain floor tiles.
 *
 * Plan (meters): interior x[-1.9, 1.9] z[0, 5.4]. Entrance door in the front
 * wall (z = 0) at x[-0.45, 0.45]. Hall z[0, 1.6]: bathroom block on the left
 * (x < -0.6), whose blush face at z = 1.6 holds the mirror; kitchenette on the
 * right (x > 1.27). Bedroom z[1.6, 5.4]: window on the left wall (x = -1.9),
 * bed against the far wall (z = 5.4), right half.
 */

const D = THREE.MathUtils.degToRad;
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function T(
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
  sx = 1,
  sy = sx,
  sz = sx,
) {
  return new THREE.Matrix4().compose(
    v3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
    v3(sx, sy, sz),
  );
}

/* ---------------- geometry plumbing ---------------- */

function flat(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes))
    if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
  if (!g.hasAttribute("normal")) g.computeVertexNormals();
  if (!g.hasAttribute("uv"))
    g.setAttribute(
      "uv",
      new THREE.BufferAttribute(
        new Float32Array(g.getAttribute("position").count * 2),
        2,
      ),
    );
  g.clearGroups();
  return g;
}

/** Box-projected UVs in meters (one texture repeat every `size` m). */
function worldUV(g: THREE.BufferGeometry, size: number, swap = false) {
  const p = g.getAttribute("position");
  const n = g.getAttribute("normal");
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = p.getX(i);
      v = p.getZ(i);
    } else if (ax >= az) {
      u = p.getZ(i);
      v = p.getY(i);
    } else {
      u = p.getX(i);
      v = p.getY(i);
    }
    if (swap) [u, v] = [v, u];
    uv[i * 2] = u / size;
    uv[i * 2 + 1] = v / size;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Collects static parts per material and merges them into one mesh each. */
class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(
    mat: THREE.Material,
    geo: THREE.BufferGeometry,
    m?: THREE.Matrix4,
    uv = 0,
    swap = false,
  ) {
    const g = flat(geo);
    if (m) g.applyMatrix4(m);
    if (uv) worldUV(g, uv, swap);
    const list = this.parts.get(mat) ?? [];
    list.push(g);
    this.parts.set(mat, list);
  }
  box(
    mat: THREE.Material,
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    uv = 0,
    swap = false,
  ) {
    this.add(
      mat,
      new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0),
      T((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
      uv,
      swap,
    );
  }
  rbox(
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    r: number,
    m: THREE.Matrix4,
    uv = 0,
  ) {
    this.add(mat, new RoundedBoxGeometry(w, h, d, 3, r), m, uv);
  }
  flush(parent: THREE.Object3D, noShadow: THREE.Material[] = []) {
    for (const [mat, list] of this.parts) {
      const g = mergeGeometries(list);
      if (!g) continue;
      const m = new THREE.Mesh(g, mat);
      m.castShadow = !noShadow.includes(mat);
      m.receiveShadow = true;
      parent.add(m);
    }
    this.parts.clear();
  }
}

function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  srgb = true,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------------- painted textures ---------------- */

/** The kitchenette's dark granite top (IMG_5300/5301, right edge). */
function graniteMaterial() {
  const map = canvasTex(512, 512, (g, w, h) => {
    const rand = seeded(29);
    g.fillStyle = "#2c2a29";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const t = rand();
      g.fillStyle =
        t < 0.5
          ? "rgba(15,14,14,0.8)"
          : t < 0.8
            ? "rgba(110,104,98,0.7)"
            : t < 0.95
              ? "rgba(150,120,95,0.6)"
              : "rgba(220,215,210,0.8)";
      const s = 1 + rand() * 3.5;
      g.fillRect(rand() * w, rand() * h, s, s * (0.6 + rand() * 0.8));
    }
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.16, metalness: 0 });
}

/** The panoramic print above their bed: a sunflower field under a blue sky. */
function sunflowerPainting() {
  return canvasTex(1024, 342, (g, w, h) => {
    const rand = seeded(19);
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, "#1f5fb8");
    sky.addColorStop(1, "#7fb2e8");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h * 0.62);
    for (let c = 0; c < 9; c++) {
      const cx = rand() * w;
      const cy = h * (0.1 + rand() * 0.35);
      for (let k = 0; k < 7; k++) {
        g.fillStyle = `rgba(255,255,255,${0.75 + rand() * 0.25})`;
        g.beginPath();
        g.ellipse(
          cx + (rand() - 0.5) * 60,
          cy + (rand() - 0.5) * 12,
          14 + rand() * 22,
          9 + rand() * 10,
          0,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
    }
    g.fillStyle = "#3d5a22";
    g.fillRect(0, h * 0.6, w, h * 0.4);
    for (let i = 0; i < 2600; i++) {
      const y = h * 0.6 + Math.pow(rand(), 0.8) * h * 0.4;
      const s = 2 + ((y - h * 0.6) / (h * 0.4)) * 9;
      const x = rand() * w;
      g.fillStyle = rand() < 0.5 ? "#f2c31b" : "#e0a90f";
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#4a2a10";
      g.beginPath();
      g.arc(x, y, s * 0.4, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/**
 * The view out of the window at night: the lilac textured wall a meter away
 * (IMG_5307/5308), in the dark, brighter low down where the room's light
 * spills on it and fading to near black above.
 */
function nightWallTexture() {
  return canvasTex(512, 1024, (g, w, h) => {
    const rand = seeded(83);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#07060c");
    grd.addColorStop(0.45, "#1b1726");
    grd.addColorStop(0.7, "#2d2540");
    grd.addColorStop(1, "#19152a");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    // stucco grain
    for (let i = 0; i < 30000; i++) {
      const v = rand();
      g.fillStyle =
        v < 0.5
          ? "rgba(0,0,0,0.22)"
          : `rgba(150,130,185,${0.05 + rand() * 0.06})`;
      const s = 1 + rand() * 2.5;
      g.fillRect(rand() * w, rand() * h, s, s);
    }
  });
}

/* ---------------- the scene ---------------- */

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  elena: {
    top: "#ff9fc4",
    topStyle: "blouse",
    bottom: "#e9dccb",
    bottomStyle: "shorts",
    shoes: "#2a2a2a",
  },
  davi: {
    top: "#1fb7b2",
    topStyle: "jersey",
    print: "1",
    printColor: "#ff8a1f",
    bottom: "#1d1f22",
    bottomStyle: "shorts",
    shoes: "#1b1b1b",
  },
};

function build(ctx: SceneCtx) {
  const { scene } = ctx;
  const high = ctx.quality === "high";
  const B = new Batch();
  const rand = seeded(2024);

  scene.background = new THREE.Color("#05060a");
  scene.environmentIntensity = 0.14;

  /* ---------- materials (colors taken from their photos) ---------- */
  const M = {
    floor: pbr(tiles("#d3cec5", "#bdb7ad", 4, 41, 0.28)),
    taupe: pbr(plaster("#6a5d4a", 31), { roughness: 0.92 }),
    blush: pbr(plaster("#d9c3ba", 32), { roughness: 0.9 }),
    ceiling: new THREE.MeshStandardMaterial({
      color: "#f2f0ec",
      roughness: 0.92,
    }),
    wood: pbr(woodPlanks("#c9a77b", 5, 4), { roughness: 0.7 }),
    woodDark: pbr(woodPlanks("#6e4a2e", 4, 8), { roughness: 0.6 }),
    white: new THREE.MeshStandardMaterial({
      color: "#f2f0eb",
      roughness: 0.45,
    }),
    sheet: pbr(fabric("#f3f1ec", 21)),
    skirt: pbr(fabric("#4f3426", 22)),
    curtain: pbr(fabric("#d3c4a8", 23), { side: THREE.DoubleSide }),
    sheer: new THREE.MeshStandardMaterial({
      color: "#f3efe6",
      roughness: 1,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    kTile: pbr(tiles("#c8bfaf", "#aea592", 10, 51, 0.3)),
    granite: graniteMaterial(),
    alu: metal("#b4b7ba", 0.35),
    steel: metal("#c9ccce", 0.22),
    chrome: metal("#e4e4e4", 0.08),
    black: new THREE.MeshStandardMaterial({
      color: "#121314",
      roughness: 0.35,
    }),
    grille: new THREE.MeshStandardMaterial({
      color: "#5c5d5f",
      roughness: 0.6,
    }),
    glassPane: new THREE.MeshStandardMaterial({
      color: "#9ab8bc",
      transparent: true,
      opacity: 0.14,
      roughness: 0.03,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    night: new THREE.MeshStandardMaterial({
      map: nightWallTexture(),
      color: "#ffffff",
      roughness: 1,
      emissive: "#ffffff",
      emissiveIntensity: 0.35,
    }),
    ground: new THREE.MeshStandardMaterial({
      color: "#0c0c10",
      roughness: 1,
    }),
  };
  M.night.emissiveMap = M.night.map;

  const H = 2.65;
  const SOFFIT = 2.42;

  /* ---------- floor, tray ceiling, walls ---------- */
  B.box(M.floor, -1.9, -0.05, 0, 1.9, 0, 5.4, 2.4);
  // hall ceiling at the band height; bedroom: lowered band, recessed center
  B.box(M.ceiling, -1.9, SOFFIT, 0, 1.9, SOFFIT + 0.05, 1.6);
  B.box(M.ceiling, -1.9, SOFFIT, 1.6, -1.45, H, 5.4);
  B.box(M.ceiling, 1.45, SOFFIT, 1.6, 1.9, H, 5.4);
  B.box(M.ceiling, -1.45, SOFFIT, 1.6, 1.45, H, 2.0);
  B.box(M.ceiling, -1.45, SOFFIT, 5.0, 1.45, H, 5.4);
  B.box(M.ceiling, -1.45, H, 2.0, 1.45, H + 0.05, 5.0);

  // window opening in the left wall, right next to the mirror wall
  const WZ0 = 1.75;
  const WZ1 = 2.95;
  const SILL = 0.95;
  const WTOP = 2.2;
  // left (window) wall
  B.box(M.taupe, -2.1, 0, 1.6, -1.9, H, WZ0);
  B.box(M.taupe, -2.1, 0, WZ1, -1.9, H, 5.6);
  B.box(M.taupe, -2.1, 0, WZ0, -1.9, SILL, WZ1);
  B.box(M.taupe, -2.1, WTOP, WZ0, -1.9, H, WZ1);
  // right wall: blush along the hall, taupe in the bedroom
  B.box(M.blush, 1.9, 0, -0.2, 2.1, H, 1.6);
  B.box(M.taupe, 1.9, 0, 1.6, 2.1, H, 5.6);
  // far (headboard) wall
  B.box(M.taupe, -2.1, 0, 5.4, 2.1, H, 5.6);
  // front wall with the entrance door opening
  B.box(M.blush, -2.1, 0, -0.2, -0.45, H, 0);
  B.box(M.blush, 0.45, 0, -0.2, 2.1, H, 0);
  B.box(M.blush, -0.45, 2.1, -0.2, 0.45, H, 0);
  ctx.wall(-2.3, 0, -1.9, 5.7);
  ctx.wall(1.9, -0.3, 2.3, 5.7);
  ctx.wall(-2.3, 5.4, 2.3, 5.7);
  ctx.wall(-2.3, -0.4, 2.3, 0);
  // white baseboards
  for (const [x0, z0, x1, z1] of [
    [-1.9, 1.6, -1.885, 5.4],
    [1.885, 1.6, 1.9, 5.4],
    [-1.9, 5.385, 1.9, 5.4],
    [-0.6, 0.015, -0.585, 1.6],
  ] as const)
    B.box(M.white, x0, 0, z0, x1, 0.08, z1);

  /* ---------- bathroom block (left of the hall): blush, the mirror ---------- */
  B.box(M.blush, -1.9, 0, 1.5, -0.6, SOFFIT, 1.6);
  B.box(M.blush, -0.7, 0, 0, -0.6, SOFFIT, 1.5);
  // closed bathroom door facing the hall
  B.box(M.white, -0.6, 0, 0.35, -0.565, 2.05, 1.15);
  B.box(M.white, -0.6, 0, 0.29, -0.55, 2.11, 0.35);
  B.box(M.white, -0.6, 0, 1.15, -0.55, 2.11, 1.21);
  B.box(M.white, -0.6, 2.05, 0.29, -0.55, 2.11, 1.21);
  B.box(M.chrome, -0.565, 1.0, 0.95, -0.54, 1.02, 1.08);
  ctx.wall(-1.9, 0, -0.56, 1.6);
  {
    // tall frameless mirror with four chrome clips (IMG_5137, 5300, 5301)
    const w = 0.8;
    const h = 1.75;
    const mx = -1.25;
    const my = 0.25 + h / 2;
    const mz = 1.605;
    if (high) {
      const mirror = new Reflector(new THREE.PlaneGeometry(w, h), {
        textureWidth: 512,
        textureHeight: 1024,
        color: 0xa4a4a4,
        clipBias: 0.003,
      });
      mirror.position.set(mx, my, mz);
      scene.add(mirror);
    } else {
      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        metal("#cfd3d6", 0.03),
      );
      mirror.position.set(mx, my, mz);
      scene.add(mirror);
    }
    for (const [dx, dy] of [
      [-w / 2 + 0.02, -h / 2 + 0.06],
      [w / 2 - 0.02, -h / 2 + 0.12],
      [-w / 2 + 0.02, h / 2 - 0.3],
      [w / 2 - 0.02, h / 2 - 0.22],
    ] as const)
      B.add(
        M.chrome,
        new THREE.SphereGeometry(0.014, 12, 8),
        T(mx + dx, my + dy, mz + 0.01),
      );

    // split air conditioner above the mirror (IMG_5300, top)
    B.rbox(M.white, 0.9, 0.27, 0.21, 0.04, T(mx, 2.25, 1.6 + 0.105));
    B.box(M.grille, mx - 0.4, 2.125, 1.66, mx + 0.4, 2.135, 1.79);
    B.box(M.grille, mx - 0.38, 2.31, 1.7, mx + 0.38, 2.38, 1.701);
    const led = new THREE.Mesh(
      new THREE.CircleGeometry(0.004, 8),
      emissive("#66d1ff", 2.5),
    );
    led.position.set(mx + 0.35, 2.17, 1.817);
    scene.add(led);
  }

  /* ---------- kitchenette niche (right of the hall) ---------- */
  {
    // beige 10 cm tiles from the floor up on the niche walls
    B.box(M.kTile, 1.885, 0, 0, 1.9, 2.0, 1.6, 1);
    B.box(M.kTile, 0.6, 0, 0.0, 1.9, 2.0, 0.015, 1);
    // white base cabinet, dark granite top
    B.box(M.white, 1.32, 0, 0.12, 1.9, 0.84, 1.55);
    B.box(M.black, 1.315, 0.05, 0.12, 1.32, 0.1, 1.55);
    B.box(M.black, 1.316, 0.12, 0.83, 1.32, 0.82, 0.84);
    for (const z of [0.76, 0.91])
      B.box(M.steel, 1.29, 0.62, z - 0.005, 1.315, 0.74, z + 0.005);
    B.box(M.granite, 1.27, 0.84, 0.015, 1.9, 0.88, 1.58);
    // sink and faucet
    B.box(M.steel, 1.42, 0.881, 0.45, 1.8, 0.884, 0.95);
    B.box(M.grille, 1.46, 0.884, 0.49, 1.76, 0.886, 0.91);
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.018, 0.022, 0.24, 14),
      T(1.84, 1.0, 0.7),
    );
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.012, 0.012, 0.2, 10),
      T(1.75, 1.11, 0.7, 0, 0, Math.PI / 2 + 0.15),
    );
    // white upper cabinet
    B.box(M.white, 1.55, 1.55, 0.03, 1.9, 2.2, 1.55);
    B.box(M.black, 1.548, 1.56, 0.79, 1.551, 2.19, 0.8);
    ctx.wall(1.27, 0, 1.9, 1.6);
  }

  /* ---------- entrance door (closed): the way out ---------- */
  {
    B.box(M.white, -0.53, 0, -0.2, -0.45, 2.18, 0.02);
    B.box(M.white, 0.45, 0, -0.2, 0.53, 2.18, 0.02);
    B.box(M.white, -0.53, 2.1, -0.2, 0.53, 2.18, 0.02);
    B.box(M.woodDark, -0.45, 0, -0.08, 0.45, 2.1, -0.04, 0.9, true);
    // lever handle and the key-card slot by the door
    B.box(M.chrome, 0.3, 1.0, -0.04, 0.32, 1.02, -0.01);
    B.box(M.chrome, 0.2, 1.0, -0.015, 0.32, 1.02, 0.0);
    B.box(M.chrome, 0.29, 0.94, -0.04, 0.35, 1.1, -0.035);
    B.box(M.white, 0.62, 1.05, 0.0, 0.72, 1.17, 0.015);
    // light switch on the bathroom side
    B.box(M.white, -0.68, 1.05, 0.015, -0.62, 1.17, 0.03);
  }

  /* ---------- headboard panel, bed, bedside table, sunflower print ---------- */
  {
    B.box(M.wood, -0.6, 0, 5.37, 1.9, 1.15, 5.4, 0.55);
    B.box(M.wood, -0.6, 1.15, 5.35, 1.9, 1.18, 5.4, 1);
    // switches at the panel's ends (IMG_5137/5138)
    B.box(M.white, -0.36, 0.92, 5.36, -0.24, 1.04, 5.37);
    B.box(M.white, 1.72, 0.92, 5.36, 1.84, 1.04, 5.37);
    const bx0 = 0.17;
    const bx1 = 1.77;
    const bz0 = 3.4;
    const bz1 = 5.36;
    B.box(M.skirt, bx0 + 0.02, 0, bz0, bx1 - 0.02, 0.33, bz1, 0.5);
    B.rbox(
      M.sheet,
      bx1 - bx0,
      0.24,
      bz1 - bz0,
      0.06,
      T((bx0 + bx1) / 2, 0.45, (bz0 + bz1) / 2),
      0.5,
    );
    // the sheets left rumpled, as in the photo
    B.rbox(
      M.sheet,
      bx1 - bx0 + 0.06,
      0.05,
      1.35,
      0.025,
      T((bx0 + bx1) / 2, 0.585, bz0 + 0.62),
      0.5,
    );
    for (let i = 0; i < 7; i++) {
      B.rbox(
        M.sheet,
        0.35 + rand() * 0.4,
        0.06 + rand() * 0.05,
        0.25 + rand() * 0.3,
        0.04,
        T(
          bx0 + 0.3 + rand() * 1.0,
          0.61,
          bz0 + 0.2 + rand() * 1.1,
          0,
          rand() * 3,
          (rand() - 0.5) * 0.2,
        ),
        0.5,
      );
    }
    B.box(M.sheet, bx0 - 0.03, 0.32, bz0, bx0, 0.6, bz0 + 1.3, 0.5);
    B.box(M.sheet, bx1, 0.32, bz0, bx1 + 0.03, 0.6, bz0 + 1.3, 0.5);
    B.box(M.sheet, bx0 - 0.03, 0.3, bz0 - 0.03, bx1 + 0.03, 0.6, bz0, 0.5);
    for (const x of [0.58, 1.36])
      B.rbox(M.sheet, 0.68, 0.17, 0.42, 0.08, T(x, 0.65, 5.1, -0.35), 0.5);
    ctx.wall(bx0 - 0.03, bz0 - 0.05, bx1 + 0.03, 5.4);

    // small wooden bedside table on dark legs (IMG_5301, left of the bed)
    B.box(M.wood, -0.36, 0.5, 4.95, 0.06, 0.54, 5.33, 0.6);
    B.box(M.wood, -0.36, 0.2, 4.95, 0.06, 0.23, 5.33, 0.6);
    for (const [x, z] of [
      [-0.34, 4.97],
      [0.04, 4.97],
      [-0.34, 5.31],
      [0.04, 5.31],
    ] as const)
      B.box(M.black, x - 0.015, 0, z - 0.015, x + 0.015, 0.5, z + 0.015);
    // a phone left on it
    B.add(
      M.black,
      new THREE.BoxGeometry(0.07, 0.15, 0.008),
      T(-0.1, 0.545, 5.1, -Math.PI / 2, 0.3),
    );
    ctx.wall(-0.38, 4.93, 0.08, 5.4);

    // sunflower panorama in a dark frame with a white mat
    const g = new THREE.Group();
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.56, 0.03), M.black);
    g.add(fr);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.48), M.white);
    mat.position.z = 0.016;
    g.add(mat);
    const pic = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 0.36),
      new THREE.MeshStandardMaterial({
        map: sunflowerPainting(),
        roughness: 0.5,
      }),
    );
    pic.position.z = 0.017;
    g.add(pic);
    g.position.set(0.85, 1.72, 5.38);
    g.rotation.y = Math.PI;
    scene.add(g);
  }

  /* ---------- sliding window (left wall), curtains, the night outside ---------- */
  {
    B.box(
      M.granite,
      -1.98,
      SILL - 0.02,
      WZ0 - 0.04,
      -1.86,
      SILL + 0.01,
      WZ1 + 0.04,
    );
    B.box(M.alu, -2.1, SILL, WZ0, -1.95, SILL + 0.04, WZ1);
    B.box(M.alu, -2.1, WTOP - 0.04, WZ0, -1.95, WTOP, WZ1);
    B.box(M.alu, -2.1, SILL, WZ0, -1.95, WTOP, WZ0 + 0.04);
    B.box(M.alu, -2.1, SILL, WZ1 - 0.04, -1.95, WTOP, WZ1);
    const mid = (WZ0 + WZ1) / 2;
    for (const [x, a, b] of [
      [-2.06, WZ0 + 0.04, mid + 0.03],
      [-2.0, mid - 0.03, WZ1 - 0.04],
    ] as const) {
      B.box(M.alu, x - 0.015, SILL + 0.04, a, x + 0.015, WTOP - 0.04, a + 0.04);
      B.box(M.alu, x - 0.015, SILL + 0.04, b - 0.04, x + 0.015, WTOP - 0.04, b);
      B.box(M.alu, x - 0.015, SILL + 0.04, a, x + 0.015, SILL + 0.08, b);
      B.box(M.alu, x - 0.015, WTOP - 0.08, a, x + 0.015, WTOP - 0.04, b);
      B.box(
        M.glassPane,
        x - 0.004,
        SILL + 0.08,
        a + 0.04,
        x + 0.004,
        WTOP - 0.08,
        b - 0.04,
      );
    }
    // latch on the inner sash
    B.box(M.chrome, -1.99, 1.5, mid - 0.06, -1.97, 1.62, mid - 0.04);

    // outside: the lilac wall of the light well, a meter away, in the dark
    const night = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 7), M.night);
    night.position.set(-3.0, 2.5, (WZ0 + WZ1) / 2);
    night.rotation.y = Math.PI / 2;
    scene.add(night);
    B.box(M.ground, -3.0, -0.25, 0.7, -2.1, -0.2, 4.0);
    B.box(M.ground, -3.0, -0.25, 0.7, -2.1, 6, 0.8);
    B.box(M.ground, -3.0, -0.25, 3.9, -2.1, 6, 4.0);

    // curtain rail under the ceiling band and the two curtains
    B.add(
      M.alu,
      new THREE.CylinderGeometry(0.012, 0.012, 3.7, 10),
      T(-1.78, 2.36, 3.48, Math.PI / 2),
    );
    const curtain = (
      mat: THREE.Material,
      w: number,
      folds: number,
      amp: number,
      z: number,
      x: number,
    ) => {
      const geo = new THREE.PlaneGeometry(w, 2.33, folds * 10, 1);
      const p = geo.getAttribute("position");
      for (let i = 0; i < p.count; i++)
        p.setZ(i, Math.sin((p.getX(i) / w) * folds * Math.PI * 2) * amp);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, 1.18, z);
      m.rotation.y = Math.PI / 2;
      m.receiveShadow = true;
      scene.add(m);
    };
    // sheer pulled over the far half of the window, beige drape bunched beside it
    curtain(M.sheer, 1.0, 7, 0.03, 3.05, -1.82);
    curtain(M.curtain, 0.6, 5, 0.045, 3.75, -1.74);
  }

  /* ---------- photo of the couple, on the right wall opposite the window ---------- */
  ctx.photo("caldas-1.webp", 0.5, 0.375, v3(1.885, 1.5, 2.65), -90);

  /* ---------- lights: recessed downlights in the ceiling band ---------- */
  {
    const dl = emissive("#fff1dc", 2.4);
    const disc = new THREE.CircleGeometry(0.045, 16);
    const spots: [number, number][] = [
      [-1.68, 2.4],
      [-1.68, 4.4],
      [1.68, 2.4],
      [1.68, 4.4],
      [-0.6, 5.2],
      [0.6, 5.2],
      [0.0, 0.8],
      [1.2, 0.8],
    ];
    for (const [x, z] of spots) {
      const d = new THREE.Mesh(disc, dl);
      d.rotation.x = Math.PI / 2;
      d.position.set(x, SOFFIT - 0.001, z);
      scene.add(d);
      B.add(
        M.chrome,
        new THREE.TorusGeometry(0.05, 0.006, 6, 20),
        T(x, SOFFIT - 0.003, z, Math.PI / 2),
      );
    }

    // 1: the only shadow caster, a wide warm wash from the recessed center
    const key = new THREE.SpotLight("#ffe0b8", 11, 9, D(68), 0.75, 2);
    key.position.set(0.1, H - 0.05, 3.3);
    key.target.position.set(0.25, 0, 3.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.03;
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 8;
    scene.add(key, key.target);

    // 2-5: the downlights' pools (no shadows)
    const pt = (x: number, y: number, z: number, i: number, d: number) => {
      const l = new THREE.PointLight("#ffe2bf", i, d, 2);
      l.position.set(x, y, z);
      scene.add(l);
    };
    pt(-1.55, 2.3, 3.0, 2.2, 5); // window side; also reaches the wall outside
    pt(1.55, 2.3, 4.0, 2.0, 5);
    pt(0.0, 2.3, 5.0, 1.6, 4); // over the headboard and the print
    pt(0.5, 2.3, 0.8, 2.6, 5); // hall, mirror and kitchenette

    // 6: faint fill so the shadows are never pure black
    scene.add(new THREE.HemisphereLight("#3a3a48", "#1e1610", 0.18));
  }

  B.flush(scene, [M.glassPane, M.sheer, M.night]);

  /* ---------- people, spawn, exit, the pack ---------- */
  // the pack waits on the kitchenette counter, beside the way in
  ctx.pack(1.6, 0.885, 1.25, 90);

  ctx.partner(
    -0.85,
    3.7,
    -17,
    "stand",
    OUTFITS,
    ctx.player === "elena"
      ? "Primeira de muitas viagens. Promessa. ✈️"
      : "Bora pra piscina? Depois a gente volta pro quarto ver série 😄",
  );
  ctx.playerOutfit(OUTFITS);
  ctx.spawn(0, 0.9, 180);
  ctx.exit(0, 0.35, 0.5);
}

const scene: SceneModule = {
  id: "caldas",
  title: "Caldas Novas",
  build,
};

export default scene;
