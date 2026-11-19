import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  carpet,
  emissive,
  fabric,
  leather,
  metal,
  pbr,
  plaster,
  repeat,
  seeded,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneModule } from "../fp/types";

/*
 * A VIP cinema room in a mall in Uberlândia: about 12 m wide, 14 m deep and
 * 6 m high. Four stepped rows of black leather power recliners in pairs with
 * side tables and little lamps between them, dark acoustic walls, dim
 * sconces, LED step lights on the aisles, the projection window at the back
 * with its beam and floating dust, and a giant screen playing a slow sunset
 * that lights the room. The partner waits in the third row, popcorn and
 * drinks on the side table.
 *
 * The engine walks on a flat floor, so this scene lifts the camera (and the
 * player's own body) to the height of the steps under the player.
 */

/* ---------------- layout (meters; the screen is at -Z) ---------------- */

const W = 12;
const HALF_W = W / 2;
const FRONT = -7;
const BACK = 7;
const CEIL = 6;
const ROW_DEPTH = 2.3;
const RISE = 0.45;
const ROW0 = -3.4;
const ROWS = 4;
const BACK_AISLE = ROW0 + ROWS * ROW_DEPTH; // 5.8
const TABLE_W = 0.5;
const SEAT_W = 0.86;
const PAIR_W = SEAT_W * 2;
const BLOCK = 5 * TABLE_W + 4 * PAIR_W; // tables and pairs across the row
const BLOCK_X = BLOCK / 2; // 4.69: the side aisles start here
const STEP = ROW_DEPTH / 2;
const TOP = (ROWS - 1) * RISE; // 1.35
const SCREEN_W = 10.4;
const SCREEN_H = 4.35;
const SCREEN_Y = 3.3;
const SCREEN_Z = FRONT + 0.16;
const LENS = new THREE.Vector3(0, 4.55, BACK + 0.05);

const rowZ = (k: number) => ROW0 + k * ROW_DEPTH;
const rowH = (k: number) => k * RISE;
/** Seat origin (floor, center) along Z for a row: the backs sit near the riser of the next row. */
const seatZ = (k: number) => rowZ(k) + 1.55;

/** Floor height under a point: tiers in the seating block, half steps on the side aisles. */
function floorAt(x: number, z: number) {
  if (z < ROW0) return 0;
  if (z >= BACK_AISLE) return TOP;
  if (Math.abs(x) > BLOCK_X) {
    const i = Math.min(7, Math.floor((z - ROW0) / STEP));
    return Math.min(i, 6) * (RISE / 2);
  }
  return Math.min(ROWS - 1, Math.floor((z - ROW0) / ROW_DEPTH)) * RISE;
}

/** X of table j (0..4) and of seat s (0..1) of pair j (0..3). */
const tableX = (j: number) => -BLOCK_X + TABLE_W / 2 + j * (TABLE_W + PAIR_W);
const seatX = (j: number, s: number) =>
  tableX(j) + TABLE_W / 2 + SEAT_W / 2 + s * SEAT_W;

/* ---------------- geometry helpers ---------------- */

const KEEP = new Set(["position", "normal", "uv"]);

/** Non-indexed, with only position/normal/uv, so everything merges together. */
function clean(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes))
    if (!KEEP.has(name)) g.deleteAttribute(name);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  if (!g.getAttribute("uv"))
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        new Float32Array(g.getAttribute("position").count * 2),
        2,
      ),
    );
  return g;
}

/** Planar UVs in meters (divided by tile) picked by the dominant normal axis. */
function worldUV(g: THREE.BufferGeometry, tile: number) {
  const p = g.getAttribute("position");
  const n = g.getAttribute("normal");
  const uv = g.getAttribute("uv");
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
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();

function place<T extends THREE.BufferGeometry>(
  geo: T,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
): T {
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s);
  geo.applyMatrix4(_m);
  return geo;
}

const box = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
) => place(new THREE.BoxGeometry(w, h, d), x, y, z);
const rbox = (w: number, h: number, d: number, r: number, seg = 2) =>
  new RoundedBoxGeometry(
    w,
    h,
    d,
    seg,
    Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001),
  );

/** Collects static geometry per material and merges it into one mesh each. */
class Batch {
  private groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private noShadow = new Set<THREE.Material>();

  add(mat: THREE.Material, geo: THREE.BufferGeometry, tile = 0) {
    const g = clean(geo);
    if (tile) worldUV(g, tile);
    const list = this.groups.get(mat);
    if (list) list.push(g);
    else this.groups.set(mat, [g]);
  }

  noCast(mat: THREE.Material) {
    this.noShadow.add(mat);
  }

  flush(parent: THREE.Object3D) {
    for (const [mat, list] of this.groups) {
      const merged = mergeGeometries(list);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !this.noShadow.has(mat);
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.groups.clear();
  }
}

/** Merges local parts into one geometry (for instancing). */
function mergeParts(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map(clean));
  if (!g) throw new Error("merge failed");
  return g;
}

/* ---------------- painted textures ---------------- */

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

/** Cinema carpet: dark charcoal with a small repeating motif in wine and petrol blue. */
function cinemaCarpetMap() {
  return canvasTex(512, 512, (g) => {
    const rand = seeded(91);
    g.fillStyle = "#18161c";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26000; i++) {
      const v = 10 + rand() * 30;
      g.fillStyle = `rgba(${v + 6},${v},${v + 8},0.35)`;
      g.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2, 1 + rand() * 2);
    }
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const cx = x * 64 + (y % 2 ? 32 : 0);
        const cy = y * 64 + 32;
        g.save();
        g.translate(cx, cy);
        g.rotate(Math.PI / 4);
        g.strokeStyle = "rgba(92,34,52,0.55)";
        g.lineWidth = 3;
        g.strokeRect(-11, -11, 22, 22);
        g.fillStyle = "rgba(30,62,72,0.6)";
        g.fillRect(-3, -3, 6, 6);
        g.restore();
      }
    }
  });
}

/** Vertical gradient blob for the light a sconce throws on the wall (additive). */
function washTex() {
  return canvasTex(128, 256, (g) => {
    const img = g.createImageData(128, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 128; x++) {
        const dx = (x - 63.5) / 64;
        const dy = (y - 127.5) / 128;
        const r2 = dx * dx * 1.0 + dy * dy;
        const a =
          Math.max(0, Math.exp(-r2 * 5) - Math.exp(-5)) *
          (0.35 + 0.65 * Math.exp(-dx * dx * 12));
        const i = (y * 128 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
  });
}

/** A soft round sprite (lens glow). */
function glowTex() {
  return canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.2, "rgba(255,255,255,0.5)");
    r.addColorStop(0.5, "rgba(255,255,255,0.1)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });
}

function exitSignTex() {
  return canvasTex(256, 96, (g) => {
    g.fillStyle = "#0a8a3c";
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = "#f4fff6";
    g.font = "bold 50px Arial, sans-serif";
    g.textBaseline = "middle";
    g.fillText("SAÍDA", 74, 52);
    // running figure
    g.lineCap = "round";
    g.strokeStyle = "#f4fff6";
    g.lineWidth = 7;
    g.beginPath();
    g.arc(38, 22, 7, 0, Math.PI * 2);
    g.fillStyle = "#f4fff6";
    g.fill();
    g.beginPath();
    g.moveTo(36, 34);
    g.lineTo(30, 56);
    g.lineTo(42, 70);
    g.lineTo(40, 86);
    g.moveTo(30, 56);
    g.lineTo(18, 72);
    g.lineTo(10, 74);
    g.moveTo(35, 38);
    g.lineTo(50, 48);
    g.moveTo(35, 38);
    g.lineTo(22, 44);
    g.lineTo(16, 54);
    g.stroke();
  });
}

function vipSignTex() {
  return canvasTex(512, 256, (g) => {
    g.fillStyle = "#0c0b0b";
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "#b8925a";
    g.lineWidth = 4;
    g.strokeRect(14, 14, 484, 228);
    g.fillStyle = "#e9c48a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 120px Georgia, serif";
    g.fillText("V I P", 256, 112);
    g.font = "28px Georgia, serif";
    g.fillStyle = "#c9a774";
    g.fillText("S A L A   7", 256, 200);
  });
}

function stripesTex(a: string, b: string, n: number) {
  return canvasTex(512, 64, (g) => {
    const w = 512 / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? a : b;
      g.fillRect(i * w, 0, w + 1, 64);
    }
  });
}

function cupTex() {
  return canvasTex(512, 128, (g) => {
    g.fillStyle = "#7c1222";
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#f1ebe2";
    g.fillRect(0, 70, 512, 14);
    g.fillStyle = "#d9a441";
    g.fillRect(0, 88, 512, 4);
  });
}

/* ---------------- shaders ---------------- */

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
`;

/**
 * The film they watched on 19/10 was "Verity", a dark thriller: an original
 * mood scene, not the film's art. A lonely house on a hill on a stormy night,
 * one warm window lit (someone writing late), rain, lightning, and now and
 * then the title typed out over a page, letter by letter.
 */
const SCREEN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uTitle;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    float t = uTime;
    vec2 p = vec2((vUv.x - 0.5) * 2.39, vUv.y);
    // lightning: rare double flashes
    float cyc = mod(t, 11.0);
    float flash = exp(-pow((cyc - 7.0) * 9.0, 2.0)) + 0.6 * exp(-pow((cyc - 7.35) * 12.0, 2.0));
    // stormy sky
    vec2 cp = vec2(p.x * 1.1 + t * 0.02, p.y * 2.2);
    float c = fbm(cp + vec2(fbm(cp * 0.6 - t * 0.01), 0.0));
    vec3 col = mix(vec3(0.015, 0.02, 0.035), vec3(0.07, 0.08, 0.11), smoothstep(0.3, 0.8, c));
    col *= 0.7 + 0.5 * vUv.y;
    col += vec3(0.5, 0.55, 0.7) * flash * (0.35 + 0.65 * smoothstep(0.35, 0.75, c));
    // the hill and the house (gabled, a chimney, one lit window upstairs)
    float hill = 0.3 + 0.07 * exp(-pow(p.x * 1.6, 2.0)) + 0.015 * fbm(vec2(p.x * 5.0, 3.0));
    vec2 h = p - vec2(0.1, hill + 0.02);
    float body = step(abs(h.x), 0.16) * step(0.0, h.y) * step(h.y, 0.17);
    float roof = step(0.17, h.y) * step(h.y, 0.17 + 0.11 * (1.0 - abs(h.x) / 0.19));
    float chim = step(abs(h.x - 0.09), 0.018) * step(0.17, h.y) * step(h.y, 0.29);
    float house = max(max(body, roof), chim);
    float ground = step(p.y, hill);
    // a bare tree beside the house
    vec2 tp = p - vec2(-0.32, hill);
    float trunk = step(abs(tp.x + 0.01 * sin(tp.y * 30.0)), 0.008) * step(0.0, tp.y) * step(tp.y, 0.22);
    float crown = step(0.12, tp.y) * step(length((tp - vec2(0.0, 0.2)) * vec2(1.0, 1.4)), 0.12) * step(0.55, fbm(tp * 40.0));
    float sil = max(max(house, ground), max(trunk, crown));
    vec3 silCol = vec3(0.008, 0.008, 0.012) + vec3(0.12, 0.13, 0.17) * flash * 0.4;
    col = mix(col, silCol, sil);
    // the warm window, flickering like a desk lamp behind a curtain
    vec2 w = h - vec2(-0.06, 0.1);
    float win = step(abs(w.x), 0.028) * step(abs(w.y), 0.032);
    float lamp = 0.85 + 0.15 * noise(vec2(t * 3.0, 1.0));
    col = mix(col, vec3(1.6, 0.95, 0.45) * lamp, win * (1.0 - step(abs(w.x), 0.003)) * (1.0 - step(abs(w.y), 0.003)));
    col += vec3(0.5, 0.3, 0.12) * exp(-length(w * vec2(1.0, 1.2)) * 28.0) * 0.6;
    // rain
    vec2 rp = vec2(p.x * 90.0 + p.y * 12.0, p.y * 8.0 + t * 9.0);
    float rain = step(0.985, hash(floor(rp))) * smoothstep(0.0, 0.6, fract(rp.y));
    col += vec3(0.22, 0.24, 0.3) * rain * (0.4 + flash);
    // every 22 s: a page fills the screen and the title is typed out on it
    float seg = mod(t, 22.0);
    float page = smoothstep(14.0, 14.8, seg) * (1.0 - smoothstep(20.8, 21.6, seg));
    if (page > 0.0) {
      vec3 paper = vec3(0.86, 0.83, 0.76) * (0.9 + 0.1 * fbm(p * 12.0));
      paper *= 1.0 - 0.5 * dot(vUv - 0.5, vUv - 0.5);
      // faint typed lines
      float ln = step(0.6, fract(p.y * 34.0)) * step(0.35, hash(vec2(floor(p.x * 40.0), floor(p.y * 34.0))));
      paper = mix(paper, vec3(0.3, 0.28, 0.26), ln * 0.35 * step(abs(p.x), 0.8) * step(abs(p.y - 0.5), 0.42));
      // the title, revealed left to right like a typewriter
      vec2 tu = vec2((vUv.x - 0.5) / 0.5 + 0.5, (vUv.y - 0.5) / 0.22 + 0.5);
      float typed = clamp((seg - 15.2) / 2.6, 0.0, 1.0);
      if (tu.x > 0.0 && tu.x < 1.0 && tu.y > 0.0 && tu.y < 1.0 && tu.x < typed) {
        float ink = texture2D(uTitle, tu).r;
        paper = mix(paper, vec3(0.06, 0.04, 0.04), ink);
      }
      col = mix(col, paper * 0.95, page);
    }
    // film look: vignette, grain, flicker
    vec2 v = vUv - 0.5;
    col *= 1.0 - dot(v * vec2(0.9, 1.4), v * vec2(0.9, 1.4)) * 0.9;
    col *= 0.97 + 0.03 * sin(t * 23.0);
    col += (hash(vUv * 900.0 + fract(t)) - 0.5) * 0.012;
    gl_FragColor = vec4(max(col, 0.0) * 0.95, 1.0);
  }
`;

/** The title, typed in a typewriter face, as a mask texture. */
function titleTex() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '700 150px "Courier New", Courier, monospace';
  g.fillText("VERITY", c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const BEAM_DENSITY = /* glsl */ `
  uniform vec3 uLens;
  uniform vec3 uScreen;
  uniform vec2 uLensHalf;
  uniform vec2 uScreenHalf;
  uniform float uTime;
  float beam(vec3 p) {
    float s = (uLens.z - p.z) / (uLens.z - uScreen.z);
    if (s < 0.0 || s > 1.0) return 0.0;
    vec3 c = mix(uLens, uScreen, s);
    vec2 hs = mix(uLensHalf, uScreenHalf, s);
    vec2 q = (p.xy - c.xy) / hs;
    float edge = (1.0 - smoothstep(0.6, 1.0, abs(q.x))) * (1.0 - smoothstep(0.55, 1.0, abs(q.y)));
    return edge * (0.12 + 1.4 * pow(1.0 - s, 4.0));
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vWorld;
  ${NOISE}
  ${BEAM_DENSITY}
  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = vWorld - ro;
    float len = length(rd);
    rd /= len;
    const int N = 24;
    float stepL = len / float(N);
    float j = hash(gl_FragCoord.xy + fract(uTime) * 61.0);
    float acc = 0.0;
    for (int i = 0; i < N; i++) {
      vec3 p = ro + rd * ((float(i) + j) * stepL);
      float d = beam(p);
      if (d > 0.0) {
        float haze = 0.45 + 0.9 * noise(vec2(p.x * 0.8 + p.z * 0.35 + uTime * 0.05, p.y * 0.9 - uTime * 0.03));
        float rays = 0.75 + 0.25 * noise(vec2(p.x * 3.0 / (0.3 + (uLens.z - p.z) * 0.1), p.y * 2.0 / (0.3 + (uLens.z - p.z) * 0.1)));
        acc += d * haze * rays;
      }
    }
    gl_FragColor = vec4(uColor * acc * stepL * uStrength, 1.0);
  }
`;

const BEAM_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const DUST_VERT = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uScale;
  varying float vBright;
  ${BEAM_DENSITY}
  void main() {
    float s = 0.04 + aSeed.z * 0.92;
    vec3 c = mix(uLens, uScreen, s);
    vec2 hs = mix(uLensHalf, uScreenHalf, s);
    vec3 p = c + vec3((aSeed.x * 2.0 - 1.0) * hs.x, (aSeed.y * 2.0 - 1.0) * hs.y, 0.0);
    float ph = aSeed.x * 37.0 + aSeed.y * 91.0;
    p += vec3(sin(uTime * 0.11 + ph) * 0.25, sin(uTime * 0.07 + ph * 1.7) * 0.18 - mod(uTime * 0.01 + aSeed.z, 1.0) * 0.2, cos(uTime * 0.09 + ph) * 0.25);
    float tw = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * (0.6 + aSeed.x) + ph), 3.0);
    vBright = beam(p) * tw;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp(uScale * 0.012 / -mv.z, 1.0, 5.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vBright;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor * vBright * a * 0.55, 1.0);
  }
`;

/* ---------------- furniture ---------------- */

type Parts = {
  leather: THREE.BufferGeometry;
  dark: THREE.BufferGeometry;
  chrome: THREE.BufferGeometry;
  hole: THREE.BufferGeometry;
  led: THREE.BufferGeometry;
};

/** A power recliner facing -Z; origin on the floor at the seat center. */
function recliner(footOut: boolean, seg: number): Parts {
  const L: THREE.BufferGeometry[] = [];
  const D: THREE.BufferGeometry[] = [];
  const C: THREE.BufferGeometry[] = [];
  const H: THREE.BufferGeometry[] = [];
  const E: THREE.BufferGeometry[] = [];
  const arm = 0.365;
  // base skirt and seat
  L.push(place(rbox(0.6, 0.28, 0.78, 0.03, seg), 0, 0.18, 0.04));
  L.push(place(rbox(0.6, 0.16, 0.64, 0.06, seg), 0, 0.39, -0.03, -0.04));
  // front roll of the seat cushion
  L.push(
    place(
      new THREE.CylinderGeometry(0.075, 0.075, 0.58, 16),
      0,
      0.385,
      -0.31,
      0,
      0,
      Math.PI / 2,
    ),
  );
  // back: lumbar, middle and head cushions in front of a shell
  L.push(place(rbox(0.56, 0.3, 0.2, 0.09, seg), 0, 0.63, 0.31, 0.2));
  L.push(place(rbox(0.58, 0.34, 0.22, 0.1, seg), 0, 0.94, 0.39, 0.22));
  L.push(place(rbox(0.5, 0.2, 0.16, 0.075, seg), 0, 1.2, 0.47, 0.22));
  L.push(place(rbox(0.64, 0.98, 0.14, 0.05, seg), 0, 0.82, 0.55, 0.18));
  // armrests with padded tops
  for (const s of [-1, 1]) {
    L.push(place(rbox(0.13, 0.56, 0.92, 0.04, seg), s * arm, 0.3, 0.0));
    L.push(place(rbox(0.16, 0.07, 0.9, 0.03, seg), s * arm, 0.6, -0.01));
    // cupholder at the front of each arm
    C.push(
      place(
        new THREE.TorusGeometry(0.042, 0.006, 8, 24),
        s * arm,
        0.637,
        -0.3,
        Math.PI / 2,
      ),
    );
    H.push(
      place(
        new THREE.CylinderGeometry(0.039, 0.036, 0.012, 20),
        s * arm,
        0.633,
        -0.3,
      ),
    );
  }
  // power buttons on the inner side of the right arm
  E.push(box(0.004, 0.014, 0.03, arm - 0.067, 0.5, -0.32));
  C.push(box(0.006, 0.03, 0.09, arm - 0.068, 0.5, -0.3));
  // floor plinth
  D.push(box(0.58, 0.05, 0.74, 0, 0.025, 0.04));
  if (footOut) {
    // footrest swung up and forward about halfway, on its scissor arms
    L.push(place(rbox(0.56, 0.09, 0.42, 0.04, seg), 0, 0.25, -0.53, -0.61));
    for (const s of [-1, 1])
      D.push(
        place(
          new THREE.BoxGeometry(0.025, 0.025, 0.36),
          s * 0.2,
          0.2,
          -0.38,
          -0.35,
        ),
      );
  } else {
    L.push(place(rbox(0.56, 0.26, 0.07, 0.03, seg), 0, 0.2, -0.37));
  }
  return {
    leather: mergeParts(L),
    dark: mergeParts(D),
    chrome: mergeParts(C),
    hole: mergeParts(H),
    led: mergeParts(E),
  };
}

/** Side table between the pairs, with its little lamp. */
function sideTable(seg: number) {
  const body = mergeParts([place(rbox(0.4, 0.6, 0.5, 0.03, seg), 0, 0.3, 0)]);
  const top = mergeParts([
    place(rbox(0.5, 0.035, 0.56, 0.012, seg), 0, 0.637, 0),
  ]);
  const lampX = -0.15;
  const lampZ = 0.17;
  const brass = mergeParts([
    place(
      new THREE.CylinderGeometry(0.045, 0.055, 0.02, 24),
      lampX,
      0.665,
      lampZ,
    ),
    place(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 8), lampX, 0.77, lampZ),
    place(
      new THREE.TorusGeometry(0.075, 0.004, 6, 24),
      lampX,
      0.845,
      lampZ,
      Math.PI / 2,
    ),
  ]);
  const shade = mergeParts([
    place(
      new THREE.CylinderGeometry(0.052, 0.075, 0.11, 24, 1, true),
      lampX,
      0.9,
      lampZ,
    ),
  ]);
  return { body, top, brass, shade, lampX, lampZ };
}

/* ---------------- the scene ---------------- */

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  davi: {
    top: "#3b2a22",
    topStyle: "tshirt",
    bottom: "#2c3a52",
    bottomStyle: "jeans",
    shoes: "#1c1c1c",
  },
  elena: {
    top: "#1d1d1d",
    topStyle: "tshirt",
    bottom: "#3a4d6b",
    bottomStyle: "jeans",
    shoes: "#e6e1d8",
  },
};

const scene: SceneModule = {
  id: "cinema",
  title: "Cinema VIP",
  build(ctx) {
    RectAreaLightUniformsLib.init();
    const high = ctx.quality === "high";
    const seg = high ? 3 : 2;
    const root = new THREE.Group();
    ctx.scene.add(root);
    ctx.scene.background = new THREE.Color("#000000");
    const batch = new Batch();

    /* ---------- materials ---------- */
    const carpetMaps = carpet("#18161c");
    const matCarpet = new THREE.MeshStandardMaterial({
      map: cinemaCarpetMap(),
      normalMap: carpetMaps.normalMap,
      roughnessMap: carpetMaps.roughnessMap,
      roughness: 1,
    });
    const matWallLow = pbr(fabric("#1a1719", 31), { roughness: 1 });
    const matPanel = pbr(fabric("#2a2427", 33), { roughness: 1 });
    const matPanelWarm = pbr(fabric("#33261f", 35), { roughness: 1 });
    const matWood = pbr(woodPlanks("#3a2316", 3, 41), { roughness: 0.75 });
    const matCeiling = pbr(plaster("#121114", 43), { roughness: 1 });
    const matBlack = new THREE.MeshStandardMaterial({
      color: "#050505",
      roughness: 1,
    });
    const matDark = new THREE.MeshStandardMaterial({
      color: "#0c0c0d",
      roughness: 0.55,
    });
    const matBronze = metal("#4a3a2a", 0.4);
    const matChrome = metal("#bdbdbd", 0.2);
    const matHole = new THREE.MeshStandardMaterial({
      color: "#030303",
      roughness: 0.8,
    });
    const matLeather = pbr(repeat(leather("#0e0c0d", 17), 2, 2), {
      roughness: 1.45,
      envMapIntensity: 1.1,
    });
    const matTableTop = pbr(woodPlanks("#1f140e", 2, 47), { roughness: 0.45 });
    const matLed = emissive("#ffd9a8", 2.4);
    const matLedBlue = emissive("#4aa8ff", 3);
    const matShade = new THREE.MeshStandardMaterial({
      color: "#ffcf96",
      emissive: "#ffb76a",
      emissiveIntensity: 1.4,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const matDownlight = emissive("#ffe0b8", 1.6);
    const matCurtain = pbr(fabric("#141215", 37), { roughness: 1 });
    batch.noCast(matCeiling);
    batch.noCast(matLed);

    /* ---------- floor, tiers and aisles ---------- */
    const floor = new THREE.PlaneGeometry(W, BACK - FRONT).rotateX(
      -Math.PI / 2,
    );
    batch.add(matCarpet, floor, 1);
    for (let k = 1; k < ROWS; k++) {
      const z0 = rowZ(k);
      const z1 = k === ROWS - 1 ? BACK : z0 + ROW_DEPTH;
      batch.add(
        matCarpet,
        box(BLOCK, rowH(k), z1 - z0, 0, rowH(k) / 2, (z0 + z1) / 2),
        1,
      );
    }
    // back cross aisle across the side aisles
    for (const s of [-1, 1]) {
      const w = HALF_W - BLOCK_X;
      const cx = s * (BLOCK_X + w / 2);
      batch.add(
        matCarpet,
        box(w, TOP, BACK - BACK_AISLE, cx, TOP / 2, (BACK + BACK_AISLE) / 2),
        1,
      );
      for (let i = 1; i < 8; i++) {
        const h = Math.min(i, 6) * (RISE / 2);
        const z0 = ROW0 + i * STEP;
        batch.add(matCarpet, box(w, h, STEP, cx, h / 2, z0 + STEP / 2), 1);
        // LED strip on each step nosing, and a stainless nosing profile
        if (i <= 6) {
          batch.add(
            matLed,
            box(w - 0.12, 0.012, 0.01, cx, h - 0.025, z0 - 0.004),
          );
          batch.add(matChrome, box(w, 0.012, 0.03, cx, h + 0.004, z0 + 0.01));
        }
      }
      // the step from the top row onto the back aisle in the seating block has no riser; nosing only on aisles
    }
    // a dim LED line along every riser of the seating block (seen between the seats)
    const matRiserLed = emissive("#ffd9a8", 1.2);
    for (let k = 1; k < ROWS; k++)
      batch.add(
        matRiserLed,
        box(BLOCK, 0.025, 0.01, 0, rowH(k) - 0.04, rowZ(k) - 0.004),
      );

    /* ---------- walls ---------- */
    // side walls: dark lower fabric, framed acoustic panels, walnut slats, cove at the top
    for (const s of [-1, 1]) {
      const x = s * HALF_W;
      batch.add(
        matWallLow,
        place(
          new THREE.PlaneGeometry(BACK - FRONT, CEIL),
          x,
          CEIL / 2,
          0,
          0,
          (-s * Math.PI) / 2,
        ),
        1.2,
      );
      const cols = 8;
      const colW = (BACK - FRONT - 0.4) / cols;
      for (let c = 0; c < cols; c++) {
        const zc = FRONT + 0.2 + colW * (c + 0.5);
        const base = floorAt(s * (HALF_W - 0.5), zc);
        const y0 = base + 0.9;
        const y1 = 5.45;
        const warm = c % 2 === 0;
        batch.add(
          warm ? matPanelWarm : matPanel,
          place(
            new THREE.BoxGeometry(0.05, y1 - y0, colW - 0.14),
            x - s * 0.025,
            (y0 + y1) / 2,
            zc,
          ),
          0.6,
        );
        // panel seams
        for (let r = 1; r < 3; r++)
          batch.add(
            matBlack,
            box(
              0.052,
              0.012,
              colW - 0.14,
              x - s * 0.026,
              y0 + ((y1 - y0) * r) / 3,
              zc,
            ),
          );
        // wood slat between columns
        batch.add(
          matWood,
          box(
            0.07,
            CEIL - 0.3,
            0.1,
            x - s * 0.035,
            CEIL / 2 - 0.15,
            FRONT + 0.2 + colW * c,
          ),
          1,
        );
        // wainscot: baseboard and a wood rail at the panel bottom
        batch.add(
          matWood,
          box(0.06, 0.05, colW, x - s * 0.03, y0 - 0.04, zc),
          1,
        );
      }
      batch.add(
        matWood,
        box(0.07, CEIL - 0.3, 0.1, x - s * 0.035, CEIL / 2 - 0.15, BACK - 0.2),
        1,
      );
      // cove line near the ceiling
      batch.add(
        matWood,
        box(0.18, 0.08, BACK - FRONT, x - s * 0.09, 5.62, 0),
        1,
      );
      batch.add(
        emissive("#ff9d52", 1.6),
        box(0.01, 0.015, BACK - FRONT - 0.4, x - s * 0.17, 5.67, 0),
      );
      // surround speakers
      for (const z of [-3.5, 0.5, 4.5]) {
        batch.add(matDark, box(0.22, 0.5, 0.34, x - s * 0.13, 4.7, z));
        batch.add(matBlack, box(0.01, 0.44, 0.28, x - s * 0.245, 4.7, z));
      }
    }
    // back wall with acoustic panels and the projection windows
    batch.add(
      matWallLow,
      place(new THREE.PlaneGeometry(W, CEIL), 0, CEIL / 2, BACK, 0, Math.PI),
      1.2,
    );
    for (let c = 0; c < 6; c++) {
      const w = (W - 0.4) / 6;
      const xc = -HALF_W + 0.2 + w * (c + 0.5);
      const y0 = TOP + 0.9;
      const y1 = 5.45;
      const parts: [number, number][] =
        Math.abs(xc) < 1.2
          ? [
              [y0, 4.05],
              [5.1, y1],
            ]
          : [[y0, y1]];
      for (const [a, b] of parts)
        batch.add(
          c % 2 ? matPanel : matPanelWarm,
          box(w - 0.14, b - a, 0.05, xc, (a + b) / 2, BACK - 0.025),
          0.6,
        );
      batch.add(
        matWood,
        box(
          0.1,
          CEIL - TOP - 0.3,
          0.07,
          -HALF_W + 0.2 + w * c,
          (CEIL + TOP) / 2 - 0.15,
          BACK - 0.035,
        ),
        1,
      );
      batch.add(matWood, box(w, 0.05, 0.06, xc, y0 - 0.04, BACK - 0.03), 1);
    }
    batch.add(matWood, box(W, 0.08, 0.18, 0, 5.62, BACK - 0.09), 1);
    // projection port: frame, glass, the booth behind
    batch.add(matBlack, box(1.5, 1.0, 0.04, 0, LENS.y, BACK - 0.02));
    batch.add(matBronze, box(0.9, 0.05, 0.08, 0, LENS.y + 0.3, BACK - 0.04));
    batch.add(matBronze, box(0.9, 0.05, 0.08, 0, LENS.y - 0.3, BACK - 0.04));
    batch.add(matBronze, box(0.05, 0.65, 0.08, -0.45, LENS.y, BACK - 0.04));
    batch.add(matBronze, box(0.05, 0.65, 0.08, 0.45, LENS.y, BACK - 0.04));
    const port = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.55),
      new THREE.MeshStandardMaterial({
        color: "#0a0c10",
        roughness: 0.05,
        metalness: 0.2,
        transparent: true,
        opacity: 0.55,
      }),
    );
    port.position.set(0, LENS.y, BACK - 0.05);
    port.rotation.y = Math.PI;
    root.add(port);
    // a second, smaller dark port
    batch.add(matBronze, box(0.45, 0.32, 0.06, -1.6, LENS.y, BACK - 0.03));
    batch.add(matBlack, box(0.38, 0.25, 0.065, -1.6, LENS.y, BACK - 0.03));
    // the lens and its glow
    batch.add(
      emissive("#fff1dc", 8),
      place(
        new THREE.CircleGeometry(0.055, 24),
        LENS.x,
        LENS.y,
        BACK + 0.02,
        0,
        Math.PI,
      ),
    );
    batch.add(matDark, box(0.5, 0.3, 0.02, 0, LENS.y, BACK + 0.04));
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex(),
        color: "#ffe6c4",
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
      }),
    );
    glow.scale.set(0.9, 0.9, 1);
    glow.position.set(LENS.x, LENS.y, BACK - 0.08);
    root.add(glow);

    // front wall: black velvet around the screen, masking frame, side curtains
    batch.add(
      matBlack,
      place(new THREE.PlaneGeometry(W, CEIL), 0, CEIL / 2, FRONT, 0, 0),
    );
    const frameT = 0.22;
    batch.add(
      matBlack,
      box(
        SCREEN_W + 2 * frameT,
        frameT,
        0.12,
        0,
        SCREEN_Y + SCREEN_H / 2 + frameT / 2,
        SCREEN_Z - 0.04,
      ),
    );
    batch.add(
      matBlack,
      box(
        SCREEN_W + 2 * frameT,
        frameT,
        0.12,
        0,
        SCREEN_Y - SCREEN_H / 2 - frameT / 2,
        SCREEN_Z - 0.04,
      ),
    );
    batch.add(
      matBlack,
      box(
        frameT,
        SCREEN_H,
        0.12,
        -SCREEN_W / 2 - frameT / 2,
        SCREEN_Y,
        SCREEN_Z - 0.04,
      ),
    );
    batch.add(
      matBlack,
      box(
        frameT,
        SCREEN_H,
        0.12,
        SCREEN_W / 2 + frameT / 2,
        SCREEN_Y,
        SCREEN_Z - 0.04,
      ),
    );
    // low stage under the screen
    batch.add(matWallLow, box(W, 0.35, 0.6, 0, 0.175, FRONT + 0.3), 1);
    batch.add(
      emissive("#ffd9a8", 0.9),
      box(W - 0.4, 0.03, 0.01, 0, 0.31, FRONT + 0.605),
    );
    for (const s of [-1, 1]) {
      const g = new THREE.PlaneGeometry(0.7, CEIL - 0.1, 24, 1);
      const pos = g.getAttribute("position");
      for (let i = 0; i < pos.count; i++)
        pos.setZ(i, Math.sin((pos.getX(i) + 0.35) * 26) * 0.045);
      g.computeVertexNormals();
      batch.add(
        matCurtain,
        place(
          g,
          s * (SCREEN_W / 2 + frameT + 0.33),
          (CEIL - 0.1) / 2,
          FRONT + 0.22,
        ),
        0.5,
      );
    }

    // ceiling with dim recessed lights and linear diffusers
    batch.add(
      matCeiling,
      place(new THREE.PlaneGeometry(W, BACK - FRONT), 0, CEIL, 0, Math.PI / 2),
      1.5,
    );
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 5; j++) {
        const x = -4 + (j * 8) / 4;
        const z = -4.5 + i * 3.4;
        batch.add(
          matBronze,
          place(
            new THREE.TorusGeometry(0.07, 0.012, 6, 20),
            x,
            CEIL - 0.005,
            z,
            Math.PI / 2,
          ),
        );
        batch.add(
          matDownlight,
          place(
            new THREE.CircleGeometry(0.055, 16),
            x,
            CEIL - 0.01,
            z,
            Math.PI / 2,
          ),
        );
      }
    }
    for (const s of [-1, 1]) {
      batch.add(matDark, box(0.25, 0.02, 11, s * 4.9, CEIL - 0.01, 0));
      for (let i = 0; i < 3; i++)
        batch.add(
          matHole,
          box(0.03, 0.022, 10.8, s * 4.9 + (i - 1) * 0.07, CEIL - 0.012, 0),
        );
    }

    /* ---------- seats, tables, lamps (instanced) ---------- */
    const partnerRow = 2;
    // Davi: they sat in the corner pair (end of the row, by the entrance aisle)
    const partnerSeat = { j: 0, s: 0 };
    const out = recliner(true, seg);
    const seats: THREE.Matrix4[] = [];
    const tables: THREE.Matrix4[] = [];
    const m4 = (x: number, y: number, z: number) =>
      new THREE.Matrix4().makeTranslation(x, y, z);
    for (let k = 0; k < ROWS; k++) {
      const y = rowH(k);
      const z = seatZ(k);
      for (let j = 0; j < 4; j++) {
        for (let s = 0; s < 2; s++) {
          if (k === partnerRow && j === partnerSeat.j && s === partnerSeat.s)
            continue;
          seats.push(m4(seatX(j, s), y, z));
        }
      }
      for (let j = 0; j < 5; j++) tables.push(m4(tableX(j), y, z - 0.05));
      // collision for the whole row: seats with footrests out, tables between them
      ctx.wall(
        -BLOCK_X - 0.08,
        rowZ(k) + 0.85,
        BLOCK_X + 0.08,
        rowZ(k) + ROW_DEPTH,
      );
      // row-end panels with a small step light facing the aisle
      for (const s of [-1, 1]) {
        batch.add(
          matLeather,
          place(
            rbox(0.06, 0.82, 1.3, 0.02, 2),
            s * (BLOCK_X + 0.03),
            y + 0.41,
            z - 0.05,
          ),
        );
        batch.add(
          matLed,
          box(0.006, 0.04, 0.16, s * (BLOCK_X + 0.062), y + 0.16, z - 0.35),
        );
        batch.add(
          matChrome,
          box(0.008, 0.06, 0.2, s * (BLOCK_X + 0.06), y + 0.16, z - 0.35),
        );
      }
    }
    const instanced = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      list: THREE.Matrix4[],
      cast = true,
    ) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = cast;
      im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      root.add(im);
      return im;
    };
    instanced(out.leather, matLeather, seats);
    instanced(out.dark, matDark, seats);
    instanced(out.chrome, matChrome, seats, false);
    instanced(out.hole, matHole, seats, false);
    instanced(out.led, matLedBlue, seats, false);
    const tbl = sideTable(seg);
    instanced(tbl.body, matLeather, tables);
    instanced(tbl.top, matTableTop, tables);
    instanced(tbl.brass, matBronze, tables, false);
    instanced(tbl.shade, matShade, tables, false);

    // the partner's own recliner, footrest folded so the legs fit
    const pX = seatX(partnerSeat.j, partnerSeat.s);
    const pY = rowH(partnerRow);
    const pZ = seatZ(partnerRow);
    const folded = recliner(false, seg);
    for (const [geo, mat] of [
      [folded.leather, matLeather],
      [folded.dark, matDark],
      [folded.chrome, matChrome],
      [folded.hole, matHole],
      [folded.led, matLedBlue],
    ] as const) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(pX, pY, pZ);
      m.castShadow = mat === matLeather || mat === matDark;
      m.receiveShadow = true;
      root.add(m);
    }

    /* ---------- the partner's table: popcorn, drinks, the pack ---------- */
    const tX = tableX(partnerSeat.j);
    const tZ = pZ - 0.05;
    const topY = pY + 0.655;
    const bucketPts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.068, 0),
      new THREE.Vector2(0.1, 0.21),
      new THREE.Vector2(0.104, 0.215),
      new THREE.Vector2(0.097, 0.215),
      new THREE.Vector2(0.066, 0.006),
    ];
    const bucket = new THREE.Mesh(
      new THREE.LatheGeometry(bucketPts, 40),
      new THREE.MeshStandardMaterial({
        map: stripesTex("#b3141f", "#f3ece2", 16),
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );
    const bX = tX + 0.09;
    const bZ = tZ + 0.1;
    bucket.position.set(bX, topY, bZ);
    bucket.castShadow = true;
    root.add(bucket);
    const kernels = high ? 170 : 90;
    const pop = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.016, 1),
      new THREE.MeshStandardMaterial({ color: "#f4e2b0", roughness: 0.75 }),
      kernels,
    );
    const rnd = seeded(77);
    const tmp = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < kernels; i++) {
      const r = Math.sqrt(rnd()) * 0.092;
      const a = rnd() * Math.PI * 2;
      const dome = 0.045 * (1 - (r / 0.095) ** 2);
      tmp.position.set(
        bX + Math.cos(a) * r,
        topY + 0.2 + dome + rnd() * 0.02,
        bZ + Math.sin(a) * r,
      );
      tmp.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      tmp.scale.set(0.8 + rnd() * 0.5, 0.7 + rnd() * 0.4, 0.8 + rnd() * 0.5);
      tmp.updateMatrix();
      pop.setMatrixAt(i, tmp.matrix);
      pop.setColorAt(
        i,
        tint.set("#f7e7bd").offsetHSL(0, 0, (rnd() - 0.5) * 0.12),
      );
    }
    pop.castShadow = true;
    root.add(pop);
    // a few kernels fallen on the table
    for (let i = 0; i < 3; i++) {
      const k = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.015, 1),
        pop.material,
      );
      k.position.set(
        tX - 0.02 + i * 0.05,
        topY + 0.012,
        tZ - 0.02 + (i % 2) * 0.04,
      );
      root.add(k);
    }
    const cupMat = new THREE.MeshStandardMaterial({
      map: cupTex(),
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const lidMat = new THREE.MeshStandardMaterial({
      color: "#efeae3",
      roughness: 0.35,
      transparent: true,
      opacity: 0.92,
    });
    const strawMat = new THREE.MeshStandardMaterial({
      color: "#e8e2da",
      roughness: 0.4,
    });
    const cupPts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.032, 0),
      new THREE.Vector2(0.046, 0.165),
      new THREE.Vector2(0.044, 0.165),
      new THREE.Vector2(0.031, 0.004),
    ];
    const cup = (x: number, y: number, z: number, lean: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 32), cupMat);
      body.castShadow = true;
      g.add(body);
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.048, 0.014, 32),
        lidMat,
      );
      lid.position.y = 0.17;
      g.add(lid);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        lidMat,
      );
      dome.scale.y = 0.25;
      dome.position.y = 0.176;
      g.add(dome);
      const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 0.24, 8),
        strawMat,
      );
      straw.position.set(0.008, 0.2, 0);
      straw.rotation.z = lean;
      g.add(straw);
      g.position.set(x, y, z);
      root.add(g);
    };
    cup(tX + 0.14, topY, tZ - 0.15, -0.12);
    // the other drink in the cupholder between the two seats of the pair
    cup(pX + 0.365, pY + 0.56, pZ - 0.3, 0.1);
    ctx.pack(tX - 0.08, topY, tZ - 0.13, 20);

    /* ---------- the partner ---------- */
    const line =
      ctx.player === "davi"
        ? "Me passa a pipoca e não solta a minha mão 🍿"
        : "Pipoca dividida é pipoca em dobro 🍿";
    const partner = ctx.partner(pX, pZ + 0.07, 180, "sit", OUTFITS, line);
    partner.position.y = pY + 0.02;
    ctx.playerOutfit(OUTFITS);

    /* ---------- doors, signs, the photo ---------- */
    const doorZ = 6.4;
    const doorY = TOP;
    // entrance door on the left wall at the top of the room, padded leather with a push bar
    batch.add(
      matWood,
      box(0.1, 2.25, 0.08, -HALF_W + 0.05, doorY + 1.125, doorZ - 0.5),
    );
    batch.add(
      matWood,
      box(0.1, 2.25, 0.08, -HALF_W + 0.05, doorY + 1.125, doorZ + 0.5),
    );
    batch.add(matWood, box(0.1, 0.1, 1.08, -HALF_W + 0.05, doorY + 2.2, doorZ));
    batch.add(
      matLeather,
      place(
        rbox(0.06, 2.1, 0.92, 0.02, 2),
        -HALF_W + 0.04,
        doorY + 1.05,
        doorZ,
      ),
    );
    batch.add(
      matChrome,
      place(
        new THREE.CylinderGeometry(0.016, 0.016, 0.7, 12),
        -HALF_W + 0.13,
        doorY + 1.0,
        doorZ,
        Math.PI / 2,
      ),
    );
    for (const dz of [-0.33, 0.33])
      batch.add(
        matChrome,
        box(0.08, 0.04, 0.03, -HALF_W + 0.09, doorY + 1.0, doorZ + dz),
      );
    // corridor light leaking under the door
    batch.add(
      emissive("#ffd7a6", 2.5),
      box(0.004, 0.012, 0.86, -HALF_W + 0.075, doorY + 0.006, doorZ),
    );
    const exitMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: exitSignTex(),
      emissive: "#ffffff",
      emissiveMap: exitSignTex(),
      emissiveIntensity: 2.2,
      roughness: 0.4,
    });
    const sign = (x: number, y: number, z: number, yaw: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.17, 0.05),
        matDark,
      );
      g.add(body);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.15), exitMat);
      face.position.z = 0.026;
      g.add(face);
      g.position.set(x, y, z);
      g.rotation.y = yaw;
      root.add(g);
    };
    sign(-HALF_W + 0.03, doorY + 2.48, doorZ, Math.PI / 2);
    const exitGlow = new THREE.PointLight("#3dff86", 0.35, 2.5, 2);
    exitGlow.position.set(-HALF_W + 0.35, doorY + 2.4, doorZ);
    root.add(exitGlow);
    // emergency exit at the front right, floor level
    const eZ = -5.3;
    batch.add(matWood, box(0.1, 2.25, 0.08, HALF_W - 0.05, 1.125, eZ - 0.55));
    batch.add(matWood, box(0.1, 2.25, 0.08, HALF_W - 0.05, 1.125, eZ + 0.55));
    batch.add(matWood, box(0.1, 0.1, 1.18, HALF_W - 0.05, 2.2, eZ));
    batch.add(matDark, box(0.06, 2.1, 1.0, HALF_W - 0.04, 1.05, eZ));
    batch.add(
      matChrome,
      place(
        new THREE.CylinderGeometry(0.016, 0.016, 0.8, 12),
        HALF_W - 0.13,
        1.0,
        eZ,
        Math.PI / 2,
      ),
    );
    batch.add(
      emissive("#ffd7a6", 1.5),
      box(0.004, 0.012, 0.95, HALF_W - 0.075, 0.006, eZ),
    );
    sign(HALF_W - 0.03, 2.48, eZ, -Math.PI / 2);
    // VIP plaque by the entrance
    const vipTex = vipSignTex();
    const vip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.3),
      new THREE.MeshStandardMaterial({
        map: vipTex,
        emissive: "#ffffff",
        emissiveMap: vipTex,
        emissiveIntensity: 1.1,
        roughness: 0.35,
        metalness: 0.2,
      }),
    );
    vip.position.set(-HALF_W + 0.06, doorY + 1.65, doorZ - 1.0);
    vip.rotation.y = Math.PI / 2;
    root.add(vip);
    // the couple's photo, lit like a poster, on the wall of the entrance aisle
    const photoZ = 4.55;
    const photoY = TOP + 1.6;
    ctx.photo(
      "cinema-1.webp",
      0.6,
      0.8,
      new THREE.Vector3(-HALF_W + 0.07, photoY, photoZ),
      90,
    );
    batch.add(
      matBronze,
      box(0.06, 0.04, 0.5, -HALF_W + 0.12, photoY + 0.52, photoZ),
    );
    batch.add(
      emissive("#fff0d8", 3),
      box(0.01, 0.006, 0.44, -HALF_W + 0.13, photoY + 0.5, photoZ),
    );
    const photoLight = new THREE.SpotLight("#ffe2bc", 2.2, 3, 0.7, 0.8, 2);
    photoLight.position.set(-HALF_W + 0.25, photoY + 0.55, photoZ);
    photoLight.target.position.set(-HALF_W, photoY - 0.1, photoZ);
    root.add(photoLight, photoLight.target);

    /* ---------- sconces ---------- */
    const wash = washTex();
    const sconceZ = [-4.2, -0.6, 3.0];
    for (const s of [-1, 1]) {
      for (const z of sconceZ) {
        const x = s * (HALF_W - 0.06);
        const y = 3.7;
        const body = new THREE.CylinderGeometry(
          0.09,
          0.09,
          0.36,
          24,
          1,
          false,
          0,
          Math.PI,
        );
        batch.add(
          matBronze,
          place(body, s * HALF_W, y, z, 0, s > 0 ? Math.PI : 0),
        );
        batch.add(
          emissive("#ffc483", 5),
          place(
            new THREE.CircleGeometry(0.085, 20, 0, Math.PI),
            s * HALF_W,
            y + 0.181,
            z,
            -Math.PI / 2,
          ),
        );
        batch.add(
          emissive("#ffc483", 5),
          place(
            new THREE.CircleGeometry(0.085, 20, Math.PI, Math.PI),
            s * HALF_W,
            y - 0.181,
            z,
            Math.PI / 2,
          ),
        );
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1, 2.8),
          new THREE.MeshBasicMaterial({
            map: wash,
            color: "#ff9f55",
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        plane.position.set(s * (HALF_W - 0.056), y, z);
        plane.rotation.y = (-s * Math.PI) / 2;
        root.add(plane);
        if ((high && z > -4) || (!high && z === -0.6)) {
          const l = new THREE.PointLight("#ffb978", 1.6, 5, 2);
          l.position.set(x - s * 0.25, y, z);
          root.add(l);
        }
      }
    }

    /* ---------- the screen, its light and the projector beam ---------- */
    const screenMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTitle: { value: titleTex() } },
      vertexShader: SCREEN_VERT,
      fragmentShader: SCREEN_FRAG,
    });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
      screenMat,
    );
    screen.position.set(0, SCREEN_Y, SCREEN_Z);
    root.add(screen);

    const screenLight = new THREE.RectAreaLight(
      "#ffb487",
      2.6,
      SCREEN_W,
      SCREEN_H,
    );
    screenLight.position.set(0, SCREEN_Y, SCREEN_Z + 0.05);
    screenLight.lookAt(0, SCREEN_Y, 10);
    root.add(screenLight);
    // the same light as a soft shadow-casting spot, so seats throw shadows back
    const spill = new THREE.SpotLight("#ffb487", 16, 24, 0.95, 1, 1.6);
    spill.position.set(0, SCREEN_Y + 0.3, SCREEN_Z + 0.4);
    spill.target.position.set(0, 0.8, 4);
    spill.castShadow = true;
    spill.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    spill.shadow.bias = -0.0004;
    spill.shadow.normalBias = 0.03;
    spill.shadow.radius = 4;
    spill.shadow.camera.near = 1;
    spill.shadow.camera.far = 22;
    root.add(spill, spill.target);

    // a warm reading downlight over the partner's pair (second shadow caster on desktop)
    const over = new THREE.SpotLight("#ffc690", 7, 9, 0.38, 0.9, 2);
    over.position.set(pX + 0.2, CEIL - 0.05, pZ - 0.2);
    over.target.position.set(pX + 0.1, pY + 0.6, pZ - 0.3);
    over.castShadow = high;
    over.shadow.mapSize.set(1024, 1024);
    over.shadow.bias = -0.0004;
    over.shadow.normalBias = 0.02;
    root.add(over, over.target);
    // the partner's table lamp
    const lamp = new THREE.PointLight("#ffb46e", 0.5, 2.6, 2);
    lamp.position.set(tX + tbl.lampX, pY + 0.88, tZ + tbl.lampZ);
    root.add(lamp);

    // projector beam: a raymarched pyramid of light from the lens to the screen
    const beamUniforms = {
      uLens: { value: LENS.clone() },
      uScreen: { value: new THREE.Vector3(0, SCREEN_Y, SCREEN_Z) },
      uLensHalf: { value: new THREE.Vector2(0.09, 0.05) },
      uScreenHalf: { value: new THREE.Vector2(SCREEN_W / 2, SCREEN_H / 2) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#ffd2a8") },
      uStrength: { value: high ? 0.09 : 0.07 },
    };
    const beamGeo = new THREE.BoxGeometry(2, 2, 1);
    {
      const pos = beamGeo.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        const s = 0.5 - pos.getZ(i);
        const hx = THREE.MathUtils.lerp(0.09, SCREEN_W / 2, s);
        const hy = THREE.MathUtils.lerp(0.05, SCREEN_H / 2, s);
        const z = THREE.MathUtils.lerp(LENS.z, SCREEN_Z + 0.01, s);
        const cy = THREE.MathUtils.lerp(LENS.y, SCREEN_Y, s);
        pos.setXYZ(i, (pos.getX(i) / 1) * hx, cy + pos.getY(i) * hy, z);
      }
      beamGeo.computeBoundingSphere();
    }
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.ShaderMaterial({
        uniforms: beamUniforms,
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    beam.renderOrder = 10;
    root.add(beam);

    const dustCount = high ? 900 : 400;
    const seeds = new Float32Array(dustCount * 3);
    const dr = seeded(5);
    for (let i = 0; i < seeds.length; i++) seeds[i] = dr();
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(dustCount * 3), 3),
    );
    dustGeo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.ShaderMaterial({
        uniforms: { ...beamUniforms, uScale: { value: 900 } },
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    dust.frustumCulled = false;
    dust.renderOrder = 11;
    root.add(dust);

    batch.flush(root);

    /* ---------- player placement ---------- */
    ctx.wall(-HALF_W - 1, FRONT - 1, -HALF_W, BACK + 1);
    ctx.wall(HALF_W, FRONT - 1, HALF_W + 1, BACK + 1);
    ctx.wall(-HALF_W - 1, FRONT - 1, HALF_W + 1, FRONT + 0.6);
    ctx.wall(-HALF_W - 1, BACK, HALF_W + 1, BACK + 1);
    ctx.spawn(-5.05, doorZ, -35);
    ctx.exit(-HALF_W + 0.25, doorZ, 0.6);

    /* ---------- per frame: film, light, beam, and walking up the steps ---------- */
    const builtChildren = new Set(ctx.scene.children);
    let bodies: THREE.Object3D[] | null = null;
    let lift = TOP;
    const tint2 = new THREE.Color();
    ctx.onUpdate((t, dt) => {
      screenMat.uniforms.uTime!.value = t;
      beamUniforms.uTime.value = t;
      const warm = 0.5 + 0.5 * Math.cos(t * 0.03);
      tint2.setRGB(1.0, 0.56 + 0.12 * warm, 0.42 + 0.1 * warm);
      screenLight.color.copy(tint2);
      spill.color.copy(tint2);
      beamUniforms.uColor.value
        .copy(tint2)
        .lerp(new THREE.Color(1, 1, 1), 0.35);
      const flick = 0.97 + 0.03 * Math.sin(t * 23);
      screenLight.intensity = 2.6 * flick;

      // the engine's own body/avatar groups appear after build: lift them with the camera
      if (!bodies)
        bodies = ctx.scene.children.filter((c) => !builtChildren.has(c));
      const ref = bodies.find((b) => b.visible);
      const px = ref ? ref.position.x : ctx.camera.position.x;
      const pz = ref ? ref.position.z : ctx.camera.position.z;
      const target = floorAt(px, pz);
      lift += (target - lift) * Math.min(1, dt * 9);
      ctx.camera.position.y += lift;
      for (const b of bodies) b.position.y = lift;
    });
  },
};

export default scene;
