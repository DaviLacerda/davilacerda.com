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
 * Caldas Novas (GO): the couple's first trip, at night, rebuilt from their
 * own photos. The aparthotel room (mirror selfies): entrance hall with the
 * full-length mirror on a blush wall and a tiled kitchenette with a granite
 * top, then the bedroom with taupe walls, a tray ceiling, the light-wood
 * headboard panel, the bed on a brown base, a sunflower panorama, and an
 * aluminium sliding window with sheer and beige curtains facing a lilac wall.
 * The room opens onto a covered walkway along the thermal pool; by the pool,
 * the grey-tiled block where they took the night selfie. The elevator at the
 * end of the walkway is the way out.
 *
 * Plan (meters): room x[-1.9, 1.9] z[0, 5.4], door in the front wall (z = 0)
 * at x[-0.45, 0.45]. Outside, the walkway is z[-2.45, -0.2], the deck spans
 * x[-15, 15] z[-25, -0.2] and the pool is centered near (0, -11).
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

function lightGranite() {
  const map = canvasTex(512, 512, (g, w, h) => {
    const rand = seeded(37);
    g.fillStyle = "#cfc8bc";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22000; i++) {
      const t = rand();
      g.fillStyle =
        t < 0.4
          ? "rgba(90,84,78,0.55)"
          : t < 0.75
            ? "rgba(160,150,138,0.6)"
            : t < 0.92
              ? "rgba(120,96,80,0.45)"
              : "rgba(250,248,244,0.8)";
      const s = 1 + rand() * 3;
      g.fillRect(rand() * w, rand() * h, s, s * (0.6 + rand() * 0.8));
    }
  });
  return new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0 });
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
  const updates: ((t: number, dt: number) => void)[] = [];

  scene.environmentIntensity = 0.16;
  scene.fog = new THREE.Fog("#0a1020", 40, 230);

  /* ---------- materials (colors taken from their photos) ---------- */
  const M = {
    floor: pbr(tiles("#cfcac1", "#b9b3a9", 4, 41, 0.28)),
    taupe: new THREE.MeshStandardMaterial({
      color: "#6c5f4f",
      roughness: 0.92,
    }),
    blush: new THREE.MeshStandardMaterial({ color: "#dcc8bd", roughness: 0.9 }),
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
    glassPane: new THREE.MeshStandardMaterial({
      color: "#9ab8bc",
      transparent: true,
      opacity: 0.14,
      roughness: 0.03,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    lilac: pbr(concrete("#8f7aa0", 33)),
    facade: new THREE.MeshStandardMaterial({
      color: "#e3d6c0",
      roughness: 0.88,
    }),
    slab: pbr(concrete("#d6d0c6", 34)),
    gardenWall: pbr(plaster("#d9cbb2", 10)),
    cap: pbr(concrete("#cfc6b6", 3)),
    deck: pbr(tiles("#c9c9c5", "#a7a7a3", 4, 31, 0.4)),
    coping: pbr(concrete("#ddd6ca", 5)),
    mosaic: pbr(tiles("#6c7177", "#9da1a5", 10, 61, 0.35)),
    terrazzo: lightGranite(),
    hedge: pbr(carpet("#2b4422", 77), {
      roughness: 0.95,
      normalScale: new THREE.Vector2(3, 3),
    }),
    loungerFrame: new THREE.MeshStandardMaterial({
      color: "#f1f0ec",
      roughness: 0.35,
    }),
    cushion: pbr(fabric("#f6f4ee", 24), { roughness: 0.95 }),
    bark: new THREE.MeshStandardMaterial({
      map: barkTexture(),
      roughness: 0.95,
    }),
  };
  M.bark.bumpMap = M.bark.map;
  M.bark.bumpScale = 3;

  /* =====================================================================
   * THE ROOM (as in their mirror selfies): entrance hall with the bathroom
   * on the left (full-length mirror on its blush wall) and a tiled
   * kitchenette on the right; then the bedroom with taupe walls, a tray
   * ceiling, the light-wood headboard panel, the bed with a brown base, the
   * sunflower panorama, and a sliding window with sheer + beige curtains.
   * Interior x[-1.9, 1.9] z[0, 5.4]; the entrance door is in the front wall
   * (z = 0) and opens onto the covered walkway along the pool.
   * ===================================================================== */
  const H = 2.65;
  const SOFFIT = 2.42;
  B.box(M.floor, -1.9, -0.05, 0, 1.9, 0, 5.4, 2.4);
  B.box(M.floor, -0.45, -0.05, -0.2, 0.45, 0, 0, 2.4);
  // tray ceiling: lowered band all around, recessed center over the bed area
  B.box(M.ceiling, -1.9, SOFFIT, 0, 1.9, SOFFIT + 0.05, 1.6);
  B.box(M.ceiling, -1.9, SOFFIT, 1.6, -1.45, H, 5.4);
  B.box(M.ceiling, 1.45, SOFFIT, 1.6, 1.9, H, 5.4);
  B.box(M.ceiling, -1.45, SOFFIT, 1.6, 1.45, H, 2.0);
  B.box(M.ceiling, -1.45, SOFFIT, 5.0, 1.45, H, 5.4);
  B.box(M.ceiling, -1.45, H, 2.0, 1.45, H + 0.05, 5.0);
  // walls
  B.box(M.taupe, -2.1, 0, 1.6, -1.9, H, 2.6);
  B.box(M.taupe, -2.1, 0, 3.8, -1.9, H, 5.6);
  B.box(M.taupe, -2.1, 0, 2.6, -1.9, 0.95, 3.8);
  B.box(M.taupe, -2.1, 2.2, 2.6, -1.9, H, 3.8);
  B.box(M.taupe, 1.9, 0, 1.6, 2.1, H, 5.6);
  B.box(M.blush, 1.9, 0, 0, 2.1, H, 1.6);
  B.box(M.taupe, -1.9, 0, 5.4, 1.9, H, 5.6);
  ctx.wall(-2.3, 0, -1.9, 5.7);
  ctx.wall(1.9, 0, 2.3, 5.7);
  ctx.wall(-2.3, 5.4, 2.3, 5.7);
  for (const [x0, z0, x1, z1] of [
    [-1.9, 1.6, -1.885, 5.4],
    [1.885, 1.6, 1.9, 5.4],
    [-0.6, 0.015, -0.585, 1.6],
  ] as const)
    B.box(M.white, x0, 0, z0, x1, 0.08, z1);

  // --- bathroom block (left of the entrance): blush walls, closed door, the mirror ---
  B.box(M.blush, -1.9, 0, 1.5, -0.6, SOFFIT, 1.6);
  B.box(M.blush, -0.7, 0, 0, -0.6, SOFFIT, 1.5);
  B.box(M.white, -0.6, 0, 0.35, -0.565, 2.05, 1.15);
  B.box(M.white, -0.6, 0, 0.29, -0.55, 2.11, 0.35);
  B.box(M.white, -0.6, 0, 1.15, -0.55, 2.11, 1.21);
  B.box(M.white, -0.6, 2.05, 0.29, -0.55, 2.11, 1.21);
  B.box(M.chrome, -0.565, 1.0, 0.95, -0.54, 1.02, 1.08);
  ctx.wall(-1.9, 0, -0.56, 1.6);
  {
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
    for (const dx of [-w / 2 + 0.03, w / 2 - 0.03])
      for (const dy of [-h / 2 + 0.05, h / 2 - 0.05])
        B.add(
          M.chrome,
          new THREE.CylinderGeometry(0.012, 0.012, 0.025, 12),
          T(mx + dx, my + dy, mz + 0.01, Math.PI / 2),
        );
  }

  // --- kitchenette nook (right of the entrance): beige 10 cm tiles, granite top ---
  {
    B.box(M.kTile, 1.885, 0, 0, 1.9, 2.0, 1.6, 1);
    B.box(M.kTile, 0.6, 0.86, 0.0, 1.9, 2.0, 0.015, 1);
    B.box(M.white, 1.32, 0, 0.12, 1.9, 0.84, 1.55);
    B.box(M.black, 1.315, 0.05, 0.12, 1.32, 0.1, 1.55);
    B.box(M.black, 1.316, 0.12, 0.83, 1.32, 0.82, 0.84);
    for (const z of [0.76, 0.91])
      B.box(M.steel, 1.29, 0.62, z - 0.005, 1.315, 0.74, z + 0.005);
    B.box(M.granite, 1.27, 0.84, 0.015, 1.9, 0.88, 1.58);
    B.box(M.steel, 1.42, 0.881, 0.45, 1.8, 0.884, 0.95);
    B.box(M.black, 1.46, 0.884, 0.49, 1.76, 0.886, 0.91);
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
    B.box(M.white, 1.55, 1.55, 0.03, 1.9, 2.2, 1.55);
    B.box(M.black, 1.548, 1.56, 0.79, 1.551, 2.19, 0.8);
    B.add(
      M.white,
      new THREE.CylinderGeometry(0.075, 0.09, 0.22, 20),
      T(1.6, 0.99, 1.3),
    );
    ctx.wall(1.27, 0, 1.9, 1.6);
  }

  // --- entrance door (open, swung into the hall) ---
  {
    B.box(M.white, -0.53, 0, -0.2, -0.45, 2.18, 0.02);
    B.box(M.white, 0.45, 0, -0.2, 0.53, 2.18, 0.02);
    B.box(M.white, -0.53, 2.1, -0.2, 0.53, 2.18, 0.02);
    B.box(M.woodDark, 0.47, 0, 0.02, 0.51, 2.08, 0.92, 0.9, true);
    B.box(M.chrome, 0.43, 1.0, 0.75, 0.47, 1.02, 0.88);
    B.box(M.chrome, 0.51, 1.0, 0.75, 0.55, 1.02, 0.88);
    B.box(M.white, -0.95, 1.05, 0.0, -0.75, 1.17, 0.015);
    ctx.wall(0.45, 0, 0.56, 0.95);
  }

  // --- headboard panel, bed, nightstand, sunflower picture ---
  {
    B.box(M.wood, -0.6, 0, 5.37, 1.9, 1.15, 5.4, 0.55);
    B.box(M.wood, -0.6, 1.15, 5.35, 1.9, 1.18, 5.4, 1);
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
    // nightstand
    B.box(M.wood, -0.42, 0, 4.92, 0.08, 0.52, 5.36, 0.6);
    B.box(M.black, -0.4, 0.3, 4.919, 0.06, 0.304, 4.921);
    B.add(
      M.black,
      new THREE.BoxGeometry(0.07, 0.15, 0.008),
      T(-0.1, 0.525, 5.1, -Math.PI / 2, 0.3),
    );
    ctx.wall(-0.42, 4.92, 0.08, 5.4);
    // sunflower panorama
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
    g.position.set(0.97, 1.72, 5.38);
    g.rotation.y = Math.PI;
    scene.add(g);
  }

  // --- sliding window (west wall) facing a lilac wall, sheer + beige curtains ---
  {
    const z0 = 2.6;
    const z1 = 3.8;
    B.box(M.granite, -1.98, 0.93, z0 - 0.04, -1.86, 0.96, z1 + 0.04);
    B.box(M.alu, -2.1, 0.95, z0, -1.95, 0.99, z1);
    B.box(M.alu, -2.1, 2.16, z0, -1.95, 2.2, z1);
    B.box(M.alu, -2.1, 0.95, z0, -1.95, 2.2, z0 + 0.04);
    B.box(M.alu, -2.1, 0.95, z1 - 0.04, -1.95, 2.2, z1);
    for (const [x, a, b] of [
      [-2.06, z0 + 0.04, (z0 + z1) / 2 + 0.03],
      [-2.0, (z0 + z1) / 2 - 0.03, z1 - 0.04],
    ] as const) {
      B.box(M.alu, x - 0.015, 0.99, a, x + 0.015, 2.16, a + 0.04);
      B.box(M.alu, x - 0.015, 0.99, b - 0.04, x + 0.015, 2.16, b);
      B.box(M.glassPane, x - 0.004, 0.99, a + 0.04, x + 0.004, 2.16, b - 0.04);
    }
    B.box(M.lilac, -3.1, 0, 1.6, -2.9, 4.5, 4.8, 1.5);
    B.box(M.lilac, -2.9, 0, 1.6, -2.1, 0.1, 4.8, 1.5);
    B.add(
      M.alu,
      new THREE.CylinderGeometry(0.012, 0.012, 2.8, 10),
      T(-1.78, 2.36, 3.2, Math.PI / 2),
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
    curtain(M.sheer, 0.9, 6, 0.03, 3.05, -1.81);
    curtain(M.curtain, 0.55, 5, 0.045, 2.18, -1.74);
    curtain(M.curtain, 0.55, 5, 0.045, 4.2, -1.74);
  }

  // --- photo of the couple on the bedroom wall, opposite the window ---
  ctx.photo("caldas-1.webp", 0.5, 0.375, v3(1.885, 1.5, 2.65), -90);

  // --- recessed downlights + the room's two lights ---
  {
    const dl = emissive("#fff1dc", 2.2);
    const spots: [number, number, number][] = [
      [-1.68, SOFFIT - 0.001, 2.6],
      [-1.68, SOFFIT - 0.001, 4.4],
      [1.68, SOFFIT - 0.001, 2.6],
      [1.68, SOFFIT - 0.001, 4.4],
      [0.0, SOFFIT - 0.001, 0.8],
      [1.2, SOFFIT - 0.001, 0.8],
    ];
    for (const [x, y, z] of spots) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), dl);
      d.rotation.x = Math.PI / 2;
      d.position.set(x, y, z);
      scene.add(d);
    }
    const main = new THREE.PointLight("#ffd9ae", 4.2, 9, 2);
    main.position.set(0.2, 2.3, 3.4);
    const hall = new THREE.PointLight("#ffe2bf", 1.8, 6, 2);
    hall.position.set(0.5, 2.25, 0.8);
    scene.add(main, hall);
  }

  /* =====================================================================
   * OUTSIDE: the building with a covered walkway, the elevator, the pool,
   * and the grey-tiled pool-side block where they took the night selfie.
   * ===================================================================== */
  {
    B.box(M.facade, -15, 0, -0.2, -0.45, 3.2, 0, 3);
    B.box(M.facade, 0.45, 0, -0.2, 15, 3.2, 0, 3);
    B.box(M.facade, -0.45, 2.1, -0.2, 0.45, 3.2, 0, 3);
    B.box(M.facade, -15, 3.2, -0.2, 15, 9.8, 0, 3);
    B.box(M.cap, -15, 6.35, -0.32, 15, 6.5, -0.2, 2);
    B.box(M.cap, -15.1, 9.8, -0.5, 15.1, 10.1, 0, 2);
    ctx.wall(-15, -0.25, -0.45, 0);
    ctx.wall(0.45, -0.25, 15, 0);
    // covered walkway: slab on columns, downlights
    B.box(M.slab, -15, 2.85, -2.45, 15, 3.1, -0.2, 2);
    const dl = emissive("#fff0d8", 2.4);
    for (const x of [-14, -10, -6, -2, 2, 6, 10, 14]) {
      B.box(M.slab, x - 0.13, 0, -2.4, x + 0.13, 2.85, -2.14, 1);
      ctx.wall(x - 0.13, -2.4, x + 0.13, -2.14);
    }
    for (let x = -13; x <= 13; x += 2) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), dl);
      d.rotation.x = Math.PI / 2;
      d.position.set(x, 2.849, -1.3);
      scene.add(d);
    }
    // the other rooms' doors on the walkway, and lit windows upstairs
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      const x = 4 * k;
      if (k === -1) continue; // the elevator is there
      B.box(M.white, x - 0.53, 0, -0.24, x + 0.53, 2.18, -0.2);
      B.box(M.woodDark, x - 0.45, 0, -0.26, x + 0.45, 2.1, -0.22, 0.9, true);
      B.box(M.chrome, x + 0.28, 1.0, -0.3, x + 0.4, 1.02, -0.26);
    }
    const winTex = curtainGlow();
    const spots: { x: number; y: number }[] = [];
    for (let f = 1; f < 3; f++)
      for (let k = -3; k <= 3; k++)
        spots.push({ x: 4 * k + 0.2, y: f * 3.2 + 0.6 });
    const frames = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.3, 1.35, 0.06),
      M.alu,
      spots.length,
    );
    const panes = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.2, 1.25),
      new THREE.MeshBasicMaterial({ map: winTex }),
      spots.length,
    );
    const dummy = new THREE.Object3D();
    spots.forEach((s, i) => {
      dummy.position.set(s.x, s.y + 0.7, -0.22);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      frames.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x, s.y + 0.7, -0.255);
      dummy.rotation.set(0, Math.PI, 0);
      dummy.updateMatrix();
      panes.setMatrixAt(i, dummy.matrix);
      const lit = rand();
      panes.setColorAt(
        i,
        lit < 0.5
          ? new THREE.Color(0.03, 0.03, 0.04)
          : new THREE.Color(
              0.8 + rand() * 0.5,
              0.65 + rand() * 0.35,
              0.5 + rand() * 0.2,
            ),
      );
    });
    scene.add(frames, panes);
    // elevator (stainless doors, call button, floor display) — the way out
    const ex = -4;
    B.box(M.steel, ex - 0.62, 0, -0.27, ex + 0.62, 2.25, -0.2);
    B.box(M.steel, ex - 0.5, 0, -0.29, ex - 0.005, 2.1, -0.27);
    B.box(M.steel, ex + 0.005, 0, -0.29, ex + 0.5, 2.1, -0.27);
    B.box(M.black, ex - 0.005, 0, -0.285, ex + 0.005, 2.1, -0.27);
    B.box(M.steel, ex + 0.75, 0.95, -0.24, ex + 0.85, 1.25, -0.2);
    const btn = new THREE.Mesh(
      new THREE.CircleGeometry(0.015, 12),
      emissive("#ffffff", 3),
    );
    btn.position.set(ex + 0.8, 1.12, -0.241);
    btn.rotation.y = Math.PI;
    scene.add(btn);
    const disp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.07),
      new THREE.MeshBasicMaterial({
        map: textTexture(
          "T",
          128,
          56,
          "bold 44px monospace",
          "#ff3b2f",
          "#120404",
        ),
        color: new THREE.Color(2, 2, 2),
      }),
    );
    disp.position.set(ex, 2.18, -0.275);
    disp.rotation.y = Math.PI;
    scene.add(disp);
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
  const NP = 160;
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
      new THREE.Vector2(-15, 0.2),
      new THREE.Vector2(15, 0.2),
      new THREE.Vector2(15, 25),
      new THREE.Vector2(-15, 25),
    ]);
    outline.holes.push(
      new THREE.Path(poly.map((p) => new THREE.Vector2(p.x, -p.y))),
    );
    const g = new THREE.ShapeGeometry(outline, 1);
    g.rotateX(-Math.PI / 2);
    B.add(M.deck, g, undefined, 2.4);
  }

  // coping: top strip, the lip down to the water, the outer edge
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
    B.add(M.coping, t.geometry());
  }

  // basin (walls + floor) with mosaic tiles, lamps and caustics
  const lampPos: THREE.Vector3[] = [];
  for (let k = 0; k < 6; k++) {
    const i = Math.floor((k / 6) * NP + 6) % NP;
    const p = poly[i]!;
    const n = outward[i]!;
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
    const floorShape = new THREE.Shape(
      poly.map((p) => new THREE.Vector2(p.x, -p.y)),
    );
    const fg = new THREE.ShapeGeometry(floorShape, 1);
    fg.rotateX(-Math.PI / 2);
    fg.translate(0, DEPTH, 0);
    const fp = fg.getAttribute("position");
    const uvs = new Float32Array(fp.count * 2);
    for (let i = 0; i < fp.count; i++) {
      uvs[i * 2] = fp.getX(i);
      uvs[i * 2 + 1] = fp.getZ(i);
    }
    fg.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    scene.add(
      new THREE.Mesh(mergeGeometries([flat(t.geometry()), flat(fg)]), basinMat),
    );
    // underwater lamp fixtures, merged into one mesh
    const discs: THREE.BufferGeometry[] = [];
    lampPos.forEach((p, k) => {
      const n = outward[Math.floor((k / 6) * NP + 6) % NP]!;
      const o = new THREE.Object3D();
      o.position.copy(p);
      o.lookAt(p.x - n.x, p.y, p.z - n.y);
      o.updateMatrix();
      discs.push(
        flat(new THREE.CircleGeometry(0.08, 20)).applyMatrix4(o.matrix),
      );
    });
    scene.add(new THREE.Mesh(mergeGeometries(discs), emissive("#d9fbff", 3.2)));
  }

  // water surface (glints from the lights around it are computed in the shader)
  const specLights = [
    v3(-2, 2.84, -1.3),
    v3(2, 2.84, -1.3),
    v3(0, 8.6, -0.7),
    v3(8.9, 2.3, -10.6),
    v3(-6, 2.84, -1.3),
    v3(6, 2.84, -1.3),
    v3(-40, 50, -100),
    v3(-10, 2.84, -1.3),
  ];
  const warm = new THREE.Color(1, 0.85, 0.65);
  const specCols = [
    warm,
    warm,
    new THREE.Color(0.45, 0.42, 0.36),
    new THREE.Color(0.9, 0.9, 0.85),
    warm,
    warm,
    new THREE.Color(0.5, 0.55, 0.7),
    warm,
  ];
  const waterMat = waterMaterial(specLights, specCols);
  {
    const g = new THREE.ShapeGeometry(
      new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.y))),
      1,
    );
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
      B.add(M.chrome, new THREE.TubeGeometry(path, 24, 0.022, 8, false));
    }
    for (const y of [-0.4, -0.7])
      B.box(M.chrome, x - 0.25, y, ez - 0.2, x + 0.25, y + 0.02, ez - 0.08);
  }

  // depth markers on the coping
  {
    const mat = new THREE.MeshStandardMaterial({
      map: textTexture("1,30 m", 256, 96, "bold 56px Arial", "#1d4f8a"),
      transparent: true,
      roughness: 0.5,
    });
    const parts: THREE.BufferGeometry[] = [];
    for (const i of [10, 62, 108]) {
      const p = poly[i]!;
      const n = outward[i]!;
      const o = new THREE.Object3D();
      o.rotation.set(-Math.PI / 2, 0, Math.atan2(n.x, -n.y) + Math.PI);
      o.position.set(p.x + n.x * 0.2, 0.032, p.y + n.y * 0.2);
      o.updateMatrix();
      parts.push(new THREE.PlaneGeometry(0.3, 0.11).applyMatrix4(o.matrix));
    }
    scene.add(new THREE.Mesh(mergeGeometries(parts), mat));
  }

  // pink inflatable ring floating
  {
    const g = new THREE.TorusGeometry(0.42, 0.15, 18, 40);
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

  // steam over the warm water (thermal pool)
  const steamMat = steamMaterial();
  {
    const n = high ? 240 : 110;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    let k = 0;
    while (k < n) {
      const x = -8 + rand() * 15.6;
      const z = -15.2 + rand() * 7.8;
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

  // --- the grey-tiled block by the pool (showers/restrooms): their selfie spot ---
  const SX0 = 9.0;
  const SX1 = 13.0;
  const SZ0 = -13.0;
  const SZ1 = -8.4;
  {
    B.box(M.mosaic, SX0, 0, SZ0, SX1, 2.7, SZ1, 1);
    B.box(M.slab, SX0 - 0.15, 2.7, SZ0 - 0.15, SX1 + 0.15, 2.9, SZ1 + 0.15, 2);
    // doorway with a white jamb, dark inside
    B.box(M.black, 9.7, 0, SZ1, 10.6, 2.1, SZ1 + 0.01);
    B.box(M.white, 9.62, 0, SZ1, 9.7, 2.15, SZ1 + 0.05);
    B.box(M.white, 10.6, 0, SZ1, 10.68, 2.15, SZ1 + 0.05);
    B.box(M.white, 9.62, 2.1, SZ1, 10.68, 2.15, SZ1 + 0.05);
    // granite/terrazzo bench along the face toward the pool, light grey floor tiles there
    B.box(M.terrazzo, SX0 - 0.42, 0, -12.4, SX0, 0.45, -9.1, 0.8);
    B.box(M.floor, SX0 - 1.4, 0.0, SZ0, SX0, 0.005, SZ1, 2.4);
    // wall light over the bench
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.12, 0.5),
      emissive("#f4f0e6", 2.6),
    );
    lamp.position.set(SX0 - 0.03, 2.3, -10.75);
    scene.add(lamp);
    const l = new THREE.PointLight("#f2ead8", 3.2, 10, 2);
    l.position.set(SX0 - 0.5, 2.3, -10.75);
    scene.add(l);
    ctx.wall(SX0 - 0.42, SZ0, SX1, SZ1);
  }

  // the walkway light, between the room door and the elevator
  {
    const l = new THREE.PointLight("#ffe0b8", 3.5, 12, 2);
    l.position.set(-2, 2.6, -1.3);
    scene.add(l);
  }

  // pool glow (one light) on the deck and on people
  {
    const l = new THREE.PointLight("#43d6e0", 10, 16, 2);
    l.position.set(0, 0.6, -11);
    scene.add(l);
  }

  // --- garden walls, hedges ---
  const hedges: {
    cx: number;
    cz: number;
    w: number;
    d: number;
    h: number;
    face: THREE.Vector3;
  }[] = [];
  {
    B.box(M.gardenWall, -15.3, 0, -25.3, -15, 2.6, -0.2, 3);
    B.box(M.gardenWall, 15, 0, -25.3, 15.3, 2.6, -0.2, 3);
    B.box(M.gardenWall, -15.3, 0, -25.3, 15.3, 2.6, -25, 3);
    ctx.wall(-15.6, -26, -13.8, 0);
    ctx.wall(13.8, -26, 15.6, 0);
    ctx.wall(-15.6, -26, 15.6, -23.6);
    const hedge = (
      x0: number,
      z0: number,
      x1: number,
      z1: number,
      face: THREE.Vector3,
    ) => {
      const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const len = along ? x1 - x0 : z1 - z0;
      const n = Math.max(1, Math.round(len / 2.2));
      for (let i = 0; i < n; i++) {
        const tm = (i + 0.5) / n;
        const hgt = 1.0 + rand() * 0.4;
        const cx = along ? x0 + (x1 - x0) * tm : (x0 + x1) / 2;
        const cz = along ? (z0 + z1) / 2 : z0 + (z1 - z0) * tm;
        const w = along ? (len / n) * 1.1 : Math.abs(x1 - x0);
        const d = along ? Math.abs(z1 - z0) : (len / n) * 1.1;
        B.rbox(M.hedge, w, hgt, d, 0.3, T(cx, hgt / 2, cz), 1);
        hedges.push({ cx, cz, w, d, h: hgt, face });
      }
    };
    hedge(-15, -23.6, -13.8, -3, v3(1, 0, 0));
    hedge(13.8, -23.6, 15, -14, v3(-1, 0, 0));
    hedge(13.8, -7.5, 15, -3, v3(-1, 0, 0));
    hedge(-13.8, -25, 13.8, -23.6, v3(0, 0, 1));
  }

  // --- loungers (instanced) ---
  type Lounger = { x: number; z: number; yaw: number };
  const loungers: Lounger[] = [
    ...[-7.4, -5.8, 3.4, 4.8].map((x) => ({ x, z: -4.7, yaw: 0 })),
    ...[-9.2, -10.8, -12.4].map((z) => ({ x: -10.6, z, yaw: -90 })),
    { x: -1.6, z: -17.6, yaw: 180 },
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
    ] as const)
      fp(new THREE.BoxGeometry(0.05, 0.28, 0.05), T(x, 0.14, z));
    cp(new RoundedBoxGeometry(0.64, 0.07, 1.28, 2, 0.03), T(0, 0.38, -0.32));
    cp(
      new RoundedBoxGeometry(0.64, 0.07, 0.74, 2, 0.03),
      T(0, 0.4 + Math.sin(0.85) * 0.37, 0.36 + Math.cos(0.85) * 0.37, -0.85),
    );
    const fi = new THREE.InstancedMesh(
      mergeGeometries(frameParts),
      M.loungerFrame,
      loungers.length,
    );
    const ci = new THREE.InstancedMesh(
      mergeGeometries(cushionParts),
      M.cushion,
      loungers.length,
    );
    const dummy = new THREE.Object3D();
    loungers.forEach((l, i) => {
      dummy.position.set(l.x, 0, l.z);
      dummy.rotation.set(0, D(l.yaw), 0);
      dummy.updateMatrix();
      fi.setMatrixAt(i, dummy.matrix);
      ci.setMatrixAt(i, dummy.matrix);
      const side = l.yaw === 0 || l.yaw === 180;
      const hx = side ? 0.36 : 1.0;
      const hz = side ? 1.0 : 0.36;
      ctx.wall(l.x - hx, l.z - hz, l.x + hx, l.z + hz);
    });
    for (const m of [fi, ci]) {
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    }
    // the pack rests on a lounger on the far side of the pool
    ctx.pack(-10.6 + 0.32, 0.42, -12.4, 90);
  }

  // --- palms (fewer, instanced fronds) ---
  const palms: [number, number, number, number][] = [
    [-9.0, -5.6, 7.2, 0.5],
    [-12.8, -11.6, 8.2, 0.7],
    [-4.0, -21.6, 8.6, 0.6],
    [2.0, -22.4, 7.4, 0.5],
    [12.4, -4.6, 6.6, 0.5],
    [12.6, -20.6, 7.6, 0.6],
  ];
  {
    const trunks: THREE.BufferGeometry[] = [];
    const boots: THREE.BufferGeometry[] = [];
    const per = high ? 16 : 11;
    const fronds = new THREE.InstancedMesh(
      frondGeometry(),
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
      trunks.push(flat(geo));
      const tp = top.clone().add(v3(x, 0, z));
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
    B.add(M.bark, mergeGeometries(trunks));
    B.add(
      new THREE.MeshStandardMaterial({ color: "#4a4a28", roughness: 0.85 }),
      mergeGeometries(boots),
    );
  }

  // --- leaves over the hedges (instanced) ---
  {
    const density = high ? 14 : 6;
    const area = (h: (typeof hedges)[number]) =>
      h.w * h.d + (h.face.x ? h.d : h.w) * h.h;
    let total = 0;
    for (const h of hedges) total += Math.round(area(h) * density);
    const leaves = new THREE.InstancedMesh(
      leafGeometry(),
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        roughness: 0.7,
      }),
      total,
    );
    const dummy = new THREE.Object3D();
    let n = 0;
    for (const h of hedges) {
      const count = Math.round(area(h) * density);
      const topShare = (h.w * h.d) / area(h);
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
    leaves.receiveShadow = true;
    scene.add(leaves);
  }

  /* =====================================================================
   * SKY, DISTANT TOWERS (Caldas Novas skyline), MAIN LIGHTS
   * ===================================================================== */
  const skyMat = skyMaterial();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), skyMat);
  sky.renderOrder = -1;
  scene.add(sky);
  {
    const towers: THREE.BufferGeometry[] = [];
    for (const [x, z, w, h, d] of [
      [-52, -112, 14, 44, 10],
      [10, -128, 18, 56, 12],
      [66, -100, 12, 38, 12],
      [-104, -62, 12, 34, 14],
      [-20, -135, 12, 30, 10],
    ] as const) {
      const g = new THREE.BoxGeometry(w, h, d);
      const uv = g.getAttribute("uv");
      for (let i = 0; i < uv.count; i++)
        uv.setXY(
          i,
          uv.getX(i) * Math.round(w / 5),
          uv.getY(i) * Math.round(h / 12),
        );
      const o = new THREE.Object3D();
      o.position.set(x, h / 2 - 2, z);
      o.lookAt(0, h / 2 - 2, 0);
      o.updateMatrix();
      towers.push(flat(g).applyMatrix4(o.matrix));
    }
    const tex = towerTexture(13);
    scene.add(
      new THREE.Mesh(
        mergeGeometries(towers),
        new THREE.MeshBasicMaterial({
          map: tex,
          color: new THREE.Color(0.55, 0.55, 0.55),
        }),
      ),
    );
  }

  scene.add(new THREE.HemisphereLight("#2a3d66", "#0d0c0b", 0.4));

  // floodlight on the facade over the pool: the only shadow-casting light
  {
    const s = new THREE.SpotLight(
      "#ffe2b8",
      high ? 130 : 150,
      40,
      D(38),
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
    B.box(M.alu, -0.2, 8.62, -0.6, 0.2, 8.87, -0.3);
  }

  B.flush(scene, [M.glassPane, M.sheer]);

  /* =====================================================================
   * PEOPLE, SPAWN, EXIT
   * ===================================================================== */
  ctx.partner(
    SX0 - 0.75,
    -10.5,
    -42,
    "stand",
    OUTFITS,
    ctx.player === "elena"
      ? "Primeira de muitas viagens. Promessa. ✈️"
      : "Bora pra piscina? Depois a gente volta pro quarto ver série 😄",
  );
  ctx.playerOutfit(OUTFITS);
  ctx.spawn(0, 0.75, 180);
  ctx.exit(-4, -0.75, 0.6);

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
