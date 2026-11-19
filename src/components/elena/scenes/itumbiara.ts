import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  concrete,
  emissive,
  metal,
  pbr,
  plaster,
  seeded,
  tiles,
} from "../fp/materials";
import type { Outfit, SceneModule } from "../fp/types";

/*
 * Itumbiara (GO), 09/10/2026: the night out with Elena's little sister.
 *
 * Built from the couple's own video (video-4130) and photos (IMG_6008-6022):
 *  - the bowling alley (video frames): four light maple lanes with chrome
 *    gutters, glossy cream approach, white Kopp ball-return hoods with chrome
 *    racks of mottled balls (black, blue, olive, green, red, orange), blue
 *    score screens hanging over the foul line with a black speaker between
 *    them, a dark mural over the pins (exploding pins, a yellow smiley ball,
 *    a white "KOPP" strip), a white ceiling with round downlights and a
 *    purple spot, a lavender half-wall with a wooden handrail and a glass
 *    partition on the right, a grey granite floor where the grey Kopp score
 *    console stands with green plastic chairs, a blue bin and the arcade
 *    corner (a gold carousel ride, a claw machine).
 *  - the bar outside (photos): a covered terrace at night, white ceiling
 *    with string lights, black wire-grid fences, red plastic tables and
 *    chairs, the "EDINHO / Torresmo" stall behind the grid with the cook,
 *    yellow beer crates, and the lit building across the street.
 *
 * Plan (meters). Lanes run toward -Z, foul line at z = 0.
 *  lane hall   x ∈ [-3.4, 3.4], z ∈ [-19.4, 0]   (pins at z ≈ -17.8 … -18.6)
 *  approach    x ∈ [-3.4, 3.4], z ∈ [0, 4.4]
 *  seating     x ∈ [-3.4, 3.4], z ∈ [4.4, 8.8]   (score consoles, chairs)
 *  side area   x ∈ [3.4, 9.0],  z ∈ [-4, 8.8]    (arcade, tables, street door)
 *  terrace     x ∈ [9.0, 17.0], z ∈ [-4, 8.8]    (door in the wall x = 9, z ∈ [1, 3])
 * Ceiling 3.2 inside, terrace roof 3.6.
 */

const D = Math.PI / 180;
const H = 3.2;
const X0 = -3.4;
const X1 = 3.4;
const SX = 9.0;
const TX = 17.0;
const ZB = -19.4;
const ZA = 4.4;
const ZS = 8.8;
const SZ0 = -4.0;
const FENCE_Z = -1.5;
const ROOF = 3.6;

const LANES = [-2.543, -0.857, 0.857, 2.543];
const PAIRS = [-1.7, 1.7];
const LW = 1.066;
const GW = 0.235;
const LANE_END = -18.6;
const MASK_Z = -17.5;
const HOOD_Z = 2.0;

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

const T = (x: number, y: number, z: number) =>
  new THREE.Matrix4().makeTranslation(x, y, z);

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
        uv[i * 2 + 1] = -z * s;
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
  /** An axis-aligned box from min/max corners. */
  box(
    mat: THREE.Material,
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    uvScale = 0,
  ) {
    this.add(
      unitBox,
      mat,
      M(
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        (z0 + z1) / 2,
        0,
        0,
        0,
        x1 - x0,
        y1 - y0,
        z1 - z0,
      ),
      uvScale,
    );
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
const unitPlane = new THREE.PlaneGeometry(1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 14);

function canvasTex(
  w: number,
  h: number,
  paint: (g: CanvasRenderingContext2D) => void,
  srgb = true,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  paint(g);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- painted textures ---------------- */

/** One maple lane, foul line at the bottom of the canvas, pin deck at the top. */
function laneTex() {
  return canvasTex(256, 4096, (g) => {
    const rand = seeded(4130);
    const boards = 39;
    const bw = 256 / boards;
    for (let i = 0; i < boards; i++) {
      const l = 70 + rand() * 8;
      g.fillStyle = `hsl(36, ${38 + rand() * 10}%, ${l}%)`;
      g.fillRect(i * bw, 0, bw + 1, 4096);
      // long grain streaks
      for (let k = 0; k < 18; k++) {
        g.fillStyle = `rgba(120,80,40,${0.04 + rand() * 0.05})`;
        g.fillRect(i * bw + rand() * bw, rand() * 4096, 0.8, 80 + rand() * 500);
      }
      g.fillStyle = "rgba(90,60,30,0.25)";
      g.fillRect(i * bw, 0, 0.7, 4096);
    }
    const LEN = -LANE_END;
    const yAt = (fromFoul: number) => ((LEN - fromFoul) / LEN) * 4096;
    // pin deck: slightly paler, with the pin spots
    g.fillStyle = "rgba(255,245,225,0.18)";
    g.fillRect(0, 0, 256, yAt(17.5));
    // target arrows (4.6 m), the centre one furthest
    g.fillStyle = "#5a3b25";
    for (let k = -3; k <= 3; k++) {
      const x = 128 + k * 5 * bw;
      const y = yAt(4.3 + (3 - Math.abs(k)) * 0.1);
      g.beginPath();
      g.moveTo(x, y - 34);
      g.lineTo(x - bw * 0.55, y + 18);
      g.lineTo(x + bw * 0.55, y + 18);
      g.closePath();
      g.fill();
    }
    // guide dots (2.1 m)
    for (const k of [-15, -10, -5, 5, 10, 15]) {
      g.beginPath();
      g.arc(128 + k * bw, yAt(2.1), 3, 0, Math.PI * 2);
      g.fill();
    }
    // foul line
    g.fillStyle = "#26201c";
    g.fillRect(0, 4096 - 6, 256, 6);
    // a little ball wear down the middle
    const grd = g.createLinearGradient(40, 0, 216, 0);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.5, "rgba(80,50,25,0.06)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, yAt(16), 256, yAt(0) - yAt(16));
  });
}

/** Grey speckled granite, one 0.5 m tile per repeat (the floor around the consoles). */
function graniteTex() {
  return canvasTex(512, 512, (g) => {
    const rand = seeded(77);
    g.fillStyle = "#a2a09b";
    g.fillRect(0, 0, 512, 512);
    const cols = [
      "#3c3a38",
      "#5f5c58",
      "#dad8d3",
      "#7b7773",
      "#2a2928",
      "#c7c2bb",
      "#8c7f74",
    ];
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = cols[Math.floor(rand() * cols.length)]!;
      const s = 1 + rand() * (rand() < 0.1 ? 5 : 2.2);
      g.fillRect(rand() * 512, rand() * 512, s, s * (0.6 + rand() * 0.8));
    }
    g.fillStyle = "rgba(90,88,84,0.9)";
    g.fillRect(0, 0, 512, 2);
    g.fillRect(0, 0, 2, 512);
  });
}

/** The mural on the masking unit over the pins. */
function muralTex() {
  return canvasTex(2048, 768, (g) => {
    const rand = seeded(9);
    const bg = g.createRadialGradient(1024, 330, 60, 1024, 380, 1150);
    bg.addColorStop(0, "#22388a");
    bg.addColorStop(0.45, "#101c4e");
    bg.addColorStop(1, "#050817");
    g.fillStyle = bg;
    g.fillRect(0, 0, 2048, 768);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.6})`;
      const s = rand() < 0.1 ? 3 : 1.5;
      g.fillRect(rand() * 2048, rand() * 700, s, s);
    }
    // swooshes
    g.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      g.strokeStyle = `rgba(80,190,255,${0.35 - k * 0.06})`;
      g.lineWidth = 26 - k * 5;
      g.beginPath();
      g.moveTo(80, 560 - k * 40);
      g.bezierCurveTo(
        600,
        300 - k * 30,
        1300,
        680 - k * 20,
        1980,
        360 + k * 30,
      );
      g.stroke();
    }
    // starburst behind the pins
    g.save();
    g.translate(1024, 330);
    for (let i = 0; i < 28; i++) {
      g.rotate((Math.PI * 2) / 28);
      g.fillStyle = i % 2 ? "rgba(255,255,255,0.18)" : "rgba(140,210,255,0.14)";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-18, -360);
      g.lineTo(18, -360);
      g.closePath();
      g.fill();
    }
    g.restore();
    const pin = (x: number, y: number, s: number, rot: number) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(s, s);
      g.fillStyle = "#f7f7f4";
      g.beginPath();
      g.moveTo(0, -100);
      g.bezierCurveTo(22, -100, 24, -70, 14, -48);
      g.bezierCurveTo(8, -36, 10, -24, 26, -4);
      g.bezierCurveTo(44, 22, 40, 70, 20, 100);
      g.lineTo(-20, 100);
      g.bezierCurveTo(-40, 70, -44, 22, -26, -4);
      g.bezierCurveTo(-10, -24, -8, -36, -14, -48);
      g.bezierCurveTo(-24, -70, -22, -100, 0, -100);
      g.fill();
      g.fillStyle = "#d8262d";
      g.fillRect(-13, -46, 26, 5);
      g.fillRect(-12, -37, 24, 5);
      g.restore();
    };
    const pins: [number, number, number, number][] = [
      [1024, 300, 1.15, 0],
      [930, 320, 1.0, -0.5],
      [1120, 318, 1.0, 0.45],
      [840, 250, 0.85, -1.1],
      [1210, 245, 0.85, 1.0],
      [760, 360, 0.7, -1.9],
      [1300, 370, 0.75, 1.7],
      [990, 180, 0.7, -0.3],
      [1080, 175, 0.68, 0.6],
      [1400, 240, 0.6, 2.4],
    ];
    for (const [x, y, s, r] of pins) pin(x, y, s, r);
    // a white ball smashing in
    g.fillStyle = "#e8ecf4";
    g.beginPath();
    g.arc(1024, 470, 70, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1b2440";
    for (const [dx, dy] of [
      [-16, -20],
      [12, -24],
      [-2, 6],
    ] as const) {
      g.beginPath();
      g.arc(1024 + dx, 470 + dy, 9, 0, Math.PI * 2);
      g.fill();
    }
    // the yellow smiley ball on the right
    const sx = 1560;
    const sy = 430;
    const yg = g.createRadialGradient(sx - 40, sy - 40, 10, sx, sy, 140);
    yg.addColorStop(0, "#ffe873");
    yg.addColorStop(1, "#e8a512");
    g.fillStyle = yg;
    g.beginPath();
    g.arc(sx, sy, 130, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3a2410";
    g.beginPath();
    g.ellipse(sx - 45, sy - 25, 14, 22, 0, 0, Math.PI * 2);
    g.ellipse(sx + 45, sy - 25, 14, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#3a2410";
    g.lineWidth = 12;
    g.beginPath();
    g.arc(sx, sy + 10, 62, 0.2, Math.PI - 0.2);
    g.stroke();
    // an orange ball on the left
    const og = g.createRadialGradient(420, 400, 10, 440, 420, 110);
    og.addColorStop(0, "#ffb15c");
    og.addColorStop(1, "#c4480f");
    g.fillStyle = og;
    g.beginPath();
    g.arc(440, 420, 95, 0, Math.PI * 2);
    g.fill();
    // white KOPP strip at the bottom
    g.fillStyle = "#f2f2ef";
    g.fillRect(0, 712, 2048, 56);
    g.fillStyle = "#1d3b9c";
    g.font = "bold italic 40px Arial, sans-serif";
    g.textBaseline = "middle";
    for (let i = 0; i < 4; i++) g.fillText("✱ KOPP", 90 + i * 512, 741);
  });
}

/** The hanging score screens (Kopp scoring, blue). */
function scoreTex() {
  return canvasTex(512, 300, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 300);
    bg.addColorStop(0, "#2d55e6");
    bg.addColorStop(1, "#0f2392");
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 300);
    g.fillStyle = "#8fe3ff";
    g.fillRect(14, 12, 484, 16);
    const rows: [string, string[], number][] = [
      ["DAVI", ["7", "/", "X", "", "8", "1", "9", "-", "X", ""], 78],
      ["ELENA", ["9", "/", "8", "1", "X", "", "7", "2", "9", "/"], 81],
      ["IRMÃ", ["X", "", "X", "", "9", "/", "8", "1", "X", ""], 104],
    ];
    g.textBaseline = "middle";
    rows.forEach(([name, marks, total], r) => {
      const y = 38 + r * 34;
      g.fillStyle = r === 2 ? "#ffe066" : "#d9f1ff";
      g.fillRect(14, y, 84, 28);
      g.fillStyle = "#0f2392";
      g.font = "bold 16px Arial, sans-serif";
      g.fillText(name, 20, y + 15);
      for (let f = 0; f < 5; f++) {
        const x = 104 + f * 66;
        g.strokeStyle = "#d9f1ff";
        g.lineWidth = 2;
        g.strokeRect(x, y, 62, 28);
        g.fillStyle = "#ffffff";
        g.font = "bold 14px Arial, sans-serif";
        g.fillText(marks[f * 2] ?? "", x + 8, y + 10);
        g.fillText(marks[f * 2 + 1] ?? "", x + 36, y + 10);
      }
      g.fillStyle = "#ffffff";
      g.font = "bold 20px Arial, sans-serif";
      g.fillText(String(total), 448, y + 15);
    });
    // the white spiral logo
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 6;
    g.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.08) {
      const r = 4 + a * 7;
      const x = 256 + Math.cos(a) * r * 1.4;
      const y = 228 + Math.sin(a) * r * 0.5;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    const tags = ["#ff4d6d", "#ffd23f", "#3ddc97", "#ffffff"];
    tags.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(330 + i * 40, 276, 30, 12);
    });
  });
}

/** The KOPP logo decal (hood sides). */
function koppTex() {
  return canvasTex(256, 128, (g) => {
    g.fillStyle = "#f1f2f3";
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#1f3f9e";
    g.font = "bold italic 58px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("KOPP", 150, 74);
    g.save();
    g.translate(54, 54);
    for (let i = 0; i < 4; i++) {
      g.rotate(Math.PI / 2);
      g.beginPath();
      g.ellipse(0, -14, 8, 14, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  });
}

/** The keypad panel of the score console. */
function panelTex() {
  return canvasTex(256, 320, (g) => {
    g.fillStyle = "#e9ecf2";
    g.fillRect(0, 0, 256, 320);
    g.strokeStyle = "#2442a8";
    g.lineWidth = 10;
    g.strokeRect(5, 5, 246, 310);
    g.fillStyle = "#2442a8";
    g.font = "bold italic 34px Arial, sans-serif";
    g.fillText("KOPP", 26, 290);
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 7; c++) {
        g.fillStyle = r === 0 ? "#2442a8" : "#c8ccd6";
        g.fillRect(28 + c * 30, 30 + r * 26, 24, 20);
      }
    const bg = g.createRadialGradient(180, 230, 5, 190, 240, 46);
    bg.addColorStop(0, "#ffe25a");
    bg.addColorStop(1, "#ff4f9a");
    g.fillStyle = bg;
    g.beginPath();
    g.arc(190, 240, 44, 0, Math.PI * 2);
    g.fill();
  });
}

/** The console screen (a cartoon was playing on it). */
function cartoonTex() {
  return canvasTex(256, 192, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 192);
    bg.addColorStop(0, "#7fbf4d");
    bg.addColorStop(1, "#3d6b22");
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 192);
    const rand = seeded(5);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(30,70,10,${0.4 + rand() * 0.4})`;
      g.lineWidth = 2;
      const x = rand() * 256;
      g.beginPath();
      g.moveTo(x, 192);
      g.lineTo(x + (rand() - 0.5) * 30, 60 + rand() * 60);
      g.stroke();
    }
    for (const [x, y, r] of [
      [60, 120, 38],
      [140, 100, 44],
      [210, 130, 34],
    ] as const) {
      g.fillStyle = "#f08a24";
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffe0c2";
      g.beginPath();
      g.arc(x, y + 4, r * 0.62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#222";
      g.fillRect(x - r * 0.25, y - 2, 5, 7);
      g.fillRect(x + r * 0.18, y - 2, 5, 7);
    }
  });
}

/** Marbled shading for the bowling balls (multiplied by each ball's colour). */
function marbleBallTex() {
  return canvasTex(512, 256, (g) => {
    const rand = seeded(21);
    g.fillStyle = "#d8d8d8";
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle =
        rand() < 0.5
          ? `rgba(255,255,255,${0.2 + rand() * 0.4})`
          : `rgba(40,40,40,${0.15 + rand() * 0.3})`;
      g.lineWidth = 2 + rand() * 9;
      g.beginPath();
      let x = rand() * 512;
      let y = rand() * 256;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rand() - 0.5) * 120;
        y += (rand() - 0.5) * 60;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

/** "EDINHO" logo over the black "Torresmo" board. */
function torresmoTex() {
  return canvasTex(512, 384, (g) => {
    g.fillStyle = "#4b2d1b";
    g.fillRect(0, 0, 512, 140);
    g.fillStyle = "#f2e6cf";
    g.beginPath();
    g.ellipse(256, 74, 170, 56, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3a2214";
    g.font = "bold 60px 'Arial Black', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("EDINHO", 256, 78);
    g.fillStyle = "#0c0c0c";
    g.fillRect(0, 140, 512, 244);
    g.strokeStyle = "#f4f4f2";
    g.lineWidth = 4;
    g.strokeRect(14, 154, 484, 216);
    g.fillStyle = "#f6f6f4";
    g.font =
      "italic bold 104px 'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive";
    g.fillText("Torresmo", 256, 262);
  });
}

/** White brand lettering on the red plastic table tops. */
function tableTopTex() {
  return canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = "#ffffff";
    g.font = "bold italic 44px 'Arial Black', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.save();
    g.translate(128, 128);
    g.rotate(-Math.PI / 4);
    g.fillText("ITAIPAVA", 0, 0);
    g.restore();
  });
}

/** The blue sponsor banner on the fence. */
function bannerTex() {
  return canvasTex(512, 256, (g) => {
    const bg = g.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, "#123b8f");
    bg.addColorStop(1, "#0a2460");
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#ffcf2e";
    g.beginPath();
    g.arc(84, 128, 46, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ffcf2e";
    g.lineWidth = 6;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      g.beginPath();
      g.moveTo(84 + Math.cos(a) * 56, 128 + Math.sin(a) * 56);
      g.lineTo(84 + Math.cos(a) * 72, 128 + Math.sin(a) * 72);
      g.stroke();
    }
    g.fillStyle = "#ffffff";
    g.font = "bold 54px Arial, sans-serif";
    g.textBaseline = "middle";
    g.fillText("Central", 170, 100);
    g.fillText("Energia", 170, 160);
  });
}

/** Black wire grid (one 10 cm cell), alpha in the texture. */
function gridTex() {
  return canvasTex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = "#101010";
    g.fillRect(0, 0, 64, 3);
    g.fillRect(0, 0, 3, 64);
  });
}

/** The street at night beyond the terrace: the lit building across, trees, sky. */
function nightTex() {
  return canvasTex(2048, 768, (g) => {
    const rand = seeded(61);
    const sky = g.createLinearGradient(0, 0, 0, 768);
    sky.addColorStop(0, "#03050b");
    sky.addColorStop(0.55, "#0b1222");
    sky.addColorStop(1, "#141821");
    g.fillStyle = sky;
    g.fillRect(0, 0, 2048, 768);
    // the long two-storey building with its white upper wall
    g.fillStyle = "#5d5f63";
    g.fillRect(0, 300, 2048, 468);
    g.fillStyle = "#8f9196";
    g.fillRect(0, 300, 2048, 120);
    for (let x = 30; x < 2048; x += 150) {
      const lit = rand() < 0.35;
      g.fillStyle = lit ? "#e7c48a" : "#23262c";
      g.fillRect(x, 330, 110, 70);
      g.fillStyle = "rgba(0,0,0,0.4)";
      g.fillRect(x + 54, 330, 3, 70);
    }
    // shopfronts at street level
    for (let x = 0; x < 2048; x += 256) {
      const r = rand();
      g.fillStyle = r < 0.3 ? "#d8dde4" : r < 0.55 ? "#3a5ec4" : "#1c1e22";
      g.fillRect(x + 20, 470, 210, 190);
      g.fillStyle = "#2a2b2e";
      g.fillRect(x + 20, 450, 210, 20);
    }
    // a blue lit sign
    g.fillStyle = "#2f63ff";
    g.fillRect(860, 430, 240, 60);
    g.fillStyle = "#ffffff";
    g.font = "bold 34px Arial, sans-serif";
    g.fillText("ÁGUA • GELO", 875, 470);
    // string lights along the eave
    for (let x = 10; x < 2048; x += 34) {
      g.fillStyle = "#ffd998";
      g.beginPath();
      g.arc(x, 424 + Math.sin(x * 0.02) * 6, 4, 0, Math.PI * 2);
      g.fill();
    }
    // trees
    for (let i = 0; i < 6; i++) {
      const x = rand() * 2048;
      g.fillStyle = "#0d1a12";
      for (let k = 0; k < 14; k++) {
        g.beginPath();
        g.arc(
          x + (rand() - 0.5) * 160,
          330 + (rand() - 0.5) * 120,
          40 + rand() * 40,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      g.fillRect(x - 8, 380, 16, 300);
    }
    g.fillStyle = "#16171a";
    g.fillRect(0, 700, 2048, 68);
  });
}

/* ---------------- the scene ---------------- */

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  davi: {
    top: "#1f4d3a",
    topStyle: "jersey",
    print: "11",
    printColor: "#ffffff",
    bottom: "#2f3542",
    bottomStyle: "jeans",
  },
  elena: {
    top: "#f3eee6",
    topStyle: "blouse",
    bottom: "#22252d",
    bottomStyle: "jeans",
  },
};

const scene: SceneModule = {
  id: "itumbiara",
  title: "Itumbiara",
  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const high = ctx.quality === "high";
    const rand = seeded(1009);
    RectAreaLightUniformsLib.init();
    const B = new Batch();

    /* ---------- materials ---------- */
    const noCast = (m: THREE.Material) => {
      m.userData.noCast = true;
      return m;
    };
    const wallMat = pbr(plaster("#e2ded6", 41));
    const ceilMat = noCast(pbr(plaster("#f1f0ec", 43)));
    const approachMat = noCast(pbr(tiles("#efe9dd", "#dcd4c6", 2, 31, 0.12)));
    const granite = noCast(
      new THREE.MeshStandardMaterial({ map: graniteTex(), roughness: 0.28 }),
    );
    const terraceFloor = noCast(pbr(concrete("#8b8883", 47)));
    const asphalt = noCast(
      new THREE.MeshStandardMaterial({ color: "#2a2a2c", roughness: 0.95 }),
    );
    const laneMat = noCast(
      new THREE.MeshPhysicalMaterial({
        map: laneTex(),
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.08,
      }),
    );
    const gutterMat = noCast(
      new THREE.MeshStandardMaterial({
        color: "#a9adb3",
        metalness: 0.85,
        roughness: 0.3,
        side: THREE.DoubleSide,
      }),
    );
    const cappingMat = new THREE.MeshStandardMaterial({
      color: "#d3cfc6",
      roughness: 0.4,
    });
    const darkMat = noCast(
      new THREE.MeshStandardMaterial({ color: "#0d0d10", roughness: 0.9 }),
    );
    const lavender = pbr(plaster("#c4c6dc", 51));
    const handrail = new THREE.MeshStandardMaterial({
      color: "#b58650",
      roughness: 0.45,
    });
    const baseboard = new THREE.MeshStandardMaterial({
      color: "#5a5856",
      roughness: 0.6,
    });
    const chrome = metal("#e6e8ec", 0.12);
    const alu = metal("#9fa4aa", 0.35);
    const blackMetal = new THREE.MeshStandardMaterial({
      color: "#151517",
      metalness: 0.6,
      roughness: 0.5,
    });
    const consoleGrey = new THREE.MeshStandardMaterial({
      color: "#5c6067",
      metalness: 0.55,
      roughness: 0.45,
    });
    const hoodMat = new THREE.MeshPhysicalMaterial({
      color: "#eef0f1",
      roughness: 0.25,
      clearcoat: 0.6,
    });
    const holeMat = new THREE.MeshStandardMaterial({
      color: "#050506",
      roughness: 1,
    });
    const koppMat = new THREE.MeshStandardMaterial({
      map: koppTex(),
      roughness: 0.4,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      map: panelTex(),
      roughness: 0.45,
    });
    const glassMat = noCast(
      new THREE.MeshStandardMaterial({
        color: "#cfe2e6",
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    const lightWood = new THREE.MeshStandardMaterial({
      color: "#d6bf94",
      roughness: 0.5,
    });
    const greenPlastic = new THREE.MeshStandardMaterial({
      color: "#39a83d",
      roughness: 0.38,
    });
    const redPlastic = new THREE.MeshStandardMaterial({
      color: "#c4161c",
      roughness: 0.42,
    });
    const blueBin = new THREE.MeshStandardMaterial({
      color: "#1d4fb8",
      roughness: 0.4,
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: "#000000",
      emissive: "#ffffff",
      emissiveMap: scoreTex(),
      emissiveIntensity: 1.5,
      roughness: 0.3,
    });
    const cartoonMat = new THREE.MeshStandardMaterial({
      color: "#000000",
      emissive: "#ffffff",
      emissiveMap: cartoonTex(),
      emissiveIntensity: 1.1,
      roughness: 0.3,
    });
    const muralMat = new THREE.MeshStandardMaterial({
      map: muralTex(),
      roughness: 0.7,
      emissive: "#ffffff",
      emissiveIntensity: 0.12,
    });
    muralMat.emissiveMap = muralMat.map;
    const downlight = emissive("#fffaf0", 3.2);
    const pinWhite = new THREE.MeshPhysicalMaterial({
      color: "#f8f8f6",
      roughness: 0.2,
      clearcoat: 1,
    });
    const pinRed = new THREE.MeshStandardMaterial({
      color: "#c81d25",
      roughness: 0.3,
    });
    const darkWood = new THREE.MeshStandardMaterial({
      color: "#4a2f1f",
      roughness: 0.65,
    });
    const steel = metal("#bfc3c8", 0.28);
    const yellowCrate = new THREE.MeshStandardMaterial({
      color: "#efbf13",
      roughness: 0.5,
    });
    const gridMat = noCast(
      new THREE.MeshStandardMaterial({
        map: gridTex(),
        color: "#ffffff",
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.3,
      }),
    );
    const nightMat = noCast(new THREE.MeshBasicMaterial({ map: nightTex() }));
    const skyMat = noCast(new THREE.MeshBasicMaterial({ color: "#04060c" }));
    const roofMat = noCast(pbr(plaster("#ecebe7", 53)));

    /* ---------- floors and ceiling ---------- */
    const floor = (
      mat: THREE.Material,
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      y = 0,
      uv = 1,
    ) =>
      B.add(
        unitPlane,
        mat,
        M(
          (x0 + x1) / 2,
          y,
          (z0 + z1) / 2,
          0,
          -Math.PI / 2,
          0,
          x1 - x0,
          z1 - z0,
          1,
        ),
        uv,
      );
    floor(approachMat, X0, 0, X1, ZA, 0, 1.2);
    floor(granite, X0, ZA, X1, ZS, 0, 0.5);
    floor(granite, X1, SZ0, SX, ZS, 0, 0.5);
    floor(terraceFloor, SX, SZ0, TX, ZS, 0, 2);
    floor(asphalt, SX, -5.6, 18.6, 10.4, -0.01, 2);
    floor(darkMat, X0, ZB, X1, 0, -0.12, 2);
    // ceiling inside, roof outside
    B.add(
      unitPlane,
      ceilMat,
      M(
        (X0 + SX) / 2,
        H,
        (ZB + ZS) / 2,
        0,
        Math.PI / 2,
        0,
        SX - X0,
        ZS - ZB,
        1,
      ),
      3,
    );
    B.box(roofMat, SX, ROOF, SZ0, TX, ROOF + 0.12, ZS, 3);
    B.add(unitPlane, skyMat, M(13.8, 6, 2.4, 0, Math.PI / 2, 0, 9.6, 16, 1));

    /* ---------- walls ---------- */
    const T_W = 0.2;
    B.box(wallMat, X0 - T_W, 0, ZB, X0, H, ZS, 2); // west
    B.box(darkMat, X0, 0, ZB - T_W, X1, H, ZB); // pit curtain
    B.box(wallMat, X1, 0, ZB, X1 + T_W, H, SZ0, 2); // right of the lanes
    B.box(wallMat, X1, 0, SZ0 - T_W, SX, H, SZ0, 2); // north of side area
    // south wall with the glass street door at x ∈ [5.6, 6.8]
    B.box(wallMat, X0 - T_W, 0, ZS, 5.6, H, ZS + T_W, 2);
    B.box(wallMat, 6.8, 0, ZS, SX + 0.1, H, ZS + T_W, 2);
    B.box(wallMat, 5.6, 2.2, ZS, 6.8, H, ZS + T_W, 2);
    B.box(alu, 5.55, 0, ZS - 0.02, 5.62, 2.22, ZS + T_W);
    B.box(alu, 6.78, 0, ZS - 0.02, 6.85, 2.22, ZS + T_W);
    B.box(alu, 5.55, 2.18, ZS - 0.02, 6.85, 2.25, ZS + T_W);
    B.box(alu, 6.17, 0, ZS + 0.06, 6.23, 2.2, ZS + 0.1);
    B.box(darkMat, 5.6, 0, ZS + T_W - 0.02, 6.8, 2.2, ZS + T_W); // night behind the door
    B.box(glassMat, 5.62, 0, ZS + 0.07, 6.78, 2.18, ZS + 0.09);
    B.box(alu, 5.75, 1.0, ZS + 0.02, 5.78, 1.3, ZS + 0.06); // pull handles
    B.box(alu, 6.62, 1.0, ZS + 0.02, 6.65, 1.3, ZS + 0.06);
    // east wall (building wall onto the terrace) with the open double door at z ∈ [1, 3]
    B.box(wallMat, SX - 0.1, 0, -5.6, SX + 0.1, 6, 1, 2);
    B.box(wallMat, SX - 0.1, 0, 3, SX + 0.1, 6, 10.4, 2);
    B.box(wallMat, SX - 0.1, 2.4, 1, SX + 0.1, 6, 3, 2);
    B.box(blackMetal, SX - 0.12, 0, 0.94, SX + 0.12, 2.42, 1.0);
    B.box(blackMetal, SX - 0.12, 0, 3.0, SX + 0.12, 2.42, 3.06);
    B.box(blackMetal, SX - 0.12, 2.36, 0.94, SX + 0.12, 2.44, 3.06);
    // the two glass leaves swung open onto the terrace
    for (const [hz, dir] of [
      [1.0, 1],
      [3.0, -1],
    ] as const) {
      const ang = dir * 78 * D;
      const leaf = M(
        SX + 0.12 + Math.sin(ang) * 0.48,
        1.2,
        hz + dir * Math.cos(78 * D) * 0.48,
        -ang + Math.PI / 2,
        0,
        0,
        0.98,
        2.36,
        0.03,
      );
      B.add(unitBox, glassMat, leaf);
      B.add(
        unitBox,
        blackMetal,
        leaf.clone().multiply(M(0, 0.49, 0, 0, 0, 0, 1.02, 0.03, 1.4)),
      );
      B.add(
        unitBox,
        blackMetal,
        leaf.clone().multiply(M(0, -0.49, 0, 0, 0, 0, 1.02, 0.03, 1.4)),
      );
    }
    // baseboards
    B.box(baseboard, X0, 0, ZA, X0 + 0.012, 0.08, ZS);
    B.box(baseboard, X0, 0, ZS - 0.012, 5.6, 0.08, ZS);
    B.box(baseboard, 6.8, 0, ZS - 0.012, SX - 0.1, 0.08, ZS);
    B.box(baseboard, X1, 0, SZ0, SX - 0.1, 0.08, SZ0 + 0.012);
    B.box(baseboard, SX - 0.112, 0, SZ0, SX - 0.1, 0.08, 0.94);
    B.box(baseboard, SX - 0.112, 0, 3.06, SX - 0.1, 0.08, ZS);

    // half-wall with the wooden handrail between the approach and the side area, glass above at the back
    B.box(lavender, X1 - 0.07, 0, SZ0, X1 + 0.07, 1.0, ZA, 1.5);
    B.box(handrail, X1 - 0.1, 1.0, SZ0, X1 + 0.1, 1.05, ZA + 0.03);
    B.box(lavender, X1 - 0.07, 0, ZA, X1 + 0.07, 1.0, ZA + 0.14, 1.5);
    for (let z = SZ0; z <= 0.01; z += 1)
      B.box(alu, X1 - 0.03, 1.05, z - 0.025, X1 + 0.03, 2.75, z + 0.025);
    B.box(glassMat, X1 - 0.01, 1.05, SZ0, X1 + 0.01, 2.75, 0);
    B.box(alu, X1 - 0.04, 2.73, SZ0, X1 + 0.04, 2.79, 0);
    B.box(wallMat, X1 - 0.07, 2.79, SZ0, X1 + 0.07, H, 0.6, 2); // soffit over the glass

    /* ---------- lanes ---------- */
    const laneLen = -LANE_END;
    for (const x of LANES) {
      B.add(
        unitPlane,
        laneMat,
        M(x, 0, LANE_END / 2, 0, -Math.PI / 2, 0, LW, laneLen, 1),
      );
      for (const s of [-1, 1]) {
        const gx = x + s * (LW / 2 + GW / 2);
        B.add(
          new THREE.CylinderGeometry(
            1,
            1,
            1,
            16,
            1,
            true,
            -Math.PI / 2,
            Math.PI,
          ),
          gutterMat,
          M(gx, 0, LANE_END / 2, 0, Math.PI / 2, 0, GW / 2, laneLen, 0.08),
        );
      }
    }
    // cappings between the gutters
    const edges: number[] = [X0];
    for (const x of LANES) edges.push(x - LW / 2 - GW, x + LW / 2 + GW);
    edges.push(X1);
    for (let i = 0; i + 1 < edges.length; i += 2) {
      const a = edges[i]!;
      const b = edges[i + 1]!;
      if (b - a < 0.01) continue;
      B.box(cappingMat, a, -0.12, LANE_END, b, 0.035, 0, 0);
    }
    // foul line markers on the cappings and the approach dots
    B.box(darkMat, X0, 0.036, -0.03, X1, 0.04, 0);
    const dotGeo = new THREE.CircleGeometry(0.012, 10);
    const dots: THREE.Matrix4[] = [];
    for (const x of LANES) {
      for (let k = -3; k <= 3; k++)
        dots.push(M(x + k * 0.13, 0.002, 0.3, 0, -Math.PI / 2));
      for (let k = -2; k <= 2; k++)
        dots.push(M(x + k * 0.13, 0.002, 3.7, 0, -Math.PI / 2));
    }

    /* ---------- pin deck, masking unit with the mural ---------- */
    B.box(darkMat, X0, 0.62, MASK_Z - 0.12, X1, H, MASK_Z);
    B.add(
      unitPlane,
      muralMat,
      M(0, (0.62 + H) / 2, MASK_Z + 0.002, 0, 0, 0, X1 - X0, H - 0.62, 1),
    );
    B.box(
      emissive("#f4f6ff", 2.4),
      X0,
      0.6,
      MASK_Z - 0.1,
      X1,
      0.625,
      MASK_Z - 0.02,
    );
    B.box(darkMat, X0, -0.3, LANE_END - 0.8, X1, -0.12, LANE_END);

    /* ---------- hanging screens, speakers, downlights ---------- */
    for (const x of LANES) {
      const m = M(x, 2.5, 0.25, 0, 12 * D);
      B.add(
        unitBox,
        blackMetal,
        m.clone().multiply(M(0, 0, 0, 0, 0, 0, 1.04, 0.62, 0.06)),
      );
      B.add(
        unitPlane,
        screenMat,
        m
          .clone()
          .multiply(T(0, 0, 0.031))
          .multiply(M(0, 0, 0, 0, 0, 0, 0.98, 0.56, 1)),
      );
      B.box(blackMetal, x - 0.015, 2.8, 0.22, x + 0.015, H, 0.25);
    }
    for (const x of PAIRS)
      B.box(blackMetal, x - 0.13, 2.45, 0.1, x + 0.13, 2.85, 0.38);
    const dlGeo = new THREE.CircleGeometry(0.07, 18);
    const dl: THREE.Matrix4[] = [];
    for (const x of [-2.5, -0.85, 0.85, 2.5])
      for (const z of [-15, -12, -9, -6, -3, 1.4, 3.4, 5.6, 7.8])
        dl.push(M(x, H - 0.004, z, 0, Math.PI / 2));
    for (const x of [5.0, 7.5])
      for (const z of [-2.5, 0, 2.5, 5, 7.5])
        dl.push(M(x, H - 0.004, z, 0, Math.PI / 2));
    // purple spots
    for (const x of [-3.0, 3.0]) {
      B.add(
        unitCyl,
        blackMetal,
        M(x, H - 0.12, 0.9, 0, 0.35, 0, 0.07, 0.22, 0.07),
      );
      B.add(
        new THREE.CircleGeometry(0.055, 14),
        emissive("#9b3dff", 5),
        M(x, H - 0.225, 0.94, 0, Math.PI / 2 + 0.35),
      );
    }

    /* ---------- ball returns (Kopp hoods) and racks ---------- */
    const hoodGeo = new RoundedBoxGeometry(0.62, 0.72, 0.95, 3, 0.09);
    const holeGeo = new THREE.CircleGeometry(0.165, 28);
    const railGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 10);
    const balls: THREE.Matrix4[] = [];
    const ballColors: THREE.Color[] = [];
    const rackColors = [
      ["#16171b", "#3b4fae", "#5b5228", "#43b04a", "#d23838"],
      ["#e2772c", "#4a55b8", "#5d4a2a", "#4cb84e", "#cf3c3c", "#16171b"],
    ];
    PAIRS.forEach((hx, p) => {
      B.add(hoodGeo, hoodMat, M(hx, 0.36, HOOD_Z));
      B.add(holeGeo, holeMat, M(hx, 0.36, HOOD_Z + 0.476));
      B.add(
        unitCyl,
        holeMat,
        M(hx, 0.36, HOOD_Z + 0.4, 0, Math.PI / 2, 0, 0.16, 0.16, 0.16),
      );
      for (const s of [-1, 1])
        B.add(
          unitPlane,
          koppMat,
          M(
            hx + s * 0.312,
            0.42,
            HOOD_Z + 0.05,
            (s * Math.PI) / 2,
            0,
            0,
            0.38,
            0.19,
            1,
          ),
        );
      const z1 = HOOD_Z + 0.45;
      const len = 1.5;
      for (const [dx, y] of [
        [-0.085, 0.17],
        [0.085, 0.17],
        [-0.19, 0.3],
        [0.19, 0.3],
      ] as const)
        B.add(
          railGeo,
          chrome,
          M(hx + dx, y, z1 + len / 2, 0, Math.PI / 2, 0, 1, len, 1),
        );
      B.add(
        new THREE.TorusGeometry(0.085, 0.016, 8, 16, Math.PI),
        chrome,
        M(hx, 0.17, z1 + len, 0, Math.PI / 2),
      );
      B.add(
        new THREE.TorusGeometry(0.19, 0.016, 8, 20, Math.PI),
        chrome,
        M(hx, 0.3, z1 + len, 0, Math.PI / 2),
      );
      for (const zz of [z1 + 0.3, z1 + len - 0.05]) {
        B.add(unitBox, chrome, M(hx, 0.15, zz, 0, 0, 0, 0.4, 0.025, 0.025));
        for (const s of [-1, 1]) {
          B.add(
            railGeo,
            chrome,
            M(hx + s * 0.19, 0.15, zz, 0, 0, 0, 0.8, 0.3, 0.8),
          );
          B.add(
            railGeo,
            chrome,
            M(hx + s * 0.085, 0.08, zz, 0, 0, 0, 0.8, 0.16, 0.8),
          );
        }
      }
      const cols = rackColors[p]!;
      cols.forEach((c, i) => {
        balls.push(
          M(
            hx,
            0.262,
            z1 + 0.17 + i * 0.226,
            rand() * 6,
            rand() * 6,
            rand() * 6,
          ),
        );
        ballColors.push(new THREE.Color(c));
      });
      ctx.wall(hx - 0.33, HOOD_Z - 0.48, hx + 0.33, z1 + len + 0.2);
    });

    /* ---------- score consoles, chairs, bins in the seating area ---------- */
    const CONSOLE_Z = 4.95;
    for (const cx of PAIRS) {
      B.box(
        consoleGrey,
        cx - 0.25,
        0,
        CONSOLE_Z - 0.2,
        cx + 0.25,
        0.85,
        CONSOLE_Z + 0.2,
      );
      B.box(
        blackMetal,
        cx - 0.28,
        0,
        CONSOLE_Z - 0.23,
        cx + 0.28,
        0.06,
        CONSOLE_Z + 0.23,
      );
      const mon = M(cx, 1.05, CONSOLE_Z + 0.08, 0, -40 * D);
      B.add(
        unitBox,
        consoleGrey,
        mon.clone().multiply(M(0, 0, 0, 0, 0, 0, 0.56, 0.42, 0.08)),
      );
      B.add(
        unitPlane,
        cartoonMat,
        mon
          .clone()
          .multiply(T(0, 0, 0.041))
          .multiply(M(0, 0, 0, 0, 0, 0, 0.48, 0.34, 1)),
      );
      const kb = M(cx, 0.84, CONSOLE_Z + 0.3, 0, -62 * D);
      B.add(
        unitBox,
        consoleGrey,
        kb.clone().multiply(M(0, 0, 0, 0, 0, 0, 0.5, 0.3, 0.04)),
      );
      B.add(
        unitPlane,
        panelMat,
        kb
          .clone()
          .multiply(T(0, 0, 0.021))
          .multiply(M(0, 0, 0, 0, 0, 0, 0.46, 0.27, 1)),
      );
      // the second, upright monitor facing the lanes
      B.box(
        consoleGrey,
        cx - 0.03,
        0.85,
        CONSOLE_Z - 0.17,
        cx + 0.03,
        1.15,
        CONSOLE_Z - 0.11,
      );
      const mon2 = M(cx, 1.32, CONSOLE_Z - 0.16, Math.PI, 8 * D);
      B.add(
        unitBox,
        blackMetal,
        mon2.clone().multiply(M(0, 0, 0, 0, 0, 0, 0.5, 0.34, 0.05)),
      );
      B.add(
        unitPlane,
        screenMat,
        mon2
          .clone()
          .multiply(T(0, 0, 0.026))
          .multiply(M(0, 0, 0, 0, 0, 0, 0.46, 0.3, 1)),
      );
      ctx.wall(cx - 0.3, CONSOLE_Z - 0.25, cx + 0.3, CONSOLE_Z + 0.45);
      // blue bin beside it
      B.box(
        blueBin,
        cx + 0.45,
        0,
        CONSOLE_Z - 0.15,
        cx + 0.78,
        0.62,
        CONSOLE_Z + 0.15,
      );
      B.box(
        blackMetal,
        cx + 0.44,
        0.62,
        CONSOLE_Z - 0.16,
        cx + 0.79,
        0.65,
        CONSOLE_Z + 0.16,
      );
      ctx.wall(cx + 0.43, CONSOLE_Z - 0.17, cx + 0.8, CONSOLE_Z + 0.17);
    }

    // green bucket seats: linked rows facing the lanes, and loose chairs at the side tables
    const shell = mergedLocal([
      [new RoundedBoxGeometry(0.44, 0.035, 0.42, 2, 0.015), M(0, 0.45, 0.02)],
      [
        new RoundedBoxGeometry(0.44, 0.4, 0.03, 2, 0.014),
        M(0, 0.69, -0.19, 0, -0.2),
      ],
      [new RoundedBoxGeometry(0.04, 0.05, 0.4, 1, 0.015), M(-0.2, 0.48, 0.02)],
      [new RoundedBoxGeometry(0.04, 0.05, 0.4, 1, 0.015), M(0.2, 0.48, 0.02)],
    ]);
    const legs4 = mergedLocal([
      [unitCyl, M(-0.19, 0.22, 0.17, 0, 0, 0, 0.012, 0.44, 0.012)],
      [unitCyl, M(0.19, 0.22, 0.17, 0, 0, 0, 0.012, 0.44, 0.012)],
      [unitCyl, M(-0.19, 0.22, -0.17, 0, 0, 0, 0.012, 0.44, 0.012)],
      [unitCyl, M(0.19, 0.22, -0.17, 0, 0, 0, 0.012, 0.44, 0.012)],
    ]);
    const greenSeats: THREE.Matrix4[] = [];
    const greenLegs: THREE.Matrix4[] = [];
    for (const cx of PAIRS) {
      for (const rz of [6.15, 7.45]) {
        for (let i = 0; i < 4; i++)
          greenSeats.push(M(cx - 0.75 + i * 0.5, 0, rz, Math.PI));
        B.box(steel, cx - 1.0, 0.36, rz - 0.04, cx + 1.0, 0.41, rz + 0.04);
        for (const s of [-1, 1]) {
          B.box(
            steel,
            cx + s * 0.95 - 0.025,
            0,
            rz - 0.025,
            cx + s * 0.95 + 0.025,
            0.38,
            rz + 0.025,
          );
          B.box(
            steel,
            cx + s * 0.95 - 0.025,
            0,
            rz - 0.22,
            cx + s * 0.95 + 0.025,
            0.03,
            rz + 0.22,
          );
        }
        ctx.wall(cx - 1.02, rz - 0.25, cx + 1.02, rz + 0.25);
      }
    }
    // light-wood tables with steel frames (side area), four green chairs each
    const sideTables: [number, number][] = [
      [5.9, 0.4],
      [6.2, 4.4],
    ];
    for (const [tx, tz] of sideTables) {
      B.box(lightWood, tx - 0.6, 0.72, tz - 0.36, tx + 0.6, 0.75, tz + 0.36);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          B.box(
            steel,
            tx + sx * 0.53 - 0.02,
            0,
            tz + sz * 0.29 - 0.02,
            tx + sx * 0.53 + 0.02,
            0.72,
            tz + sz * 0.29 + 0.02,
          );
      B.box(steel, tx - 0.55, 0.66, tz - 0.31, tx + 0.55, 0.7, tz + 0.31);
      for (const sx of [-0.3, 0.3])
        for (const sz of [-1, 1]) {
          const m = M(tx + sx, 0, tz + sz * 0.62, sz > 0 ? Math.PI : 0);
          greenSeats.push(m);
          greenLegs.push(m);
        }
      ctx.wall(tx - 0.62, tz - 0.85, tx + 0.62, tz + 0.85);
    }

    /* ---------- arcade corner (side area) ---------- */
    // claw machine
    {
      const cx = 4.2;
      const cz = -3.45;
      B.box(
        new THREE.MeshStandardMaterial({ color: "#d23a7a", roughness: 0.35 }),
        cx - 0.43,
        0,
        cz - 0.4,
        cx + 0.43,
        0.95,
        cz + 0.4,
      );
      B.box(glassMat, cx - 0.42, 0.95, cz - 0.39, cx + 0.42, 1.75, cz + 0.39);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          B.box(
            chrome,
            cx + sx * 0.42 - 0.02,
            0.95,
            cz + sz * 0.39 - 0.02,
            cx + sx * 0.42 + 0.02,
            1.75,
            cz + sz * 0.39 + 0.02,
          );
      B.box(
        new THREE.MeshStandardMaterial({ color: "#2a1d6b", roughness: 0.4 }),
        cx - 0.45,
        1.75,
        cz - 0.42,
        cx + 0.45,
        2.05,
        cz + 0.42,
      );
      B.box(
        emissive("#ff5fb0", 2.6),
        cx - 0.4,
        1.8,
        cz + 0.42,
        cx + 0.4,
        2.0,
        cz + 0.425,
      );
      B.box(blackMetal, cx - 0.3, 0.92, cz + 0.4, cx + 0.3, 0.98, cz + 0.55);
      B.add(unitCyl, chrome, M(cx + 0.05, 1.55, cz, 0, 0, 0, 0.01, 0.35, 0.01));
      B.add(
        new THREE.ConeGeometry(0.06, 0.1, 6, 1, true),
        chrome,
        M(cx + 0.05, 1.35, cz, 0, Math.PI),
      );
      ctx.wall(cx - 0.45, cz - 0.42, cx + 0.45, cz + 0.6);
    }
    // gold carousel kiddie ride
    const prizes: THREE.Matrix4[] = [];
    const prizeColors: THREE.Color[] = [];
    const prizePal = [
      "#ff6b8a",
      "#ffd23f",
      "#5ec8ff",
      "#8cff6b",
      "#c58cff",
      "#ff9f43",
      "#ffffff",
    ];
    for (let i = 0; i < 26; i++) {
      prizes.push(
        M(
          4.2 + (rand() - 0.5) * 0.7,
          1.0 + rand() * 0.16,
          -3.45 + (rand() - 0.5) * 0.65,
          rand() * 6,
          0,
          0,
          0.06 + rand() * 0.03,
        ),
      );
      prizeColors.push(new THREE.Color(prizePal[i % prizePal.length]!));
    }
    const bulbs: THREE.Matrix4[] = [];
    {
      const cx = 7.3;
      const cz = -2.6;
      const gold = metal("#d9a93a", 0.25);
      B.add(
        new THREE.CylinderGeometry(0.75, 0.8, 0.25, 32),
        new THREE.MeshStandardMaterial({ color: "#b3202a", roughness: 0.4 }),
        M(cx, 0.125, cz),
      );
      B.add(
        new THREE.CylinderGeometry(0.76, 0.76, 0.02, 32),
        gold,
        M(cx, 0.26, cz),
      );
      B.add(unitCyl, gold, M(cx, 1.3, cz, 0, 0, 0, 0.05, 2.1, 0.05));
      B.add(
        new THREE.ConeGeometry(0.85, 0.4, 24, 1, true),
        gold,
        M(cx, 2.4, cz),
      );
      B.add(
        new THREE.CylinderGeometry(0.85, 0.85, 0.14, 24, 1, true),
        new THREE.MeshStandardMaterial({
          color: "#f2e6c4",
          roughness: 0.5,
          side: THREE.DoubleSide,
        }),
        M(cx, 2.13, cz),
      );
      B.add(new THREE.SphereGeometry(0.08, 12, 8), gold, M(cx, 2.62, cz));
      const seatCols = ["#e8e2d6", "#5ab3e8", "#f08ab4"];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const px = cx + Math.cos(a) * 0.5;
        const pz = cz + Math.sin(a) * 0.5;
        B.add(unitCyl, gold, M(px, 1.18, pz, 0, 0, 0, 0.015, 1.9, 0.015));
        B.add(
          new RoundedBoxGeometry(0.16, 0.24, 0.5, 2, 0.06),
          new THREE.MeshStandardMaterial({
            color: seatCols[i]!,
            roughness: 0.35,
          }),
          M(px, 0.72, pz, -a),
        );
        B.add(
          new RoundedBoxGeometry(0.12, 0.22, 0.14, 2, 0.05),
          new THREE.MeshStandardMaterial({
            color: seatCols[i]!,
            roughness: 0.35,
          }),
          M(
            px + Math.cos(a + Math.PI / 2) * 0.2,
            0.92,
            pz + Math.sin(a + Math.PI / 2) * 0.2,
            -a,
            0.4,
          ),
        );
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        bulbs.push(
          M(
            cx + Math.cos(a) * 0.86,
            2.06,
            cz + Math.sin(a) * 0.86,
            0,
            0,
            0,
            0.6,
          ),
        );
      }
      ctx.wall(cx - 0.82, cz - 0.82, cx + 0.82, cz + 0.82);
    }
    // a dark arcade cabinet by the north wall
    B.box(blackMetal, 5.4, 0, -3.95, 6.1, 1.8, -3.35);
    B.add(
      unitPlane,
      cartoonMat,
      M(5.75, 1.3, -3.34, 0, -10 * D, 0, 0.5, 0.36, 1),
    );
    B.box(emissive("#43c8ff", 2.2), 5.42, 1.72, -3.34, 6.08, 1.78, -3.33);
    ctx.wall(5.38, -4, 6.12, -3.3);

    /* ---------- the couple's photo, on the seating wall ---------- */
    ctx.photo(
      "itumbiara-1.webp",
      0.45,
      0.6,
      new THREE.Vector3(-1.7, 1.6, ZS - 0.02),
      180,
    );

    /* ================= the terrace ================= */
    // posts, beams and the white roof
    const postXs = [SX + 0.1, 11.7, 14.35, TX];
    const postZs = [SZ0, FENCE_Z, 1.6, 5.2, ZS];
    for (const x of postXs)
      for (const z of [SZ0, ZS]) {
        if (x === SX + 0.1) continue;
        B.box(blackMetal, x - 0.05, 0, z - 0.05, x + 0.05, ROOF, z + 0.05);
      }
    for (const z of postZs)
      B.box(blackMetal, TX - 0.05, 0, z - 0.05, TX + 0.05, ROOF, z + 0.05);
    for (const x of [11.7, 14.35])
      B.box(
        blackMetal,
        x - 0.05,
        0,
        FENCE_Z - 0.05,
        x + 0.05,
        ROOF,
        FENCE_Z + 0.05,
      );
    for (let x = SX + 1.3; x < TX; x += 2.6)
      B.box(blackMetal, x - 0.05, ROOF - 0.2, SZ0, x + 0.05, ROOF, ZS);
    B.box(blackMetal, SX, ROOF - 0.15, SZ0 - 0.04, TX + 0.05, ROOF, SZ0 + 0.04);
    B.box(blackMetal, SX, ROOF - 0.15, ZS - 0.04, TX + 0.05, ROOF, ZS + 0.04);
    B.box(blackMetal, TX - 0.04, ROOF - 0.15, SZ0, TX + 0.04, ROOF, ZS);
    // wire-grid fences
    const fence = (x0: number, z0: number, x1: number, z1: number, h = 2.8) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ry = Math.atan2(-(z1 - z0), x1 - x0);
      B.add(
        unitPlane,
        gridMat,
        M((x0 + x1) / 2, h / 2, (z0 + z1) / 2, ry, 0, 0, len, h, 1),
        0.1,
      );
      B.add(
        unitBox,
        blackMetal,
        M((x0 + x1) / 2, h, (z0 + z1) / 2, ry, 0, 0, len, 0.03, 0.03),
      );
      B.add(
        unitBox,
        blackMetal,
        M((x0 + x1) / 2, 0.02, (z0 + z1) / 2, ry, 0, 0, len, 0.03, 0.03),
      );
    };
    fence(SX + 0.1, SZ0, TX, SZ0);
    fence(SX + 0.1, ZS, TX, ZS);
    fence(TX, SZ0, TX, ZS);
    fence(SX + 0.1, FENCE_Z, TX, FENCE_Z);
    ctx.wall(SX, FENCE_Z - 0.06, TX + 0.2, FENCE_Z + 0.06);
    ctx.wall(TX - 0.06, SZ0, TX + 0.2, ZS + 0.2);
    ctx.wall(SX, ZS - 0.06, TX + 0.2, ZS + 0.2);
    // the street beyond: the lit building across, night sky
    B.add(unitPlane, nightMat, M(18.6, 3, 2.4, -Math.PI / 2, 0, 0, 16, 6, 1));
    B.add(unitPlane, nightMat, M(13.8, 3, -5.6, 0, 0, 0, 9.6, 6, 1));
    B.add(unitPlane, nightMat, M(13.8, 3, 10.4, Math.PI, 0, 0, 9.6, 6, 1));
    // sponsor banner on the east fence
    B.add(
      unitPlane,
      new THREE.MeshStandardMaterial({ map: bannerTex(), roughness: 0.6 }),
      M(TX - 0.03, 1.9, 3.4, -Math.PI / 2, 0, 0, 1.8, 0.9, 1),
    );

    // the Edinho Torresmo stall behind the grid
    {
      const k0 = 10.9;
      const k1 = 14.2;
      const kz0 = SZ0 + 0.1;
      const kz1 = FENCE_Z - 0.35;
      B.box(darkWood, k0, 0, kz0, k1, 2.7, kz0 + 0.08);
      B.box(darkWood, k0, 0, kz0, k0 + 0.08, 2.7, kz1);
      B.box(darkWood, k1 - 0.08, 0, kz0, k1, 2.7, kz1);
      B.box(darkWood, k0, 2.62, kz0, k1, 2.7, kz1 + 0.1);
      // counter
      B.box(darkWood, k0 + 0.08, 0, kz1 - 0.5, k1 - 0.08, 0.98, kz1);
      B.box(steel, k0 + 0.06, 0.98, kz1 - 0.52, k1 - 0.06, 1.01, kz1 + 0.02);
      // shelf with bottles on the back wall
      B.box(darkWood, k0 + 0.3, 1.5, kz0 + 0.08, k1 - 0.3, 1.53, kz0 + 0.3);
      // fryer pot on its burner
      B.add(
        new THREE.CylinderGeometry(0.3, 0.27, 0.32, 24, 1, true),
        metal("#3b3b3d", 0.4),
        M(11.8, 1.17, kz0 + 0.8),
      );
      B.add(
        new THREE.CircleGeometry(0.29, 24),
        new THREE.MeshStandardMaterial({
          color: "#b58a3a",
          roughness: 0.15,
          metalness: 0.2,
        }),
        M(11.8, 1.27, kz0 + 0.8, 0, -Math.PI / 2),
      );
      B.box(blackMetal, 11.5, 0, kz0 + 0.5, 12.1, 1.01, kz0 + 1.1);
      // the menu board inside
      B.box(
        new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.8 }),
        12.8,
        1.7,
        kz0 + 0.081,
        13.9,
        2.4,
        kz0 + 0.1,
      );
      // warm bulb inside
      B.add(
        new THREE.SphereGeometry(0.06, 12, 8),
        emissive("#ffd49a", 6),
        M(12.6, 2.45, kz0 + 0.9),
      );
      // yellow beer crates by the stall
      for (let i = 0; i < 4; i++) {
        const cz = FENCE_Z - 0.6;
        const y = i * 0.29;
        B.box(yellowCrate, 14.4, y, cz - 0.17, 14.95, y + 0.28, cz + 0.17);
        for (let b = 0; b < 6; b++)
          B.add(
            unitCyl,
            new THREE.MeshStandardMaterial({
              color: "#3a2410",
              roughness: 0.3,
            }),
            M(
              14.48 + (b % 3) * 0.18,
              y + 0.28,
              cz - 0.08 + Math.floor(b / 3) * 0.16,
              0,
              0,
              0,
              0.03,
              0.02,
              0.03,
            ),
          );
      }
    }
    // the sign hung on the grid
    B.add(
      unitPlane,
      new THREE.MeshStandardMaterial({ map: torresmoTex(), roughness: 0.6 }),
      M(12.6, 2.15, FENCE_Z + 0.02, 0, 0, 0, 1.1, 0.82, 1),
    );
    B.box(blackMetal, 12.03, 2.56, FENCE_Z + 0.005, 13.17, 2.6, FENCE_Z + 0.04);

    // bottles on the shelf
    const bottleGeo = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.035, 0],
        [0.037, 0.02],
        [0.037, 0.19],
        [0.03, 0.22],
        [0.014, 0.25],
        [0.013, 0.31],
        [0, 0.31],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    );
    const bottleMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const bottles: THREE.Matrix4[] = [];
    const bottleCols: THREE.Color[] = [];
    for (let i = 0; i < 12; i++) {
      bottles.push(M(11.3 + i * 0.22, 1.53, SZ0 + 0.28));
      bottleCols.push(
        new THREE.Color(["#b4791a", "#3f6a23", "#d8c26a", "#6a2a10"][i % 4]!),
      );
    }
    // a beer bottle on the couple's table
    const CT_X = 11.9;
    const CT_Z = -0.35;
    bottles.push(M(CT_X + 0.2, 0.745, CT_Z - 0.15));
    bottleCols.push(new THREE.Color("#7a4a12"));

    // red plastic tables and chairs
    const tables: [number, number][] = [
      [CT_X, CT_Z],
      [15.0, -0.3],
      [12.2, 3.2],
      [15.2, 3.2],
      [11.6, 6.6],
      [14.8, 6.7],
    ];
    const redChair = mergedLocal([
      [new RoundedBoxGeometry(0.44, 0.035, 0.42, 2, 0.015), M(0, 0.43, 0.02)],
      [
        new RoundedBoxGeometry(0.44, 0.07, 0.03, 2, 0.012),
        M(0, 0.61, -0.2, 0, -0.18),
      ],
      [
        new RoundedBoxGeometry(0.44, 0.07, 0.03, 2, 0.012),
        M(0, 0.73, -0.22, 0, -0.18),
      ],
      [
        new RoundedBoxGeometry(0.44, 0.08, 0.03, 2, 0.012),
        M(0, 0.85, -0.24, 0, -0.18),
      ],
      [
        new RoundedBoxGeometry(0.035, 0.45, 0.04, 1, 0.012),
        M(-0.21, 0.66, -0.21, 0, -0.18),
      ],
      [
        new RoundedBoxGeometry(0.035, 0.45, 0.04, 1, 0.012),
        M(0.21, 0.66, -0.21, 0, -0.18),
      ],
      [new RoundedBoxGeometry(0.04, 0.03, 0.36, 1, 0.012), M(-0.23, 0.63, 0.0)],
      [new RoundedBoxGeometry(0.04, 0.03, 0.36, 1, 0.012), M(0.23, 0.63, 0.0)],
      [new RoundedBoxGeometry(0.03, 0.2, 0.03, 1, 0.01), M(-0.23, 0.53, 0.15)],
      [new RoundedBoxGeometry(0.03, 0.2, 0.03, 1, 0.01), M(0.23, 0.53, 0.15)],
      [
        new RoundedBoxGeometry(0.04, 0.44, 0.04, 1, 0.012),
        M(-0.2, 0.21, 0.19, 0, 0.08, -0.06),
      ],
      [
        new RoundedBoxGeometry(0.04, 0.44, 0.04, 1, 0.012),
        M(0.2, 0.21, 0.19, 0, 0.08, 0.06),
      ],
      [
        new RoundedBoxGeometry(0.04, 0.44, 0.04, 1, 0.012),
        M(-0.2, 0.21, -0.17, 0, -0.08, -0.06),
      ],
      [
        new RoundedBoxGeometry(0.04, 0.44, 0.04, 1, 0.012),
        M(0.2, 0.21, -0.17, 0, -0.08, 0.06),
      ],
    ]);
    const redChairs: THREE.Matrix4[] = [];
    const topDecal = new THREE.MeshStandardMaterial({
      map: tableTopTex(),
      transparent: true,
      roughness: 0.45,
      depthWrite: false,
    });
    const tableTopGeo = new RoundedBoxGeometry(0.7, 0.04, 0.7, 2, 0.015);
    tables.forEach(([tx, tz], ti) => {
      B.add(tableTopGeo, redPlastic, M(tx, 0.725, tz));
      B.box(
        redPlastic,
        tx - 0.33,
        0.62,
        tz - 0.33,
        tx + 0.33,
        0.705,
        tz + 0.33,
      );
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          B.add(
            new RoundedBoxGeometry(0.05, 0.66, 0.05, 1, 0.015),
            redPlastic,
            M(tx + sx * 0.3, 0.33, tz + sz * 0.3, 0, -sz * 0.06, sx * 0.06),
          );
      B.add(
        unitPlane,
        topDecal,
        M(tx, 0.7465, tz, 0, -Math.PI / 2, 0, 0.6, 0.6, 1),
      );
      const seats = ti === 0 ? [0, 1, 2] : ti % 2 ? [0, 1, 2, 3] : [0, 2, 3];
      for (const s of seats) {
        const a = (s / 4) * Math.PI * 2 + (rand() - 0.5) * 0.25;
        const d = 0.58 + rand() * 0.08;
        const cx = tx + Math.sin(a) * d;
        const cz = tz + Math.cos(a) * d;
        redChairs.push(M(cx, 0, cz, a + Math.PI));
      }
      ctx.wall(tx - 0.4, tz - 0.4, tx + 0.4, tz + 0.4);
    });
    // what is on the couple's table: a red drink, the beer, a plate of torresmo, a menu card
    B.add(
      new THREE.CylinderGeometry(0.038, 0.032, 0.13, 16, 1, true),
      glassMat,
      M(CT_X - 0.12, 0.81, CT_Z + 0.1),
    );
    B.add(
      new THREE.CylinderGeometry(0.035, 0.03, 0.1, 16),
      new THREE.MeshStandardMaterial({
        color: "#7a1020",
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
      M(CT_X - 0.12, 0.8, CT_Z + 0.1),
    );
    B.add(
      new THREE.CylinderGeometry(0.11, 0.08, 0.02, 24),
      new THREE.MeshStandardMaterial({ color: "#f4f2ee", roughness: 0.3 }),
      M(CT_X + 0.05, 0.755, CT_Z + 0.05),
    );
    const crackling: THREE.Matrix4[] = [];
    for (let i = 0; i < 14; i++)
      crackling.push(
        M(
          CT_X + 0.05 + (rand() - 0.5) * 0.13,
          0.775 + rand() * 0.02,
          CT_Z + 0.05 + (rand() - 0.5) * 0.13,
          rand() * 6,
          rand(),
          rand(),
          0.03 + rand() * 0.015,
          0.02,
          0.025,
        ),
      );
    B.box(
      new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.3 }),
      CT_X - 0.25,
      0.745,
      CT_Z - 0.2,
      CT_X - 0.1,
      0.92,
      CT_Z - 0.18,
    );

    // string lights across the terrace
    const bulbGeo = new THREE.SphereGeometry(0.028, 10, 8);
    const strandBulbs: THREE.Matrix4[] = [];
    const wireGeos: THREE.BufferGeometry[] = [];
    for (const z of [-1.0, 1.0, 3.0, 5.0, 7.0, 8.5]) {
      const pts: THREE.Vector3[] = [];
      const xa = SX + 0.2;
      const xb = TX - 0.1;
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push(
          new THREE.Vector3(
            xa + (xb - xa) * t,
            ROOF - 0.25 - 0.4 * (1 - (2 * t - 1) ** 2),
            z,
          ),
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      wireGeos.push(new THREE.TubeGeometry(curve, 48, 0.004, 4, false));
      for (let i = 1; i < 16; i++) {
        const p = curve.getPoint(i / 16);
        strandBulbs.push(M(p.x, p.y - 0.05, p.z));
      }
    }
    for (const g of wireGeos) B.add(g, blackMetal, new THREE.Matrix4());
    // string lights along the building wall too (seen behind them in the photos)
    for (let i = 0; i < 18; i++)
      strandBulbs.push(
        M(SX + 0.16, 3.0 + Math.sin(i * 1.3) * 0.05, SZ0 + 0.4 + i * 0.7),
      );

    B.flush(root);

    /* ---------- instanced pieces ---------- */
    const inst = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      ms: THREE.Matrix4[],
      cast = true,
      colors?: THREE.Color[],
    ) => {
      const im = new THREE.InstancedMesh(geo, mat, ms.length);
      ms.forEach((m, i) => im.setMatrixAt(i, m));
      if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = cast;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      root.add(im);
      return im;
    };
    // pins
    const pinGeo = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.0255, 0],
        [0.034, 0.02],
        [0.05, 0.06],
        [0.0605, 0.114],
        [0.056, 0.16],
        [0.04, 0.21],
        [0.0235, 0.25],
        [0.0225, 0.27],
        [0.028, 0.3],
        [0.032, 0.33],
        [0.029, 0.36],
        [0.018, 0.376],
        [0, 0.381],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      20,
    );
    const pins: THREE.Matrix4[] = [];
    const stripes: THREE.Matrix4[] = [];
    for (const lx of LANES)
      for (let r = 0; r < 4; r++)
        for (let i = 0; i <= r; i++) {
          const x = lx + (i - r / 2) * 0.305;
          const z = MASK_Z - 0.3 - r * 0.264;
          pins.push(M(x, 0, z));
          stripes.push(M(x, 0.257, z, 0, 0, 0, 0.0245, 0.009, 0.0245));
          stripes.push(M(x, 0.272, z, 0, 0, 0, 0.0232, 0.008, 0.0232));
        }
    inst(pinGeo, pinWhite, pins);
    inst(
      new THREE.CylinderGeometry(1, 1, 1, 20, 1, true),
      pinRed,
      stripes,
      false,
    );
    // bowling balls
    const ballMat = new THREE.MeshPhysicalMaterial({
      map: marbleBallTex(),
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
    });
    inst(
      new THREE.SphereGeometry(0.109, 32, 20),
      ballMat,
      balls,
      true,
      ballColors,
    );
    const holes: THREE.Matrix4[] = [];
    for (const b of balls) {
      const p = new THREE.Vector3().setFromMatrixPosition(b);
      for (const [dx, dz] of [
        [-0.022, -0.02],
        [0.022, -0.02],
        [0, 0.03],
      ] as const) {
        const n = new THREE.Vector3(dx * 4, 1, dz * 4).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          n,
        );
        holes.push(
          new THREE.Matrix4().compose(
            p.clone().addScaledVector(n, 0.1095),
            q,
            new THREE.Vector3(1, 1, 1),
          ),
        );
      }
    }
    inst(new THREE.CircleGeometry(0.011, 10), holeMat, holes, false);
    inst(dotGeo, darkMat, dots, false);
    inst(dlGeo, downlight, dl, false);
    inst(shell, greenPlastic, greenSeats);
    inst(legs4, steel, greenLegs);
    inst(redChair, redPlastic, redChairs);
    inst(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshStandardMaterial({ roughness: 0.6 }),
      prizes,
      false,
      prizeColors,
    );
    inst(
      new THREE.SphereGeometry(0.035, 10, 8),
      emissive("#ffe2a8", 4),
      bulbs,
      false,
    );
    inst(bulbGeo, emissive("#ffcf8a", 5), strandBulbs, false);
    inst(bottleGeo, bottleMat, bottles, false, bottleCols);
    inst(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: "#c98a3c", roughness: 0.55 }),
      crackling,
      false,
    );

    /* ---------- people ---------- */
    ctx.playerOutfit(OUTFITS);
    const line =
      ctx.player === "elena"
        ? "Strike! Ou quase… 🎳"
        : "Minha irmã tá ganhando de você, hein 😂";
    ctx.partner(2.55, 3.3, 38, "talk", OUTFITS, line);
    // Elena's little sister on lane 3's approach
    ctx.person(
      {
        skin: "#e0b08f",
        hair: "#24160f",
        hairStyle: "long",
        height: 1.35,
        female: true,
      },
      {
        top: "#17181c",
        topStyle: "tshirt",
        print: "♥",
        printColor: "#f070b0",
        bottom: "#a4e6d0",
        bottomStyle: "shorts",
        shoes: "#e9e3da",
      },
      0.9,
      1.45,
      25,
      "wave",
      "Bora mais uma partida!",
    );
    // the cook at the torresmo stall
    ctx.person(
      {
        skin: "#d2a07e",
        hair: "#8d8984",
        hairStyle: "short",
        height: 1.74,
        glasses: true,
      },
      {
        top: "#ecebe6",
        topStyle: "tshirt",
        bottom: "#3a3d44",
        bottomStyle: "pants",
        shoes: "#222222",
      },
      12.7,
      -2.75,
      0,
      "stand",
      "Olha o torresmo saindo! 🥓",
    );

    /* ---------- lights (8, one shadow) ---------- */
    root.add(new THREE.HemisphereLight("#e4e9ff", "#2a2622", 0.35));
    // key over the approach: the people and the ball returns, with shadows
    const key = new THREE.SpotLight("#f5f2ea", 34, 0, 62 * D, 0.85, 2);
    key.position.set(0.6, H - 0.05, 2.6);
    key.target.position.set(0.6, 0, 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 0.3;
    key.shadow.camera.far = 9;
    root.add(key, key.target);
    // the downlight rows over the lanes
    const lanesWash = new THREE.RectAreaLight("#eef1ff", 2.2, X1 - X0, 15);
    lanesWash.position.set(0, H - 0.02, -8.5);
    lanesWash.lookAt(0, 0, -8.5);
    root.add(lanesWash);
    // the pin deck lights under the mural
    const deck = new THREE.PointLight("#ffffff", 5, 3.5, 2);
    deck.position.set(0, 0.5, MASK_Z + 0.25);
    root.add(deck);
    // seating and side area
    const seat = new THREE.PointLight("#f6f2ea", 12, 0, 2);
    seat.position.set(0, H - 0.25, 6.6);
    root.add(seat);
    const side = new THREE.PointLight("#f2efe6", 9, 0, 2);
    side.position.set(6.3, H - 0.25, 1.5);
    root.add(side);
    // the terrace under its string lights, and the stall
    const terrace = new THREE.PointLight("#ffc27a", 16, 0, 2);
    terrace.position.set(13.2, ROOF - 0.5, 3.0);
    root.add(terrace);
    const stall = new THREE.PointLight("#ffd29a", 6, 7, 2);
    stall.position.set(12.6, 2.35, -2.6);
    root.add(stall);

    /* ---------- the game ---------- */
    // the pack rests on top of the left ball-return hood
    ctx.pack(PAIRS[0]!, 0.72, HOOD_Z + 0.05, 20);
    ctx.spawn(6.2, 7.9, 40);
    ctx.exit(6.2, ZS - 0.3, 0.5);
  },
};

export default scene;
