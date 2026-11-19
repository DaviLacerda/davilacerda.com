import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  carpet,
  concrete,
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
 * Caldas Novas (GO), Hot Springs aparthotel: the couple's first trip, at
 * night. A ground-floor apart-hotel room (light wood headboard wall, double
 * bed, granite sink by the entrance) opens through a glass sliding door onto
 * the hotel's thermal pool area: a curvy glowing pool with steam, palms, white
 * loungers, a thatched-roof bar kiosk, warm garden lights and a starry sky.
 *
 * Plan (meters): room x[-1.9, 1.9] z[0, 5.2], entrance door on the south wall
 * (z = 5.2), glass door on the north wall (z = 0) x[-0.1, 1.75]. Outside, the
 * deck spans x[-14.8, 14.8] z[-25, 0]; the pool is centered near (0, -11).
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

/** Free-form triangles with explicit normals (winding fixed to match them). */
class Tris {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  tri(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    n: THREE.Vector3,
    ua: number[] = [0, 0],
    ub: number[] = [0, 0],
    uc: number[] = [0, 0],
    ns?: THREE.Vector3[],
  ) {
    const f = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));
    let B = b;
    let C = c;
    let UB = ub;
    let UC = uc;
    let NB = ns?.[1] ?? n;
    let NC = ns?.[2] ?? n;
    if (f.dot(n) < 0) {
      [B, C, UB, UC, NB, NC] = [C, B, UC, UB, NC, NB];
    }
    const NA = ns?.[0] ?? n;
    for (const [p, q, u] of [
      [a, NA, ua],
      [B, NB, UB],
      [C, NC, UC],
    ] as [THREE.Vector3, THREE.Vector3, number[]][]) {
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(q.x, q.y, q.z);
      this.uv.push(u[0] ?? 0, u[1] ?? 0);
    }
  }
  quad(
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3,
    n: THREE.Vector3,
    uvs?: number[][],
    ns?: THREE.Vector3[],
  ) {
    const u = uvs ?? [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const N = ns ?? [n, n, n, n];
    this.tri(a, b, c, n, u[0], u[1], u[2], [N[0]!, N[1]!, N[2]!]);
    this.tri(a, c, d, n, u[0], u[2], u[3], [N[0]!, N[2]!, N[3]!]);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
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

function insidePoly(poly: THREE.Vector2[], x: number, z: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (
      a.y > z !== b.y > z &&
      x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x
    )
      c = !c;
  }
  return c;
}

/* ---------------- painted textures ---------------- */

function thatchTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    const rand = seeded(91);
    g.fillStyle = "#8a6a3c";
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) {
      const y0 = (row / 8) * h;
      const grd = g.createLinearGradient(0, y0, 0, y0 + h / 8);
      grd.addColorStop(0, "rgba(40,25,10,0.45)");
      grd.addColorStop(0.3, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, y0, w, h / 8);
    }
    for (let i = 0; i < 9000; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 20 + rand() * 60;
      const tone = rand();
      g.strokeStyle =
        tone < 0.4
          ? `rgba(60,42,20,${0.4 + rand() * 0.4})`
          : tone < 0.85
            ? `rgba(176,140,82,${0.4 + rand() * 0.4})`
            : `rgba(222,196,140,${0.5 + rand() * 0.4})`;
      g.lineWidth = 0.6 + rand() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand() - 0.5) * 8, y + len);
      g.stroke();
    }
  });
}

function barkTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    const rand = seeded(57);
    g.fillStyle = "#7a6c5a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      const v = 80 + rand() * 70;
      g.fillStyle = `rgba(${v},${v * 0.9},${v * 0.75},0.25)`;
      g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 4 + rand() * 18);
    }
    let y = 0;
    while (y < h) {
      const band = 10 + rand() * 12;
      g.fillStyle = `rgba(30,24,18,${0.35 + rand() * 0.3})`;
      g.fillRect(0, y, w, 2 + rand() * 3);
      g.fillStyle = "rgba(200,190,170,0.12)";
      g.fillRect(0, y + 4, w, band * 0.4);
      y += band;
    }
  });
}

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

function beachPainting() {
  return canvasTex(640, 420, (g, w, h) => {
    const rand = seeded(17);
    const sky = g.createLinearGradient(0, 0, 0, h * 0.56);
    sky.addColorStop(0, "#e7a07e");
    sky.addColorStop(0.55, "#f6cf9c");
    sky.addColorStop(1, "#fbe6c0");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h * 0.56);
    g.fillStyle = "rgba(255,244,214,0.95)";
    g.beginPath();
    g.arc(w * 0.66, h * 0.5, 30, 0, Math.PI * 2);
    g.fill();
    const sea = g.createLinearGradient(0, h * 0.56, 0, h * 0.76);
    sea.addColorStop(0, "#2f7f99");
    sea.addColorStop(1, "#63b9bd");
    g.fillStyle = sea;
    g.fillRect(0, h * 0.56, w, h * 0.2);
    g.fillStyle = "rgba(255,236,200,0.45)";
    g.fillRect(w * 0.55, h * 0.56, w * 0.22, 3);
    g.fillRect(w * 0.58, h * 0.6, w * 0.16, 2);
    const sand = g.createLinearGradient(0, h * 0.76, 0, h);
    sand.addColorStop(0, "#efdcb3");
    sand.addColorStop(1, "#d9bf8f");
    g.fillStyle = sand;
    g.fillRect(0, h * 0.76, w, h * 0.24);
    g.strokeStyle = "rgba(255,255,255,0.8)";
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= w; x += 10)
      g.lineTo(x, h * 0.765 + Math.sin(x * 0.05) * 3);
    g.stroke();
    const palm = (x: number, base: number, top: number, lean: number) => {
      g.strokeStyle = "#3b2a1e";
      for (let k = 0; k < 6; k++) {
        g.lineWidth = 9 - k * 1.2;
        g.beginPath();
        g.moveTo(x, base);
        g.quadraticCurveTo(x + lean * 0.2, (base + top) / 2, x + lean, top);
        g.stroke();
      }
      const tx = x + lean;
      for (let f = 0; f < 9; f++) {
        const a =
          -Math.PI * 0.95 + (f / 8) * Math.PI * 1.1 + (rand() - 0.5) * 0.2;
        const len = 70 + rand() * 40;
        const ex = tx + Math.cos(a) * len;
        const ey = top + Math.sin(a) * len * 0.45 + len * 0.35;
        g.strokeStyle = "#1f3a22";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(tx, top);
        g.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, top - 25, ex, ey);
        g.stroke();
        for (let l = 1; l < 14; l++) {
          const t = l / 14;
          const px = tx + (ex - tx) * t;
          const py = top + (ey - top) * t - Math.sin(t * Math.PI) * 18;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px + 6 * Math.cos(a + 1.2), py + 16);
          g.moveTo(px, py);
          g.lineTo(px + 6 * Math.cos(a - 1.2), py + 16);
          g.stroke();
        }
      }
    };
    palm(w * 0.15, h * 0.98, h * 0.18, 40);
    palm(w * 0.27, h * 0.95, h * 0.32, -30);
    palm(w * 0.9, h * 1.0, h * 0.25, -45);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},0.04)`;
      g.fillRect(rand() * w, rand() * h, 3, 1);
    }
  });
}

function curtainGlow() {
  return canvasTex(128, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#c88a52");
    grd.addColorStop(0.5, "#e8b77c");
    grd.addColorStop(1, "#b07a48");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = `rgba(60,30,10,${0.12 + 0.1 * Math.sin(x)})`;
      g.fillRect(x, 0, 3, h);
    }
    g.fillStyle = "#1a1714";
    g.fillRect(w / 2 - 3, 0, 6, h);
    g.fillRect(0, 0, w, 5);
    g.fillRect(0, h - 5, w, 5);
    g.fillRect(0, 0, 5, h);
    g.fillRect(w - 5, 0, 5, h);
  });
}

function towerTexture(seed: number) {
  return canvasTex(256, 512, (g, w, h) => {
    const rand = seeded(seed);
    g.fillStyle = "#0d0f14";
    g.fillRect(0, 0, w, h);
    const cols = 8;
    const rows = 34;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 6 + c * (w / cols);
        const y = 6 + r * (h / rows);
        const t = rand();
        g.fillStyle =
          t < 0.16
            ? `rgb(${220 + rand() * 30},${160 + rand() * 40},${90 + rand() * 30})`
            : t < 0.21
              ? "#9fb8e0"
              : "#16191f";
        g.fillRect(x, y, w / cols - 12, h / rows - 6);
      }
    }
  });
}

function textTexture(
  text: string,
  w: number,
  h: number,
  font: string,
  color: string,
  bg?: string,
) {
  return canvasTex(w, h, (g) => {
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = color;
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2);
  });
}

/* ---------------- shaders ---------------- */

const CAUSTIC = /* glsl */ `
float caustic(vec2 uv, float time) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 5; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}
`;

function basinMaterial(lamps: THREE.Vector3[], level: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLamps: { value: lamps },
      uLevel: { value: level },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uLamps[${lamps.length}]; uniform float uLevel;
      varying vec3 vW; varying vec3 vN; varying vec2 vUv;
      ${CAUSTIC}
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec2 t = vUv / 0.05;
        vec2 id = floor(t); vec2 f = fract(t);
        float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
        float aa = clamp(1.6 - length(fwidth(t)) * 2.5, 0.0, 1.0);
        float grout = (1.0 - smoothstep(0.03, 0.09, e)) * aa;
        float r = mix(0.45, h21(id), aa);
        vec3 tile = mix(vec3(0.06, 0.42, 0.56), vec3(0.22, 0.64, 0.74), r);
        if (r > 0.94) tile = mix(tile, vec3(0.05, 0.28, 0.48), aa);
        vec3 base = mix(tile, vec3(0.75, 0.82, 0.82), grout) * mix(1.06, 1.0, aa);
        vec3 N = normalize(vN);
        vec3 light = vec3(0.025, 0.08, 0.1);
        for (int i = 0; i < ${lamps.length}; i++) {
          vec3 d = uLamps[i] - vW; float dist = length(d);
          float ndl = max(dot(N, d / dist), 0.0);
          light += vec3(0.8, 0.97, 1.0) * (0.2 + ndl) * 1.1 / (1.0 + dist * dist * 0.45);
        }
        float depth = max(uLevel - vW.y, 0.0);
        float c = caustic(vW.xz * 0.21, uTime * 0.32) + 0.6 * caustic(vW.xz * 0.37 + 3.1, uTime * 0.27);
        float cm = mix(0.4, 1.0, step(0.5, N.y));
        vec3 col = base * light * (1.0 + c * 1.5 * cm);
        float path = depth + 0.12 * length(cameraPosition.xz - vW.xz);
        col *= exp(-vec3(1.1, 0.22, 0.16) * path * 0.45);
        col += vec3(0.0, 0.05, 0.065) * (1.0 - exp(-path * 0.5));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function waterMaterial(lights: THREE.Vector3[], colors: THREE.Color[]) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uLP: { value: lights },
      uLC: { value: colors },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uLP[${lights.length}]; uniform vec3 uLC[${lights.length}];
      varying vec3 vW;
      ${CAUSTIC}
      vec2 waveGrad(vec2 p, float t) {
        vec2 g = vec2(0.0);
        for (int i = 0; i < 9; i++) {
          float fi = float(i);
          float ang = fi * 2.399 + 0.4;
          vec2 d = vec2(cos(ang), sin(ang));
          float k = 1.4 * pow(1.42, fi);
          float amp = 0.03 / pow(1.55, fi);
          float ph = dot(d, p) * k + t * sqrt(9.8 * k) * 0.55 + fi * 1.7;
          g += d * k * amp * cos(ph);
        }
        return g;
      }
      void main() {
        vec2 g = waveGrad(vW.xz, uTime);
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 V = normalize(cameraPosition - vW);
        float ndv = max(dot(N, V), 0.0);
        float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, N);
        float up = clamp(R.y, 0.0, 1.0);
        vec3 refl = mix(vec3(0.05, 0.06, 0.08), vec3(0.008, 0.012, 0.03), pow(up, 0.5));
        refl += vec3(0.09, 0.06, 0.035) * exp(-up * 9.0);
        vec3 spec = vec3(0.0);
        for (int i = 0; i < ${lights.length}; i++) {
          vec3 L = normalize(uLP[i] - vW);
          float s = max(dot(R, L), 0.0);
          spec += uLC[i] * (pow(s, 1200.0) * 9.0 + pow(s, 80.0) * 0.06);
        }
        float c = caustic(vW.xz * 0.3 + 7.0, uTime * 0.4);
        vec3 body = vec3(0.01, 0.16, 0.19) * (0.6 + 0.5 * c);
        vec3 col = mix(body, refl, fres) + spec;
        float alpha = clamp(mix(0.32, 1.0, fres) + length(spec) * 0.15, 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(vec3(0.05, 0.065, 0.11), vec3(0.004, 0.007, 0.02), pow(h, 0.4));
        col += vec3(0.16, 0.08, 0.035) * exp(-h * 16.0) * 0.55;
        vec3 p = d * 220.0; vec3 id = floor(p); float r = hash(id);
        if (r > 0.9955 && d.y > 0.12) {
          vec3 f = fract(p) - 0.5;
          float s = smoothstep(0.22, 0.0, length(f));
          float tw = 0.65 + 0.35 * sin(uTime * (1.0 + r * 4.0) + r * 60.0);
          col += vec3(0.85, 0.9, 1.0) * s * tw * ((r - 0.9955) / 0.0045) * 2.2;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function steamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 600 },
      uColor: { value: new THREE.Color("#bfe3e6") },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA; varying float vS;
      void main() {
        vec3 p = position;
        float life = fract(uTime * 0.07 + aSeed);
        p.y += life * 1.5;
        p.x += sin(uTime * 0.45 + aSeed * 20.0) * 0.35 * life + life * 0.4;
        p.z += cos(uTime * 0.38 + aSeed * 13.0) * 0.35 * life;
        vA = smoothstep(0.0, 0.2, life) * (1.0 - life);
        vS = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (0.9 + life * 1.8) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA; varying float vS;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a *= a * (0.75 + 0.25 * sin(c.x * 9.0 + vS * 30.0) * sin(c.y * 7.0 + vS * 11.0));
        gl_FragColor = vec4(uColor, a * vA * 0.16);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/* ---------------- palm pieces ---------------- */

function frondGeometry() {
  const rand = seeded(5);
  const L = 3.0;
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const rach = (s: number) => v3(s * L, L * (0.26 * s - 0.5 * s * s), 0);
  const push = (p: THREE.Vector3, c: THREE.Color) => {
    pos.push(p.x, p.y, p.z);
    col.push(c.r, c.g, c.b);
    return pos.length / 3 - 1;
  };
  const dark = new THREE.Color("#1f3a14");
  const light = new THREE.Color("#5a7a2a");
  // rachis ribbon
  const SEG = 16;
  for (let i = 0; i <= SEG; i++) {
    const s = i / SEG;
    const p = rach(s);
    const w = 0.035 * (1 - s * 0.8);
    push(p.clone().add(v3(0, 0, w)), dark);
    push(p.clone().add(v3(0, 0, -w)), dark);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const N = 40;
  for (let k = 0; k < N; k++) {
    const s = 0.1 + (0.9 * k) / (N - 1);
    const base = rach(s);
    const len =
      (0.18 + 0.72 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.7)) *
      (1 - 0.25 * s);
    for (const side of [-1, 1]) {
      const droop = -0.25 - 0.35 * s - rand() * 0.15;
      const dir = v3(0.35 + rand() * 0.1, droop, side).normalize();
      const tip = base.clone().addScaledVector(dir, len);
      const mid = base.clone().addScaledVector(dir, len * 0.4);
      const across = v3(1, 0, 0)
        .addScaledVector(dir, -dir.x)
        .normalize()
        .multiplyScalar(0.03);
      const c = dark.clone().lerp(light, 0.3 + rand() * 0.5 + s * 0.2);
      const ct = c.clone().lerp(new THREE.Color("#8a8a3a"), 0.25);
      const a = push(base, c);
      const b = push(
        mid
          .clone()
          .add(across)
          .add(v3(0, 0.012, 0)),
        c,
      );
      const d = push(
        mid
          .clone()
          .sub(across)
          .add(v3(0, 0.012, 0)),
        c,
      );
      const t = push(tip, ct);
      idx.push(a, b, d, b, t, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function trunkGeometry(h: number, lean: number, dir: number) {
  const segs = 30;
  const radial = 12;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const dx = Math.sin(dir) * lean;
  const dz = Math.cos(dir) * lean;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const cx = dx * t * t;
    const cz = dz * t * t;
    const y = t * h;
    let r =
      (0.19 - 0.06 * t) *
      (1 + 0.06 * Math.pow(0.5 + 0.5 * Math.cos(y * 16), 3));
    r *= 1 + 0.55 * Math.exp(-y * 3.2);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
      uv.push((j / radial) * 2, y * 0.9);
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + 1;
      const c = a + radial + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, top: v3(dx, h, dz) };
}

function leafGeometry() {
  const t = new Tris();
  const L = 0.55;
  const SEG = 6;
  const pt = (s: number, side: number) => {
    const w = 0.055 * Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.05)) * side;
    return v3(w, Math.sin(s * 1.6) * L * 0.55, s * L).add(
      v3(0, side === 0 ? 0.008 : 0, 0),
    );
  };
  for (let i = 0; i < SEG; i++) {
    const s0 = i / SEG;
    const s1 = (i + 1) / SEG;
    for (const side of [-1, 1]) {
      t.quad(
        pt(s0, 0),
        pt(s1, 0),
        pt(s1, side),
        pt(s0, side),
        v3(0, 1, -0.3).normalize(),
      );
    }
  }
  return t.geometry();
}

/* ---------------- the scene ---------------- */

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  elena: {
    top: "#ff9fc4",
    topStyle: "blouse",
    bottom: "#e9dccb",
    bottomStyle: "shorts",
    shoes: "#d4b089",
  },
  davi: {
    top: "#1fb7b2",
    topStyle: "jersey",
    print: "1",
    printColor: "#ff8a1f",
    bottom: "#24272c",
    bottomStyle: "shorts",
    shoes: "#1b1b1b",
  },
};

function build(ctx: SceneCtx) {
  const { scene } = ctx;
  const high = ctx.quality === "high";
  const B = new Batch();
  const rand = seeded(2024);
  const updates: ((t: number, dt: number) => void)[] = [];

  scene.environmentIntensity = 0.16;
  scene.fog = new THREE.Fog("#0a1020", 40, 230);

  /* ---------- materials ---------- */
  const M = {
    floor: pbr(tiles("#cdcdca", "#b2b2ae", 4, 41, 0.22)),
    wall: new THREE.MeshStandardMaterial({ color: "#e8e3d9", roughness: 0.9 }),
    veneer: pbr(woodPlanks("#c79c68", 2, 6), { roughness: 0.6 }),
    bagFabric: pbr(fabric("#2e3135", 26), { roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({
      color: "#f3f1ec",
      roughness: 0.92,
    }),
    facade: new THREE.MeshStandardMaterial({
      color: "#e6d9c3",
      roughness: 0.88,
    }),
    gardenWall: pbr(plaster("#d9cbb2", 10)),
    cap: pbr(concrete("#cfc6b6", 3)),
    wood: pbr(woodPlanks("#c9a06d", 6, 4), { roughness: 0.75 }),
    woodDark: pbr(woodPlanks("#6e4a2e", 4, 8), { roughness: 0.6 }),
    deckWood: pbr(woodPlanks("#7a5536", 8, 12), { roughness: 0.8 }),
    white: new THREE.MeshStandardMaterial({
      color: "#f2f0eb",
      roughness: 0.45,
    }),
    whiteGloss: new THREE.MeshStandardMaterial({
      color: "#f7f6f2",
      roughness: 0.18,
    }),
    sheet: pbr(fabric("#f3f1ec", 21)),
    skirt: pbr(fabric("#6a4a35", 22)),
    curtain: pbr(fabric("#d4c09e", 23), { side: THREE.DoubleSide }),
    granite: graniteMaterial(),
    alu: metal("#a9adb0", 0.35),
    bronze: metal("#3a332d", 0.4),
    chrome: metal("#e4e4e4", 0.08),
    black: new THREE.MeshStandardMaterial({
      color: "#121314",
      roughness: 0.35,
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
    deck: pbr(tiles("#c4b79e", "#9b8f79", 4, 31, 0.42)),
    coping: pbr(concrete("#ddd4c3", 5)),
    hedge: pbr(carpet("#2b4422", 77), {
      roughness: 0.95,
      normalScale: new THREE.Vector2(3, 3),
    }),
    soil: pbr(carpet("#2d241b", 78)),
    loungerFrame: new THREE.MeshStandardMaterial({
      color: "#f1f0ec",
      roughness: 0.35,
    }),
    cushion: pbr(fabric("#f6f4ee", 24), { roughness: 0.95 }),
    bark: new THREE.MeshStandardMaterial({
      map: barkTexture(),
      roughness: 0.95,
    }),
    pink: new THREE.MeshPhysicalMaterial({
      color: "#f07fae",
      roughness: 0.25,
      clearcoat: 0.6,
    }),
  };
  M.bark.bumpMap = M.bark.map;
  M.bark.bumpScale = 3;

  /* =====================================================================
   * THE ROOM
   * ===================================================================== */
  const H = 2.7;
  // floor + ceiling
  B.box(M.floor, -1.9, -0.05, 0, 1.9, 0, 5.2, 2.4);
  B.box(M.ceiling, -1.9, H, 0, 1.9, H + 0.05, 5.2);
  // walls (the north wall is the facade, built with the outside)
  B.box(M.wall, -2.1, 0, 0, -1.9, H, 5.4, 3);
  B.box(M.wall, 1.9, 0, 0, 2.1, H, 5.4, 3);
  B.box(M.wall, -1.9, 0, 5.2, 1.9, H, 5.4, 3);
  ctx.wall(-2.3, -0.2, -1.9, 5.5);
  ctx.wall(1.9, -0.2, 2.3, 5.5);
  ctx.wall(-2.3, 5.2, 2.3, 5.6);
  // baseboards
  for (const [x0, z0, x1, z1] of [
    [1.885, 0, 1.9, 5.2],
    [-1.9, 5.185, 1.9, 5.2],
    [-1.9, 0, -0.1, 0.015],
    [1.75, 0, 1.9, 0.015],
  ] as const)
    B.box(M.white, x0, 0, z0, x1, 0.08, z1);
  // crown molding
  B.box(M.white, -1.9, H - 0.06, 5.17, 1.9, H, 5.2);
  B.box(M.white, 1.87, H - 0.06, 0, 1.9, H, 5.2);
  B.box(M.white, -1.9, H - 0.06, 0, -1.87, H, 5.2);
  B.box(M.white, -1.9, H - 0.06, 0, 1.9, H, 0.03);

  // --- headboard wall: light wood panel on the west wall ---
  B.box(M.wood, -1.9, 0.05, 0.22, -1.875, 2.42, 3.38, 0.62, true);
  B.box(M.wood, -1.9, 2.42, 0.18, -1.86, 2.47, 3.42, 1);
  for (let z = 0.22 + 0.526; z < 3.37; z += 0.526)
    B.box(M.black, -1.876, 0.05, z - 0.004, -1.874, 2.42, z + 0.004);
  // reading LED strip on the panel top
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.012, 3.1),
    emissive("#ffd6a0", 1.8),
  );
  led.position.set(-1.87, 2.405, 1.8);
  scene.add(led);

  // --- bed (head against the panel) ---
  const bedX0 = -1.87;
  const bedX1 = 0.12;
  const bedZ0 = 1.01;
  const bedZ1 = 2.59;
  B.box(
    M.skirt,
    bedX0 + 0.02,
    0,
    bedZ0 + 0.02,
    bedX1 - 0.02,
    0.33,
    bedZ1 - 0.02,
    0.5,
  );
  B.rbox(
    M.sheet,
    bedX1 - bedX0,
    0.24,
    bedZ1 - bedZ0,
    0.06,
    T((bedX0 + bedX1) / 2, 0.44, (bedZ0 + bedZ1) / 2),
    0.5,
  );
  // duvet over the lower two thirds, with a turned-down band
  B.rbox(M.sheet, 1.45, 0.07, 1.68, 0.03, T(bedX1 - 0.7, 0.575, 1.8), 0.5);
  B.rbox(
    M.sheet,
    0.28,
    0.085,
    1.69,
    0.035,
    T(bedX1 - 1.4, 0.58, 1.8, 0, 0, 0.04),
    0.5,
  );
  // drape over the side edges
  B.box(
    M.sheet,
    bedX1 - 1.42,
    0.3,
    bedZ0 - 0.035,
    bedX1 + 0.03,
    0.6,
    bedZ0 - 0.005,
    0.5,
  );
  B.box(
    M.sheet,
    bedX1 - 1.42,
    0.3,
    bedZ1 + 0.005,
    bedX1 + 0.03,
    0.6,
    bedZ1 + 0.035,
    0.5,
  );
  B.box(
    M.sheet,
    bedX1 + 0.0,
    0.3,
    bedZ0 - 0.035,
    bedX1 + 0.035,
    0.6,
    bedZ1 + 0.035,
    0.5,
  );
  // decorative runner across the foot of the bed
  const runner = pbr(fabric("#7a5236", 25), { roughness: 0.9 });
  B.box(runner, -0.62, 0.608, bedZ0 - 0.045, -0.12, 0.622, bedZ1 + 0.045, 0.4);
  B.box(runner, -0.62, 0.42, bedZ0 - 0.05, -0.12, 0.622, bedZ0 - 0.035, 0.4);
  B.box(runner, -0.62, 0.42, bedZ1 + 0.035, -0.12, 0.622, bedZ1 + 0.05, 0.4);
  // pillows
  for (const z of [1.43, 2.17]) {
    B.rbox(M.sheet, 0.42, 0.17, 0.68, 0.08, T(-1.62, 0.64, z, 0, 0, 0.35), 0.5);
  }
  // folded towels on the bed, like the hotel leaves them
  B.rbox(M.sheet, 0.32, 0.06, 0.24, 0.025, T(-0.32, 0.64, 1.62, 0, 0.1), 0.3);
  B.rbox(M.sheet, 0.3, 0.055, 0.22, 0.024, T(-0.31, 0.695, 1.62, 0, 0.05), 0.3);
  B.rbox(M.sheet, 0.32, 0.06, 0.24, 0.025, T(-0.32, 0.64, 1.98, 0, -0.08), 0.3);
  B.rbox(M.sheet, 0.22, 0.05, 0.16, 0.02, T(-0.31, 0.69, 1.98, 0, -0.1), 0.3);
  ctx.wall(bedX0, bedZ0 - 0.05, bedX1 + 0.04, bedZ1 + 0.05);

  // --- nightstands with lamps ---
  const lampShade = new THREE.MeshStandardMaterial({
    color: "#efe2c8",
    emissive: "#ffc27a",
    emissiveIntensity: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const bulb = emissive("#ffd9a8", 3);
  for (const [zc, phone] of [
    [0.7, false],
    [2.9, true],
  ] as const) {
    B.box(M.veneer, -1.87, 0.0, zc - 0.225, -1.45, 0.55, zc + 0.225, 1.2);
    B.box(M.black, -1.452, 0.3, zc - 0.2, -1.448, 0.304, zc + 0.2);
    B.box(M.chrome, -1.45, 0.4, zc - 0.07, -1.435, 0.415, zc + 0.07);
    B.add(
      M.whiteGloss,
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.001, 0),
          new THREE.Vector2(0.07, 0),
          new THREE.Vector2(0.085, 0.07),
          new THREE.Vector2(0.06, 0.18),
          new THREE.Vector2(0.02, 0.24),
          new THREE.Vector2(0.001, 0.25),
        ],
        20,
      ),
      T(-1.68, 0.55, zc),
    );
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.22, 28, 1, true),
      lampShade,
    );
    shade.position.set(-1.68, 0.92, zc);
    scene.add(shade);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), bulb);
    b.position.set(-1.68, 0.86, zc);
    scene.add(b);
    const l = new THREE.PointLight("#ffb978", 0.9, 6, 2);
    l.position.set(-1.62, 1.0, zc);
    scene.add(l);
    if (phone) {
      B.rbox(
        M.black,
        0.16,
        0.05,
        0.19,
        0.012,
        T(-1.58, 0.575, zc + 0.08, 0, 0.3),
        0,
      );
      B.rbox(
        M.black,
        0.05,
        0.035,
        0.2,
        0.015,
        T(-1.6, 0.615, zc + 0.08, 0, 0.3),
        0,
      );
    } else {
      // water bottles and the room key card
      for (const dz of [0.08, 0.15])
        B.add(
          M.glassPane,
          new THREE.CylinderGeometry(0.03, 0.03, 0.2, 14),
          T(-1.55, 0.65, zc + dz),
        );
      B.box(M.white, -1.62, 0.55, zc - 0.15, -1.54, 0.553, zc - 0.1);
    }
    // outlet by the nightstand
    B.box(M.white, -1.9, 0.3, zc + 0.3, -1.875, 0.38, zc + 0.38);
  }

  // --- beach painting above the bed ---
  {
    const g = new THREE.Group();
    const fr = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.74, 0.035),
      M.woodDark,
    );
    fr.castShadow = true;
    g.add(fr);
    const pic = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 0.66),
      new THREE.MeshStandardMaterial({ map: beachPainting(), roughness: 0.55 }),
    );
    pic.position.z = 0.019;
    g.add(pic);
    g.position.set(-1.85, 1.62, 1.8);
    g.rotation.y = Math.PI / 2;
    scene.add(g);
  }

  // --- glass sliding door, frame and curtains (north wall) ---
  {
    const dx0 = -0.1;
    const dx1 = 1.75;
    const top = 2.25;
    B.box(M.alu, dx0, 0, -0.2, dx0 + 0.05, top, 0);
    B.box(M.alu, dx1 - 0.05, 0, -0.2, dx1, top, 0);
    B.box(M.alu, dx0, top - 0.05, -0.2, dx1, top, 0);
    B.box(M.alu, dx0, 0, -0.2, dx1, 0.02, 0);
    const panel = (x0: number, x1: number, z: number) => {
      B.box(M.alu, x0, 0.02, z - 0.02, x0 + 0.05, top - 0.05, z + 0.02);
      B.box(M.alu, x1 - 0.05, 0.02, z - 0.02, x1, top - 0.05, z + 0.02);
      B.box(M.alu, x0, 0.02, z - 0.02, x1, 0.1, z + 0.02);
      B.box(M.alu, x0, top - 0.1, z - 0.02, x1, top - 0.05, z + 0.02);
      B.box(
        M.glassPane,
        x0 + 0.05,
        0.1,
        z - 0.004,
        x1 - 0.05,
        top - 0.1,
        z + 0.004,
      );
      B.box(M.alu, x1 - 0.04, 0.9, z + 0.02, x1 - 0.02, 1.15, z + 0.04);
    };
    panel(-0.05, 0.86, -0.06);
    panel(-0.03, 0.92, -0.14);
    ctx.wall(dx0, -0.25, 0.92, 0.02);
    // curtain rod + curtains
    B.add(
      M.alu,
      new THREE.CylinderGeometry(0.012, 0.012, 2.45, 10),
      T(0.75, 2.5, 0.1, 0, 0, Math.PI / 2),
    );
    const curtain = (w: number, folds: number, amp: number, x: number) => {
      const g = new THREE.PlaneGeometry(w, 2.46, folds * 10, 1);
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++)
        p.setZ(i, Math.sin((p.getX(i) / w) * folds * Math.PI * 2) * amp);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.curtain);
      m.position.set(x, 1.255, 0.11);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    };
    curtain(0.62, 7, 0.045, -0.15);
    curtain(0.2, 3, 0.04, 1.79);
  }

  // --- photo of the couple on the wardrobe side, lit by the bedside lamp ---
  ctx.photo("caldas-1.webp", 0.46, 0.345, v3(-1.61, 1.42, 3.535), 180);

  // --- TV console, TV, minibar, AC (east wall) ---
  {
    const x0 = 1.42;
    B.box(M.veneer, x0, 0.72, 0.95, 1.9, 0.76, 2.75, 1.2);
    B.box(M.veneer, x0, 0, 0.95, x0 + 0.03, 0.72, 2.75, 1.2);
    B.box(M.veneer, x0 + 0.03, 0, 0.95, 1.9, 0.72, 0.98, 1.2);
    B.box(M.veneer, x0 + 0.03, 0, 2.72, 1.9, 0.72, 2.75, 1.2);
    B.box(M.veneer, x0 + 0.03, 0.3, 0.98, 1.9, 0.32, 2.1, 1.2);
    // minibar
    B.rbox(M.black, 0.42, 0.52, 0.46, 0.015, T(1.67, 0.26, 2.45), 0);
    B.box(M.chrome, 1.455, 0.36, 2.25, 1.46, 0.46, 2.27);
    // TV
    B.box(M.black, 1.855, 1.03, 1.3, 1.88, 1.68, 2.42);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.63),
      new THREE.MeshStandardMaterial({
        color: "#040506",
        roughness: 0.08,
        metalness: 0.3,
      }),
    );
    screen.position.set(1.854, 1.355, 1.86);
    screen.rotation.y = -Math.PI / 2;
    scene.add(screen);
    const standby = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.006, 0.006),
      emissive("#ff2a2a", 3),
    );
    standby.position.set(1.853, 1.04, 2.3);
    scene.add(standby);
    // things on the console: kettle, cups, remote, hotel folder
    B.add(
      M.whiteGloss,
      new THREE.CylinderGeometry(0.07, 0.085, 0.2, 20),
      T(1.68, 0.86, 1.15),
    );
    B.add(
      M.black,
      new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12),
      T(1.68, 0.975, 1.15),
    );
    for (const z of [1.35, 1.45])
      B.add(
        M.whiteGloss,
        new THREE.CylinderGeometry(0.04, 0.032, 0.085, 16),
        T(1.62, 0.8025, z),
      );
    B.rbox(M.black, 0.05, 0.02, 0.17, 0.008, T(1.6, 0.77, 2.1, 0, 0.2), 0);
    B.rbox(M.woodDark, 0.23, 0.02, 0.32, 0.005, T(1.7, 0.77, 2.5, 0, -0.1), 0);
    // AC split
    B.rbox(M.white, 0.22, 0.3, 0.86, 0.05, T(1.78, 2.42, 1.85), 0);
    B.box(M.black, 1.665, 2.29, 1.47, 1.68, 2.31, 2.23);
    ctx.wall(x0, 0.95, 1.9, 2.75);
  }

  // --- entrance door (south wall), switches, card slot ---
  {
    B.box(M.woodDark, -0.65, 0, 5.15, 0.25, 2.1, 5.2, 0.9, true);
    B.box(M.white, -0.73, 0, 5.13, -0.65, 2.18, 5.2);
    B.box(M.white, 0.25, 0, 5.13, 0.33, 2.18, 5.2);
    B.box(M.white, -0.73, 2.1, 5.13, 0.33, 2.18, 5.2);
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.025, 0.025, 0.03, 16),
      T(0.13, 1.02, 5.13, Math.PI / 2),
    );
    B.box(M.chrome, -0.02, 1.005, 5.105, 0.14, 1.03, 5.125);
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10),
      T(-0.2, 1.55, 5.14, Math.PI / 2),
    );
    B.box(M.alu, -0.5, 2.05, 5.12, -0.1, 2.08, 5.15);
    const plan = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.21),
      new THREE.MeshStandardMaterial({
        map: canvasTex(240, 168, (g, w, h) => {
          g.fillStyle = "#f4f4f0";
          g.fillRect(0, 0, w, h);
          g.fillStyle = "#c0392b";
          g.fillRect(0, 0, w, 22);
          g.fillStyle = "#fff";
          g.font = "bold 14px sans-serif";
          g.fillText("ROTA DE FUGA", 10, 16);
          g.strokeStyle = "#333";
          g.lineWidth = 2;
          g.strokeRect(20, 40, 200, 110);
          for (let x = 40; x < 220; x += 30) {
            g.beginPath();
            g.moveTo(x, 40);
            g.lineTo(x, 80);
            g.stroke();
          }
          g.strokeStyle = "#27ae60";
          g.lineWidth = 4;
          g.beginPath();
          g.moveTo(60, 100);
          g.lineTo(200, 100);
          g.lineTo(200, 140);
          g.stroke();
        }),
        roughness: 0.4,
      }),
    );
    plan.position.set(-0.2, 1.5, 5.143);
    plan.rotation.y = Math.PI;
    scene.add(plan);
    // key-card power slot and switches
    B.box(M.white, 0.45, 1.25, 5.18, 0.55, 1.37, 5.2);
    B.box(M.black, 0.47, 1.33, 5.175, 0.53, 1.34, 5.18);
    B.box(M.white, 0.45, 1.05, 5.185, 0.55, 1.17, 5.2);
    const keyLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.008, 0.004),
      emissive("#5cff7a", 3),
    );
    keyLed.position.set(0.5, 1.29, 5.176);
    scene.add(keyLed);
  }

  // --- wardrobe (west wall, by the entrance) ---
  {
    B.box(M.veneer, -1.9, 0, 3.55, -1.32, 2.36, 5.12, 1.2, true);
    B.box(M.black, -1.321, 0.05, 4.33, -1.318, 2.32, 4.34);
    B.box(M.black, -1.321, 2.0, 3.58, -1.318, 2.005, 5.09);
    for (const z of [4.27, 4.4])
      B.add(
        M.chrome,
        new THREE.CylinderGeometry(0.008, 0.008, 0.4, 10),
        T(-1.29, 1.1, z),
      );
    for (const z of [4.27, 4.4])
      for (const y of [0.92, 1.28])
        B.box(
          M.chrome,
          -1.32,
          y - 0.008,
          z - 0.005,
          -1.29,
          y + 0.008,
          z + 0.005,
        );
    ctx.wall(-1.9, 3.55, -1.32, 5.12);
  }

  // --- pink suitcase (their first trip) and a backpack ---
  {
    const sx = 0.85;
    const sz = 4.75;
    const g = new THREE.Group();
    const shell = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.62, 0.26, 4, 0.05),
      M.pink,
    );
    shell.position.y = 0.37;
    shell.castShadow = true;
    g.add(shell);
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.56, 0.275),
        M.pink,
      );
      rib.position.set(i * 0.075, 0.37, 0);
      g.add(rib);
    }
    const zip = new THREE.Mesh(
      new THREE.BoxGeometry(0.43, 0.63, 0.012),
      new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.6 }),
    );
    zip.position.y = 0.37;
    g.add(zip);
    for (const x of [-0.13, 0.13]) {
      const rod = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.36, 0.02),
        M.alu,
      );
      rod.position.set(x, 0.86, -0.1);
      g.add(rod);
      for (const z of [-0.09, 0.09]) {
        const w = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12),
          M.black,
        );
        w.rotation.z = Math.PI / 2;
        w.position.set(x * 1.3, 0.035, z);
        g.add(w);
      }
    }
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.025, 0.03),
      M.black,
    );
    handle.position.set(0, 1.04, -0.1);
    g.add(handle);
    g.position.set(sx, 0, sz);
    g.rotation.y = D(-20);
    scene.add(g);
    ctx.solid(g, 0.02);
    // backpack slumped by the bed
    B.rbox(
      M.bagFabric,
      0.32,
      0.42,
      0.2,
      0.08,
      T(0.38, 0.21, 2.95, 0.15, 0.4),
      0,
    );
    B.rbox(
      M.bagFabric,
      0.24,
      0.16,
      0.06,
      0.04,
      T(0.4, 0.15, 2.84, 0.15, 0.4),
      0,
    );
  }

  // --- sink counter (granite) with mirror, by the entrance (east wall) ---
  {
    const cx = 1.615;
    const cz = 3.5;
    B.box(M.veneer, 1.37, 0.1, 3.02, 1.9, 0.86, 3.98, 1.2);
    B.box(M.black, 1.37, 0, 3.04, 1.88, 0.1, 3.96);
    B.box(M.black, 1.368, 0.12, 3.495, 1.371, 0.84, 3.505);
    for (const z of [3.42, 3.58])
      B.box(M.chrome, 1.35, 0.6, z - 0.005, 1.368, 0.75, z + 0.005);
    const top = new THREE.Shape();
    top.moveTo(-0.29, -0.52);
    top.lineTo(0.29, -0.52);
    top.lineTo(0.29, 0.52);
    top.lineTo(-0.29, 0.52);
    top.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, 0, 0.15, 0.21, 0, Math.PI * 2, true, 0);
    top.holes.push(hole);
    const tg = new THREE.ExtrudeGeometry(top, {
      depth: 0.035,
      bevelEnabled: false,
      curveSegments: 32,
    });
    tg.rotateX(-Math.PI / 2);
    const topMesh = new THREE.Mesh(tg, M.granite);
    topMesh.position.set(cx, 0.86, cz);
    topMesh.receiveShadow = true;
    scene.add(topMesh);
    // backsplash
    B.box(M.granite, 1.88, 0.895, 2.98, 1.9, 1.0, 4.02);
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(
        1,
        28,
        12,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2,
      ),
      new THREE.MeshStandardMaterial({
        color: "#f4f4f2",
        roughness: 0.12,
        side: THREE.DoubleSide,
      }),
    );
    bowl.scale.set(0.15, 0.15, 0.21);
    bowl.position.set(cx, 0.89, cz);
    scene.add(bowl);
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.02, 0.02, 0.004, 16),
      T(cx, 0.742, cz),
    );
    // faucet
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.022, 0.026, 0.22, 16),
      T(1.82, 1.005, cz),
    );
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.014, 0.014, 0.17, 12),
      T(1.74, 1.11, cz, 0, 0, Math.PI / 2 + 0.12),
    );
    B.box(M.chrome, 1.8, 1.12, cz - 0.006, 1.86, 1.13, cz + 0.006);
    // soap, glasses, a folded hand towel
    B.add(
      M.whiteGloss,
      new THREE.CylinderGeometry(0.03, 0.03, 0.13, 14),
      T(1.78, 0.96, 3.15),
    );
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8),
      T(1.78, 1.045, 3.15),
    );
    for (const z of [3.85, 3.92])
      B.add(
        M.glassPane,
        new THREE.CylinderGeometry(0.03, 0.026, 0.1, 14),
        T(1.78, 0.945, z),
      );
    B.rbox(M.sheet, 0.3, 0.04, 0.22, 0.015, T(1.62, 0.915, 3.15, 0, 0.1), 0.3);
    // mirror
    if (high) {
      const mirror = new Reflector(new THREE.PlaneGeometry(0.95, 0.85), {
        textureWidth: 512,
        textureHeight: 512,
        color: 0x9a9a9a,
        clipBias: 0.003,
      });
      mirror.position.set(1.893, 1.55, cz);
      mirror.rotation.y = -Math.PI / 2;
      scene.add(mirror);
    } else {
      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.85),
        metal("#cfd3d6", 0.03),
      );
      mirror.position.set(1.893, 1.55, cz);
      mirror.rotation.y = -Math.PI / 2;
      scene.add(mirror);
    }
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.02, 0.9),
      emissive("#fff0d8", 1.6),
    );
    strip.position.set(1.88, 2.03, cz);
    scene.add(strip);
    if (high) {
      const sl = new THREE.PointLight("#ffe2bd", 0.7, 5, 2);
      sl.position.set(1.25, 2.3, cz);
      scene.add(sl);
    }
    // towel ring
    B.add(
      M.chrome,
      new THREE.TorusGeometry(0.09, 0.008, 8, 24),
      T(1.88, 1.35, 4.06, 0, Math.PI / 2),
    );
    ctx.wall(1.35, 2.98, 1.9, 4.02);
  }

  // --- bathroom door (east wall, closed) ---
  {
    B.box(M.white, 1.86, 0, 4.15, 1.9, 2.1, 4.95);
    B.box(M.white, 1.85, 0, 4.09, 1.9, 2.17, 4.15);
    B.box(M.white, 1.85, 0, 4.95, 1.9, 2.17, 5.01);
    B.box(M.white, 1.85, 2.1, 4.09, 1.9, 2.17, 5.01);
    B.box(M.chrome, 1.83, 1.0, 4.22, 1.86, 1.02, 4.36);
    B.add(
      M.chrome,
      new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14),
      T(1.845, 1.01, 4.22, 0, 0, Math.PI / 2),
    );
  }

  // --- ceiling light (with the room's shadow) ---
  {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.05, 40),
      emissive("#fff1dc", 1.6),
    );
    disc.position.set(-0.2, H - 0.03, 2.3);
    scene.add(disc);
    B.add(
      M.alu,
      new THREE.TorusGeometry(0.24, 0.012, 6, 40),
      T(-0.2, H - 0.05, 2.3, Math.PI / 2),
    );
    const s = new THREE.SpotLight("#ffe6c4", 7, 10, D(75), 0.9, 2);
    s.position.set(-0.2, H - 0.08, 2.3);
    s.target.position.set(-0.2, 0, 2.3);
    if (high) {
      s.castShadow = true;
      s.shadow.mapSize.set(1024, 1024);
      s.shadow.bias = -0.0004;
      s.shadow.normalBias = 0.02;
      s.shadow.camera.near = 0.1;
      s.shadow.camera.far = 6;
    }
    scene.add(s, s.target);
    // smoke detector
    B.add(
      M.white,
      new THREE.CylinderGeometry(0.06, 0.065, 0.035, 20),
      T(0.6, H - 0.018, 4.2),
    );
  }

  /* =====================================================================
   * OUTSIDE: facade, deck, pool, kiosk, palms
   * ===================================================================== */

  // --- the hotel facade (north wall of the room and the building around it) ---
  {
    B.box(M.facade, -14.8, 0, -0.2, -0.1, 3.2, 0, 3);
    B.box(M.facade, 1.75, 0, -0.2, 14.8, 3.2, 0, 3);
    B.box(M.facade, -0.1, 2.25, -0.2, 1.75, 3.2, 0, 3);
    B.box(M.facade, -14.8, 3.2, -0.2, 14.8, 9.8, 0, 3);
    for (const y of [3.15, 6.35])
      B.box(M.cap, -14.8, y, -0.34, 14.8, y + 0.15, -0.2, 2);
    B.box(M.cap, -14.9, 9.8, -0.5, 14.9, 10.1, 0, 2);
    ctx.wall(-15, -0.25, -0.1, 0);
    ctx.wall(1.75, -0.25, 15, 0);

    // other rooms' glass doors (curtains lit or dark), balconies above
    const winTex = curtainGlow();
    const spots: { x: number; y: number }[] = [];
    for (let f = 0; f < 3; f++)
      for (let k = -3; k <= 3; k++) {
        if (f === 0 && k === 0) continue;
        spots.push({ x: 4 * k + 0.82, y: f * 3.2 });
      }
    const frames = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.97, 2.3, 0.08),
      M.bronze,
      spots.length,
    );
    const panes = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.85, 2.2),
      new THREE.MeshBasicMaterial({ map: winTex }),
      spots.length,
    );
    const dummy = new THREE.Object3D();
    spots.forEach((s, i) => {
      dummy.position.set(s.x, s.y + 1.15, -0.22);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      frames.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x, s.y + 1.14, -0.265);
      dummy.rotation.set(0, Math.PI, 0);
      dummy.updateMatrix();
      panes.setMatrixAt(i, dummy.matrix);
      const lit = rand();
      const c =
        lit < 0.45
          ? new THREE.Color(0.02, 0.025, 0.035)
          : lit < 0.6
            ? new THREE.Color(0.3, 0.42, 0.6)
            : new THREE.Color(
                0.8 + rand() * 0.6,
                0.65 + rand() * 0.4,
                0.5 + rand() * 0.2,
              );
      panes.setColorAt(i, c);
    });
    frames.castShadow = true;
    scene.add(frames, panes);

    const upper = spots.filter((s) => s.y > 0);
    const slabs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.5, 0.14, 1.25),
      M.facade,
      upper.length,
    );
    const rails = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.5, 0.05, 0.06),
      M.alu,
      upper.length * 3,
    );
    const glassF = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.4, 0.95, 0.015),
      M.glassPane,
      upper.length,
    );
    upper.forEach((s, i) => {
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(s.x, s.y - 0.02, -0.82);
      dummy.updateMatrix();
      slabs.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x, s.y + 0.55, -1.42);
      dummy.updateMatrix();
      glassF.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x, s.y + 1.05, -1.42);
      dummy.updateMatrix();
      rails.setMatrixAt(i * 3, dummy.matrix);
      for (const side of [0, 1]) {
        dummy.position.set(s.x + (side ? 1.23 : -1.23), s.y + 1.05, -0.82);
        dummy.rotation.set(0, Math.PI / 2, 0);
        dummy.scale.set(0.48, 1, 1);
        dummy.updateMatrix();
        rails.setMatrixAt(i * 3 + 1 + side, dummy.matrix);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(0, 0, 0);
      }
    });
    slabs.castShadow = rails.castShadow = true;
    slabs.receiveShadow = true;
    scene.add(slabs, rails, glassF);

    // wall sconces between the ground-floor doors
    const sconceMat = emissive("#ffc985", 2.6);
    const sconces = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.32, 0.07),
      sconceMat,
      7,
    );
    for (let k = -3; k <= 3; k++) {
      dummy.position.set(4 * k - 1.18, 2.45, -0.24);
      dummy.updateMatrix();
      sconces.setMatrixAt(k + 3, dummy.matrix);
    }
    scene.add(sconces);
    for (const x of high ? [-1.18, 2.82] : [-1.18]) {
      const l = new THREE.PointLight("#ffbf7a", 1.4, 9, 2);
      l.position.set(x, 2.3, -0.75);
      scene.add(l);
    }
  }

  // --- terrace of the room: table, two chairs, planters ---
  {
    B.add(
      M.alu,
      new THREE.CylinderGeometry(0.33, 0.33, 0.025, 28),
      T(-1.05, 0.72, -0.95),
    );
    B.add(
      M.alu,
      new THREE.CylinderGeometry(0.025, 0.025, 0.7, 10),
      T(-1.05, 0.36, -0.95),
    );
    B.add(
      M.alu,
      new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20),
      T(-1.05, 0.01, -0.95),
    );
    for (const [x, ry] of [
      [-1.6, Math.PI / 2],
      [-0.5, -Math.PI / 2],
    ] as const) {
      const m = T(x, 0, -0.95, 0, ry);
      const part = (g: THREE.BufferGeometry, mm: THREE.Matrix4) =>
        B.add(M.loungerFrame, g, m.clone().multiply(mm));
      part(new RoundedBoxGeometry(0.46, 0.04, 0.44, 2, 0.015), T(0, 0.45, 0));
      part(
        new RoundedBoxGeometry(0.46, 0.4, 0.035, 2, 0.015),
        T(0, 0.67, 0.22, -0.18),
      );
      for (const [lx, lz] of [
        [-0.2, -0.19],
        [0.2, -0.19],
        [-0.2, 0.19],
        [0.2, 0.19],
      ] as const)
        part(
          new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8),
          T(lx, 0.225, lz),
        );
    }
    ctx.wall(-1.75, -1.35, -0.4, -0.55);
    for (const x0 of [-2.45, 1.95]) {
      B.box(M.cap, x0, 0, -1.9, x0 + 0.5, 0.45, -0.2, 1);
      B.box(M.soil, x0 + 0.04, 0.45, -1.86, x0 + 0.46, 0.46, -0.24, 1);
      ctx.wall(x0, -1.9, x0 + 0.5, -0.2);
    }
  }

  // --- deck, pool shape ---
  const ctrl = [
    [-6.5, -8.6],
    [-3.5, -7.7],
    [0, -8.3],
    [3.2, -7.6],
    [6.2, -8.5],
    [7.4, -11.2],
    [5.7, -13.4],
    [2.3, -13.0],
    [-0.5, -14.6],
    [-4.2, -15.0],
    [-7.0, -13.3],
    [-7.8, -10.6],
  ].map(([x, z]) => v3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(ctrl, true, "centripetal");
  const NP = 180;
  const poly = curve
    .getSpacedPoints(NP)
    .slice(0, NP)
    .map((p) => new THREE.Vector2(p.x, p.z));
  const outward = poly.map((p, i) => {
    const a = poly[(i - 1 + NP) % NP]!;
    const b = poly[(i + 1) % NP]!;
    const n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
    if (insidePoly(poly, p.x + n.x * 0.05, p.y + n.y * 0.05)) n.negate();
    return n;
  });
  const LEVEL = -0.12;
  const DEPTH = -1.35;
  const COPE = 0.4;

  {
    const outline = new THREE.Shape([
      new THREE.Vector2(-14.8, 0),
      new THREE.Vector2(14.8, 0),
      new THREE.Vector2(14.8, 25),
      new THREE.Vector2(-14.8, 25),
    ]);
    outline.holes.push(
      new THREE.Path(poly.map((p) => new THREE.Vector2(p.x, -p.y))),
    );
    const g = new THREE.ShapeGeometry(outline, 1);
    g.rotateX(-Math.PI / 2);
    B.add(M.deck, g, undefined, 2.4);
  }

  // coping: top strip and the lip down to the water
  {
    const t = new Tris();
    let per = 0;
    for (let i = 0; i < NP; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % NP]!;
      const na = outward[i]!;
      const nb = outward[(i + 1) % NP]!;
      const seg = a.distanceTo(b);
      const A = v3(a.x, 0.03, a.y);
      const Bv = v3(b.x, 0.03, b.y);
      const Ao = v3(a.x + na.x * COPE, 0.03, a.y + na.y * COPE);
      const Bo = v3(b.x + nb.x * COPE, 0.03, b.y + nb.y * COPE);
      t.quad(A, Bv, Bo, Ao, v3(0, 1, 0), [
        [per, 0],
        [per + seg, 0],
        [per + seg, COPE],
        [per, COPE],
      ]);
      const inA = v3(-na.x, 0, -na.y);
      const inB = v3(-nb.x, 0, -nb.y);
      t.quad(
        v3(a.x, LEVEL - 0.03, a.y),
        v3(b.x, LEVEL - 0.03, b.y),
        Bv,
        A,
        inA.clone().add(inB).normalize(),
        [
          [per, 0],
          [per + seg, 0],
          [per + seg, 0.18],
          [per, 0.18],
        ],
      );
      t.quad(
        Ao,
        Bo,
        Bo.clone().setY(0),
        Ao.clone().setY(0),
        v3(na.x, 0, na.y),
        undefined,
      );
      per += seg;
    }
    const m = new THREE.Mesh(t.geometry(), M.coping);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
  }

  // basin (walls + floor) with mosaic tiles, lamps and caustics
  const lampPos: THREE.Vector3[] = [];
  for (let k = 0; k < 7; k++) {
    const i = Math.floor((k / 7) * NP + 6);
    const p = poly[i % NP]!;
    const n = outward[i % NP]!;
    lampPos.push(v3(p.x - n.x * 0.03, -0.62, p.y - n.y * 0.03));
  }
  const basinMat = basinMaterial(lampPos, LEVEL);
  {
    const t = new Tris();
    let per = 0;
    for (let i = 0; i < NP; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % NP]!;
      const seg = a.distanceTo(b);
      const na = outward[i]!;
      const nb = outward[(i + 1) % NP]!;
      const inA = v3(-na.x, 0, -na.y);
      const inB = v3(-nb.x, 0, -nb.y);
      t.quad(
        v3(a.x, DEPTH, a.y),
        v3(b.x, DEPTH, b.y),
        v3(b.x, LEVEL - 0.02, b.y),
        v3(a.x, LEVEL - 0.02, a.y),
        inA.clone().add(inB).normalize(),
        [
          [per, DEPTH],
          [per + seg, DEPTH],
          [per + seg, LEVEL],
          [per, LEVEL],
        ],
        [inA, inB, inB, inA],
      );
      per += seg;
    }
    const wallGeo = t.geometry();
    const floorShape = new THREE.Shape(
      poly.map((p) => new THREE.Vector2(p.x, -p.y)),
    );
    const fg = new THREE.ShapeGeometry(floorShape, 1);
    fg.rotateX(-Math.PI / 2);
    fg.translate(0, DEPTH, 0);
    const fuv = fg.getAttribute("position");
    const uvs = new Float32Array(fuv.count * 2);
    for (let i = 0; i < fuv.count; i++) {
      uvs[i * 2] = fuv.getX(i);
      uvs[i * 2 + 1] = fuv.getZ(i);
    }
    fg.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    const basin = new THREE.Mesh(
      mergeGeometries([flat(wallGeo), flat(fg)]),
      basinMat,
    );
    scene.add(basin);
    // underwater lamp fixtures (they bloom through the water)
    const lampMat = emissive("#d9fbff", 3.2);
    for (let k = 0; k < lampPos.length; k++) {
      const p = lampPos[k]!;
      const i = Math.floor((k / 7) * NP + 6) % NP;
      const n = outward[i]!;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), lampMat);
      disc.position.copy(p);
      disc.lookAt(p.x - n.x, p.y, p.z - n.y);
      scene.add(disc);
    }
  }

  // water surface
  const specLights = [
    v3(-1.18, 2.45, -0.3),
    v3(2.82, 2.45, -0.3),
    v3(0, 8.5, -0.6),
    v3(9.6, 2.3, -18.6),
    v3(-9, 6.5, -5.2),
    v3(12.6, 7.5, -13.2),
    v3(-40, 50, -100),
    v3(4, 3.0, -3.3),
  ];
  const specCols = [
    new THREE.Color(1, 0.75, 0.45),
    new THREE.Color(1, 0.75, 0.45),
    new THREE.Color(0.45, 0.42, 0.36),
    new THREE.Color(1, 0.7, 0.35),
    new THREE.Color(1, 0.85, 0.6),
    new THREE.Color(1, 0.85, 0.6),
    new THREE.Color(0.5, 0.55, 0.7),
    new THREE.Color(1, 0.75, 0.4),
  ];
  const waterMat = waterMaterial(specLights, specCols);
  {
    const shape = new THREE.Shape(
      poly.map((p) => new THREE.Vector2(p.x, -p.y)),
    );
    const g = new THREE.ShapeGeometry(shape, 1);
    g.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(g, waterMat);
    w.position.y = LEVEL;
    w.renderOrder = 1;
    scene.add(w);
  }
  // keep the player out of the water: vertical slices of the pool
  {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }
    const step = 0.3;
    for (let x = minX; x < maxX; x += step) {
      const xm = x + step / 2;
      const zs: number[] = [];
      for (let i = 0; i < NP; i++) {
        const a = poly[i]!;
        const b = poly[(i + 1) % NP]!;
        if (a.x <= xm !== b.x <= xm)
          zs.push(a.y + ((xm - a.x) / (b.x - a.x)) * (b.y - a.y));
      }
      zs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < zs.length; k += 2) {
        const z0 = zs[k]! + 0.12;
        const z1 = zs[k + 1]! - 0.12;
        if (z1 > z0) ctx.wall(x + 0.08, z0, x + step - 0.08, z1);
      }
    }
  }
  const nearEdgeZ = (x: number) => {
    let best = -Infinity;
    for (let i = 0; i < NP; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % NP]!;
      if (a.x <= x !== b.x <= x)
        best = Math.max(best, a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
    }
    return best;
  };

  // pool ladder
  {
    const x = -3.4;
    const ez = nearEdgeZ(x);
    for (const dx of [-0.25, 0.25]) {
      const path = new THREE.CatmullRomCurve3([
        v3(x + dx, 0.03, ez + 0.35),
        v3(x + dx, 0.75, ez + 0.3),
        v3(x + dx, 0.85, ez + 0.05),
        v3(x + dx, 0.6, ez - 0.12),
        v3(x + dx, -0.9, ez - 0.14),
      ]);
      B.add(M.chrome, new THREE.TubeGeometry(path, 30, 0.022, 8, false));
    }
    for (const y of [-0.4, -0.7])
      B.box(M.chrome, x - 0.25, y, ez - 0.2, x + 0.25, y + 0.02, ez - 0.08);
  }

  // depth markers on the coping
  {
    const tex = textTexture("1,30 m", 256, 96, "bold 56px Arial", "#1d4f8a");
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.5,
    });
    for (const i of [10, 70, 120]) {
      const p = poly[i]!;
      const n = outward[i]!;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.11), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.atan2(n.x, -n.y) + Math.PI;
      m.position.set(p.x + n.x * 0.2, 0.032, p.y + n.y * 0.2);
      scene.add(m);
    }
  }

  // pink inflatable ring floating
  {
    const g = new THREE.TorusGeometry(0.42, 0.15, 20, 48);
    const p = g.getAttribute("position");
    const col = new Float32Array(p.count * 3);
    const pinkC = new THREE.Color("#ff6fa8");
    const whiteC = new THREE.Color("#fff3f7");
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getY(i), p.getX(i));
      const c =
        Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2 ? pinkC : whiteC;
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const ring = new THREE.Mesh(
      g,
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.22,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.castShadow = true;
    scene.add(ring);
    updates.push((t) => {
      ring.position.set(
        0.6 + Math.sin(t * 0.07) * 1.2,
        LEVEL + 0.05 + Math.sin(t * 1.3) * 0.012,
        -11.6 + Math.cos(t * 0.05) * 0.7,
      );
      ring.rotation.z = t * 0.05;
      ring.rotation.y = Math.sin(t * 1.1) * 0.03;
    });
  }

  // steam over the warm water
  const steamMat = steamMaterial();
  {
    const n = high ? 280 : 130;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    let k = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }
    while (k < n) {
      const x = minX + rand() * (maxX - minX);
      const z = minZ + rand() * (maxZ - minZ);
      if (!insidePoly(poly, x, z)) continue;
      pos.set([x, LEVEL + 0.05, z], k * 3);
      seed[k] = rand();
      k++;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(g, steamMat);
    pts.renderOrder = 2;
    pts.frustumCulled = false;
    scene.add(pts);
  }

  // pool lights: the turquoise glow on the deck and on people
  for (const [x, z] of high
    ? [
        [-4.6, -10.4],
        [4.6, -11.2],
      ]
    : [[0, -10.5]]) {
    const l = new THREE.PointLight("#43d6e0", high ? 8 : 12, 14, 2);
    l.position.set(x!, 0.5, z!);
    scene.add(l);
  }

  // --- garden walls, hedges, planting beds ---
  const hedges: {
    cx: number;
    cz: number;
    w: number;
    d: number;
    h: number;
    face: THREE.Vector3;
  }[] = [];
  {
    B.box(M.gardenWall, -15.1, 0, -25.3, -14.8, 2.6, -0.2, 3);
    B.box(M.gardenWall, 14.8, 0, -25.3, 15.1, 2.6, -0.2, 3);
    B.box(M.gardenWall, -15.1, 0, -25.3, 15.1, 2.6, -25, 3);
    B.box(M.cap, -15.2, 2.6, -25.4, -14.7, 2.7, -0.2, 1);
    B.box(M.cap, 14.7, 2.6, -25.4, 15.2, 2.7, -0.2, 1);
    B.box(M.cap, -15.2, 2.6, -25.4, 15.2, 2.7, -24.9, 1);
    ctx.wall(-15.5, -26, -13.6, 0);
    ctx.wall(13.6, -26, 15.5, 0);
    ctx.wall(-15.5, -26, 15.5, -23.6);
    const hedge = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      face: THREE.Vector3,
    ) => {
      const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const len = along ? x1 - x0 : z1 - z0;
      const n = Math.max(1, Math.round(len / 1.8));
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const hgt = 1.0 + rand() * 0.45;
        const cx = along ? x0 + (x1 - x0) * (t0 + t1) * 0.5 : (x0 + x1) / 2;
        const cz = along ? (z0 + z1) / 2 : z0 + (z1 - z0) * (t0 + t1) * 0.5;
        const w = along ? (len / n) * 1.12 : Math.abs(x1 - x0);
        const d = along ? Math.abs(z1 - z0) : (len / n) * 1.12;
        B.rbox(
          M.hedge,
          w,
          hgt,
          d,
          0.3,
          T(cx, hgt / 2, cz, 0, (rand() - 0.5) * 0.06),
          1,
        );
        hedges.push({ cx, cz, w, d, h: hgt, face });
      }
    };
    hedge(-14.8, -23.6, -13.6, -2.4, v3(1, 0, 0));
    hedge(13.6, -23.6, 14.8, -2.4, v3(-1, 0, 0));
    hedge(-13.6, -24.8, 13.6, -23.6, v3(0, 0, 1));
  }

  // --- "Hot Springs" backlit letters on the far wall ---
  {
    const tex = textTexture(
      "Hot Springs",
      1024,
      220,
      "italic bold 150px Georgia, serif",
      "#ffffff",
    );
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.73),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        color: new THREE.Color(2.4, 1.9, 1.3),
        fog: false,
      }),
    );
    sign.position.set(-0.8, 2.05, -24.97);
    scene.add(sign);
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(3.9, 0.9),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.12, 0.07, 0.03),
        transparent: true,
        opacity: 0.6,
      }),
    );
    back.position.set(-0.8, 2.05, -24.985);
    scene.add(back);
  }

  // --- loungers ---
  type Lounger = { x: number; z: number; yaw: number };
  const loungers: Lounger[] = [
    ...[-7.4, -5.8, -4.2, 3.4, 4.8].map((x) => ({ x, z: -4.6, yaw: 0 })),
    ...[-9.0, -10.6, -12.2, -13.8].map((z) => ({ x: -10.6, z, yaw: -90 })),
    ...[-8.0, -9.6, -11.2].map((z) => ({ x: 10.0, z, yaw: 90 })),
    ...[-6.4, -4.8, -3.2, -1.6].map((x) => ({ x, z: -17.6, yaw: 180 })),
  ];
  {
    const frameParts: THREE.BufferGeometry[] = [];
    const cushionParts: THREE.BufferGeometry[] = [];
    const fp = (g: THREE.BufferGeometry, m: THREE.Matrix4) =>
      frameParts.push(flat(g).applyMatrix4(m));
    const cp = (g: THREE.BufferGeometry, m: THREE.Matrix4) =>
      cushionParts.push(flat(g).applyMatrix4(m));
    fp(new RoundedBoxGeometry(0.7, 0.05, 1.32, 2, 0.02), T(0, 0.32, -0.32));
    for (const x of [-0.33, 0.33])
      fp(new RoundedBoxGeometry(0.05, 0.08, 1.95, 2, 0.02), T(x, 0.29, -0.02));
    fp(
      new RoundedBoxGeometry(0.7, 0.05, 0.78, 2, 0.02),
      T(0, 0.35 + Math.sin(0.85) * 0.39, 0.33 + Math.cos(0.85) * 0.39, -0.85),
    );
    for (const [x, z] of [
      [-0.31, -0.9],
      [0.31, -0.9],
      [-0.31, 0.85],
      [0.31, 0.85],
    ]) {
      fp(new THREE.BoxGeometry(0.05, 0.28, 0.05), T(x!, 0.14, z!));
    }
    cp(new RoundedBoxGeometry(0.64, 0.07, 1.28, 2, 0.03), T(0, 0.38, -0.32));
    cp(
      new RoundedBoxGeometry(0.64, 0.07, 0.74, 2, 0.03),
      T(0, 0.4 + Math.sin(0.85) * 0.37, 0.36 + Math.cos(0.85) * 0.37, -0.85),
    );
    const fg = mergeGeometries(frameParts);
    const cg = mergeGeometries(cushionParts);
    const fi = new THREE.InstancedMesh(fg, M.loungerFrame, loungers.length);
    const ci = new THREE.InstancedMesh(cg, M.cushion, loungers.length);
    const towels = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.5, 14),
      new THREE.MeshStandardMaterial({ color: "#f7f5ef", roughness: 0.95 }),
      loungers.length,
    );
    const dummy = new THREE.Object3D();
    let nt = 0;
    loungers.forEach((l, i) => {
      dummy.position.set(l.x, 0, l.z);
      dummy.rotation.set(0, D(l.yaw), 0);
      dummy.updateMatrix();
      fi.setMatrixAt(i, dummy.matrix);
      ci.setMatrixAt(i, dummy.matrix);
      if (i % 3 !== 1) {
        const m = dummy.matrix
          .clone()
          .multiply(T(0, 0.48, -0.75, 0, 0, Math.PI / 2));
        towels.setMatrixAt(nt++, m);
      }
      const hx = l.yaw === 0 || l.yaw === 180 ? 0.36 : 1.0;
      const hz = l.yaw === 0 || l.yaw === 180 ? 1.0 : 0.36;
      ctx.wall(l.x - hx, l.z - hz, l.x + hx, l.z + hz);
    });
    towels.count = nt;
    for (const m of [fi, ci, towels]) {
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    }
  }

  // --- closed umbrellas ---
  for (const [x, z] of [
    [-5.0, -3.9],
    [4.1, -3.9],
    [-10.6, -11.4],
    [-4.0, -18.4],
    [10.0, -10.4],
  ] as const) {
    B.add(
      M.white,
      new THREE.CylinderGeometry(0.22, 0.25, 0.08, 20),
      T(x, 0.04, z),
    );
    B.add(M.alu, new THREE.CylinderGeometry(0.02, 0.02, 2.5, 8), T(x, 1.25, z));
    B.add(
      M.cushion,
      new THREE.CylinderGeometry(0.03, 0.13, 1.4, 12),
      T(x, 1.75, z),
    );
    B.add(M.alu, new THREE.SphereGeometry(0.035, 8, 6), T(x, 2.5, z));
    ctx.wall(x - 0.15, z - 0.15, x + 0.15, z + 0.15);
  }

  // --- palms ---
  const palms: [number, number, number, number][] = [
    [-9.0, -5.2, 7.2, 0.5],
    [-12.6, -11.5, 8.4, 0.7],
    [-9.6, -18.8, 6.6, 0.4],
    [-4.0, -21.6, 8.8, 0.6],
    [2.0, -22.4, 7.4, 0.5],
    [12.6, -13.6, 8.2, 0.8],
    [12.2, -4.2, 6.4, 0.5],
    [6.6, -3.0, 5.8, 0.4],
    [-2.4, -3.4, 6.2, 0.35],
    [-12.8, -22.6, 7.8, 0.6],
    [12.9, -22.9, 6.8, 0.5],
    [9.4, -6.2, 7.0, 0.6],
  ];
  const palmTops: THREE.Vector3[] = [];
  {
    const trunks: THREE.BufferGeometry[] = [];
    const boots: THREE.BufferGeometry[] = [];
    const frond = frondGeometry();
    const per = high ? 17 : 12;
    const fronds = new THREE.InstancedMesh(
      frond,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.75,
      }),
      palms.length * per,
    );
    const dummy = new THREE.Object3D();
    dummy.rotation.order = "YZX";
    let n = 0;
    palms.forEach(([x, z, h, lean], pi) => {
      const toPool = Math.atan2(0 - x, -11 - z);
      const { geo, top } = trunkGeometry(
        h,
        lean,
        toPool + (rand() - 0.5) * 0.8,
      );
      geo.translate(x, 0, z);
      trunks.push(geo);
      const tp = top.clone().add(v3(x, 0, z));
      palmTops.push(tp);
      boots.push(
        flat(new THREE.CylinderGeometry(0.13, 0.2, 0.55, 12)).applyMatrix4(
          T(tp.x, tp.y - 0.05, tp.z),
        ),
      );
      for (let c = 0; c < 4; c++) {
        const a = c * 1.7 + pi;
        boots.push(
          flat(new THREE.SphereGeometry(0.09, 10, 8)).applyMatrix4(
            T(tp.x + Math.cos(a) * 0.17, tp.y - 0.2, tp.z + Math.sin(a) * 0.17),
          ),
        );
      }
      for (let f = 0; f < per; f++) {
        const yaw = (f / per) * Math.PI * 2 + rand() * 0.4 + pi;
        const tier = f % 3;
        const pitch =
          tier === 0
            ? 0.55 + rand() * 0.25
            : tier === 1
              ? 0.15 + rand() * 0.2
              : -0.25 + rand() * 0.2;
        dummy.position.copy(tp).add(v3(0, 0.15, 0));
        dummy.rotation.set(rand() * 0.3 - 0.15, yaw, pitch);
        const s = 0.8 + rand() * 0.35;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        fronds.setMatrixAt(n, dummy.matrix);
        const tone = tier === 2 ? 0.8 + rand() * 0.15 : 0.95 + rand() * 0.15;
        fronds.setColorAt(
          n,
          new THREE.Color(tone * (tier === 2 ? 1.1 : 1), tone, tone * 0.9),
        );
        n++;
      }
      ctx.wall(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
    });
    fronds.castShadow = true;
    fronds.receiveShadow = true;
    scene.add(fronds);
    const tm = new THREE.Mesh(mergeGeometries(trunks.map(flat)), M.bark);
    tm.castShadow = tm.receiveShadow = true;
    scene.add(tm);
    const bm = new THREE.Mesh(
      mergeGeometries(boots),
      new THREE.MeshStandardMaterial({ color: "#4a4a28", roughness: 0.85 }),
    );
    bm.castShadow = true;
    scene.add(bm);
    // ground uplights at the palms (warm, from below)
    const upIdx = high ? [0, 5, 8, 11] : [8];
    const capMat = emissive("#ffd9a0", 5);
    palms.forEach(([x, z], i) => {
      const toPool = Math.atan2(0 - x, -11 - z);
      const lx = x + Math.sin(toPool) * 0.6;
      const lz = z + Math.cos(toPool) * 0.6;
      B.add(
        M.bronze,
        new THREE.CylinderGeometry(0.07, 0.08, 0.1, 12),
        T(lx, 0.05, lz),
      );
      const cap = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), capMat);
      cap.rotation.x = -Math.PI / 2;
      cap.position.set(lx, 0.102, lz);
      scene.add(cap);
      if (upIdx.includes(i)) {
        const s = new THREE.SpotLight("#ffcf94", 30, 14, D(22), 0.6, 2);
        s.position.set(lx, 0.15, lz);
        const tp = palmTops[i]!;
        s.target.position.set(tp.x, tp.y, tp.z);
        scene.add(s, s.target);
      }
    });
  }

  // --- leafy plants in the beds and planters (instanced leaves) ---
  {
    const clumps: THREE.Vector3[] = [];
    for (let z = -21.5; z < -3; z += 2.4) {
      clumps.push(v3(-13.3, 0, z + rand()));
      if (z > -14 || z < -22) clumps.push(v3(13.3, 0, z + rand()));
    }
    for (let x = -12; x < 13; x += 2.6) clumps.push(v3(x + rand(), 0, -23.3));
    clumps.push(
      v3(-2.2, 0.45, -1.05),
      v3(2.2, 0.45, -1.05),
      v3(-2.2, 0.45, -0.5),
      v3(2.2, 0.45, -0.5),
    );
    const per = high ? 26 : 16;
    const density = high ? 16 : 7;
    let hedgeLeaves = 0;
    for (const h of hedges)
      hedgeLeaves += Math.round(
        (h.w * h.d + (h.face.x ? h.d : h.w) * h.h) * density,
      );
    const leaves = new THREE.InstancedMesh(
      leafGeometry(),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        roughness: 0.7,
      }),
      clumps.length * per + hedgeLeaves,
    );
    const dummy = new THREE.Object3D();
    let n = 0;
    for (const c of clumps) {
      const big = 0.9 + rand() * 0.7;
      for (let i = 0; i < per; i++) {
        dummy.position.set(
          c.x + (rand() - 0.5) * 0.25,
          c.y + rand() * 0.1,
          c.z + (rand() - 0.5) * 0.25,
        );
        dummy.rotation.set(-0.2 - rand() * 0.9, rand() * Math.PI * 2, 0, "YXZ");
        const s = big * (0.7 + rand() * 0.6);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        leaves.setMatrixAt(n, dummy.matrix);
        const g = 0.12 + rand() * 0.12;
        leaves.setColorAt(n, new THREE.Color(g * 0.55, g * 1.35, g * 0.45));
        n++;
      }
    }
    // leaves over the hedges: their tops and the face toward the deck
    for (const h of hedges) {
      const count = Math.round(
        (h.w * h.d + (h.face.x ? h.d : h.w) * h.h) * density,
      );
      const topShare = (h.w * h.d) / (h.w * h.d + (h.face.x ? h.d : h.w) * h.h);
      for (let i = 0; i < count; i++) {
        if (rand() < topShare) {
          dummy.position.set(
            h.cx + (rand() - 0.5) * h.w * 0.95,
            h.h - 0.05,
            h.cz + (rand() - 0.5) * h.d * 0.95,
          );
          dummy.rotation.set(
            -0.3 - rand() * 0.7,
            rand() * Math.PI * 2,
            0,
            "YXZ",
          );
        } else {
          const along = (rand() - 0.5) * (h.face.x ? h.d : h.w) * 0.95;
          dummy.position.set(
            h.cx + h.face.x * (h.w / 2 - 0.08) + (h.face.x ? 0 : along),
            0.1 + rand() * (h.h - 0.2),
            h.cz + h.face.z * (h.d / 2 - 0.08) + (h.face.z ? 0 : along),
          );
          dummy.rotation.set(
            -rand() * 0.8 + 0.2,
            Math.atan2(h.face.x, h.face.z) + (rand() - 0.5) * 1.6,
            0,
            "YXZ",
          );
        }
        const s = 0.45 + rand() * 0.35;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        leaves.setMatrixAt(n, dummy.matrix);
        const g = 0.08 + rand() * 0.1;
        leaves.setColorAt(n, new THREE.Color(g * 0.5, g * 1.3, g * 0.4));
        n++;
      }
    }
    leaves.count = n;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    scene.add(leaves);
  }

  // --- bollard lights along the beds ---
  {
    const spots: [number, number][] = [];
    for (let z = -21; z < -3; z += 4) spots.push([-13.4, z], [13.4, z]);
    for (let x = -10; x <= 10; x += 5) spots.push([x, -23.3]);
    const body = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.55, 12),
      M.bronze,
      spots.length,
    );
    const glow = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.08, 12),
      emissive("#ffd7a0", 4),
      spots.length,
    );
    const dummy = new THREE.Object3D();
    spots.forEach(([x, z], i) => {
      dummy.position.set(x, 0.275, z);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 0.5, z);
      dummy.updateMatrix();
      glow.setMatrixAt(i, dummy.matrix);
    });
    body.castShadow = true;
    scene.add(body, glow);
  }

  // --- the thatched kiosk bar ---
  const K = v3(9.6, 0, -18.6);
  const toPoolDir = new THREE.Vector2(0 - K.x, -11 - K.z).normalize();
  {
    const thatch = thatchTexture();
    const roofTex = thatch.clone();
    roofTex.repeat.set(9, 2.2);
    roofTex.needsUpdate = true;
    const roofMat = new THREE.MeshStandardMaterial({
      map: roofTex,
      bumpMap: roofTex,
      bumpScale: 4,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 2.0, 48, 6, true),
      roofMat,
    );
    roof.position.set(K.x, 2.65 + 1.0, K.z);
    roof.castShadow = roof.receiveShadow = true;
    scene.add(roof);
    const fg = new THREE.CylinderGeometry(3.4, 3.5, 0.38, 96, 1, true);
    const fp = fg.getAttribute("position");
    const fr = seeded(7);
    for (let i = 0; i < fp.count; i++)
      if (fp.getY(i) < 0) fp.setY(i, fp.getY(i) - fr() * 0.14);
    fg.computeVertexNormals();
    const fringeTex = thatch.clone();
    fringeTex.repeat.set(18, 0.35);
    fringeTex.needsUpdate = true;
    const fringe = new THREE.Mesh(
      fg,
      new THREE.MeshStandardMaterial({
        map: fringeTex,
        bumpMap: fringeTex,
        bumpScale: 3,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    fringe.position.set(K.x, 2.65 - 0.16, K.z);
    fringe.castShadow = true;
    scene.add(fringe);
    B.add(M.woodDark, new THREE.SphereGeometry(0.16, 12, 8), T(K.x, 4.68, K.z));
    // posts, ring beam, rafters
    const logMat = M.bark;
    for (let i = 0; i < 6; i++) {
      const a =
        (i / 6) * Math.PI * 2 +
        Math.atan2(toPoolDir.y, toPoolDir.x) +
        Math.PI / 6;
      const px = K.x + Math.cos(a) * 2.45;
      const pz = K.z + Math.sin(a) * 2.45;
      B.add(
        logMat,
        new THREE.CylinderGeometry(0.09, 0.11, 2.7, 12),
        T(px, 1.35, pz),
      );
      ctx.wall(px - 0.13, pz - 0.13, px + 0.13, pz + 0.13);
    }
    B.add(
      M.woodDark,
      new THREE.TorusGeometry(2.45, 0.07, 8, 60),
      T(K.x, 2.62, K.z, Math.PI / 2),
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p0 = v3(K.x + Math.cos(a) * 3.2, 2.7, K.z + Math.sin(a) * 3.2);
      const p1 = v3(K.x, 4.5, K.z);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const len = p0.distanceTo(p1);
      const geo = new THREE.CylinderGeometry(0.04, 0.05, len, 6);
      geo.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          v3(0, 1, 0),
          p1.clone().sub(p0).normalize(),
        ),
      );
      B.add(M.woodDark, geo, T(mid.x, mid.y - 0.1, mid.z));
    }
    // round wooden platform
    B.add(
      M.deckWood,
      new THREE.CylinderGeometry(2.7, 2.75, 0.08, 48),
      T(K.x, 0.04, K.z),
      1.2,
    );
    // bar counter: an annulus with a gap for the bartender (away from the pool)
    const poolA = Math.atan2(-toPoolDir.y, toPoolDir.x); // angle in shape space (x, -z)
    const gapA = poolA + Math.PI;
    const a0 = gapA + D(35);
    const a1 = gapA + D(325);
    const sector = (r1: number, r2: number) => {
      const s = new THREE.Shape();
      s.absarc(0, 0, r2, a0, a1, false);
      s.absarc(0, 0, r1, a1, a0, true);
      s.closePath();
      return s;
    };
    const body = new THREE.ExtrudeGeometry(sector(1.3, 1.6), {
      depth: 1.0,
      bevelEnabled: false,
      curveSegments: 64,
    });
    body.rotateX(-Math.PI / 2);
    B.add(M.wood, body, T(K.x, 0.08, K.z), 0.5, true);
    const topG = new THREE.ExtrudeGeometry(sector(1.22, 1.72), {
      depth: 0.06,
      bevelEnabled: false,
      curveSegments: 64,
    });
    topG.rotateX(-Math.PI / 2);
    B.add(M.granite, topG, T(K.x, 1.08, K.z));
    const counterTop = 1.14;
    // under-counter LED glow
    const arc: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const a = a0 + ((a1 - a0) * i) / 80;
      arc.push(v3(K.x + Math.cos(a) * 1.66, 1.065, K.z - Math.sin(a) * 1.66));
    }
    scene.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(arc),
          120,
          0.012,
          5,
          false,
        ),
        emissive("#ffb05c", 3.5),
      ),
    );
    // back bar: central column with shelves of bottles
    B.add(
      M.woodDark,
      new THREE.CylinderGeometry(0.22, 0.25, 4.1, 16),
      T(K.x, 2.1, K.z),
    );
    for (const y of [1.25, 1.62])
      B.add(
        M.woodDark,
        new THREE.CylinderGeometry(0.62, 0.62, 0.03, 28),
        T(K.x, y, K.z),
      );
    const bottleGeo = new THREE.LatheGeometry(
      [
        v3(0.001, 0),
        v3(0.034, 0),
        v3(0.036, 0.02),
        v3(0.036, 0.17),
        v3(0.03, 0.2),
        v3(0.013, 0.23),
        v3(0.012, 0.29),
        v3(0.001, 0.29),
      ].map((p) => new THREE.Vector2(p.x, p.y)),
      12,
    );
    const nb = 32;
    const bottles = new THREE.InstancedMesh(
      bottleGeo,
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
      nb,
    );
    const palette = [
      "#6b3b12",
      "#2f5a2a",
      "#d8e4e0",
      "#8a1f1f",
      "#2b4b7a",
      "#c9852a",
    ];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < nb; i++) {
      const shelf = i < nb / 2 ? 1.265 : 1.635;
      const a = (i / (nb / 2)) * Math.PI * 2 + (i < nb / 2 ? 0 : 0.2);
      dummy.position.set(
        K.x + Math.cos(a) * 0.5,
        shelf,
        K.z + Math.sin(a) * 0.5,
      );
      dummy.updateMatrix();
      bottles.setMatrixAt(i, dummy.matrix);
      bottles.setColorAt(i, new THREE.Color(palette[i % palette.length]!));
    }
    scene.add(bottles);
    // glasses and a coconut drink on the counter
    for (let i = 0; i < 4; i++) {
      const a = Math.atan2(toPoolDir.y, toPoolDir.x) + 0.5 + i * 0.35;
      B.add(
        M.glassPane,
        new THREE.CylinderGeometry(0.035, 0.03, 0.12, 14),
        T(
          K.x + Math.cos(a) * 1.45,
          counterTop + 0.06,
          K.z + Math.sin(a) * 1.45,
        ),
      );
    }
    {
      const a = Math.atan2(toPoolDir.y, toPoolDir.x) - 0.45;
      B.add(
        M.bark,
        new THREE.SphereGeometry(0.1, 14, 10),
        T(
          K.x + Math.cos(a) * 1.45,
          counterTop + 0.09,
          K.z + Math.sin(a) * 1.45,
        ),
      );
      B.add(
        M.pink,
        new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6),
        T(
          K.x + Math.cos(a) * 1.45,
          counterTop + 0.22,
          K.z + Math.sin(a) * 1.45,
          0.3,
        ),
      );
    }
    // stools
    const stoolParts: THREE.BufferGeometry[] = [];
    stoolParts.push(
      flat(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20)).applyMatrix4(
        T(0, 0.75, 0),
      ),
    );
    for (let l = 0; l < 4; l++) {
      const a = (l / 4) * Math.PI * 2 + 0.785;
      stoolParts.push(
        flat(new THREE.CylinderGeometry(0.018, 0.022, 0.76, 8)).applyMatrix4(
          T(
            Math.cos(a) * 0.15,
            0.37,
            Math.sin(a) * 0.15,
            Math.sin(a) * 0.12,
            0,
            -Math.cos(a) * 0.12,
          ),
        ),
      );
    }
    stoolParts.push(
      flat(new THREE.TorusGeometry(0.15, 0.012, 6, 24)).applyMatrix4(
        T(0, 0.3, 0, Math.PI / 2),
      ),
    );
    const stoolAngles: number[] = [];
    const pa = Math.atan2(toPoolDir.y, toPoolDir.x);
    for (let i = -3; i <= 3; i++) stoolAngles.push(pa + i * 0.62);
    const stools = new THREE.InstancedMesh(
      mergeGeometries(stoolParts),
      M.woodDark,
      stoolAngles.length,
    );
    stoolAngles.forEach((a, i) => {
      dummy.position.set(
        K.x + Math.cos(a) * 2.0,
        0.08,
        K.z + Math.sin(a) * 2.0,
      );
      dummy.updateMatrix();
      stools.setMatrixAt(i, dummy.matrix);
    });
    stools.castShadow = true;
    scene.add(stools);
    // pendant bulbs
    const bulbMat = emissive("#ffb766", 9);
    for (let i = 0; i < 4; i++) {
      const a = pa + (i - 1.5) * 0.9;
      const bx = K.x + Math.cos(a) * 1.45;
      const bz = K.z + Math.sin(a) * 1.45;
      B.add(
        M.black,
        new THREE.CylinderGeometry(0.004, 0.004, 0.75, 4),
        T(bx, 2.8, bz),
      );
      B.add(
        M.bronze,
        new THREE.CylinderGeometry(0.02, 0.03, 0.06, 10),
        T(bx, 2.41, bz),
      );
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), bulbMat);
      b.position.set(bx, 2.34, bz);
      scene.add(b);
    }
    const kl = new THREE.PointLight("#ffaa5c", 9, 12, 2);
    kl.position.set(K.x + toPoolDir.x * 1.2, 2.25, K.z + toPoolDir.y * 1.2);
    scene.add(kl);
    // small chalk menu board on the column
    const menu = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.55),
      new THREE.MeshStandardMaterial({
        roughness: 0.9,
        map: canvasTex(200, 275, (g, w, h) => {
          g.fillStyle = "#1e2420";
          g.fillRect(0, 0, w, h);
          g.strokeStyle = "#8a6a3c";
          g.lineWidth = 10;
          g.strokeRect(0, 0, w, h);
          g.fillStyle = "#f2efe6";
          g.font = "bold 24px Georgia, serif";
          g.textAlign = "center";
          g.fillText("Drinks", w / 2, 42);
          g.font = "16px Georgia, serif";
          const items = [
            "Caipirinha 22",
            "Piña colada 26",
            "Água de coco 9",
            "Suco natural 12",
            "Chopp 14",
          ];
          items.forEach((s, i) => g.fillText(s, w / 2, 85 + i * 34));
        }),
      }),
    );
    menu.position.set(K.x + toPoolDir.x * 0.27, 2.1, K.z + toPoolDir.y * 0.27);
    menu.rotation.y = Math.atan2(toPoolDir.x, toPoolDir.y);
    scene.add(menu);
    ctx.wall(K.x - 1.72, K.z - 1.72, K.x + 1.72, K.z + 1.72);
    // the pack waits on the counter, facing the pool
    const pkA = Math.atan2(toPoolDir.y, toPoolDir.x);
    const pk = v3(
      K.x + Math.cos(pkA) * 1.47,
      counterTop,
      K.z + Math.sin(pkA) * 1.47,
    );
    ctx.pack(
      pk.x,
      pk.y,
      pk.z,
      THREE.MathUtils.radToDeg(Math.atan2(Math.cos(pkA), Math.sin(pkA))),
    );
  }

  // --- festoon string lights ---
  {
    const strings: [THREE.Vector3, THREE.Vector3, number][] = [
      [
        v3(K.x + toPoolDir.x * 3.3, 2.75, K.z + toPoolDir.y * 3.3),
        palmTops[5]!.clone().setY(3.6),
        0.45,
      ],
      [v3(K.x - 2.6, 2.75, K.z - 1.5), palmTops[4]!.clone().setY(3.4), 0.4],
      [palmTops[8]!.clone().setY(3.3), palmTops[7]!.clone().setY(3.3), 0.6],
      [palmTops[0]!.clone().setY(3.3), palmTops[8]!.clone().setY(3.3), 0.55],
      [palmTops[7]!.clone().setY(3.3), palmTops[11]!.clone().setY(3.5), 0.45],
    ];
    const bulbs: THREE.Vector3[] = [];
    for (const [a, b, sag] of strings) {
      const pts: THREE.Vector3[] = [];
      const n = Math.ceil(a.distanceTo(b) / 0.55);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = a.clone().lerp(b, t);
        p.y -= sag * 4 * t * (1 - t);
        pts.push(p);
        if (i > 0 && i < n) bulbs.push(p.clone().add(v3(0, -0.06, 0)));
      }
      B.add(
        M.black,
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          n * 2,
          0.006,
          4,
          false,
        ),
      );
    }
    const bm = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.028, 10, 6),
      emissive("#ffc070", 4),
      bulbs.length,
    );
    const dummy = new THREE.Object3D();
    bulbs.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.updateMatrix();
      bm.setMatrixAt(i, dummy.matrix);
    });
    scene.add(bm);
  }

  /* =====================================================================
   * SKY, DISTANT TOWERS, MAIN LIGHTS
   * ===================================================================== */
  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);
  {
    const moonTex = canvasTex(128, 128, (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, "rgba(255,250,235,1)");
      grd.addColorStop(0.18, "rgba(250,245,230,1)");
      grd.addColorStop(0.22, "rgba(200,210,240,0.35)");
      grd.addColorStop(1, "rgba(120,140,200,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    });
    const moon = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: moonTex,
        color: new THREE.Color(1.6, 1.6, 1.6),
        fog: false,
        depthWrite: false,
      }),
    );
    moon.position.set(-55, 70, -110);
    moon.scale.set(18, 18, 1);
    scene.add(moon);
  }
  // other hotel towers of Caldas Novas in the distance
  {
    const blink: THREE.Mesh[] = [];
    const tw = [
      [-52, -112, 14, 44, 10, 1],
      [10, -128, 18, 56, 12, 2],
      [66, -100, 12, 38, 12, 3],
      [-104, -62, 12, 34, 14, 4],
      [-20, -135, 12, 30, 10, 5],
    ] as const;
    for (const [x, z, w, h, d, s] of tw) {
      const tex = towerTexture(s * 13);
      tex.repeat.set(Math.round(w / 5), Math.round(h / 12));
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color(0.55, 0.55, 0.55),
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2 - 2, z);
      m.lookAt(0, h / 2 - 2, 0);
      scene.add(m);
      const red = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 8, 6),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.3, 0.2) }),
      );
      red.position.set(x, h - 1.6, z);
      scene.add(red);
      blink.push(red);
    }
    updates.push((t) =>
      blink.forEach((b, i) => (b.visible = Math.sin(t * 2.2 + i) > 0.2)),
    );
  }

  // moonlight + sky fill
  const hemi = new THREE.HemisphereLight("#2a3d66", "#0d0c0b", 0.35);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight("#9fb6ff", 0.12);
  moonLight.position.set(-30, 40, -60);
  scene.add(moonLight);

  // floodlight on the facade, over the pool (main shadow-casting light outside)
  {
    const s = new THREE.SpotLight(
      "#ffe2b8",
      high ? 130 : 150,
      40,
      D(36),
      0.7,
      2,
    );
    s.position.set(0, 8.6, -0.7);
    s.target.position.set(0, 0, -12);
    s.castShadow = true;
    s.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    s.shadow.bias = -0.0005;
    s.shadow.normalBias = 0.03;
    s.shadow.camera.near = 2;
    s.shadow.camera.far = 32;
    scene.add(s, s.target);
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.3),
      M.bronze,
    );
    fixture.position.set(0, 8.75, -0.45);
    scene.add(fixture);
    const lens = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.2),
      emissive("#fff1d6", 5),
    );
    lens.position.set(0, 8.62, -0.45);
    lens.rotation.x = Math.PI / 2 + 0.4;
    scene.add(lens);
  }

  B.flush(scene, [M.glassPane]);

  /* =====================================================================
   * PEOPLE, SPAWN, EXIT
   * ===================================================================== */
  const px = 0.9;
  const pz = nearEdgeZ(px) + 0.62;
  ctx.partner(
    px,
    pz,
    12,
    "stand",
    OUTFITS,
    ctx.player === "elena"
      ? "Primeira de muitas viagens. Promessa. ✈️"
      : "Bora pra piscina? Depois a gente volta pro quarto ver série 😄",
  );
  ctx.playerOutfit(OUTFITS);
  ctx.spawn(-0.2, 4.55, 0);
  ctx.exit(-0.2, 5.0, 0.6);

  ctx.onUpdate((t, dt) => {
    basinMat.uniforms.uTime!.value = t;
    waterMat.uniforms.uTime!.value = t;
    steamMat.uniforms.uTime!.value = t;
    skyMat.uniforms.uTime!.value = t;
    sky.position.copy(ctx.camera.position);
    const hgt = ctx.renderer.domElement.height;
    steamMat.uniforms.uScale!.value =
      hgt / (2 * Math.tan(D(ctx.camera.fov) / 2));
    for (const u of updates) u(t, dt);
  });
}

const scene: SceneModule = {
  id: "caldas",
  title: "Caldas Novas",
  build,
};

export default scene;
