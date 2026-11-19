import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  bricks,
  concrete,
  emissive,
  fabric,
  marble,
  metal,
  pbr,
  plaster,
  seeded,
  tiles,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneModule } from "../fp/types";

/*
 * Panedoca Pizzeria Artigianale (Rua Carmo Gifoni, 351, Martins, Uberlândia),
 * the first date. A small, intimate room at night: on the left a grey-white
 * brick wall over two teal velvet booths, a warm LED strip grazing the
 * bricks at the top of the backrests, grey-green partitions with a cyan LED
 * in the corner and travertine-marble tables. The couple's booth is the
 * left one, right in the corner where the bricks meet the green front wall.
 * One more small table in the middle; a short counter and a small
 * wood-fired oven at the back right.
 *
 * Plan (meters): x ∈ [-2.8, 2.8], z ∈ [-5, 2.2], ceiling 3.0. Entrance
 * (glass door) on the front wall z = 2.2 at x ≈ 1.75.
 */

const D = Math.PI / 180;
const W0 = -2.8;
const W1 = 2.8;
const Z0 = -5.0;
const Z1 = 2.2;
const H = 3.0;

/* ---------------- geometry helpers ---------------- */

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

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
    _q,
    new THREE.Vector3(sx, sy, sz),
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
      mesh.receiveShadow = true;
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
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 20);
const rbCache = new Map<string, THREE.BufferGeometry>();
function rbox(w: number, h: number, d: number, r: number, seg = 3) {
  const k = `${w}:${h}:${d}:${r}:${seg}`;
  let g = rbCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    rbCache.set(k, g);
  }
  return g;
}

/** Lathe from a profile; with `planar`, UVs are projected from above (pizzas, plates). */
function lathe(pts: [number, number][], seg = 40, planar = 0) {
  const g = new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
  if (planar) {
    const p = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++)
      uv.setXY(
        i,
        p.getX(i) / (2 * planar) + 0.5,
        -p.getZ(i) / (2 * planar) + 0.5,
      );
    uv.needsUpdate = true;
  }
  return g;
}

function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, rand: () => number) => void,
  seed = 1,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  draw(g, seeded(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------------- painted textures ---------------- */

function blob(
  g: CanvasRenderingContext2D,
  rand: () => number,
  x: number,
  y: number,
  r: number,
  wob = 0.3,
  n = 14,
) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - wob / 2 + rand() * wob);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
}

/** A Neapolitan pizza seen from above: leopard-spotted cornicione, sauce, toppings. */
function pizzaTexture(kind: "margherita" | "pesto", seed: number) {
  return canvasTex(
    512,
    512,
    (g, rand) => {
      const c = 256;
      const grd = g.createRadialGradient(c, c, 150, c, c, 256);
      grd.addColorStop(0, "#e8c48c");
      grd.addColorStop(0.55, "#dca866");
      grd.addColorStop(0.85, "#c98a48");
      grd.addColorStop(1, "#8a5428");
      g.fillStyle = grd;
      g.fillRect(0, 0, 512, 512);
      // leopard spotting on the crust
      for (let i = 0; i < 420; i++) {
        const a = rand() * Math.PI * 2;
        const rr = 200 + rand() * 52;
        const s = 1.5 + rand() * (rand() < 0.15 ? 9 : 4);
        g.fillStyle = `rgba(${40 + rand() * 30},${20 + rand() * 15},10,${0.45 + rand() * 0.5})`;
        blob(g, rand, c + Math.cos(a) * rr, c + Math.sin(a) * rr, s, 0.5, 8);
      }
      for (let i = 0; i < 160; i++) {
        const a = rand() * Math.PI * 2;
        const rr = 205 + rand() * 40;
        g.fillStyle = `rgba(250,225,170,${0.15 + rand() * 0.2})`;
        blob(
          g,
          rand,
          c + Math.cos(a) * rr,
          c + Math.sin(a) * rr,
          3 + rand() * 6,
          0.5,
          8,
        );
      }
      // sauce
      g.fillStyle = kind === "margherita" ? "#a8301b" : "#5f7f2a";
      blob(g, rand, c, c, 198, 0.06, 48);
      for (let i = 0; i < 220; i++) {
        const a = rand() * Math.PI * 2;
        const rr = rand() * 185;
        g.fillStyle =
          kind === "margherita"
            ? `rgba(${120 + rand() * 80},${20 + rand() * 30},10,0.35)`
            : `rgba(${50 + rand() * 50},${90 + rand() * 50},${20 + rand() * 20},0.35)`;
        blob(
          g,
          rand,
          c + Math.cos(a) * rr,
          c + Math.sin(a) * rr,
          4 + rand() * 14,
          0.5,
          9,
        );
      }
      if (kind === "margherita") {
        // fior di latte
        for (let i = 0; i < 9; i++) {
          const a = rand() * Math.PI * 2;
          const rr = 30 + rand() * 120;
          const x = c + Math.cos(a) * rr;
          const y = c + Math.sin(a) * rr;
          const r = 22 + rand() * 18;
          g.fillStyle = "rgba(235,205,150,0.8)";
          blob(g, rand, x, y, r + 5, 0.35);
          g.fillStyle = "#f6efdf";
          blob(g, rand, x, y, r, 0.35);
          g.fillStyle = "rgba(205,150,80,0.35)";
          blob(g, rand, x + r * 0.3, y - r * 0.2, r * 0.35, 0.5);
        }
        // basil
        for (let i = 0; i < 5; i++) {
          const a = rand() * Math.PI * 2;
          const rr = 40 + rand() * 120;
          g.save();
          g.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
          g.rotate(rand() * Math.PI);
          g.fillStyle = "#2b5e1e";
          g.beginPath();
          g.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "rgba(160,210,120,0.6)";
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(-22, 0);
          g.lineTo(22, 0);
          g.stroke();
          g.restore();
        }
      } else {
        // confit cherry tomatoes and burrata
        for (let i = 0; i < 14; i++) {
          const a = rand() * Math.PI * 2;
          const rr = 20 + rand() * 160;
          const x = c + Math.cos(a) * rr;
          const y = c + Math.sin(a) * rr;
          g.fillStyle = "#8f1d10";
          blob(g, rand, x, y, 17, 0.2);
          g.fillStyle = "#d4442a";
          blob(g, rand, x, y, 13, 0.2);
          g.fillStyle = "rgba(255,170,120,0.7)";
          blob(g, rand, x - 3, y - 3, 5, 0.4, 8);
        }
        for (let i = 0; i < 4; i++) {
          const a = rand() * Math.PI * 2;
          const rr = rand() * 110;
          g.fillStyle = "#f7f2e6";
          blob(
            g,
            rand,
            c + Math.cos(a) * rr,
            c + Math.sin(a) * rr,
            26 + rand() * 10,
            0.45,
          );
        }
        for (let i = 0; i < 300; i++) {
          g.fillStyle = `rgba(245,235,200,${0.5 + rand() * 0.4})`;
          const a = rand() * Math.PI * 2;
          const rr = rand() * 190;
          g.fillRect(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 2, 2);
        }
      }
      // olive oil sheen
      for (let i = 0; i < 40; i++) {
        const a = rand() * Math.PI * 2;
        const rr = rand() * 180;
        g.fillStyle = "rgba(255,210,90,0.18)";
        blob(
          g,
          rand,
          c + Math.cos(a) * rr,
          c + Math.sin(a) * rr,
          3 + rand() * 8,
          0.4,
          8,
        );
      }
    },
    seed,
  );
}

function signTexture() {
  return canvasTex(1024, 400, (g) => {
    g.clearRect(0, 0, 1024, 400);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.font = "italic 700 190px Georgia, 'Times New Roman', serif";
    g.fillText("Panedoca", 512, 220);
    g.font = "600 46px Georgia, serif";
    g.fillText("P I Z Z E R I A   A R T I G I A N A L E", 512, 320);
    g.fillRect(212, 350, 600, 4);
  });
}

function menuTexture() {
  return canvasTex(1024, 720, (g, rand) => {
    g.fillStyle = "#1c1d1b";
    g.fillRect(0, 0, 1024, 720);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(255,255,255,${rand() * 0.04})`;
      g.fillRect(rand() * 1024, rand() * 720, 2 + rand() * 30, 1 + rand() * 3);
    }
    g.fillStyle = "#efe8d8";
    g.textAlign = "center";
    g.font = "italic 700 64px Georgia, serif";
    g.fillText("Le Pizze", 512, 90);
    g.font = "24px Georgia, serif";
    g.fillStyle = "#d6b46a";
    g.fillText("massa de fermentação natural · forno a lenha", 512, 132);
    const items: [string, string, string][] = [
      ["Marinara", "tomate San Marzano, alho, orégano", "46"],
      ["Margherita", "fior di latte, manjericão, azeite", "54"],
      ["Pesto e Pomodorini", "pesto, tomatinhos confit, burrata", "66"],
      ["Diavola", "salame picante, fior di latte", "62"],
      ["Quattro Formaggi", "gorgonzola, parmesão, provolone", "68"],
      ["Mortadella", "mortadela, pistache, stracciatella", "72"],
    ];
    g.textAlign = "left";
    items.forEach(([n, d, p], i) => {
      const y = 205 + i * 82;
      g.fillStyle = "#f3eee2";
      g.font = "600 38px Georgia, serif";
      g.fillText(n, 90, y);
      g.fillStyle = "#b9b2a2";
      g.font = "italic 24px Georgia, serif";
      g.fillText(d, 90, y + 32);
      g.fillStyle = "#e6c77f";
      g.font = "600 36px Georgia, serif";
      g.textAlign = "right";
      g.fillText(p, 934, y);
      g.textAlign = "left";
    });
  });
}

function exteriorTexture() {
  return canvasTex(1024, 512, (g, rand) => {
    const sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, "#0b1020");
    sky.addColorStop(0.55, "#1a1c26");
    sky.addColorStop(0.75, "#24211f");
    sky.addColorStop(1, "#3a3530");
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 512);
    // buildings across the street
    for (let i = 0; i < 9; i++) {
      const x = i * 120 - 20 + rand() * 30;
      const top = 120 + rand() * 120;
      g.fillStyle = `rgb(${18 + rand() * 12},${18 + rand() * 12},${24 + rand() * 12})`;
      g.fillRect(x, top, 110 + rand() * 30, 360 - top);
      for (let k = 0; k < 6; k++) {
        if (rand() < 0.5) continue;
        g.fillStyle = `rgba(255,${190 + rand() * 50},${120 + rand() * 60},${0.4 + rand() * 0.5})`;
        g.fillRect(
          x + 10 + rand() * 80,
          top + 20 + rand() * (300 - top),
          18,
          14,
        );
      }
    }
    // street, sidewalk and lamps
    g.fillStyle = "#2a2724";
    g.fillRect(0, 360, 1024, 152);
    g.fillStyle = "#4a443d";
    g.fillRect(0, 430, 1024, 82);
    for (const lx of [140, 560, 930]) {
      const halo = g.createRadialGradient(lx, 150, 0, lx, 150, 120);
      halo.addColorStop(0, "rgba(255,200,130,0.95)");
      halo.addColorStop(0.15, "rgba(255,170,90,0.5)");
      halo.addColorStop(1, "rgba(255,150,70,0)");
      g.fillStyle = halo;
      g.fillRect(lx - 120, 30, 240, 240);
      g.fillStyle = "#111";
      g.fillRect(lx - 3, 150, 6, 280);
      const pool = g.createRadialGradient(lx, 420, 0, lx, 420, 160);
      pool.addColorStop(0, "rgba(255,180,100,0.35)");
      pool.addColorStop(1, "rgba(255,180,100,0)");
      g.fillStyle = pool;
      g.fillRect(lx - 160, 360, 320, 152);
    }
    // a parked car
    g.fillStyle = "#15171b";
    g.beginPath();
    g.roundRect(300, 330, 230, 70, 20);
    g.fill();
    g.fillStyle = "rgba(255,40,30,0.8)";
    g.fillRect(304, 360, 10, 8);
  });
}

function posterTexture(kind: number) {
  return canvasTex(512, 720, (g, rand) => {
    if (kind === 0) {
      g.fillStyle = "#e9dcc2";
      g.fillRect(0, 0, 512, 720);
      g.fillStyle = "#d9583a";
      g.beginPath();
      g.arc(330, 220, 90, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2f4a5a";
      g.beginPath();
      g.moveTo(0, 520);
      g.lineTo(160, 300);
      g.lineTo(220, 330);
      g.lineTo(300, 260);
      g.lineTo(512, 520);
      g.closePath();
      g.fill();
      g.fillStyle = "#1f6f8a";
      g.fillRect(0, 520, 512, 200);
      g.fillStyle = "#e9dcc2";
      for (let i = 0; i < 30; i++)
        g.fillRect(rand() * 512, 540 + rand() * 160, 20 + rand() * 40, 2);
      g.fillStyle = "#1c1c1c";
      g.font = "700 92px Georgia, serif";
      g.textAlign = "center";
      g.fillText("NAPOLI", 256, 130);
    } else {
      g.fillStyle = "#1e3b33";
      g.fillRect(0, 0, 512, 720);
      g.fillStyle = "#c8321e";
      g.beginPath();
      g.ellipse(256, 380, 150, 170, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,190,160,0.45)";
      g.beginPath();
      g.ellipse(200, 320, 40, 60, -0.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3f7a2a";
      for (let i = 0; i < 6; i++) {
        g.save();
        g.translate(256, 215);
        g.rotate((i / 6) * Math.PI * 2);
        g.beginPath();
        g.ellipse(0, -30, 14, 40, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      g.fillStyle = "#efe6d2";
      g.font = "italic 700 64px Georgia, serif";
      g.textAlign = "center";
      g.fillText("Pomodoro", 256, 640);
    }
  });
}

function fireTexture() {
  return canvasTex(256, 160, (g, rand) => {
    g.fillStyle = "#0a0503";
    g.fillRect(0, 0, 256, 160);
    const glow = g.createRadialGradient(128, 170, 10, 128, 170, 200);
    glow.addColorStop(0, "#fff1b0");
    glow.addColorStop(0.2, "#ffb347");
    glow.addColorStop(0.5, "#c8471a");
    glow.addColorStop(1, "#1a0603");
    g.fillStyle = glow;
    g.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 18; i++) {
      const x = 40 + rand() * 176;
      g.fillStyle = `rgba(255,${180 + rand() * 60},${80 + rand() * 60},0.55)`;
      g.beginPath();
      g.moveTo(x - 14, 160);
      g.quadraticCurveTo(
        x - 6 + rand() * 12,
        100 - rand() * 50,
        x + rand() * 10 - 5,
        40 + rand() * 50,
      );
      g.quadraticCurveTo(x + 8, 110, x + 14, 160);
      g.fill();
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = "#2a1208";
      g.fillRect(30 + rand() * 190, 140 + rand() * 12, 40 + rand() * 30, 8);
    }
  });
}

function canTexture() {
  return canvasTex(256, 128, (g) => {
    g.fillStyle = "#c4161c";
    g.fillRect(0, 0, 256, 128);
    g.strokeStyle = "#f4f0ea";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(0, 90);
    g.bezierCurveTo(70, 60, 150, 120, 256, 80);
    g.stroke();
    g.fillStyle = "#f4f0ea";
    g.font = "italic 700 34px Georgia, serif";
    g.fillText("Cola", 30, 60);
    g.fillText("Cola", 158, 60);
  });
}

function labelTexture() {
  return canvasTex(256, 64, (g) => {
    g.fillStyle = "#151515";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#e8e8e8";
    g.font = "700 26px Arial, sans-serif";
    g.fillText("ÁGUA MINERAL", 20, 40);
    g.fillText("ÁGUA MINERAL", 150, 40);
  });
}

function boxTexture() {
  return canvasTex(256, 256, (g, rand) => {
    g.fillStyle = "#b98d5c";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(80,50,20,${rand() * 0.08})`;
      g.fillRect(rand() * 256, rand() * 256, 2, 2);
    }
    g.strokeStyle = "#3b2a1c";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(128, 128, 70, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#3b2a1c";
    g.textAlign = "center";
    g.font = "italic 700 34px Georgia, serif";
    g.fillText("Panedoca", 128, 140);
  });
}

/** Sobel normal map from a grayscale height canvas. */
function normalMapFrom(h: HTMLCanvasElement, strength: number) {
  const n = h.width;
  const hg = h.getContext("2d");
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  if (!hg || !g) throw new Error("2d canvas unavailable");
  const src = hg.getImageData(0, 0, n, n).data;
  const out = g.createImageData(n, n);
  const at = (x: number, y: number) =>
    (src[(((y + n) % n) * n + ((x + n) % n)) * 4] ?? 128) / 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * n + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / len) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

/**
 * Panedoca's wall: long, thin, rough cement-stone bricks (≈ 30 × 7.5 cm) in
 * grey-white with a hint of mauve, deep mortar joints. One tile = 1.2 m.
 */
function stoneBrickMaterial() {
  const n = 1024;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("2d canvas unavailable");
    return { c, g };
  };
  const a = mk();
  const h = mk();
  const r = mk();
  const rand = seeded(77);
  const rows = 16;
  const bh = n / rows;
  const bw = bh * 4.1;
  a.g.fillStyle = "#6f6a65";
  a.g.fillRect(0, 0, n, n);
  h.g.fillStyle = "#1a1a1a";
  h.g.fillRect(0, 0, n, n);
  r.g.fillStyle = "#f2f2f2";
  r.g.fillRect(0, 0, n, n);
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * bw * 0.5 + (row % 4 === 1 ? bw * 0.18 : 0);
    for (let x = -bw * 2; x < n + bw; x += bw) {
      const px = x + off + 3;
      const py = row * bh + 3;
      const w = bw - 5 - rand() * 2;
      const hh = bh - 5;
      const tone = rand();
      const base =
        tone < 0.15
          ? [192, 181, 178]
          : tone < 0.3
            ? [212, 208, 200]
            : [200 + rand() * 14, 195 + rand() * 12, 187 + rand() * 12];
      const v = 150 + rand() * 40;
      for (const shift of [-n, 0, n]) {
        const X = px + shift;
        if (X > n || X + w < 0) continue;
        a.g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        a.g.fillRect(X, py, w, hh);
        h.g.fillStyle = `rgb(${v},${v},${v})`;
        h.g.fillRect(X, py, w, hh);
        h.g.fillStyle = "rgba(60,60,60,0.5)";
        h.g.fillRect(X, py + hh - 3, w, 3);
        h.g.fillRect(X + w - 3, py, 3, hh);
      }
      // rough face: pits, flecks and trowel swirls
      for (let k = 0; k < 70; k++) {
        const cx = px + rand() * w;
        const cy = py + rand() * hh;
        const s = 1 + rand() * 4;
        const sy = s * (0.5 + rand());
        const dark = rand() < 0.6;
        const al = 0.08 + rand() * 0.14;
        for (const shift of [-n, 0, n]) {
          a.g.fillStyle = dark
            ? `rgba(70,60,55,${al})`
            : `rgba(255,255,250,${al})`;
          a.g.fillRect(cx + shift, cy, s, sy);
          h.g.fillStyle = dark
            ? "rgba(40,40,40,0.5)"
            : "rgba(220,220,220,0.35)";
          h.g.fillRect(cx + shift, cy, s, sy);
        }
      }
      for (let k = 0; k < 3; k++) {
        const cx = px + rand() * w;
        const cy = py + hh * 0.5;
        const rad = 8 + rand() * 20;
        const s0 = Math.PI * (0.1 + rand());
        const s1 = Math.PI * (1.2 + rand());
        const col = rand() < 0.5 ? "90,90,90" : "200,200,200";
        const lw = 1 + rand() * 2;
        for (const shift of [-n, 0, n]) {
          h.g.strokeStyle = `rgba(${col},0.35)`;
          h.g.lineWidth = lw;
          h.g.beginPath();
          h.g.arc(cx + shift, cy, rad, s0, s1);
          h.g.stroke();
        }
      }
    }
  }
  for (let i = 0; i < 40000; i++) {
    const v = Math.floor(rand() * 255);
    a.g.fillStyle = `rgba(${v},${v},${v},0.035)`;
    a.g.fillRect(rand() * n, rand() * n, 1 + rand() * 2, 1 + rand() * 2);
    h.g.fillStyle = `rgba(${v},${v},${v},0.12)`;
    h.g.fillRect(rand() * n, rand() * n, 1 + rand() * 2, 1 + rand() * 2);
  }
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return new THREE.MeshStandardMaterial({
    map: tex(a.c, true),
    normalMap: tex(normalMapFrom(h.c, 6), false),
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: tex(r.c, false),
    roughness: 1,
  });
}

/* ---------------- the scene ---------------- */

const outfits: { davi: Outfit; elena: Outfit } = {
  davi: {
    top: "#5a3b2b",
    topStyle: "tshirt",
    bottom: "#2f3542",
    bottomStyle: "jeans",
    shoes: "#f2f2f2",
  },
  elena: {
    top: "#f3eee6",
    topStyle: "tank",
    bottom: "#22252d",
    bottomStyle: "jeans",
    shoes: "#f2f2f2",
  },
};

const scene: SceneModule = {
  id: "panedoca",
  title: "Panedoca",
  build(ctx) {
    const high = ctx.quality === "high";
    const root = ctx.scene;
    root.background = new THREE.Color("#050505");
    RectAreaLightUniformsLib.init();
    const B = new Batch();
    const rand = seeded(2024);

    /* ---------- materials ---------- */
    const noCast = <T extends THREE.Material>(m: T) => {
      m.userData.noCast = true;
      return m;
    };
    const floorMat = pbr(tiles("#4f4a45", "#3a3633", 2, 31, 0.45), {
      roughness: 1,
    });
    const brickMat = stoneBrickMaterial();
    const greenMat = pbr(plaster("#1d3a33", 41));
    const ceilMat = pbr(plaster("#161616", 43));
    const partMat = pbr(plaster("#7f8c84", 45));
    const whiteTile = pbr(tiles("#ece8df", "#bdb6aa", 4, 47, 0.2));
    const velvetMaps = fabric("#0f4b4e", 51);
    const velvet = new THREE.MeshPhysicalMaterial({
      color: "#08393c",
      roughness: 0.9,
      sheen: 0.8,
      sheenColor: new THREE.Color("#2c8a86"),
      sheenRoughness: 0.4,
      normalMap: velvetMaps.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
    });
    const darkWood = pbr(woodPlanks("#3d2a1e", 6, 53));
    const warmWood = pbr(woodPlanks("#8a5a36", 8, 55));
    const blackMetal = metal("#1b1b1b", 0.45);
    const brass = new THREE.MeshStandardMaterial({
      color: "#b48a4c",
      metalness: 0.65,
      roughness: 0.38,
    });
    const copper = metal("#b0663e", 0.38);
    const steel = metal("#bfc3c6", 0.28);
    const travertine = pbr(marble("#e2d3bb", "rgba(150,115,80,0.45)", 57));
    const carrara = pbr(marble("#efece6", "rgba(95,95,105,0.28)", 59));
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: "#f4f1ea",
      roughness: 0.25,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });
    const glassware = new THREE.MeshPhysicalMaterial({
      color: "#e8f2f0",
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      clearcoat: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const darkPaint = pbr(plaster("#14211d", 61));
    const ledWarm = noCast(emissive("#ffb76b", 5));
    const ledCyan = noCast(emissive("#2fe6e0", 4));
    const bulbMat = noCast(emissive("#ffc27a", 6));
    const sootMat = new THREE.MeshStandardMaterial({
      color: "#120a06",
      roughness: 1,
    });
    const cream = pbr(fabric("#bfae92", 79));
    const rust = pbr(fabric("#93451f", 81));

    /* ---------- shell ---------- */
    const L = Z1 - Z0;
    const Wd = W1 - W0;
    /** Offsets along the brick wall: `lx(v)` is v meters from it, written as if the wall were at x = -4. */
    const lx = (v: number) => W0 + v + 4;
    const KX = 0.2; // the kitchen starts at this x, behind the counter
    B.add(
      new THREE.PlaneGeometry(Wd, L),
      floorMat,
      M((W0 + W1) / 2, 0, (Z0 + Z1) / 2, 0, -Math.PI / 2),
      1.2,
    );
    B.add(
      new THREE.PlaneGeometry(Wd, L),
      ceilMat,
      M((W0 + W1) / 2, H, (Z0 + Z1) / 2, 0, Math.PI / 2),
      2,
    );
    // left: brick wall
    B.add(
      new THREE.PlaneGeometry(L, H),
      brickMat,
      M(W0, H / 2, (Z0 + Z1) / 2, Math.PI / 2),
      1.2,
    );
    // back wall: dining part green, kitchen part white tiles to 2.0 m then green
    B.add(
      new THREE.PlaneGeometry(KX - W0, H),
      greenMat,
      M((W0 + KX) / 2, H / 2, Z0),
      2,
    );
    B.add(
      new THREE.PlaneGeometry(W1 - KX, 2.0),
      whiteTile,
      M((KX + W1) / 2, 1.0, Z0 + 0.001),
      0.6,
    );
    B.add(
      new THREE.PlaneGeometry(W1 - KX, H - 2.0),
      greenMat,
      M((KX + W1) / 2, 2.0 + (H - 2.0) / 2, Z0),
      2,
    );
    // right wall
    B.add(
      new THREE.PlaneGeometry(L, H),
      greenMat,
      M(W1, H / 2, (Z0 + Z1) / 2, -Math.PI / 2),
      2,
    );
    // front wall: solid in the couple's corner, then the shop window (x -0.5..1.0) and the door (x 1.3..2.2)
    const front = (x0: number, x1: number, y0: number, y1: number) =>
      B.add(
        new THREE.PlaneGeometry(x1 - x0, y1 - y0),
        greenMat,
        M((x0 + x1) / 2, (y0 + y1) / 2, Z1, Math.PI),
        2,
      );
    front(W0, -0.5, 0, H);
    front(-0.5, 1.0, 0, 0.6);
    front(-0.5, 1.0, 2.4, H);
    front(1.0, 1.3, 0, H);
    front(1.3, 2.2, 2.15, H);
    front(2.2, W1, 0, H);
    ctx.wall(W0 - 1, Z0 - 1, W0, Z1 + 1);
    ctx.wall(W1, Z0 - 1, W1 + 1, Z1 + 1);
    ctx.wall(W0 - 1, Z0 - 1, W1 + 1, Z0);
    ctx.wall(W0 - 1, Z1, W1 + 1, Z1 + 1);

    // wainscot and skirting on the green walls
    const cz0 = -3.6;
    const cz1 = -3.05;
    B.add(
      unitBox,
      darkWood,
      M(W1 - 0.01, 0.55, (cz1 + Z1) / 2, 0, 0, 0, 0.02, 1.1, Z1 - cz1),
      1,
    );
    B.add(
      unitBox,
      brass,
      M(W1 - 0.025, 1.11, (cz1 + Z1) / 2, 0, 0, 0, 0.02, 0.02, Z1 - cz1),
    );
    for (const [x0, x1, h] of [
      [-0.5, 1.0, 0.6],
      [1.0, 1.3, 1.1],
      [2.2, W1, 1.1],
    ] as const) {
      B.add(
        unitBox,
        darkWood,
        M((x0 + x1) / 2, h / 2, Z1 - 0.01, 0, 0, 0, x1 - x0, h, 0.02),
        1,
      );
    }
    B.add(
      unitBox,
      darkWood,
      M((W0 + KX) / 2, 0.05, Z0 + 0.01, 0, 0, 0, KX - W0, 0.1, 0.02),
      1,
    );

    // exposed duct and AC unit
    const duct = metal("#8c9095", 0.55);
    B.add(
      unitCyl,
      duct,
      M(1.0, H - 0.25, (Z0 + Z1) / 2, 0, Math.PI / 2, 0, 0.12, L - 0.1, 0.12),
    );
    for (let z = Z0 + 0.6; z < Z1; z += 1.6)
      B.add(
        unitBox,
        blackMetal,
        M(1.0, H - 0.08, z, 0, 0, 0, 0.02, 0.16, 0.02),
      );
    for (let z = Z0 + 0.5; z < Z1; z += 1.2)
      B.add(
        unitCyl,
        duct,
        M(1.0, H - 0.25, z, 0, Math.PI / 2, 0, 0.13, 0.03, 0.13),
      );
    B.add(
      rbox(0.9, 0.3, 0.22, 0.04),
      new THREE.MeshStandardMaterial({ color: "#e9e9e6", roughness: 0.4 }),
      M(W1 - 0.12, 2.55, 0.4, Math.PI / 2),
    );

    /* ---------- the booths along the brick wall: two bays, the couple's in the front corner ---------- */
    const bayEdges = [-1.75, 0.2, Z1 - 0.06];
    const bayCenters = [(-1.75 + 0.2) / 2, (0.2 + Z1 - 0.06) / 2];
    const hz = bayCenters[1] ?? 1.17; // the couple's table
    const oz2 = bayCenters[0] ?? -0.78; // the other booth
    const benchFront = lx(-3.38);
    const bz0 = bayEdges[0] ?? -1.75;
    const bLen = Z1 - bz0;
    const bMid = (Z1 + bz0) / 2;
    // plinth and seat base
    B.add(
      unitBox,
      darkWood,
      M((W0 + benchFront) / 2, 0.2, bMid, 0, 0, 0, benchFront - W0, 0.4, bLen),
      1,
    );
    B.add(
      unitBox,
      blackMetal,
      M(benchFront + 0.005, 0.04, bMid, 0, 0, 0, 0.01, 0.08, bLen),
    );
    for (let b = 0; b < 2; b++) {
      const z0 = (bayEdges[b] ?? 0) + 0.06;
      const z1 = (bayEdges[b + 1] ?? 0) - 0.06;
      const len = z1 - z0;
      // seat cushion
      B.add(
        rbox(0.5, 0.1, len - 0.02, 0.035),
        velvet,
        M(lx(-3.64), 0.45, (z0 + z1) / 2),
      );
      // channel-tufted backrest
      const n = Math.round(len / 0.21);
      const cw = len / n;
      for (let i = 0; i < n; i++) {
        B.add(
          rbox(0.13, 0.6, cw - 0.012, 0.05),
          velvet,
          M(lx(-3.9), 0.8, z0 + cw * (i + 0.5), 0, 0, -6 * D),
        );
      }
    }
    // ledge cap with the LED strip grazing the bricks
    B.add(
      unitBox,
      darkWood,
      M(lx(-3.92), 1.11, bMid, 0, 0, 0, 0.16, 0.04, bLen),
      1,
    );
    B.add(
      unitBox,
      ledWarm,
      M(lx(-3.985), 1.137, bMid, 0, 0, 0, 0.02, 0.012, bLen),
    );
    ctx.wall(W0, bz0 - 0.1, benchFront, Z1);

    // partitions with a cyan LED in the corner; the last one is the grey-green pillar of the corner, against the front wall
    for (const z of bayEdges) {
      B.add(
        unitBox,
        partMat,
        M(lx(-3.52), 1.2, z, 0, 0, 0, 0.96, 2.4, 0.12),
        1,
      );
      B.add(
        unitBox,
        blackMetal,
        M(lx(-3.04), 1.2, z, 0, 0, 0, 0.012, 2.4, 0.125),
      );
      for (const s of [-1, 1])
        if (z + s * 0.062 < Z1)
          B.add(
            unitBox,
            ledCyan,
            M(lx(-3.965), 1.75, z + s * 0.062, 0, 0, 0, 0.012, 1.25, 0.008),
          );
      ctx.wall(W0, z - 0.07, lx(-3.0), Math.min(Z1, z + 0.07));
    }
    // brass sconces on the bricks, one per bay
    for (const z of bayCenters) {
      B.add(unitBox, brass, M(lx(-3.97), 1.95, z, 0, 0, 0, 0.06, 0.3, 0.22));
      B.add(
        unitBox,
        ledWarm,
        M(lx(-3.935), 1.795, z, 0, 0, 0, 0.012, 0.01, 0.18),
      );
      B.add(
        unitBox,
        ledWarm,
        M(lx(-3.935), 2.105, z, 0, 0, 0, 0.012, 0.01, 0.18),
      );
    }
    // the brass electrical cover from the photo, by the couple's table
    B.add(
      unitBox,
      brass,
      M(lx(-3.985), 2.25, hz + 0.6, 0, 0, 0, 0.02, 0.32, 0.26),
    );

    // cushions (beige and rust, as in the photos)
    const cushion = rbox(0.38, 0.34, 0.12, 0.06, 4);
    B.add(
      cushion,
      cream,
      M(lx(-3.76), 0.66, hz + 0.72, 90 * D + 8 * D, -14 * D, 8 * D),
    );
    B.add(
      cushion,
      rust,
      M(lx(-3.76), 0.66, oz2 - 0.65, 90 * D - 10 * D, -14 * D, -6 * D),
    );

    /* ---------- tables and chairs ---------- */
    const tableBase = mergedLocal([
      [unitCyl, M(0, 0.38, 0, 0, 0, 0, 0.035, 0.68, 0.035)],
      [unitBox, M(0, 0.02, 0, 45 * D, 0, 0, 0.6, 0.03, 0.06)],
      [unitBox, M(0, 0.02, 0, -45 * D, 0, 0, 0.6, 0.03, 0.06)],
      [unitBox, M(0, 0.71, 0, 0, 0, 0, 0.4, 0.02, 0.4)],
    ]);
    const topGeo = rbox(1, 0.03, 1, 0.008, 2);
    const tableTops: THREE.Matrix4[] = [];
    const tableBases: THREE.Matrix4[] = [];
    const addTable = (x: number, z: number, w: number, d: number) => {
      tableTops.push(M(x, 0.735, z, 0, 0, 0, w, 1, d));
      tableBases.push(M(x, 0, z));
      ctx.wall(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    };
    // bistro chair, facing +Z
    const chairMetal = mergedLocal([
      ...[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz): [THREE.BufferGeometry, THREE.Matrix4] => [
          unitCyl,
          M(
            sx * 0.18,
            0.22,
            sz * 0.18,
            0,
            sz * -3 * D,
            sx * 3 * D,
            0.011,
            0.45,
            0.011,
          ),
        ]),
      ),
      [unitCyl, M(-0.18, 0.66, -0.2, 0, -8 * D, 0, 0.011, 0.42, 0.011)],
      [unitCyl, M(0.18, 0.66, -0.2, 0, -8 * D, 0, 0.011, 0.42, 0.011)],
      [
        new THREE.TorusGeometry(0.235, 0.008, 6, 32),
        M(0, 0.17, 0, 0, Math.PI / 2, 0),
      ],
    ]);
    const chairWood = mergedLocal([
      [rbox(0.44, 0.035, 0.42, 0.012), M(0, 0.46, 0)],
      [rbox(0.42, 0.1, 0.025, 0.01), M(0, 0.8, -0.225, 0, -8 * D)],
      [rbox(0.42, 0.04, 0.02, 0.008), M(0, 0.64, -0.21, 0, -8 * D)],
    ]);
    const chairs: THREE.Matrix4[] = [];
    const addChair = (x: number, z: number, yawDeg: number, solid = true) => {
      chairs.push(M(x, 0, z, yawDeg * D));
      if (solid) ctx.wall(x - 0.22, z - 0.22, x + 0.22, z + 0.22);
    };

    // the two booth tables, and one small two-top in the middle of the room
    const TX = lx(-2.92);
    for (const z of bayCenters) {
      addTable(TX, z, 0.8, 0.95);
      addChair(lx(-2.2), z, -90);
    }
    const mx = 0.75;
    const mz = -0.9;
    addTable(mx, mz, 0.65, 0.65);
    addChair(mx, mz - 0.56, 0);
    addChair(mx, mz + 0.56, 180);
    const inst = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material | THREE.Material[],
      ms: THREE.Matrix4[],
      cast = true,
    ) => {
      const im = new THREE.InstancedMesh(geo, mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = cast;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      root.add(im);
      return im;
    };
    inst(topGeo, travertine, tableTops);
    inst(tableBase, blackMetal, tableBases);
    inst(chairMetal, blackMetal, chairs);
    inst(chairWood, warmWood, chairs);

    /* ---------- tableware ---------- */
    const plateGeo = lathe(
      [
        [0, 0],
        [0.09, 0],
        [0.1, 0.004],
        [0.155, 0.018],
        [0.166, 0.022],
        [0.163, 0.024],
        [0.13, 0.012],
        [0.11, 0.008],
        [0, 0.008],
      ],
      48,
    );
    const pizzaGeo = lathe(
      [
        [0, 0],
        [0.15, 0],
        [0.156, 0.008],
        [0.155, 0.016],
        [0.149, 0.024],
        [0.14, 0.026],
        [0.13, 0.017],
        [0.12, 0.011],
        [0.06, 0.01],
        [0, 0.011],
      ],
      56,
      0.158,
    );
    const tumblerGeo = lathe([
      [0, 0],
      [0.034, 0],
      [0.04, 0.125],
      [0.038, 0.125],
      [0.032, 0.012],
      [0, 0.012],
    ]);
    const bottleGeo = lathe([
      [0, 0],
      [0.032, 0],
      [0.034, 0.02],
      [0.033, 0.13],
      [0.03, 0.15],
      [0.016, 0.19],
      [0.013, 0.205],
      [0, 0.205],
    ]);
    const beerGeo = lathe([
      [0, 0],
      [0.03, 0],
      [0.031, 0.15],
      [0.026, 0.18],
      [0.014, 0.225],
      [0.013, 0.25],
      [0, 0.25],
    ]);
    const cruetGeo = lathe([
      [0, 0],
      [0.03, 0],
      [0.031, 0.12],
      [0.02, 0.16],
      [0.009, 0.2],
      [0.009, 0.24],
      [0, 0.24],
    ]);

    const plates: THREE.Matrix4[] = [];
    const tumblers: THREE.Matrix4[] = [];
    const knives: THREE.Matrix4[] = [];
    const napkins: THREE.Matrix4[] = [];
    const menus: THREE.Matrix4[] = [];
    const cruets: THREE.Matrix4[] = [];
    const TOP = 0.75;
    // a simple setting for the other tables
    const setTable = (x: number, z: number, seats: [number, number][]) => {
      for (const [sx, sz] of seats) {
        const a = Math.atan2(sx, sz);
        const px = x + sx * 0.24;
        const pz = z + sz * 0.24;
        napkins.push(
          M(px + Math.cos(a) * 0.17, TOP + 0.002, pz - Math.sin(a) * 0.17, a),
        );
        knives.push(
          M(px + Math.cos(a) * 0.17, TOP + 0.006, pz - Math.sin(a) * 0.17, a),
        );
        tumblers.push(
          M(
            px - Math.cos(a) * 0.14 - sx * 0.12,
            TOP,
            pz + Math.sin(a) * 0.14 - sz * 0.12,
          ),
        );
      }
      cruets.push(M(x + 0.05, TOP, z - 0.03), M(x - 0.03, TOP, z + 0.05));
      menus.push(M(x, TOP, z, rand() * Math.PI));
    };
    setTable(TX, oz2, [[1, 0]]);
    setTable(mx, mz, [
      [0, -1],
      [0, 1],
    ]);

    const marg = new THREE.MeshStandardMaterial({
      map: pizzaTexture("margherita", 71),
      roughness: 0.78,
    });
    const pesto = new THREE.MeshStandardMaterial({
      map: pizzaTexture("pesto", 73),
      roughness: 0.78,
    });
    const pizza = (mat: THREE.Material, x: number, z: number, rot: number) => {
      plates.push(M(x, TOP, z));
      const p = new THREE.Mesh(pizzaGeo, mat);
      p.position.set(x + 0.004, TOP + 0.008, z);
      p.rotation.y = rot;
      p.castShadow = p.receiveShadow = true;
      root.add(p);
    };

    // the couple's table: partner on the bench, player's chair opposite; the pillar is on the player's left
    pizza(marg, lx(-3.12), hz - 0.2, 0.3);
    pizza(pesto, lx(-2.74), hz - 0.12, 1.2);
    // the other booth, where another couple is eating
    pizza(pesto, lx(-3.12), oz2 - 0.2, 2);
    pizza(marg, lx(-2.72), oz2 + 0.15, 4);
    // knives on napkins for the couple
    napkins.push(
      M(lx(-2.62), TOP + 0.002, hz - 0.36, 0),
      M(lx(-3.3), TOP + 0.002, hz - 0.42, 0),
    );
    knives.push(
      M(lx(-2.62), TOP + 0.006, hz - 0.36, 0),
      M(lx(-3.3), TOP + 0.006, hz - 0.42, 0),
    );
    // drinks cluster on the player's left (towards the pillar), as in the video
    tumblers.push(M(lx(-2.72), TOP, hz + 0.27));
    const water = new THREE.Mesh(bottleGeo, glassware);
    water.position.set(lx(-2.66), TOP, hz + 0.37);
    root.add(water);
    const waterIn = new THREE.Mesh(
      lathe([
        [0, 0.004],
        [0.03, 0.004],
        [0.031, 0.12],
        [0, 0.12],
      ]),
      new THREE.MeshPhysicalMaterial({
        color: "#cfe6ea",
        roughness: 0.05,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    );
    waterIn.position.copy(water.position);
    root.add(waterIn);
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0335, 0.0335, 0.05, 32, 1, true),
      new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.5 }),
    );
    label.position.set(lx(-2.66), TOP + 0.08, hz + 0.37);
    root.add(label);
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.02, 16),
      new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.6 }),
    );
    cap.position.set(lx(-2.66), TOP + 0.21, hz + 0.37);
    root.add(cap);
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.033, 0.033, 0.115, 32),
      [
        new THREE.MeshStandardMaterial({
          map: canTexture(),
          metalness: 0.6,
          roughness: 0.3,
        }),
        steel,
        steel,
      ],
    );
    can.position.set(lx(-2.58), TOP + 0.0575, hz + 0.25);
    can.castShadow = true;
    root.add(can);
    const beer = new THREE.Mesh(
      beerGeo,
      new THREE.MeshPhysicalMaterial({
        color: "#3b1c07",
        roughness: 0.08,
        transparent: true,
        opacity: 0.88,
        clearcoat: 1,
      }),
    );
    beer.position.set(lx(-2.58), TOP, hz + 0.42);
    beer.castShadow = true;
    root.add(beer);
    // napkin jar with paper napkins and black tongs
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.042, 0.1, 24, 1, true),
      glassware,
    );
    jar.position.set(lx(-2.86), TOP + 0.05, hz + 0.4);
    root.add(jar);
    for (let i = 0; i < 7; i++)
      B.add(
        unitBox,
        new THREE.MeshStandardMaterial({ color: "#f5f3ee", roughness: 0.9 }),
        M(
          lx(-2.86) + (i - 3) * 0.008,
          TOP + 0.1,
          hz + 0.4,
          0,
          0,
          (i - 3) * 5 * D,
          0.002,
          0.15,
          0.06,
        ),
      );
    B.add(
      unitBox,
      blackMetal,
      M(lx(-2.83), TOP + 0.12, hz + 0.43, 0, 0, -20 * D, 0.008, 0.2, 0.015),
    );
    // the black phone
    const phone = new THREE.Mesh(
      rbox(0.075, 0.008, 0.155, 0.006),
      new THREE.MeshPhysicalMaterial({
        color: "#0b0b0c",
        roughness: 0.15,
        clearcoat: 1,
      }),
    );
    phone.position.set(lx(-2.95), TOP + 0.004, hz + 0.12);
    phone.rotation.y = 80 * D;
    phone.castShadow = true;
    root.add(phone);

    inst(plateGeo, ceramic, plates);
    inst(tumblerGeo, glassware, tumblers, false);
    inst(
      new THREE.BoxGeometry(0.14, 0.003, 0.14),
      new THREE.MeshStandardMaterial({ color: "#efe9df", roughness: 0.95 }),
      napkins,
      false,
    );
    inst(new THREE.BoxGeometry(0.012, 0.004, 0.2), steel, knives, false);
    inst(
      rbox(0.1, 0.16, 0.06, 0.01),
      darkWood,
      menus.map((m) => m.clone().multiply(M(0, 0.08, 0))),
    );
    inst(
      cruetGeo,
      new THREE.MeshPhysicalMaterial({
        color: "#8a8d2a",
        roughness: 0.05,
        transparent: true,
        opacity: 0.7,
        clearcoat: 1,
      }),
      cruets,
      false,
    );

    /* ---------- pendant lamps ---------- */
    const shadeGeo = lathe(
      [
        [0.02, 0.32],
        [0.04, 0.3],
        [0.06, 0.2],
        [0.16, 0.04],
        [0.17, 0],
      ],
      40,
    );
    const pendants: [number, number, number][] = [
      [TX, hz, 1.62],
      [TX, oz2, 1.62],
      [mx, mz, 1.65],
      [0.95, (cz0 + cz1) / 2, 1.8],
      [2.15, (cz0 + cz1) / 2, 1.8],
    ];
    const shadeMat = metal("#151515", 0.5);
    shadeMat.side = THREE.DoubleSide;
    inst(
      shadeGeo,
      shadeMat,
      pendants.map(([x, z, y]) => M(x, y, z)),
      false,
    );
    inst(
      new THREE.SphereGeometry(0.045, 16, 12),
      bulbMat,
      pendants.map(([x, z, y]) => M(x, y + 0.03, z)),
      false,
    );
    inst(
      unitCyl,
      blackMetal,
      pendants.map(([x, z, y]) =>
        M(x, (y + 0.32 + H) / 2, z, 0, 0, 0, 0.004, H - y - 0.32, 0.004),
      ),
      false,
    );
    inst(
      unitCyl,
      blackMetal,
      pendants.map(([x, z]) => M(x, H - 0.01, z, 0, 0, 0, 0.05, 0.02, 0.05)),
      false,
    );

    /* ---------- a short counter at the back right, the small oven behind it ---------- */
    const cLen = W1 - KX;
    const cMid = (W1 + KX) / 2;
    B.add(
      unitBox,
      darkPaint,
      M(cMid, 0.51, (cz0 + cz1) / 2, 0, 0, 0, cLen, 1.02, cz1 - cz0),
      1,
    );
    B.add(
      rbox(cLen, 0.04, cz1 - cz0 + 0.08, 0.008),
      carrara,
      M(cMid, 1.04, (cz0 + cz1) / 2 + 0.02),
    );
    B.add(
      unitBox,
      ledWarm,
      M(cMid, 0.995, cz1 + 0.035, 0, 0, 0, cLen - 0.05, 0.008, 0.01),
    );
    const slats: THREE.Matrix4[] = [];
    for (let x = KX + 0.04; x < W1 - 0.02; x += 0.065)
      slats.push(M(x, 0.5, cz1 + 0.015, 0, 0, 0, 0.045, 0.96, 0.03));
    inst(unitBox, warmWood, slats);
    B.add(
      unitBox,
      blackMetal,
      M(cMid, 0.03, cz1 + 0.02, 0, 0, 0, cLen, 0.06, 0.04),
    );
    ctx.wall(KX, cz0, W1, cz1 + 0.05);
    // kitchen side wall
    B.add(
      unitBox,
      greenMat,
      M(KX - 0.06, H / 2, (Z0 + cz0) / 2, 0, 0, 0, 0.12, H, cz0 - Z0),
      2,
    );
    ctx.wall(KX - 0.12, Z0, KX, cz0);

    // the wood-fired oven (a small one)
    const ox = 2.0;
    const R = 0.6;
    const oz = Z0 + 0.6;
    B.add(unitBox, darkPaint, M(ox, 0.5, oz, 0, 0, 0, 1.4, 1.0, 1.2), 1);
    B.add(
      unitBox,
      carrara,
      M(ox, 1.0, oz + R + 0.02, 0, 0, 0, 1.0, 0.06, 0.14),
      0.6,
    );
    const mosaic = pbr(tiles("#9b5a33", "#2c2420", 24, 63, 0.3));
    B.add(
      new THREE.SphereGeometry(R, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      mosaic,
      M(ox, 1.0, oz, 0, 0, 0, 1, 0.82, 1),
      0.5,
    );
    const arch = new THREE.Shape();
    arch.moveTo(-0.32, 0);
    arch.lineTo(0.32, 0);
    arch.lineTo(0.32, 0.22);
    arch.absarc(0, 0.22, 0.32, 0, Math.PI, false);
    arch.lineTo(-0.32, 0);
    const hole = new THREE.Path();
    hole.moveTo(-0.2, 0.02);
    hole.lineTo(0.2, 0.02);
    hole.lineTo(0.2, 0.1);
    hole.absarc(0, 0.1, 0.2, 0, Math.PI, false);
    hole.lineTo(-0.2, 0.02);
    arch.holes.push(hole);
    const facade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(arch, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSize: 0.01,
        bevelThickness: 0.01,
        bevelSegments: 2,
        curveSegments: 24,
      }),
      [pbr(bricks("#8d4a2e", "#3a2a22", 6, 65)), sootMat],
    );
    facade.position.set(ox, 1.03, oz + R);
    facade.castShadow = facade.receiveShadow = true;
    root.add(facade);
    const fireMat = new THREE.MeshStandardMaterial({
      color: "#000",
      emissive: "#ffffff",
      emissiveMap: fireTexture(),
      emissiveIntensity: 3,
    });
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), fireMat);
    fire.position.set(ox, 1.19, oz + R - 0.005);
    root.add(fire);
    B.add(
      unitCyl,
      copper,
      M(ox, (1.45 + H) / 2, oz, 0, 0, 0, 0.16, H - 1.45, 0.16),
    );
    B.add(
      new THREE.CylinderGeometry(0.16, 0.34, 0.24, 32),
      copper,
      M(ox, 1.45, oz),
    );
    // a few logs stacked in the niche under the oven
    const bark = pbr(concrete("#4e3a2b", 67));
    const logs: THREE.Matrix4[] = [];
    B.add(
      unitBox,
      sootMat,
      M(ox, 0.3, oz + R + 0.005, 0, 0, 0, 1.0, 0.45, 0.01),
    );
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 6 - (row % 2); i++)
        logs.push(
          M(
            ox + (i - 2.5 + (row % 2) * 0.5) * 0.15,
            0.14 + row * 0.12,
            oz + R + 0.03,
            (rand() - 0.5) * 0.15,
            Math.PI / 2,
            0,
            0.055,
            0.12,
            0.055,
          ),
        );
    }
    inst(
      unitCyl,
      [
        bark,
        new THREE.MeshStandardMaterial({ color: "#b48a5e", roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: "#b48a5e", roughness: 0.9 }),
      ],
      logs,
    );
    // prep table with dough trays, shelf with jars
    const px0 = 0.85;
    B.add(unitBox, steel, M(px0, 0.9, Z0 + 0.3, 0, 0, 0, 1.0, 0.04, 0.55));
    for (const [x, z] of [
      [px0 - 0.45, Z0 + 0.08],
      [px0 + 0.45, Z0 + 0.08],
      [px0 - 0.45, Z0 + 0.52],
      [px0 + 0.45, Z0 + 0.52],
    ] as const)
      B.add(unitCyl, steel, M(x, 0.45, z, 0, 0, 0, 0.02, 0.9, 0.02));
    B.add(unitBox, steel, M(px0, 0.25, Z0 + 0.3, 0, 0, 0, 0.95, 0.02, 0.5));
    const trayMat = new THREE.MeshStandardMaterial({
      color: "#e8e6e0",
      roughness: 0.6,
    });
    const dough: THREE.Matrix4[] = [];
    for (let t = 0; t < 2; t++) {
      const tx = px0 - 0.24 + t * 0.48;
      B.add(unitBox, trayMat, M(tx, 0.96, Z0 + 0.3, 0, 0, 0, 0.42, 0.08, 0.36));
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++)
          dough.push(
            M(
              tx - 0.13 + i * 0.13,
              1.0,
              Z0 + 0.22 + j * 0.16,
              0,
              0,
              0,
              0.055,
              0.032,
              0.055,
            ),
          );
    }
    inst(
      new THREE.SphereGeometry(1, 16, 10),
      new THREE.MeshStandardMaterial({ color: "#efe2c8", roughness: 0.7 }),
      dough,
    );
    B.add(
      unitBox,
      darkWood,
      M(px0, 1.5, Z0 + 0.12, 0, 0, 0, 1.0, 0.03, 0.22),
      1,
    );
    for (let i = 0; i < 5; i++) {
      B.add(
        unitCyl,
        glassware,
        M(px0 - 0.4 + i * 0.2, 1.6, Z0 + 0.12, 0, 0, 0, 0.05, 0.17, 0.05),
      );
      B.add(
        unitCyl,
        new THREE.MeshStandardMaterial({
          color: ["#c9a24a", "#8a2a18", "#d9cfb8", "#6b7a2a"][i % 4] ?? "#888",
          roughness: 0.8,
        }),
        M(px0 - 0.4 + i * 0.2, 1.57, Z0 + 0.12, 0, 0, 0, 0.045, 0.1, 0.045),
      );
    }
    // menu board above the prep table, the sign on the dining back wall
    const menu = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.71),
      new THREE.MeshStandardMaterial({ map: menuTexture(), roughness: 0.85 }),
    );
    menu.position.set(px0, 2.35, Z0 + 0.03);
    root.add(menu);
    B.add(
      unitBox,
      darkWood,
      M(px0, 2.35, Z0 + 0.012, 0, 0, 0, 1.07, 0.78, 0.025),
    );
    const signTex = signTexture();
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.7),
      new THREE.MeshStandardMaterial({
        color: "#000",
        emissive: "#ffd6a0",
        emissiveMap: signTex,
        emissiveIntensity: 3.2,
        alphaMap: signTex,
        transparent: true,
      }),
    );
    const signX = (W0 + KX) / 2 + 0.2;
    sign.position.set(signX, 2.05, Z0 + 0.04);
    root.add(sign);

    // things on the counter: pizza boxes (the pack hides behind them), POS, peel, oil, basil
    const boxMat = new THREE.MeshStandardMaterial({
      map: boxTexture(),
      roughness: 0.9,
    });
    for (let i = 0; i < 7; i++)
      B.add(
        unitBox,
        boxMat,
        M(
          2.3,
          1.08 + i * 0.042,
          cz1 - 0.2,
          (rand() - 0.5) * 0.08,
          0,
          0,
          0.34,
          0.04,
          0.34,
        ),
      );
    B.add(
      rbox(0.22, 0.05, 0.18, 0.01),
      blackMetal,
      M(0.5, 1.085, cz1 - 0.2, 0.3),
    );
    B.add(
      rbox(0.16, 0.2, 0.02, 0.01),
      new THREE.MeshStandardMaterial({
        color: "#101214",
        roughness: 0.3,
        emissive: "#3b5a7a",
        emissiveIntensity: 0.4,
      }),
      M(0.5, 1.2, cz1 - 0.32, 0.3, -15 * D),
    );
    const peel = mergedLocal([
      [new THREE.CylinderGeometry(0.17, 0.17, 0.012, 32), M(0, 0, 0)],
      [unitBox, M(0, 0, -0.42, 0, 0, 0, 0.04, 0.02, 0.6)],
    ]);
    const peelMesh = new THREE.Mesh(peel, warmWood);
    peelMesh.position.set(1.45, 1.07, cz1 - 0.3);
    peelMesh.rotation.y = 70 * D;
    peelMesh.castShadow = true;
    root.add(peelMesh);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(
        cruetGeo,
        new THREE.MeshPhysicalMaterial({
          color: i === 2 ? "#5a1a14" : "#7c8a20",
          roughness: 0.05,
          transparent: true,
          opacity: 0.8,
          clearcoat: 1,
        }),
      );
      b.position.set(1.8 + i * 0.09, 1.06, cz0 + 0.12);
      b.scale.setScalar(1.25);
      root.add(b);
    }
    const bx = 0.95;
    const bzc = cz1 - 0.25;
    B.add(
      new THREE.CylinderGeometry(0.07, 0.055, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: "#c2643a", roughness: 0.9 }),
      M(bx, 1.12, bzc),
    );
    const basilLeaves: THREE.Matrix4[] = [];
    for (let i = 0; i < 40; i++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.07;
      basilLeaves.push(
        M(
          bx + Math.cos(a) * r,
          1.2 + rand() * 0.1,
          bzc + Math.sin(a) * r,
          a,
          -0.6 - rand() * 0.6,
          0,
          0.6 + rand() * 0.5,
        ),
      );
    }

    /* ---------- right wall: a shelf and a print ---------- */
    for (const y of [1.45, 1.85]) {
      B.add(
        unitBox,
        darkWood,
        M(W1 - 0.13, y, -1.0, 0, 0, 0, 0.26, 0.035, 1.5),
        1,
      );
      for (let i = 0; i < 9; i++) {
        const z = -1.65 + i * 0.16 + rand() * 0.03;
        const kind = Math.floor(rand() * 3);
        if (kind === 0)
          B.add(
            beerGeo,
            new THREE.MeshPhysicalMaterial({
              color: "#1d2a14",
              roughness: 0.1,
              clearcoat: 1,
            }),
            M(W1 - 0.12, y + 0.018, z, 0, 0, 0, 1.3),
          );
        else if (kind === 1)
          B.add(
            unitCyl,
            new THREE.MeshStandardMaterial({
              color: "#b8261a",
              roughness: 0.4,
              metalness: 0.4,
            }),
            M(W1 - 0.12, y + 0.075, z, 0, 0, 0, 0.042, 0.12, 0.042),
          );
        else
          B.add(
            cruetGeo,
            new THREE.MeshPhysicalMaterial({
              color: "#6f7a1e",
              roughness: 0.05,
              clearcoat: 1,
            }),
            M(W1 - 0.12, y + 0.018, z, 0, 0, 0, 1.2),
          );
      }
    }
    for (const z of [-1.65, -0.35])
      B.add(
        unitBox,
        blackMetal,
        M(W1 - 0.08, 1.6, z, 0, 0, 0, 0.16, 0.5, 0.02),
      );
    ctx.wall(W1 - 0.27, -1.8, W1, -0.2);
    {
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshStandardMaterial({
          map: posterTexture(0),
          roughness: 0.7,
        }),
      );
      p.position.set(W1 - 0.03, 1.75, -2.45);
      p.rotation.y = -Math.PI / 2;
      root.add(p);
      B.add(
        unitBox,
        blackMetal,
        M(W1 - 0.015, 1.75, -2.45, 0, 0, 0, 0.025, 0.76, 0.56),
      );
    }

    // door and shop window, with the street outside
    const alu = metal("#202020", 0.5);
    const frameBar = (x: number, y: number, w: number, h: number) =>
      B.add(unitBox, alu, M(x, y, Z1, 0, 0, 0, w, h, 0.08));
    frameBar(1.3, 1.075, 0.06, 2.15);
    frameBar(2.2, 1.075, 0.06, 2.15);
    frameBar(1.75, 2.15, 0.96, 0.06);
    frameBar(1.75, 0.08, 0.84, 0.16);
    frameBar(-0.5, 1.5, 0.06, 1.8);
    frameBar(1.0, 1.5, 0.06, 1.8);
    frameBar(0.25, 2.4, 1.56, 0.06);
    frameBar(0.25, 0.6, 1.56, 0.06);
    frameBar(0.25, 1.5, 0.04, 1.8);
    const pane = new THREE.MeshPhysicalMaterial({
      color: "#9fb3b8",
      roughness: 0.03,
      transparent: true,
      opacity: 0.12,
      clearcoat: 1,
      depthWrite: false,
    });
    for (const [x, y, w, h] of [
      [1.75, 1.12, 0.84, 1.96],
      [0.25, 1.5, 1.44, 1.74],
    ] as const) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pane);
      g.position.set(x, y, Z1 - 0.005);
      root.add(g);
    }
    B.add(unitCyl, brass, M(1.41, 1.05, Z1 - 0.07, 0, 0, 0, 0.012, 0.9, 0.012));
    B.add(
      unitBox,
      brass,
      M(1.41, 0.62, Z1 - 0.04, 0, 0, 0, 0.015, 0.015, 0.06),
    );
    B.add(
      unitBox,
      brass,
      M(1.41, 1.48, Z1 - 0.04, 0, 0, 0, 0.015, 0.015, 0.06),
    );
    const outside = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 4.5),
      new THREE.MeshBasicMaterial({ map: exteriorTexture(), color: "#9a9a9a" }),
    );
    outside.position.set(0.8, 1.6, Z1 + 3.0);
    outside.rotation.y = Math.PI;
    root.add(outside);
    const sidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 3),
      new THREE.MeshStandardMaterial({ color: "#3a3631", roughness: 0.9 }),
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0.8, -0.02, Z1 + 1.5);
    root.add(sidewalk);
    B.add(
      unitBox,
      pbr(fabric("#1e1a17", 75)),
      M(1.75, 0.006, Z1 - 0.55, 0, 0, 0, 1.0, 0.012, 0.6),
      0.5,
    );
    // brass sconces either side of the door
    for (const x of [1.12, 2.45]) {
      B.add(
        new THREE.CylinderGeometry(0.07, 0.05, 0.16, 20, 1, true),
        brass,
        M(x, 2.3, Z1 - 0.09),
      );
      B.add(unitBox, brass, M(x, 2.3, Z1 - 0.03, 0, 0, 0, 0.02, 0.02, 0.06));
      B.add(
        new THREE.SphereGeometry(0.03, 12, 8),
        bulbMat,
        M(x, 2.23, Z1 - 0.09),
      );
    }

    /* ---------- plants ---------- */
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.bezierCurveTo(0.5, 0.15, 0.55, 0.75, 0, 1);
    leafShape.bezierCurveTo(-0.55, 0.75, -0.5, 0.15, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 6);
    leafGeo.rotateX(-Math.PI / 2 + 0.3);
    const leafMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const leaves: THREE.Matrix4[] = [];
    const leafColors: THREE.Color[] = [];
    const stems: THREE.Matrix4[] = [];
    const green = (l: number) =>
      new THREE.Color().setHSL(
        0.27 + rand() * 0.05,
        0.45 + rand() * 0.15,
        l + rand() * 0.08,
      );
    // trailing pothos from pots on the partitions (the one by the couple's table, as in the video)
    const potMat = new THREE.MeshStandardMaterial({
      color: "#d9d4ca",
      roughness: 0.7,
    });
    for (const pz of [Z1 - 0.06, bz0]) {
      const towardRoom = pz > 0 ? -1 : 1;
      B.add(
        new THREE.CylinderGeometry(0.11, 0.08, 0.16, 20),
        potMat,
        M(lx(-3.3), 2.48, pz + (pz > 0 ? -0.04 : 0)),
      );
      for (let v = 0; v < 6; v++) {
        const side = pz > 0 ? towardRoom : v % 2 ? 1 : -1;
        // over the rim, along the top of the partition, then down its end and sides
        const pts: THREE.Vector3[] = [
          new THREE.Vector3(
            lx(-3.3) + (rand() - 0.5) * 0.1,
            2.54,
            pz + side * 0.04,
          ),
        ];
        const out = v < 2 ? 0.28 : 0.1 + rand() * 0.1;
        pts.push(
          new THREE.Vector3(
            lx(-3.3) + out * 0.6,
            2.47,
            pz + side * (0.05 + rand() * 0.02),
          ),
        );
        const drop = 0.5 + rand() * (v < 2 ? 0.9 : 0.6);
        const steps = 10 + Math.floor(drop * 12);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = lx(-3.3) + out + Math.sin(t * 3 + v) * 0.03;
          const z =
            pz +
            side * (0.075 + Math.sin(t * 5 + v) * 0.01 + (v < 2 ? 0 : 0.02));
          pts.push(new THREE.Vector3(x, 2.42 - t * drop, z));
        }
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          if (!p0 || !p1) continue;
          const mid = p0.clone().add(p1).multiplyScalar(0.5);
          const dir = p1.clone().sub(p0);
          const len = dir.length();
          const q = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.normalize(),
          );
          stems.push(
            new THREE.Matrix4().compose(
              mid,
              q,
              new THREE.Vector3(0.003, len, 0.003),
            ),
          );
          if (i > 1) {
            const s = 0.05 + rand() * 0.035 * (1 - i / pts.length) + 0.02;
            const yaw = Math.atan2(side, 0.4) + (rand() - 0.5) * 2;
            leaves.push(
              M(
                p1.x,
                p1.y,
                p1.z,
                yaw,
                0.9 + rand() * 0.5,
                (rand() - 0.5) * 0.6,
                s,
              ),
            );
            leafColors.push(green(0.3));
          }
        }
      }
    }
    // big potted plants: back-left corner under the sign, and by the door
    const bigPlant = (x: number, z: number, h: number, count: number) => {
      B.add(
        new THREE.CylinderGeometry(0.24, 0.19, 0.5, 24),
        new THREE.MeshStandardMaterial({ color: "#2b2724", roughness: 0.8 }),
        M(x, 0.25, z),
      );
      for (let i = 0; i < count; i++) {
        const a = i * 2.39996;
        const t = i / count;
        const y = 0.55 + t * h;
        const r = 0.05 + (1 - Math.abs(t - 0.55)) * 0.32;
        leaves.push(
          M(
            x + Math.cos(a) * r,
            y,
            z + Math.sin(a) * r,
            -a + Math.PI / 2,
            -0.2 - rand() * 0.6,
            0,
            0.22 + rand() * 0.12,
          ),
        );
        leafColors.push(green(0.22));
      }
      B.add(unitCyl, darkWood, M(x, 0.5 + h / 2, z, 0, 0, 0, 0.02, h, 0.02));
      ctx.wall(x - 0.26, z - 0.26, x + 0.26, z + 0.26);
    };
    bigPlant(W0 + 0.45, Z0 + 0.45, 1.4, high ? 60 : 35);
    bigPlant(W1 - 0.35, 1.3, 1.1, high ? 50 : 30);
    for (const m of basilLeaves) {
      leaves.push(m.multiply(M(0, 0, 0, 0, 0, 0, 0.05)));
      leafColors.push(green(0.3));
    }
    const leafMesh = inst(leafGeo, leafMat, leaves);
    leafColors.forEach((c, i) => leafMesh.setColorAt(i, c));
    if (leafMesh.instanceColor) leafMesh.instanceColor.needsUpdate = true;
    inst(
      new THREE.CylinderGeometry(1, 1, 1, 5),
      new THREE.MeshStandardMaterial({ color: "#4f6a2a", roughness: 0.7 }),
      stems,
      false,
    );

    B.flush(root);

    /* ---------- people ---------- */
    const line =
      ctx.player === "elena"
        ? "Você ficou com vergonha da câmera, lembra? 😄"
        : "Eu tava morrendo de vergonha, para de filmar! 🙈";
    ctx.playerOutfit(outfits);
    ctx.partner(lx(-3.62), hz, 90, "sit", outfits, line);
    ctx.person(
      {
        skin: "#d9a07c",
        hair: "#1a1210",
        hairStyle: "short",
        height: 1.78,
        beard: true,
      },
      {
        top: "#f4f4f2",
        topStyle: "tshirt",
        bottom: "#1d1d1f",
        bottomStyle: "pants",
        shoes: "#1a1a1a",
      },
      0.9,
      cz0 - 0.4,
      0,
      "stand",
      "Buona sera! Saindo mais uma margherita do forno 🍕",
    );
    if (high) {
      ctx.person(
        {
          skin: "#c98f6c",
          hair: "#5a3a22",
          hairStyle: "long",
          height: 1.66,
          female: true,
        },
        {
          top: "#8a2f3a",
          topStyle: "blouse",
          bottom: "#1f2430",
          bottomStyle: "jeans",
          shoes: "#2a2a2a",
        },
        lx(-3.62),
        oz2,
        90,
        "sit",
      );
      ctx.person(
        { skin: "#e0b294", hair: "#2a1d14", hairStyle: "short", height: 1.8 },
        {
          top: "#2f4058",
          topStyle: "tshirt",
          bottom: "#3a3a3a",
          bottomStyle: "jeans",
          shoes: "#d8d8d8",
        },
        lx(-2.25),
        oz2,
        -90,
        "sit",
      );
    }

    /* ---------- photos of the couple, on the partitions of their booth ---------- */
    ctx.photo(
      "panedoca-1.webp",
      0.36,
      0.48,
      new THREE.Vector3(lx(-3.45), 1.7, 0.2 + 0.075),
      0,
    );
    ctx.photo(
      "panedoca-2.webp",
      0.36,
      0.48,
      new THREE.Vector3(lx(-3.45), 1.7, Z1 - 0.06 - 0.075),
      180,
    );

    /* ---------- lights ---------- */
    root.add(new THREE.HemisphereLight("#ffd9b0", "#1a1512", 0.12));
    // the couple's pendant: the key light, with shadows
    const key = new THREE.SpotLight("#ffbf80", 2.6, 6, 62 * D, 0.75, 2);
    key.position.set(TX, 1.6, hz);
    key.target.position.set(TX - 0.03, 0, hz);
    key.castShadow = true;
    key.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 0.1;
    root.add(key, key.target);
    // the other pendants
    const pendantLights = high ? pendants.slice(1, 3) : pendants.slice(1, 2);
    for (const [x, z, y] of pendantLights) {
      const p = new THREE.PointLight("#ffbf80", high ? 1.8 : 3, 5.5, 2);
      p.position.set(x, y - 0.05, z);
      root.add(p);
    }
    // the counter: a warm spot over it (second shadow caster on desktop)
    const counterSpot = new THREE.SpotLight("#ffc890", 5, 6, 55 * D, 0.6, 2);
    counterSpot.position.set(1.5, H - 0.05, cz1 - 0.1);
    counterSpot.target.position.set(1.5, 0.9, cz0 - 0.2);
    counterSpot.castShadow = high;
    counterSpot.shadow.mapSize.set(1024, 1024);
    counterSpot.shadow.bias = -0.0005;
    root.add(counterSpot, counterSpot.target);
    // LED strip grazing the brick wall
    const graze = new THREE.RectAreaLight("#ffb571", 6, bLen, 0.1);
    graze.position.set(lx(-3.95), 1.15, bMid);
    graze.rotation.set(Math.PI / 2, Math.PI / 2, 0, "YXZ");
    root.add(graze);
    // a soft wash from the sign, the entrance and the oven
    const signGlow = new THREE.PointLight("#ffcf99", 2.0, 3.5, 2);
    signGlow.position.set(signX, 2.0, Z0 + 0.4);
    root.add(signGlow);
    const entry = new THREE.PointLight("#ffc488", 2.4, 4.5, 2);
    entry.position.set(1.75, 2.4, Z1 - 0.6);
    root.add(entry);
    const ovenLight = new THREE.PointLight("#ff7a2e", 2.5, 5, 2);
    ovenLight.position.set(ox, 1.4, oz + R + 0.25);
    root.add(ovenLight);
    if (high) {
      const sconce = new THREE.PointLight("#ffbf80", 0.6, 2.5, 2);
      sconce.position.set(lx(-3.55), 2.2, hz);
      root.add(sconce);
    }
    ctx.onUpdate((t) => {
      const f =
        0.85 +
        Math.sin(t * 7.3) * 0.06 +
        Math.sin(t * 13.1) * 0.05 +
        Math.sin(t * 2.1) * 0.04;
      ovenLight.intensity = 2.5 * f;
      fireMat.emissiveIntensity = 3 * f;
    });

    /* ---------- the game ---------- */
    // the pack waits on the counter, behind the stack of pizza boxes
    ctx.pack(2.58, 1.06, cz0 + 0.18, -15);
    ctx.ambient("amb-panedoca.m4a", 0.45);
    ctx.spawn(1.75, Z1 - 0.8, 55);
    ctx.exit(1.75, Z1 - 0.25, 0.55);
  },
};

export default scene;
