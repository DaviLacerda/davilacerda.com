import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  carpet,
  emissive,
  fabric,
  leather,
  marble,
  metal,
  pbr,
  repeat,
  seeded,
  tiles,
  woodPlanks,
  type Maps,
} from "../fp/materials";
import type { SceneCtx, SceneModule } from "../fp/types";

/*
 * Davi's living room at night: the evening he asked Elena to be his
 * girlfriend (the rings) and, later, the red roses. A dim, warm room lit by
 * candles, a salt lamp on the sideboard, a floor lamp and the kitchen
 * downlights through the pass-through window; the city glitters outside.
 *
 * Plan (meters): room x ∈ [-3.6, 3.6], z ∈ [-2.8, 2.8], ceiling 2.7.
 * Kitchen behind the back wall (z < -2.8), seen through the pass-through.
 * Window + curtains on the left wall (x = -3.6), entrance door on the front
 * wall (z = +2.8), sofa along the right wall.
 */

const RX = 3.6;
const RZ = 2.8;
const H = 2.7;
const T = 0.15; // wall thickness

const TABLE = { x: -1.2, z: -0.6, w: 1.6, d: 0.9, h: 0.75 };

/* ---------------- small helpers ---------------- */

type Mat = THREE.Material | THREE.Material[];

function mesh(
  geo: THREE.BufferGeometry,
  mat: Mat,
  x = 0,
  y = 0,
  z = 0,
  cast = true,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function rbox(w: number, h: number, d: number, r = 0.01, seg = 2) {
  return new RoundedBoxGeometry(
    w,
    h,
    d,
    seg,
    Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4),
  );
}

function rep(
  maps: Maps,
  x: number,
  y: number,
  opts: THREE.MeshStandardMaterialParameters = {},
) {
  return pbr(repeat(maps, x, y), opts);
}

/** A wall in its own XY plane with rectangular holes; UVs in meters. */
function holedWall(
  x0: number,
  x1: number,
  h: number,
  holes: [number, number, number, number][],
) {
  const s = new THREE.Shape();
  s.moveTo(x0, 0);
  s.lineTo(x1, 0);
  s.lineTo(x1, h);
  s.lineTo(x0, h);
  s.lineTo(x0, 0);
  for (const [a, b, c, d] of holes) {
    const p = new THREE.Path();
    p.moveTo(a, b);
    p.lineTo(a, d);
    p.lineTo(c, d);
    p.lineTo(c, b);
    p.lineTo(a, b);
    s.holes.push(p);
  }
  return new THREE.ShapeGeometry(s);
}

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
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Smooth painted plaster albedo (soft clouds + fine grain), tiling. */
function plasterTex(base: string, seed: number) {
  const t = canvasTex(512, 512, (g) => {
    const rand = seeded(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const r = 20 + rand() * 70;
      const light = rand() < 0.5;
      for (const ox of [-512, 0, 512])
        for (const oy of [-512, 0, 512]) {
          const grd = g.createRadialGradient(
            x + ox,
            y + oy,
            0,
            x + ox,
            y + oy,
            r,
          );
          grd.addColorStop(
            0,
            light ? "rgba(255,255,255,0.035)" : "rgba(60,40,20,0.035)",
          );
          grd.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = grd;
          g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
    }
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},${rand() * 0.05})`;
      g.fillRect(rand() * 512, rand() * 512, 1, 1);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.6, 0.6);
  return t;
}

const glassLite = (tint = "#ffffff", opacity = 0.16) =>
  new THREE.MeshPhysicalMaterial({
    color: tint,
    roughness: 0.03,
    metalness: 0,
    transparent: true,
    opacity,
    envMapIntensity: 3,
    specularIntensity: 1,
    clearcoat: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

/* ---------------- the night city behind the window ---------------- */

function skylineTexture(quality: "high" | "low") {
  const W = quality === "high" ? 4096 : 2048;
  const Hh = W / 2;
  return canvasTex(W, Hh, (g) => {
    const rand = seeded(77);
    const horizon = Hh * 0.47;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#03040b");
    sky.addColorStop(0.55, "#0b0d1d");
    sky.addColorStop(0.85, "#241a2a");
    sky.addColorStop(1, "#4a2f2a");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, horizon);
    // faint stars
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.35})`;
      g.fillRect(rand() * W, rand() * horizon * 0.6, 1.5, 1.5);
    }
    // ground haze below the horizon
    const ground = g.createLinearGradient(0, horizon, 0, Hh);
    ground.addColorStop(0, "#3a2522");
    ground.addColorStop(0.3, "#140d0d");
    ground.addColorStop(1, "#050404");
    g.fillStyle = ground;
    g.fillRect(0, horizon, W, Hh - horizon);
    // street-light grid far below
    for (let i = 0; i < 1400; i++) {
      const y = horizon + 20 + Math.pow(rand(), 0.7) * (Hh - horizon - 20);
      const warm = rand() < 0.8;
      g.fillStyle = warm
        ? `rgba(255,${150 + rand() * 60},${60 + rand() * 40},${0.4 + rand() * 0.5})`
        : `rgba(200,220,255,${0.3 + rand() * 0.4})`;
      const s = 1 + ((y - horizon) / (Hh - horizon)) * 3;
      g.fillRect(rand() * W, y, s, s);
    }
    // three bands of buildings: far (short, faint) to near (tall)
    const bands = [
      {
        n: 90,
        minH: 0.03,
        maxH: 0.12,
        base: horizon + Hh * 0.04,
        col: [24, 22, 30],
        lit: 0.25,
        win: 3,
      },
      {
        n: 55,
        minH: 0.08,
        maxH: 0.24,
        base: horizon + Hh * 0.16,
        col: [16, 15, 20],
        lit: 0.32,
        win: 4,
      },
      {
        n: 26,
        minH: 0.2,
        maxH: 0.5,
        base: horizon + Hh * 0.42,
        col: [10, 9, 12],
        lit: 0.38,
        win: 6,
      },
    ];
    for (const b of bands) {
      for (let i = 0; i < b.n; i++) {
        const bw = (W / b.n) * (0.7 + rand() * 1.2);
        const bx = rand() * W - bw / 2;
        const bh = Hh * (b.minH + rand() * (b.maxH - b.minH));
        const top = b.base - bh;
        const shade = 0.8 + rand() * 0.4;
        g.fillStyle = `rgb(${b.col[0]! * shade},${b.col[1]! * shade},${b.col[2]! * shade})`;
        g.fillRect(bx, top, bw, Hh - top);
        // windows
        const ws = b.win;
        const gapX = ws * 2.2;
        const gapY = ws * 2.6;
        const floorLit = rand() * 0.4 + b.lit * 0.8;
        for (
          let y = top + gapY;
          y < Math.min(Hh, b.base + Hh * 0.2);
          y += gapY
        ) {
          const rowOn = rand() < 0.85;
          for (let x = bx + gapX * 0.6; x < bx + bw - ws; x += gapX) {
            if (!rowOn || rand() > floorLit) continue;
            const t = rand();
            g.fillStyle =
              t < 0.6
                ? `rgba(255,${190 + rand() * 40},${110 + rand() * 50},${0.55 + rand() * 0.45})`
                : t < 0.85
                  ? `rgba(255,240,215,${0.5 + rand() * 0.5})`
                  : `rgba(170,200,255,${0.45 + rand() * 0.4})`;
            g.fillRect(x, y, ws, ws * 1.3);
          }
        }
        // aviation light on tall towers
        if (bh > Hh * 0.3 && rand() < 0.6) {
          g.fillStyle = "rgba(255,40,30,0.95)";
          g.beginPath();
          g.arc(bx + bw / 2, top - 4, 4, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    // soft orange city glow over the horizon
    const glow = g.createLinearGradient(
      0,
      horizon - Hh * 0.1,
      0,
      horizon + Hh * 0.05,
    );
    glow.addColorStop(0, "rgba(255,140,80,0)");
    glow.addColorStop(0.7, "rgba(255,140,80,0.10)");
    glow.addColorStop(1, "rgba(255,140,80,0)");
    g.fillStyle = glow;
    g.fillRect(0, horizon - Hh * 0.1, W, Hh * 0.15);
  });
}

/* ---------------- the roses ---------------- */

/** One petal in its XY plane (y = length), cupped toward -Z, rolled outward at the tip. */
/** `wrap` = radius of the cylinder the petal wraps around (its distance to the rose axis). */
function petalGeometry(
  len: number,
  wid: number,
  wrap: number,
  curl: number,
  color: (v: number, edge: number) => THREE.Color,
) {
  const g = new THREE.PlaneGeometry(1, 1, 8, 10);
  const p = g.attributes.position!;
  const colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i); // -0.5..0.5
    const v = p.getY(i) + 0.5; // 0..1
    // broad, round-topped petal: narrow claw at the base, widest ~70%, semicircular tip
    const body = 0.3 + 0.7 * Math.sin(Math.PI * 0.5 * Math.min(v / 0.7, 1));
    const tipV = Math.max(0, (v - 0.72) / 0.28);
    const w = wid * body * Math.sqrt(Math.max(0.04, 1 - tipV * tipV));
    const s = u * 2 * w; // arc length across the petal
    const e = Math.abs(u * 2);
    // wrap around the rose axis (concentric arcs, not a flat star); opens up a little toward the rim
    const R = wrap * (1 + v * 0.6);
    const phi = Math.max(-1.7, Math.min(1.7, s / R));
    const x = R * Math.sin(phi);
    let y = v * len;
    let z = R * (Math.cos(phi) - 1);
    // the rim rolls back outward
    const roll = Math.max(0, v - 0.55) / 0.45;
    z += curl * roll * roll * len * 0.5;
    y -= curl * roll * roll * roll * len * 0.12;
    z += (e > 0.7 && v > 0.6 ? (e - 0.7) * curl * 0.02 : 0) * len;
    p.setXYZ(i, x, y, z);
    const c = color(v, e);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function roseHeadGeometry(seed: number) {
  const rand = seeded(seed);
  const base = new THREE.Color("#4a0610");
  const mid = new THREE.Color("#a3101f");
  const tip = new THREE.Color("#c41628");
  const color = (v: number, e: number) => {
    const c = base.clone().lerp(mid, Math.min(1, Math.pow(v, 0.7) * 1.3));
    if (v > 0.65) c.lerp(tip, (v - 0.65) * 2);
    return c.multiplyScalar(0.85 + 0.15 * e);
  };
  const parts: THREE.BufferGeometry[] = [];
  const layers = [
    {
      n: 3,
      len: 0.028,
      wid: 0.014,
      open: 0.02,
      r: 0.002,
      cup: 1.6,
      curl: 0.02,
      y: 0.014,
    },
    {
      n: 4,
      len: 0.034,
      wid: 0.018,
      open: 0.08,
      r: 0.004,
      cup: 1.4,
      curl: 0.08,
      y: 0.01,
    },
    {
      n: 5,
      len: 0.04,
      wid: 0.022,
      open: 0.18,
      r: 0.007,
      cup: 1.2,
      curl: 0.2,
      y: 0.006,
    },
    {
      n: 5,
      len: 0.046,
      wid: 0.026,
      open: 0.34,
      r: 0.01,
      cup: 1.05,
      curl: 0.38,
      y: 0.002,
    },
    {
      n: 5,
      len: 0.05,
      wid: 0.03,
      open: 0.58,
      r: 0.012,
      cup: 0.9,
      curl: 0.55,
      y: -0.002,
    },
  ];
  let k = 0;
  for (const L of layers) {
    for (let i = 0; i < L.n; i++) {
      const pg = petalGeometry(
        L.len * (0.9 + rand() * 0.2),
        L.wid * (0.9 + rand() * 0.2),
        L.r + L.len * Math.sin(L.open) * 0.35 + 0.006,
        L.curl,
        color,
      );
      const m = new THREE.Matrix4();
      const theta = (i / L.n) * Math.PI * 2 + k * 0.7 + rand() * 0.3;
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-(L.open + (rand() - 0.5) * 0.12), theta, 0, "YXZ"),
      );
      const pos = new THREE.Vector3(
        Math.sin(theta) * L.r,
        L.y,
        Math.cos(theta) * L.r,
      );
      m.compose(pos, q, new THREE.Vector3(1, 1, 1));
      pg.applyMatrix4(m);
      parts.push(pg);
    }
    k++;
  }
  // the tight core
  const core = new THREE.SphereGeometry(0.009, 10, 8);
  core.scale(1, 1.6, 1);
  core.translate(0, 0.02, 0);
  const cc: number[] = [];
  for (let i = 0; i < core.attributes.position!.count; i++)
    cc.push(0.35, 0.03, 0.06);
  core.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3));
  core.deleteAttribute("uv");
  for (const p of parts) p.deleteAttribute("uv");
  parts.push(core);
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  if (!g) throw new Error("rose merge failed");
  return g;
}

function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.024, 0.02, 0.0, 0.065);
  s.quadraticCurveTo(-0.024, 0.02, 0, 0);
  const g = new THREE.ShapeGeometry(s, 6);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, -Math.abs(x) * 0.5 + Math.sin((y / 0.065) * Math.PI) * 0.006);
  }
  g.computeVertexNormals();
  return g;
}

/** A hand-tied bouquet built upright (apex at the origin, heads up +Y). */
function bouquet(quality: "high" | "low") {
  const group = new THREE.Group();
  const rand = seeded(2024);
  const nRoses = quality === "high" ? 15 : 11;
  const petalMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.55,
    sheen: 1,
    sheenColor: new THREE.Color("#ff3040"),
    sheenRoughness: 0.45,
    side: THREE.DoubleSide,
  });
  const green = new THREE.MeshStandardMaterial({
    color: "#1f3a1a",
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: "#2f4a22",
    roughness: 0.7,
  });

  // heads on a dome: two variants, instanced
  const variants = [roseHeadGeometry(11), roseHeadGeometry(29)];
  const heads = variants.map(
    (g) => new THREE.InstancedMesh(g, petalMat, nRoses),
  );
  const sepal = new THREE.ConeGeometry(0.012, 0.03, 6, 1, true);
  sepal.translate(0, -0.012, 0);
  const sepals = new THREE.InstancedMesh(sepal, green, nRoses);
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.0035, 0.004, 1, 6),
    stemMat,
    nRoses,
  );
  const counts = [0, 0];
  const m = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const domeC = new THREE.Vector3(0, 0.32, 0);
  const headPos: THREE.Vector3[] = [];
  for (let i = 0; i < nRoses; i++) {
    // golden-angle spiral over a spherical cap
    const f = (i + 0.5) / nRoses;
    const polar = Math.acos(1 - f * 0.5) * 1.15;
    const az = i * 2.39996;
    const dir = new THREE.Vector3(
      Math.sin(polar) * Math.cos(az),
      Math.cos(polar),
      Math.sin(polar) * Math.sin(az),
    );
    const pos = domeC.clone().addScaledVector(dir, 0.13);
    headPos.push(pos);
    const q = new THREE.Quaternion().setFromUnitVectors(
      up,
      dir.clone().lerp(up, 0.3).normalize(),
    );
    q.multiply(
      new THREE.Quaternion().setFromAxisAngle(up, rand() * Math.PI * 2),
    );
    const sc = 1.3 + rand() * 0.2;
    m.compose(pos, q, new THREE.Vector3(sc, sc, sc));
    const v = i % 2;
    heads[v]!.setMatrixAt(counts[v]!++, m);
    sepals.setMatrixAt(i, m);
    // stem from the head down toward the binding point
    const bottom = new THREE.Vector3(
      (rand() - 0.5) * 0.01,
      0.04,
      (rand() - 0.5) * 0.01,
    );
    const mid = pos.clone().add(bottom).multiplyScalar(0.5);
    const len = pos.distanceTo(bottom);
    const sq = new THREE.Quaternion().setFromUnitVectors(
      up,
      pos.clone().sub(bottom).normalize(),
    );
    m.compose(mid, sq, new THREE.Vector3(1, len, 1));
    stems.setMatrixAt(i, m);
  }
  heads.forEach((h, i) => {
    h.count = counts[i]!;
    h.castShadow = true;
    h.receiveShadow = true;
    group.add(h);
  });
  sepals.castShadow = true;
  group.add(sepals, stems);

  // leaves tucked between the heads
  const nLeaves = quality === "high" ? 34 : 20;
  const leaves = new THREE.InstancedMesh(leafGeometry(), green, nLeaves);
  for (let i = 0; i < nLeaves; i++) {
    const a = headPos[i % headPos.length]!;
    const b = headPos[(i * 7 + 3) % headPos.length]!;
    const p = a.clone().lerp(b, 0.5);
    const out = p.clone().sub(domeC).normalize();
    p.addScaledVector(out, -0.02 - rand() * 0.03);
    const q = new THREE.Quaternion().setFromUnitVectors(
      up,
      out
        .clone()
        .lerp(up, -0.2 + rand() * 0.3)
        .normalize(),
    );
    q.multiply(
      new THREE.Quaternion().setFromAxisAngle(up, rand() * Math.PI * 2),
    );
    m.compose(p, q, new THREE.Vector3(1.2, 1.2, 1.2));
    leaves.setMatrixAt(i, m);
  }
  leaves.castShadow = true;
  group.add(leaves);

  // wrapping paper: a crinkled cone, two layers (outer red paper, inner dark tissue)
  const paper = (
    r0: number,
    r1: number,
    height: number,
    seed: number,
    jag: number,
  ) => {
    const r = seeded(seed);
    const seg = 56;
    const g = new THREE.CylinderGeometry(r1, r0, height, seg, 8, true);
    g.translate(0, height / 2, 0);
    const p = g.attributes.position!;
    const folds: number[] = [];
    for (let i = 0; i <= seg; i++) folds.push(r());
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const idx = Math.round(((a + Math.PI) / (Math.PI * 2)) * seg);
      const t = y / height;
      const tri =
        Math.abs((((((a * 8) / Math.PI + t * 0.7) % 2) + 2) % 2) - 1) - 0.5; // sharp pleats
      const crinkle =
        1 +
        tri * 0.16 * (0.3 + t) +
        Math.sin(a * 23 + t * 5) * 0.02 * t +
        (folds[idx % seg]! - 0.5) * 0.08 * t;
      let yy = y;
      if (t > 0.98)
        yy += (folds[idx % seg]! - 0.5) * jag + Math.sin(a * 5) * jag * 0.5;
      p.setXYZ(i, x * crinkle, yy, z * crinkle);
    }
    g.computeVertexNormals();
    return g;
  };
  const redPaper = new THREE.MeshPhysicalMaterial({
    color: "#8a0c16",
    roughness: 0.55,
    sheen: 0.25,
    sheenColor: new THREE.Color("#ff5050"),
    clearcoat: 0.08,
    side: THREE.DoubleSide,
  });
  const tissue = new THREE.MeshStandardMaterial({
    color: "#5c0a12",
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  group.add(mesh(paper(0.03, 0.2, 0.42, 5, 0.06), redPaper));
  const inner = mesh(paper(0.025, 0.17, 0.4, 9, 0.08), tissue);
  inner.rotation.y = 0.4;
  group.add(inner);
  // stems poking out of the bottom + ribbon
  const stub = mesh(
    new THREE.CylinderGeometry(0.018, 0.016, 0.12, 12),
    stemMat,
    0,
    -0.03,
    0,
  );
  group.add(stub);
  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: "#f3e7d3",
    roughness: 0.3,
    sheen: 1,
    sheenColor: new THREE.Color("#ffffff"),
  });
  const band = mesh(
    new THREE.TorusGeometry(0.036, 0.006, 8, 32),
    ribbonMat,
    0,
    0.06,
    0,
  );
  band.rotation.x = Math.PI / 2;
  group.add(band);
  for (const s of [-1, 1]) {
    const loop = mesh(
      new THREE.TorusGeometry(0.028, 0.005, 6, 24),
      ribbonMat,
      s * 0.03,
      0.07,
      0.035,
    );
    loop.scale.set(1, 0.55, 1);
    loop.rotation.set(0.2, 0, s * 0.5);
    group.add(loop);
    const tail = mesh(
      new THREE.BoxGeometry(0.012, 0.1, 0.002),
      ribbonMat,
      s * 0.012,
      0.01,
      0.04,
    );
    tail.rotation.z = s * 0.25;
    group.add(tail);
  }
  return group;
}

/* ---------------- the ring box ---------------- */

function ringBox() {
  const g = new THREE.Group();
  const velvet = new THREE.MeshPhysicalMaterial({
    color: "#4a0a14",
    roughness: 0.95,
    sheen: 1,
    sheenColor: new THREE.Color("#c2384e"),
    sheenRoughness: 0.6,
  });
  const satin = new THREE.MeshPhysicalMaterial({
    color: "#f2e9dc",
    roughness: 0.35,
    sheen: 0.8,
    sheenColor: new THREE.Color("#ffffff"),
  });
  const cushionMat = new THREE.MeshPhysicalMaterial({
    color: "#2a060b",
    roughness: 0.95,
    sheen: 1,
    sheenColor: new THREE.Color("#a03045"),
  });
  const W = 0.066;
  const D = 0.06;
  g.add(mesh(rbox(W, 0.034, D, 0.006, 3), velvet, 0, 0.017, 0));
  // cushion with the slot
  for (const s of [-1, 1]) {
    const c = mesh(
      new THREE.CapsuleGeometry(0.009, W - 0.026, 4, 12),
      cushionMat,
      0,
      0.034,
      s * 0.01,
    );
    c.rotation.z = Math.PI / 2;
    g.add(c);
  }
  // hinged lid, open ~105°
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.034, -D / 2);
  hinge.rotation.x = -1.85;
  g.add(hinge);
  hinge.add(mesh(rbox(W, 0.022, D, 0.006, 3), velvet, 0, 0.011, D / 2));
  const lining = mesh(
    new THREE.PlaneGeometry(W - 0.01, D - 0.01),
    satin,
    0,
    -0.0005,
    D / 2,
    false,
  );
  lining.rotation.x = Math.PI / 2;
  hinge.add(lining);
  const brass = metal("#c9a45c", 0.25);
  hinge.add(
    mesh(
      new THREE.CylinderGeometry(0.002, 0.002, W * 0.8, 8),
      brass,
      0,
      0,
      0,
    ).rotateZ(Math.PI / 2),
  );
  // two plain bands, polished silver (as in their selfie)
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: "#e6e6e8",
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 4,
    clearcoat: 0.5,
  });
  const ringA = mesh(
    new THREE.TorusGeometry(0.0095, 0.0016, 16, 64),
    ringMat,
    -0.012,
    0.045,
    0,
  );
  const ringB = mesh(
    new THREE.TorusGeometry(0.0085, 0.0015, 16, 64),
    ringMat,
    0.012,
    0.044,
    0,
  );
  ringA.scale.set(1, 1, 1.5);
  ringB.scale.set(1, 1, 1.5);
  ringA.rotation.y = 0.15;
  ringB.rotation.y = -0.15;
  g.add(ringA, ringB);
  return g;
}

/* ---------------- furniture ---------------- */

function chair(wood: THREE.Material, seatMat: THREE.Material) {
  const g = new THREE.Group();
  const legGeo = new THREE.BoxGeometry(0.035, 0.45, 0.035);
  for (const [x, z] of [
    [-0.2, 0.2],
    [0.2, 0.2],
    [-0.2, -0.2],
    [0.2, -0.2],
  ] as const)
    g.add(mesh(legGeo, wood, x, 0.225, z));
  g.add(mesh(rbox(0.46, 0.05, 0.46, 0.015), seatMat, 0, 0.47, 0));
  // back posts + rails + slats
  const post = new THREE.BoxGeometry(0.035, 0.48, 0.035);
  for (const x of [-0.2, 0.2]) {
    const p = mesh(post, wood, x, 0.72, -0.21);
    p.rotation.x = -0.08;
    g.add(p);
  }
  const top = mesh(rbox(0.44, 0.07, 0.025, 0.008), wood, 0, 0.92, -0.225);
  top.rotation.x = -0.08;
  g.add(top);
  for (const x of [-0.08, 0, 0.08]) {
    const s = mesh(
      new THREE.BoxGeometry(0.03, 0.3, 0.012),
      wood,
      x,
      0.7,
      -0.21,
    );
    s.rotation.x = -0.08;
    g.add(s);
  }
  g.add(
    mesh(new THREE.BoxGeometry(0.4, 0.03, 0.02), wood, 0, 0.12, 0.2),
    mesh(new THREE.BoxGeometry(0.4, 0.03, 0.02), wood, 0, 0.12, -0.2),
  );
  return g;
}

function candle(
  height: number,
  wax: THREE.Material,
  flameMat: THREE.Material,
  holderMat: THREE.Material | null,
) {
  const g = new THREE.Group();
  let base = 0;
  if (holderMat) {
    const prof = [
      [0, 0],
      [0.032, 0],
      [0.034, 0.006],
      [0.012, 0.016],
      [0.008, 0.05],
      [0.014, 0.075],
      [0.018, 0.085],
      [0.012, 0.088],
      [0, 0.088],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    g.add(mesh(new THREE.LatheGeometry(prof, 24), holderMat));
    base = 0.086;
  }
  const body = mesh(
    new THREE.CylinderGeometry(0.011, 0.012, height, 16),
    wax,
    0,
    base + height / 2,
  );
  g.add(body);
  // a little melted pool on top
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.0115, 0.011, 0.004, 16),
      wax,
      0,
      base + height + 0.001,
      0,
      false,
    ),
  );
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.0007, 0.0007, 0.01, 4),
      new THREE.MeshStandardMaterial({ color: "#111" }),
      0,
      base + height + 0.006,
      0,
      false,
    ),
  );
  const flame = mesh(
    new THREE.SphereGeometry(0.0055, 12, 8),
    flameMat,
    0,
    base + height + 0.017,
    0,
    false,
  );
  flame.scale.set(1, 2.6, 1);
  flame.userData.dynamic = true;
  g.add(flame);
  return { group: g, flame, top: base + height + 0.02 };
}

function tealight(
  waxMat: THREE.Material,
  flameMat: THREE.Material,
  glassMat: THREE.Material,
) {
  const g = new THREE.Group();
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.03, 0.028, 0.065, 20, 1, true),
      glassMat,
      0,
      0.0325,
      0,
      false,
    ),
  );
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 0.016, 16),
      metal("#b9b9b9", 0.35),
      0,
      0.008,
    ),
  );
  g.add(
    mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.002, 16),
      waxMat,
      0,
      0.016,
      0,
      false,
    ),
  );
  const flame = mesh(
    new THREE.SphereGeometry(0.004, 10, 6),
    flameMat,
    0,
    0.026,
    0,
    false,
  );
  flame.scale.set(1, 2.4, 1);
  flame.userData.dynamic = true;
  g.add(flame);
  return { group: g, flame };
}

function wineGlassGeometry() {
  const prof = [
    [0, 0],
    [0.034, 0],
    [0.035, 0.003],
    [0.006, 0.006],
    [0.0035, 0.02],
    [0.0035, 0.09],
    [0.012, 0.1],
    [0.034, 0.125],
    [0.042, 0.16],
    [0.038, 0.205],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  return new THREE.LatheGeometry(prof, 28);
}

function tumblerGeometry() {
  const prof = [
    [0, 0.0],
    [0.035, 0],
    [0.037, 0.005],
    [0.04, 0.095],
    [0.0375, 0.095],
    [0.0345, 0.012],
    [0, 0.012],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  return new THREE.LatheGeometry(prof, 28);
}

function fluteGeometry() {
  const prof = [
    [0, 0],
    [0.032, 0],
    [0.033, 0.003],
    [0.005, 0.006],
    [0.003, 0.02],
    [0.003, 0.1],
    [0.012, 0.11],
    [0.024, 0.16],
    [0.025, 0.23],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  return new THREE.LatheGeometry(prof, 24);
}

function mugGeometry() {
  const prof = [
    [0, 0],
    [0.036, 0],
    [0.039, 0.004],
    [0.04, 0.092],
    [0.037, 0.093],
    [0.036, 0.008],
    [0, 0.008],
  ].map(([r, y]) => new THREE.Vector2(r!, y!));
  const body = new THREE.LatheGeometry(prof, 24);
  const handle = new THREE.TorusGeometry(0.026, 0.006, 8, 16, Math.PI);
  handle.rotateZ(-Math.PI / 2);
  handle.translate(0.038, 0.048, 0);
  const g = mergeGeometries([body.toNonIndexed(), handle.toNonIndexed()]);
  if (!g) throw new Error("mug merge failed");
  return g;
}

function abstractArt() {
  return canvasTex(768, 512, (g) => {
    const rand = seeded(5);
    g.fillStyle = "#e9dfcf";
    g.fillRect(0, 0, 768, 512);
    const cols = [
      "#b5543c",
      "#d99a5b",
      "#3d4a5c",
      "#7a2e2a",
      "#c9b18e",
      "#1f2a33",
    ];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = cols[Math.floor(rand() * cols.length)]!;
      g.globalAlpha = 0.5 + rand() * 0.5;
      g.beginPath();
      const x = rand() * 768;
      const y = rand() * 512;
      if (rand() < 0.5)
        g.arc(x, y, 20 + rand() * 120, rand() * 6, rand() * 6 + 2.5);
      else g.rect(x, y, 30 + rand() * 200, 10 + rand() * 60);
      g.fill();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 8000; i++) {
      g.fillStyle = `rgba(0,0,0,${rand() * 0.05})`;
      g.fillRect(rand() * 768, rand() * 512, 2, 2);
    }
  });
}

/** Merges every static mesh under `root` that shares a material (and shadow flags) into one draw call. */
function batchStatic(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const buckets = new Map<
    string,
    {
      mat: THREE.Material;
      cast: boolean;
      receive: boolean;
      geos: THREE.BufferGeometry[];
      meshes: THREE.Mesh[];
    }
  >();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (
      !m.isMesh ||
      (m as THREE.InstancedMesh).isInstancedMesh ||
      m.userData.dynamic ||
      Array.isArray(m.material)
    )
      return;
    if (m.matrixWorld.determinant() < 0) return;
    const mat = m.material as THREE.Material;
    const key = `${mat.uuid}:${m.castShadow}:${m.receiveShadow}`;
    let b = buckets.get(key);
    if (!b)
      buckets.set(
        key,
        (b = {
          mat,
          cast: m.castShadow,
          receive: m.receiveShadow,
          geos: [],
          meshes: [],
        }),
      );
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(g.attributes))
      if (name !== "position" && name !== "normal" && name !== "uv")
        g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv)
      g.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(g.attributes.position!.count * 2),
          2,
        ),
      );
    g = g.applyMatrix4(m.matrixWorld);
    b.geos.push(g);
    b.meshes.push(m);
  });
  for (const b of buckets.values()) {
    if (b.meshes.length < 2) continue;
    const merged = mergeGeometries(b.geos);
    if (!merged) continue;
    for (const m of b.meshes) m.removeFromParent();
    const one = new THREE.Mesh(merged, b.mat);
    one.castShadow = b.cast;
    one.receiveShadow = b.receive;
    root.add(one);
  }
}

/* ---------------- the scene ---------------- */

const scene: SceneModule = {
  id: "casa",
  title: "casa",
  build(ctx: SceneCtx) {
    const S = new THREE.Group(); // everything static of this room (batched at the end)
    ctx.scene.add(S);
    const hi = ctx.quality === "high";
    RectAreaLightUniformsLib.init();
    ctx.scene.background = new THREE.Color("#020205");
    ctx.scene.environmentIntensity = 0.12; // night: keep the image-based fill low

    /* ---- materials ---- */
    const wallMat = new THREE.MeshStandardMaterial({
      map: plasterTex("#d6c09e", 31),
      roughness: 0.92,
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      map: plasterTex("#ece5d9", 33),
      roughness: 0.95,
    });
    const floorMat = rep(
      woodPlanks("#9a6b43", 6, 41),
      (RX * 2) / 1.2,
      (RZ * 2) / 1.2,
      { roughness: 0.6 },
    );
    const tableWood = woodPlanks("#c8a57c", 5, 43);
    const darkWood = woodPlanks("#3b2416", 4, 47);
    const midWood = woodPlanks("#9c7048", 4, 49);
    const trim = new THREE.MeshStandardMaterial({
      color: "#f1ebe1",
      roughness: 0.5,
    });
    const granite = rep(
      marble("#2b2725", "rgba(200,190,175,0.25)", 53),
      2,
      0.5,
      { roughness: 0.25, metalness: 0.05 },
    );
    const flameMat = emissive("#ffb257", 9);
    const wax = new THREE.MeshPhysicalMaterial({
      color: "#f4ead8",
      roughness: 0.55,
      transmission: 0,
      sheen: 0.3,
      emissive: "#ff9a40",
      emissiveIntensity: 0.06,
    });
    const brass = metal("#b8914f", 0.3);
    const blackMetal = metal("#1b1b1b", 0.45);

    /* ---- shell: floor, ceiling, walls ---- */
    const floor = mesh(
      new THREE.PlaneGeometry(RX * 2, RZ * 2),
      floorMat,
      0,
      0,
      0,
      false,
    );
    floor.rotation.x = -Math.PI / 2;
    S.add(floor);
    const ceil = mesh(
      new THREE.PlaneGeometry(RX * 2, RZ * 2),
      ceilMat,
      0,
      H,
      0,
      false,
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.receiveShadow = false;
    S.add(ceil);

    const PT = { x0: -1.6, x1: 0.2, y0: 1.05, y1: 2.05 }; // kitchen pass-through
    const WIN = { z0: -1.7, z1: 0.9, y0: 0.08, y1: 2.42 }; // balcony window
    const DOOR = { x0: 2.15, x1: 3.05 };

    const back = mesh(
      holedWall(-RX, RX, H, [[PT.x0, PT.y0, PT.x1, PT.y1]]),
      wallMat,
      0,
      0,
      -RZ,
      false,
    );
    const left = mesh(
      holedWall(-RZ, RZ, H, [[-WIN.z1, WIN.y0, -WIN.z0, WIN.y1]]),
      wallMat,
      -RX,
      0,
      0,
      false,
    );
    left.rotation.y = Math.PI / 2;
    const right = mesh(holedWall(-RZ, RZ, H, []), wallMat, RX, 0, 0, false);
    right.rotation.y = -Math.PI / 2;
    const front = mesh(
      holedWall(-RX, RX, H, [[-DOOR.x1, 0, -DOOR.x0, 2.1]]),
      wallMat,
      0,
      0,
      RZ,
      false,
    );
    front.rotation.y = Math.PI;
    S.add(back, left, right, front);
    ctx.wall(-RX - 1, -RZ - T, RX + 1, -RZ); // back (pass-through sill is above reach)
    ctx.wall(-RX - T, -RZ - 1, -RX, RZ + 1);
    ctx.wall(RX, -RZ - 1, RX + T, RZ + 1);
    ctx.wall(-RX - 1, RZ, RX + 1, RZ + T);

    // baseboards and a crown moulding all around
    const skirtGeo = (len: number) => new THREE.BoxGeometry(len, 0.08, 0.015);
    const crownGeo = (len: number) => new THREE.BoxGeometry(len, 0.06, 0.04);
    const ring = (
      geo: (l: number) => THREE.BufferGeometry,
      y: number,
      inset: number,
      skipFront: boolean,
    ) => {
      const parts: THREE.BufferGeometry[] = [];
      const add = (
        g: THREE.BufferGeometry,
        x: number,
        z: number,
        ry: number,
      ) => {
        g.rotateY(ry);
        g.translate(x, y, z);
        parts.push(g);
      };
      add(geo(RX * 2), 0, -RZ + inset, 0);
      add(geo(RZ * 2), -RX + inset, 0, Math.PI / 2);
      add(geo(RZ * 2), RX - inset, 0, Math.PI / 2);
      if (skipFront) {
        add(
          geo(DOOR.x0 + RX - 0.08),
          (-RX + DOOR.x0 - 0.08) / 2,
          RZ - inset,
          0,
        );
        add(geo(RX - DOOR.x1 - 0.08), (RX + DOOR.x1 + 0.08) / 2, RZ - inset, 0);
      } else add(geo(RX * 2), 0, RZ - inset, 0);
      return mergeGeometries(parts)!;
    };
    S.add(mesh(ring(skirtGeo, 0.04, 0.0075, true), trim, 0, 0, 0, false));
    S.add(mesh(ring(crownGeo, H - 0.03, 0.02, false), trim, 0, 0, 0, false));

    /* ---- kitchen behind the pass-through ---- */
    const K = { x0: -2.7, x1: 1.3, z0: -5.0, z1: -RZ - T };
    const kTiles = tiles("#ece9e3", "#c9c4bb", 4, 61, 0.2);
    const kFloor = mesh(
      new THREE.PlaneGeometry(K.x1 - K.x0, K.z1 - K.z0),
      rep(
        tiles("#cfc6b8", "#a69d90", 2, 63, 0.4),
        (K.x1 - K.x0) / 1.2,
        (K.z1 - K.z0) / 1.2,
      ),
      (K.x0 + K.x1) / 2,
      0,
      (K.z0 + K.z1) / 2,
      false,
    );
    kFloor.rotation.x = -Math.PI / 2;
    const kCeil = mesh(
      new THREE.PlaneGeometry(K.x1 - K.x0, K.z1 - K.z0),
      ceilMat,
      (K.x0 + K.x1) / 2,
      2.5,
      (K.z0 + K.z1) / 2,
      false,
    );
    kCeil.rotation.x = Math.PI / 2;
    const kBack = mesh(
      new THREE.PlaneGeometry(K.x1 - K.x0, 2.5),
      rep(kTiles, (K.x1 - K.x0) / 0.6, 2.5 / 0.6, { roughness: 0.3 }),
      (K.x0 + K.x1) / 2,
      1.25,
      K.z0,
      false,
    );
    const kL = mesh(
      new THREE.PlaneGeometry(K.z1 - K.z0, 2.5),
      rep(kTiles, (K.z1 - K.z0) / 0.6, 2.5 / 0.6),
      K.x0,
      1.25,
      (K.z0 + K.z1) / 2,
      false,
    );
    kL.rotation.y = Math.PI / 2;
    const kR = mesh(
      new THREE.PlaneGeometry(K.z1 - K.z0, 2.5),
      rep(kTiles, (K.z1 - K.z0) / 0.6, 2.5 / 0.6),
      K.x1,
      1.25,
      (K.z0 + K.z1) / 2,
      false,
    );
    kR.rotation.y = -Math.PI / 2;
    // kitchen side of the dividing wall
    const kFrontWall = mesh(
      holedWall(K.x0, K.x1, 2.5, [[PT.x0, PT.y0, PT.x1, PT.y1]]),
      new THREE.MeshStandardMaterial({
        map: plasterTex("#efe9df", 35),
        roughness: 0.9,
      }),
      0,
      0,
      K.z1,
      false,
    );
    kFrontWall.rotation.y = Math.PI;
    kFrontWall.scale.x = -1;
    S.add(kFloor, kCeil, kBack, kL, kR, kFrontWall);
    // pass-through: reveals + granite sill sticking out on both sides
    const reveal = new THREE.BoxGeometry(0.02, PT.y1 - PT.y0, T);
    S.add(
      mesh(
        reveal,
        wallMat,
        PT.x0 - 0.01,
        (PT.y0 + PT.y1) / 2,
        -RZ - T / 2,
        false,
      ),
      mesh(
        reveal,
        wallMat,
        PT.x1 + 0.01,
        (PT.y0 + PT.y1) / 2,
        -RZ - T / 2,
        false,
      ),
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(PT.x1 - PT.x0, 0.02, T),
        wallMat,
        (PT.x0 + PT.x1) / 2,
        PT.y1 + 0.01,
        -RZ - T / 2,
        false,
      ),
    );
    S.add(
      mesh(
        rbox(PT.x1 - PT.x0 + 0.1, 0.035, T + 0.36, 0.008),
        granite,
        (PT.x0 + PT.x1) / 2,
        PT.y0 - 0.0175,
        -RZ - T / 2 + 0.06,
      ),
    );
    // a string of fairy lights draped along the front of the pass-through sill
    {
      const n = hi ? 60 : 36;
      const bulbs = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.006, 8, 6),
        emissive("#ffc773", 5),
        n,
      );
      const wirePts: THREE.Vector3[] = [];
      const m4 = new THREE.Matrix4();
      const sags = 4;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = PT.x0 - 0.02 + t * (PT.x1 - PT.x0 + 0.04);
        const local = (t * sags) % 1;
        const y = PT.y0 - 0.04 - Math.sin(local * Math.PI) * 0.09;
        const p = new THREE.Vector3(x, y, -RZ + 0.25);
        wirePts.push(p);
        m4.makeTranslation(p.x, p.y - 0.008, p.z);
        bulbs.setMatrixAt(i, m4);
      }
      S.add(bulbs);
      const wire = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(wirePts),
          n * 2,
          0.0012,
          4,
        ),
        new THREE.MeshStandardMaterial({ color: "#3a3020", roughness: 0.6 }),
      );
      S.add(wire);
      const fairyGlow = new THREE.PointLight("#ffb860", 0.5, 2.5, 2);
      fairyGlow.position.set((PT.x0 + PT.x1) / 2, PT.y0 - 0.1, -RZ + 0.35);
      S.add(fairyGlow);
    }
    // fruit bowl and a small jar on the pass-through
    const bowl = mesh(
      new THREE.SphereGeometry(
        0.11,
        24,
        12,
        0,
        Math.PI * 2,
        Math.PI / 2,
        Math.PI / 2,
      ),
      new THREE.MeshStandardMaterial({
        color: "#f3efe8",
        roughness: 0.25,
        side: THREE.DoubleSide,
      }),
      -1.25,
      PT.y0 + 0.11,
      -RZ + 0.05,
    );
    bowl.scale.y = 0.55;
    S.add(bowl);
    const fruitCols = ["#e0a12a", "#d9541e", "#9bb03a", "#e0a12a"];
    fruitCols.forEach((c, i) =>
      S.add(
        mesh(
          new THREE.SphereGeometry(0.035, 16, 12),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }),
          -1.25 + Math.cos(i * 1.6) * 0.04,
          PT.y0 + 0.07 + (i === 3 ? 0.04 : 0),
          -RZ + 0.05 + Math.sin(i * 1.6) * 0.04,
        ),
      ),
    );

    // base cabinets, counter, upper cabinets along the kitchen back wall
    const white = new THREE.MeshStandardMaterial({
      color: "#f2f0ec",
      roughness: 0.35,
    });
    const steel = metal("#c9cbcd", 0.28);
    const kLen = K.x1 - K.x0 - 0.75; // leave room for the fridge
    const kx0 = K.x0;
    S.add(
      mesh(
        new THREE.BoxGeometry(kLen, 0.86, 0.58),
        white,
        kx0 + kLen / 2,
        0.43,
        K.z0 + 0.29,
      ),
    );
    S.add(
      mesh(
        rbox(kLen + 0.02, 0.03, 0.62, 0.006),
        granite,
        kx0 + kLen / 2,
        0.875,
        K.z0 + 0.31,
      ),
    );
    const handleGeo = new THREE.BoxGeometry(0.12, 0.012, 0.015);
    for (let x = kx0 + 0.3; x < kx0 + kLen; x += 0.6) {
      S.add(
        mesh(
          new THREE.BoxGeometry(0.003, 0.84, 0.003),
          new THREE.MeshStandardMaterial({ color: "#bdb9b2" }),
          x + 0.3,
          0.43,
          K.z0 + 0.581,
          false,
        ),
      );
      S.add(mesh(handleGeo, steel, x, 0.78, K.z0 + 0.59, false));
      S.add(
        mesh(
          new THREE.BoxGeometry(0.58, 0.68, 0.34),
          white,
          x,
          1.92,
          K.z0 + 0.17,
        ),
      );
    }
    // range hood + cooktop
    S.add(
      mesh(
        new THREE.BoxGeometry(0.6, 0.12, 0.45),
        steel,
        kx0 + 1.65,
        1.52,
        K.z0 + 0.225,
      ),
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(0.58, 0.008, 0.5),
        new THREE.MeshStandardMaterial({ color: "#0b0b0b", roughness: 0.1 }),
        kx0 + 1.65,
        0.894,
        K.z0 + 0.3,
        false,
      ),
    );
    // fridge
    S.add(
      mesh(rbox(0.7, 1.85, 0.68, 0.02), steel, K.x1 - 0.37, 0.925, K.z0 + 0.36),
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(0.02, 0.6, 0.02),
        metal("#888", 0.3),
        K.x1 - 0.68,
        1.2,
        K.z0 + 0.71,
        false,
      ),
    );
    // kettle, coffee machine, microwave, bottles
    const kettleProf = [
      [0, 0],
      [0.075, 0],
      [0.08, 0.02],
      [0.078, 0.15],
      [0.06, 0.2],
      [0.03, 0.215],
      [0, 0.215],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    const kettle = new THREE.Group();
    kettle.add(
      mesh(
        new THREE.LatheGeometry(kettleProf, 24),
        new THREE.MeshStandardMaterial({ color: "#f6f4f0", roughness: 0.2 }),
      ),
    );
    const kh = mesh(
      new THREE.TorusGeometry(0.07, 0.012, 8, 16, Math.PI),
      blackMetal,
      -0.06,
      0.13,
      0,
    );
    kh.rotation.z = Math.PI / 2;
    kettle.add(
      kh,
      mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.015, 24),
        blackMetal,
        0,
        -0.008,
        0,
      ),
    );
    kettle.position.set(kx0 + 0.55, 0.89, K.z0 + 0.3);
    S.add(kettle);
    const coffee = new THREE.Group();
    coffee.add(mesh(rbox(0.2, 0.32, 0.3, 0.02), white, 0, 0.16, 0));
    coffee.add(mesh(rbox(0.16, 0.06, 0.12, 0.01), blackMetal, 0, 0.22, 0.17));
    coffee.add(
      mesh(new THREE.BoxGeometry(0.14, 0.01, 0.1), steel, 0, 0.03, 0.17),
    );
    coffee.position.set(kx0 + 0.95, 0.89, K.z0 + 0.25);
    S.add(coffee);
    const micro = mesh(
      rbox(0.48, 0.28, 0.36, 0.01),
      new THREE.MeshStandardMaterial({ color: "#1d1d1f", roughness: 0.3 }),
      kx0 + 2.45,
      0.89 + 0.14,
      K.z0 + 0.22,
    );
    S.add(micro);
    const bottleMat = new THREE.MeshPhysicalMaterial({
      color: "#3d5a2a",
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 3; i++)
      S.add(
        mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.24, 12),
          bottleMat,
          kx0 + 2.0 + i * 0.08,
          1.01,
          K.z0 + 0.12,
        ),
      );
    // downlights (the brightest place in the scene, like the video)
    const dlGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.01, 20);
    const dlMat = emissive("#fff1d8", 6);
    for (const x of [-1.35, -0.05]) {
      S.add(mesh(dlGeo, dlMat, x, 2.495, -3.9, false));
      const sp = new THREE.SpotLight("#ffe7c4", 4.5, 6, 0.9, 0.6, 2);
      sp.position.set(x, 2.48, -3.9);
      sp.target.position.set(x, 0, -4.2);
      S.add(sp, sp.target);
    }

    /* ---- balcony window, curtains and the city ---- */
    const frameMat = new THREE.MeshStandardMaterial({
      color: "#2b2b2d",
      roughness: 0.4,
      metalness: 0.6,
    });
    const winW = WIN.z1 - WIN.z0;
    const winH = WIN.y1 - WIN.y0;
    const wz = (WIN.z0 + WIN.z1) / 2;
    const wy = (WIN.y0 + WIN.y1) / 2;
    // frame: sill, head, jambs and a central mullion (sliding doors)
    S.add(
      mesh(
        new THREE.BoxGeometry(T, 0.05, winW),
        frameMat,
        -RX - T / 2,
        WIN.y0,
        wz,
        false,
      ),
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(T, 0.05, winW),
        frameMat,
        -RX - T / 2,
        WIN.y1,
        wz,
        false,
      ),
    );
    for (const z of [WIN.z0, WIN.z1, wz])
      S.add(
        mesh(
          new THREE.BoxGeometry(T, winH, 0.05),
          frameMat,
          -RX - T / 2,
          wy,
          z,
          false,
        ),
      );
    const pane = mesh(
      new THREE.PlaneGeometry(winW, winH),
      glassLite("#c8d8e8", 0.08),
      -RX - T / 2,
      wy,
      wz,
      false,
    );
    pane.rotation.y = Math.PI / 2;
    S.add(pane);
    // balcony: slab + glass railing
    const balc = mesh(
      new THREE.BoxGeometry(1.4, 0.1, 4.2),
      rep(tiles("#8d857b", "#6d665e", 3, 65), 2, 6),
      -RX - T - 0.7,
      -0.05,
      wz,
      false,
    );
    S.add(balc);
    S.add(
      mesh(
        new THREE.BoxGeometry(0.05, 0.05, 4.2),
        frameMat,
        -RX - 1.35,
        1.08,
        wz,
        false,
      ),
    );
    const rail = mesh(
      new THREE.PlaneGeometry(4.2, 1.0),
      glassLite("#a8c0c8", 0.12),
      -RX - 1.35,
      0.55,
      wz,
      false,
    );
    rail.rotation.y = Math.PI / 2;
    S.add(rail);
    // a neighbouring tower close by + the skyline far away
    const city = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 80),
      new THREE.MeshBasicMaterial({
        map: skylineTexture(ctx.quality),
        color: new THREE.Color(1.15, 1.15, 1.15),
      }),
    );
    city.position.set(-60, 2, wz);
    city.rotation.y = Math.PI / 2;
    S.add(city);
    const tower = canvasTex(256, 1024, (g) => {
      const rand = seeded(3);
      g.fillStyle = "#0b0a0d";
      g.fillRect(0, 0, 256, 1024);
      for (let y = 10; y < 1024; y += 22) {
        for (let x = 8; x < 250; x += 16) {
          if (rand() < 0.35) {
            g.fillStyle =
              rand() < 0.7
                ? `rgba(255,${180 + rand() * 50},${110 + rand() * 50},0.9)`
                : "rgba(160,190,255,0.7)";
            g.fillRect(x, y, 9, 14);
          } else {
            g.fillStyle = "#151419";
            g.fillRect(x, y, 9, 14);
          }
        }
      }
    });
    const towerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 44),
      new THREE.MeshBasicMaterial({ map: tower }),
    );
    towerMesh.position.set(-34, -8, wz + 13);
    towerMesh.rotation.y = Math.PI / 2 - 0.3;
    S.add(towerMesh);
    // moonlight / city glow through the glass
    const cityGlow = new THREE.RectAreaLight("#8fa4d8", 0.9, winW, winH);
    cityGlow.position.set(-RX - 0.05, wy, wz);
    cityGlow.lookAt(0, wy * 0.6, wz);
    S.add(cityGlow);

    // curtains: heavy linen drapes gathered at the sides + a sheer in the middle
    const curtain = (
      width: number,
      height: number,
      folds: number,
      amp: number,
      seed: number,
    ) => {
      const g = new THREE.PlaneGeometry(
        width,
        height,
        Math.max(24, folds * 6),
        12,
      );
      const p = g.attributes.position!;
      const r = seeded(seed);
      const ph = r() * 6;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const t = (x / width + 0.5) * folds * Math.PI * 2;
        const flare = 1 + (0.5 - y / height) * 0.4;
        p.setZ(
          i,
          Math.sin(t + ph) * amp * flare + Math.sin(t * 2.3) * amp * 0.2,
        );
      }
      g.computeVertexNormals();
      return g;
    };
    const drapeMat = rep(fabric("#7a6a5a", 71), 3, 6, {
      side: THREE.DoubleSide,
    });
    const sheerMat = new THREE.MeshStandardMaterial({
      color: "#e8e0d2",
      roughness: 0.9,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cy = 2.58 / 2 + 0.01;
    for (const [z, w] of [
      [WIN.z0 - 0.15, 0.7],
      [WIN.z1 + 0.15, 0.7],
    ] as const) {
      const d = mesh(
        curtain(w, 2.56, 5, 0.045, z > 0 ? 3 : 4),
        drapeMat,
        -RX + 0.16,
        cy,
        z,
      );
      d.rotation.y = Math.PI / 2;
      S.add(d);
    }
    const sheer = mesh(
      curtain(1.2, 2.5, 7, 0.03, 9),
      sheerMat,
      -RX + 0.1,
      2.5 / 2 + 0.05,
      WIN.z1 - 0.65,
      false,
    );
    sheer.rotation.y = Math.PI / 2;
    S.add(sheer);
    const rod = mesh(
      new THREE.CylinderGeometry(0.012, 0.012, winW + 1.0, 10),
      blackMetal,
      -RX + 0.16,
      2.6,
      wz,
      false,
    );
    rod.rotation.x = Math.PI / 2;
    S.add(rod);

    /* ---- dining table ---- */
    const table = new THREE.Group();
    table.position.set(TABLE.x, 0, TABLE.z);
    const tabTop = mesh(
      rbox(TABLE.w, 0.04, TABLE.d, 0.012, 3),
      rep(tableWood, 1.4, 0.8, { roughness: 0.45 }),
      0,
      TABLE.h - 0.02,
      0,
    );
    table.add(tabTop);
    const legMat = rep(tableWood, 0.1, 1);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        table.add(
          mesh(
            new THREE.BoxGeometry(0.06, TABLE.h - 0.04, 0.06),
            legMat,
            sx * (TABLE.w / 2 - 0.08),
            (TABLE.h - 0.04) / 2,
            sz * (TABLE.d / 2 - 0.08),
          ),
        );
    table.add(
      mesh(
        new THREE.BoxGeometry(TABLE.w - 0.2, 0.08, 0.02),
        legMat,
        0,
        TABLE.h - 0.08,
        TABLE.d / 2 - 0.08,
      ),
      mesh(
        new THREE.BoxGeometry(TABLE.w - 0.2, 0.08, 0.02),
        legMat,
        0,
        TABLE.h - 0.08,
        -TABLE.d / 2 + 0.08,
      ),
    );
    S.add(table);
    ctx.solid(tabTop, 0.02);
    // table runner
    const runner = mesh(
      new THREE.BoxGeometry(TABLE.w * 0.9, 0.003, 0.32),
      rep(fabric("#8a2a2c", 73), 3, 1, { roughness: 0.95 }),
      TABLE.x,
      TABLE.h + 0.0015,
      TABLE.z,
      false,
    );
    S.add(runner);

    const chairWood = new THREE.MeshStandardMaterial({
      color: "#24170f",
      roughness: 0.45,
    });
    const seatMat = rep(fabric("#3a3330", 75), 1, 1);
    const chairs: [number, number, number][] = [
      [TABLE.x - 0.42, TABLE.z - 0.6, 0],
      [TABLE.x + 0.42, TABLE.z - 0.6, 0.05],
      [TABLE.x - 0.42, TABLE.z + 0.62, Math.PI],
      [TABLE.x + 0.5, TABLE.z + 0.78, Math.PI - 0.35],
    ];
    for (const [x, z, r] of chairs) {
      const c = chair(chairWood, seatMat);
      c.position.set(x, 0, z);
      c.rotation.y = r;
      S.add(c);
      ctx.solid(c, 0.02);
    }

    /* ---- on the table: roses, ring box, gift, bag, candles, wine ---- */
    const y0 = TABLE.h;
    const bq = bouquet(ctx.quality);
    const tilt = new THREE.Group();
    tilt.add(bq);
    tilt.rotation.z = -1.33; // lies on the table, heads raised by the cone
    const bqHolder = new THREE.Group();
    bqHolder.add(tilt);
    bqHolder.position.set(TABLE.x - 0.18, y0 + 0.035, TABLE.z - 0.02);
    bqHolder.rotation.y = -0.45;
    S.add(bqHolder);
    // a couple of fallen petals
    const loose = petalGeometry(
      0.045,
      0.026,
      0.04,
      0.4,
      () => new THREE.Color("#9a0f1e"),
    );
    const looseMat = new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.55,
      sheen: 1,
      sheenColor: new THREE.Color("#ff3040"),
      side: THREE.DoubleSide,
    });
    for (const [x, z, r] of [
      [0.42, 0.18, 0.4],
      [0.55, 0.05, 2.1],
      [0.3, 0.3, 4.0],
    ] as const) {
      const p = mesh(
        loose,
        looseMat,
        TABLE.x + x,
        y0 + 0.006,
        TABLE.z + z,
        false,
      );
      p.rotation.set(-Math.PI / 2 + 0.25, 0, r);
      S.add(p);
    }

    const rb = ringBox();
    rb.position.set(TABLE.x + 0.45, y0, TABLE.z + 0.2);
    rb.rotation.y = 0.75;
    S.add(rb);

    // gift box with a satin ribbon
    const gift = new THREE.Group();
    gift.add(
      mesh(
        rbox(0.14, 0.1, 0.14, 0.004),
        new THREE.MeshStandardMaterial({ color: "#1d1d22", roughness: 0.5 }),
        0,
        0.05,
        0,
      ),
    );
    gift.add(
      mesh(
        rbox(0.148, 0.03, 0.148, 0.004),
        new THREE.MeshStandardMaterial({ color: "#1d1d22", roughness: 0.45 }),
        0,
        0.095,
        0,
      ),
    );
    const ribbon = new THREE.MeshPhysicalMaterial({
      color: "#a3121e",
      roughness: 0.3,
      sheen: 1,
      sheenColor: new THREE.Color("#ff8080"),
    });
    gift.add(
      mesh(new THREE.BoxGeometry(0.152, 0.112, 0.02), ribbon, 0, 0.056, 0),
      mesh(new THREE.BoxGeometry(0.02, 0.112, 0.152), ribbon, 0, 0.056, 0),
    );
    for (const s of [-1, 1]) {
      const l = mesh(
        new THREE.TorusGeometry(0.022, 0.006, 6, 18),
        ribbon,
        s * 0.02,
        0.122,
        0,
      );
      l.scale.set(1, 0.6, 1);
      l.rotation.z = s * 0.4;
      gift.add(l);
    }
    gift.position.set(TABLE.x - 0.62, y0, TABLE.z + 0.25);
    gift.rotation.y = 0.3;
    S.add(gift);

    // her black bag
    const bag = new THREE.Group();
    const bagLeather = rep(leather("#141215", 81), 1, 1, { roughness: 0.55 });
    bag.add(mesh(rbox(0.3, 0.2, 0.11, 0.035, 3), bagLeather, 0, 0.1, 0));
    const strap = mesh(
      new THREE.TorusGeometry(0.1, 0.008, 6, 24, Math.PI),
      bagLeather,
      0,
      0.19,
      0,
    );
    bag.add(strap);
    bag.add(
      mesh(
        new THREE.BoxGeometry(0.06, 0.02, 0.005),
        brass,
        0,
        0.16,
        0.057,
        false,
      ),
    );
    bag.position.set(TABLE.x - 0.58, y0, TABLE.z - 0.28);
    bag.rotation.y = -0.2;
    S.add(bag);

    // candles: two tapers in brass holders + tealights
    const flames: { flame: THREE.Object3D; phase: number }[] = [];
    for (const [dx, dz, h] of [
      [-0.05, -0.3, 0.22],
      [0.1, -0.33, 0.18],
    ] as const) {
      const c = candle(h, wax, flameMat, brass);
      c.group.position.set(TABLE.x + dx, y0, TABLE.z + dz);
      S.add(c.group);
      flames.push({ flame: c.flame, phase: dx * 40 });
    }
    const tlGlass = glassLite("#ffd9b0", 0.25);
    for (const [dx, dz] of [
      [0.62, -0.1],
      [-0.25, 0.3],
      [0.05, 0.32],
    ] as const) {
      const t = tealight(wax, flameMat, tlGlass);
      t.group.position.set(TABLE.x + dx, y0, TABLE.z + dz);
      S.add(t.group);
      flames.push({ flame: t.flame, phase: dz * 30 + dx * 7 });
    }
    const candleLight = new THREE.PointLight("#ff9f4a", 0.7, 4.5, 2);
    candleLight.position.set(TABLE.x + 0.02, y0 + 0.42, TABLE.z - 0.32);
    S.add(candleLight);

    // a bottle of red and two glasses
    const wgGeo = wineGlassGeometry();
    const wgMat = glassLite();
    const wineMat = new THREE.MeshPhysicalMaterial({
      color: "#3a0209",
      roughness: 0.05,
      transparent: true,
      opacity: 0.92,
    });
    for (const [dx, dz] of [
      [-0.35, -0.3],
      [-0.12, -0.36],
    ] as const) {
      S.add(mesh(wgGeo, wgMat, TABLE.x + dx, y0, TABLE.z + dz, false));
      const wine = mesh(
        new THREE.SphereGeometry(
          0.038,
          20,
          10,
          0,
          Math.PI * 2,
          Math.PI * 0.55,
          Math.PI * 0.45,
        ),
        wineMat,
        TABLE.x + dx,
        y0 + 0.155,
        TABLE.z + dz,
        false,
      );
      wine.scale.y = 0.8;
      S.add(wine);
    }
    const bottleProf = [
      [0, 0],
      [0.037, 0],
      [0.038, 0.01],
      [0.038, 0.2],
      [0.03, 0.24],
      [0.014, 0.27],
      [0.014, 0.33],
      [0.016, 0.335],
      [0, 0.335],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    const wineBottle = mesh(
      new THREE.LatheGeometry(bottleProf, 24),
      new THREE.MeshPhysicalMaterial({
        color: "#14200f",
        roughness: 0.08,
        clearcoat: 1,
        envMapIntensity: 3,
      }),
      TABLE.x - 0.25,
      y0,
      TABLE.z - 0.2,
    );
    S.add(wineBottle);
    const label = mesh(
      new THREE.CylinderGeometry(0.0385, 0.0385, 0.08, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: "#efe3c8", roughness: 0.8 }),
      TABLE.x - 0.25,
      y0 + 0.11,
      TABLE.z - 0.2,
      false,
    );
    S.add(label);

    // pendant over the table (dimmed low)
    const shadeProf = [
      [0.02, 0],
      [0.06, -0.02],
      [0.17, -0.16],
      [0.18, -0.17],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    const pendant = new THREE.Group();
    pendant.add(
      mesh(
        new THREE.LatheGeometry(shadeProf, 32),
        new THREE.MeshStandardMaterial({
          color: "#1c1b1a",
          roughness: 0.45,
          metalness: 0.5,
          side: THREE.DoubleSide,
        }),
        0,
        0,
        0,
        false,
      ),
    );
    pendant.add(
      mesh(
        new THREE.SphereGeometry(0.04, 16, 12),
        emissive("#ffc98a", 3.5),
        0,
        -0.1,
        0,
        false,
      ),
    );
    pendant.add(
      mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 1.05, 4),
        blackMetal,
        0,
        0.52,
        0,
        false,
      ),
    );
    pendant.add(
      mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
        blackMetal,
        0,
        1.04,
        0,
        false,
      ),
    );
    pendant.position.set(TABLE.x, H - 1.05, TABLE.z);
    S.add(pendant);
    const pendantLight = new THREE.SpotLight("#ffb874", 3, 6, 1.0, 0.7, 2);
    pendantLight.position.set(TABLE.x, H - 1.13, TABLE.z);
    pendantLight.target.position.set(TABLE.x, 0, TABLE.z);
    pendantLight.castShadow = true;
    pendantLight.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
    pendantLight.shadow.bias = -0.0004;
    pendantLight.shadow.normalBias = 0.02;
    pendantLight.shadow.radius = 4;
    S.add(pendantLight, pendantLight.target);

    /* ---- sideboard with the salt lamp, glasses and the photo ---- */
    const SB = { x: 1.35, z: -RZ + 0.23, w: 1.6, h: 0.8, d: 0.44 };
    const sb = new THREE.Group();
    sb.position.set(SB.x, 0, SB.z);
    const sbWood = rep(darkWood, 1.2, 0.6, { roughness: 0.45 });
    sb.add(mesh(rbox(SB.w, 0.035, SB.d, 0.006), sbWood, 0, SB.h - 0.0175, 0));
    sb.add(
      mesh(new THREE.BoxGeometry(SB.w, 0.03, SB.d - 0.02), sbWood, 0, 0.16, 0),
    );
    sb.add(
      mesh(
        new THREE.BoxGeometry(0.03, SB.h - 0.16, SB.d),
        sbWood,
        -SB.w / 2 + 0.015,
        (SB.h + 0.16) / 2,
        0,
      ),
      mesh(
        new THREE.BoxGeometry(0.03, SB.h - 0.16, SB.d),
        sbWood,
        SB.w / 2 - 0.015,
        (SB.h + 0.16) / 2,
        0,
      ),
    );
    sb.add(
      mesh(
        new THREE.BoxGeometry(SB.w, SB.h - 0.16, 0.02),
        sbWood,
        0,
        (SB.h + 0.16) / 2,
        -SB.d / 2 + 0.01,
      ),
    );
    // two doors on the left, an open niche glowing on the right
    sb.add(
      mesh(
        new THREE.BoxGeometry(0.03, SB.h - 0.2, SB.d - 0.02),
        sbWood,
        0.1,
        (SB.h + 0.16) / 2,
        0,
      ),
    );
    for (const x of [-0.55, -0.2]) {
      sb.add(
        mesh(
          rbox(0.34, SB.h - 0.21, 0.02, 0.004),
          sbWood,
          x,
          (SB.h + 0.16) / 2,
          SB.d / 2 - 0.01,
        ),
      );
      sb.add(
        mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8),
          brass,
          x + (x < -0.3 ? 0.14 : -0.14),
          (SB.h + 0.16) / 2,
          SB.d / 2 + 0.008,
          false,
        ),
      );
    }
    sb.add(
      mesh(
        new THREE.BoxGeometry(0.66, 0.012, 0.012),
        emissive("#ff6a24", 3.2),
        0.45,
        SB.h - 0.045,
        SB.d / 2 - 0.04,
        false,
      ),
    );
    for (const x of [-0.45, 0.45])
      for (const z of [-0.15, 0.15])
        sb.add(
          mesh(
            new THREE.CylinderGeometry(0.015, 0.01, 0.16, 10),
            sbWood,
            x,
            0.08,
            z,
          ),
        );
    // books + a basket inside the niche
    const bookCols = ["#6b2c22", "#2d3a4a", "#c9b38a", "#3e4b32", "#8a6a3a"];
    bookCols.forEach((c, i) =>
      sb.add(
        mesh(
          new THREE.BoxGeometry(0.035, 0.22 + (i % 3) * 0.02, 0.17),
          new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }),
          0.2 + i * 0.038,
          0.175 + 0.11 + (i % 3) * 0.01,
          0,
        ),
      ),
    );
    S.add(sb);
    ctx.solid(sb, 0.02);
    const nicheLight = new THREE.PointLight("#ff6a26", 0.6, 1.5, 2);
    nicheLight.position.set(SB.x + 0.45, SB.h - 0.1, SB.z + 0.1);
    S.add(nicheLight);
    const sbTop = SB.h;
    // Himalayan salt lamp: the orange glow of the room
    const saltGeo = new THREE.IcosahedronGeometry(0.085, 3);
    {
      const p = saltGeo.attributes.position!;
      const r = seeded(91);
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n =
          1 +
          Math.sin(v.x * 60 + r() * 0.2) * 0.06 +
          Math.sin(v.y * 45) * 0.08 +
          Math.cos(v.z * 70) * 0.05;
        v.multiplyScalar(n);
        v.y *= 1.35;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      saltGeo.computeVertexNormals();
    }
    const salt = mesh(
      saltGeo,
      new THREE.MeshStandardMaterial({
        color: "#6a2410",
        emissive: "#ff5a18",
        emissiveIntensity: 1.25,
        roughness: 0.7,
      }),
      SB.x - 0.55,
      sbTop + 0.05 + 0.11,
      SB.z + 0.02,
      false,
    );
    S.add(salt);
    S.add(
      mesh(
        new THREE.CylinderGeometry(0.07, 0.08, 0.05, 20),
        rep(midWood, 0.3, 0.1),
        SB.x - 0.55,
        sbTop + 0.025,
        SB.z + 0.02,
      ),
    );
    const saltLight = new THREE.PointLight("#ff6a2a", 1.3, 5, 2);
    saltLight.position.set(SB.x - 0.55, sbTop + 0.22, SB.z + 0.3);
    S.add(saltLight);
    // glassware on a mirrored tray
    const tray = mesh(
      new THREE.BoxGeometry(0.5, 0.012, 0.28),
      new THREE.MeshStandardMaterial({
        color: "#c7b28a",
        metalness: 1,
        roughness: 0.15,
      }),
      SB.x - 0.05,
      sbTop + 0.006,
      SB.z,
      false,
    );
    S.add(tray);
    const gm = glassLite("#ffffff", 0.07);
    const placeGlasses = (
      geo: THREE.BufferGeometry,
      spots: [number, number][],
    ) => {
      const im = new THREE.InstancedMesh(geo, gm, spots.length);
      const m4 = new THREE.Matrix4();
      spots.forEach(([dx, dz], i) => {
        m4.makeTranslation(SB.x + dx, sbTop + 0.012, SB.z + dz);
        im.setMatrixAt(i, m4);
      });
      S.add(im);
    };
    placeGlasses(wineGlassGeometry(), [
      [-0.22, -0.07],
      [-0.12, -0.08],
      [-0.02, -0.07],
    ]);
    placeGlasses(fluteGeometry(), [
      [0.07, -0.08],
      [0.14, -0.06],
    ]);
    placeGlasses(tumblerGeometry(), [
      [-0.2, 0.06],
      [-0.1, 0.07],
      [0.0, 0.06],
      [0.1, 0.07],
      [0.32, 0.1],
      [0.42, 0.09],
    ]);
    // a decanter
    const decProf = [
      [0, 0],
      [0.06, 0],
      [0.07, 0.06],
      [0.05, 0.14],
      [0.018, 0.18],
      [0.018, 0.25],
      [0.024, 0.255],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    S.add(
      mesh(
        new THREE.LatheGeometry(decProf, 28),
        glassLite("#ffffff", 0.18),
        SB.x + 0.3,
        sbTop + 0.012,
        SB.z - 0.08,
        false,
      ),
    );
    // hurricane candle on the sideboard
    const sbCandle = candle(0.12, wax, flameMat, null);
    sbCandle.group.position.set(SB.x + 0.62, sbTop, SB.z + 0.05);
    S.add(sbCandle.group);
    S.add(
      mesh(
        new THREE.CylinderGeometry(0.055, 0.05, 0.22, 24, 1, true),
        glassLite("#ffe6c8", 0.16),
        SB.x + 0.62,
        sbTop + 0.11,
        SB.z + 0.05,
        false,
      ),
    );
    flames.push({ flame: sbCandle.flame, phase: 3.3 });
    // the photo of the rings, standing in a frame
    const PH = { w: 0.2, h: 0.267 };
    ctx.photo(
      "casa-1.webp",
      PH.w,
      PH.h,
      new THREE.Vector3(
        SB.x + 0.62 - 0.27,
        sbTop + PH.h / 2 + 0.03,
        SB.z - 0.05,
      ),
      8,
    );
    const easel = mesh(
      new THREE.BoxGeometry(0.02, PH.h * 0.8, 0.006),
      new THREE.MeshStandardMaterial({ color: "#1d1a17" }),
      SB.x + 0.35,
      sbTop + PH.h * 0.4,
      SB.z - 0.12,
      false,
    );
    easel.rotation.x = 0.35;
    S.add(easel);

    /* ---- living area: sofa, coffee table, rug, floor lamp ---- */
    const sofa = new THREE.Group();
    const sofaFab = rep(fabric("#6d6863", 83), 2, 2);
    sofa.add(mesh(rbox(2.1, 0.24, 0.88, 0.04, 3), sofaFab, 0, 0.2, 0));
    for (const x of [-0.66, 0, 0.66]) {
      sofa.add(mesh(rbox(0.65, 0.16, 0.66, 0.06, 4), sofaFab, x, 0.39, 0.08));
      const bc = mesh(rbox(0.65, 0.46, 0.2, 0.08, 4), sofaFab, x, 0.66, -0.25);
      bc.rotation.x = -0.12;
      sofa.add(bc);
    }
    sofa.add(mesh(rbox(2.1, 0.56, 0.18, 0.04, 3), sofaFab, 0, 0.55, -0.35));
    for (const s of [-1, 1])
      sofa.add(
        mesh(rbox(0.18, 0.58, 0.88, 0.06, 3), sofaFab, s * 0.96, 0.37, 0),
      );
    for (const x of [-0.95, 0.95])
      for (const z of [-0.36, 0.36])
        sofa.add(
          mesh(
            new THREE.CylinderGeometry(0.02, 0.015, 0.08, 8),
            blackMetal,
            x,
            0.04,
            z,
          ),
        );
    const pillowMat1 = rep(fabric("#8c2f2a", 85), 1, 1);
    const pillowMat2 = rep(fabric("#c9a46a", 87), 1, 1);
    const pl1 = mesh(
      rbox(0.42, 0.42, 0.14, 0.07, 4),
      pillowMat1,
      -0.7,
      0.67,
      -0.1,
    );
    pl1.rotation.set(-0.2, 0.2, 0.1);
    const pl2 = mesh(
      rbox(0.4, 0.4, 0.13, 0.07, 4),
      pillowMat2,
      0.72,
      0.66,
      -0.1,
    );
    pl2.rotation.set(-0.2, -0.25, -0.08);
    sofa.add(pl1, pl2);
    // a folded throw
    const throwM = mesh(
      rbox(0.5, 0.05, 0.6, 0.02),
      rep(fabric("#d8cdb9", 89), 1, 1),
      0.55,
      0.5,
      0.12,
    );
    throwM.rotation.y = 0.2;
    sofa.add(throwM);
    sofa.position.set(RX - 0.5, 0, -0.45);
    sofa.rotation.y = -Math.PI / 2;
    S.add(sofa);
    ctx.solid(sofa, 0.02);

    const rug = mesh(
      new THREE.BoxGeometry(1.7, 0.012, 2.3),
      rep(carpet("#b9ab95", 93), 2, 3),
      1.75,
      0.006,
      -0.45,
      false,
    );
    S.add(rug);
    const ct = new THREE.Group();
    ct.add(
      mesh(
        rbox(0.55, 0.04, 1.0, 0.01),
        rep(darkWood, 0.5, 1, { roughness: 0.35 }),
        0,
        0.4,
        0,
      ),
    );
    ct.add(
      mesh(
        new THREE.BoxGeometry(0.5, 0.02, 0.95),
        rep(darkWood, 0.5, 1),
        0,
        0.1,
        0,
      ),
    );
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        ct.add(
          mesh(
            new THREE.BoxGeometry(0.035, 0.38, 0.035),
            blackMetal,
            sx * 0.24,
            0.2,
            sz * 0.46,
          ),
        );
    ct.add(
      mesh(
        new THREE.BoxGeometry(0.2, 0.03, 0.27),
        new THREE.MeshStandardMaterial({ color: "#2b3b4a", roughness: 0.8 }),
        0,
        0.435,
        -0.25,
      ),
    );
    ct.add(
      mesh(
        new THREE.BoxGeometry(0.18, 0.025, 0.25),
        new THREE.MeshStandardMaterial({ color: "#d9cbb0", roughness: 0.8 }),
        0.01,
        0.462,
        -0.25,
      ),
    );
    ct.position.set(1.75, 0, -0.45);
    S.add(ct);
    ctx.solid(ct, 0.02);
    for (const [dz, dx] of [
      [0.15, 0.05],
      [0.28, -0.08],
    ] as const) {
      const t = tealight(wax, flameMat, tlGlass);
      t.group.position.set(1.75 + dx, 0.42, -0.45 + dz);
      S.add(t.group);
      flames.push({ flame: t.flame, phase: dz * 50 });
    }

    // floor lamp in the corner (linen shade)
    const lamp = new THREE.Group();
    lamp.add(
      mesh(
        new THREE.CylinderGeometry(0.15, 0.16, 0.025, 24),
        blackMetal,
        0,
        0.0125,
        0,
      ),
    );
    lamp.add(
      mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 1.45, 8),
        blackMetal,
        0,
        0.73,
        0,
      ),
    );
    lamp.add(
      mesh(
        new THREE.CylinderGeometry(0.19, 0.23, 0.32, 32, 1, true),
        new THREE.MeshStandardMaterial({
          color: "#f3e3c6",
          emissive: "#ffc27a",
          emissiveIntensity: 0.9,
          roughness: 0.9,
          side: THREE.DoubleSide,
        }),
        0,
        1.55,
        0,
        false,
      ),
    );
    lamp.position.set(RX - 0.35, 0, -RZ + 0.4);
    S.add(lamp);
    ctx.wall(RX - 0.55, -RZ, RX, -RZ + 0.6);
    const lampLight = new THREE.PointLight("#ffb46b", 2.2, 7, 2);
    lampLight.position.set(RX - 0.35, 1.5, -RZ + 0.4);
    S.add(lampLight);

    // art above the sofa + the split AC unit
    const art = new THREE.Group();
    art.add(
      mesh(
        new THREE.BoxGeometry(1.0, 0.68, 0.03),
        new THREE.MeshStandardMaterial({ color: "#1d1a17", roughness: 0.5 }),
      ),
    );
    const canvasArt = mesh(
      new THREE.PlaneGeometry(0.94, 0.62),
      new THREE.MeshStandardMaterial({ map: abstractArt(), roughness: 0.85 }),
      0,
      0,
      0.016,
      false,
    );
    art.add(canvasArt);
    art.position.set(RX - 0.02, 1.5, -0.45);
    art.rotation.y = -Math.PI / 2;
    S.add(art);
    const ac = new THREE.Group();
    ac.add(
      mesh(
        rbox(0.85, 0.28, 0.2, 0.04, 3),
        new THREE.MeshStandardMaterial({ color: "#f4f4f2", roughness: 0.35 }),
      ),
    );
    ac.add(
      mesh(
        new THREE.BoxGeometry(0.7, 0.012, 0.01),
        new THREE.MeshStandardMaterial({ color: "#d8d8d6" }),
        0,
        -0.1,
        0.1,
        false,
      ),
    );
    ac.add(
      mesh(
        new THREE.BoxGeometry(0.03, 0.01, 0.005),
        emissive("#7ad0ff", 2),
        0.3,
        -0.05,
        0.101,
        false,
      ),
    );
    ac.position.set(RX - 0.11, 2.36, -0.45);
    ac.rotation.y = -Math.PI / 2;
    S.add(ac);

    /* ---- ladder shelf with mugs and plates (left wall, by the window) ---- */
    const ladder = new THREE.Group();
    const lw = rep(midWood, 0.2, 1, { roughness: 0.6 });
    const lean = 0.12;
    for (const z of [-0.36, 0.36]) {
      const railM = mesh(
        new THREE.BoxGeometry(0.04, 1.85, 0.04),
        lw,
        0.2,
        0.9,
        z,
      );
      railM.rotation.z = lean;
      ladder.add(railM);
    }
    const shelves = [0.32, 0.72, 1.12, 1.5];
    shelves.forEach((y) => {
      const depth = 0.4 - y * 0.16;
      const x = 0.2 - Math.tan(lean) * (y - 0.9) + depth / 2 - 0.15;
      ladder.add(mesh(new THREE.BoxGeometry(depth, 0.025, 0.72), lw, x, y, 0));
    });
    // mugs (black) and plate stacks (white)
    const mugMat = new THREE.MeshStandardMaterial({
      color: "#121212",
      roughness: 0.2,
    });
    const plateMat = new THREE.MeshStandardMaterial({
      color: "#f3f1ec",
      roughness: 0.25,
    });
    const mugSpots: [number, number, number][] = [];
    const rand = seeded(101);
    [0.72, 1.12].forEach((y) => {
      for (let i = 0; i < 6; i++)
        mugSpots.push([y, -0.3 + i * 0.11, rand() * 6]);
    });
    const mugs = new THREE.InstancedMesh(
      mugGeometry(),
      mugMat,
      mugSpots.length,
    );
    const m4 = new THREE.Matrix4();
    mugSpots.forEach(([y, z, r], i) => {
      const depth = 0.4 - y * 0.16;
      const x = 0.2 - Math.tan(lean) * (y - 0.9) + depth / 2 - 0.15;
      m4.compose(
        new THREE.Vector3(x, y + 0.0125, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      mugs.setMatrixAt(i, m4);
    });
    mugs.castShadow = true;
    ladder.add(mugs);
    const plateGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.018, 28);
    const plates = new THREE.InstancedMesh(plateGeo, plateMat, 16);
    let pi = 0;
    for (const [y, z, n] of [
      [0.32, -0.15, 6],
      [0.32, 0.17, 5],
      [1.5, 0.15, 5],
    ] as const) {
      const depth = 0.4 - y * 0.16;
      const x = 0.2 - Math.tan(lean) * (y - 0.9) + depth / 2 - 0.15;
      for (let k = 0; k < n; k++) {
        m4.makeTranslation(x, y + 0.02 + k * 0.016, z);
        plates.setMatrixAt(pi++, m4);
      }
    }
    plates.count = pi;
    ladder.add(plates);
    // a little plant on top
    const pot = mesh(
      new THREE.CylinderGeometry(0.06, 0.045, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: "#2e4a4c", roughness: 0.4 }),
      0.13,
      1.56,
      -0.15,
    );
    ladder.add(pot);
    const leafG = leafGeometry();
    leafG.scale(1.6, 1.6, 1.6);
    const plantLeaves = new THREE.InstancedMesh(
      leafG,
      new THREE.MeshStandardMaterial({
        color: "#2f5a2a",
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
      26,
    );
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.4 + rand() * 0.8, a, 0, "YXZ"),
      );
      m4.compose(
        new THREE.Vector3(0.13, 1.6, -0.15),
        q,
        new THREE.Vector3(1, 1 + rand() * 0.5, 1),
      );
      plantLeaves.setMatrixAt(i, m4);
    }
    ladder.add(plantLeaves);
    ladder.position.set(-RX + 0.02, 0, 1.75);
    S.add(ladder);
    ctx.wall(-RX, 1.3, -RX + 0.45, 2.2);

    /* ---- big plant in the corner by the kitchen ---- */
    const planter = new THREE.Group();
    planter.add(
      mesh(
        new THREE.CylinderGeometry(0.2, 0.16, 0.42, 24),
        new THREE.MeshStandardMaterial({ color: "#d9d2c5", roughness: 0.7 }),
        0,
        0.21,
        0,
      ),
    );
    const bigLeaf = leafGeometry();
    bigLeaf.scale(5, 6, 5);
    const nBig = hi ? 70 : 40;
    const bigLeaves = new THREE.InstancedMesh(
      bigLeaf,
      new THREE.MeshStandardMaterial({
        color: "#284a22",
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
      nBig,
    );
    const stemsG: THREE.BufferGeometry[] = [];
    for (let i = 0; i < nBig; i++) {
      const a = i * 2.39996;
      const h = 0.5 + rand() * 0.9;
      const r = 0.06 + rand() * 0.25;
      const pos = new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.6 + rand() * 0.9, -a + Math.PI / 2, 0, "YXZ"),
      );
      m4.compose(pos, q, new THREE.Vector3(1, 1, 1));
      bigLeaves.setMatrixAt(i, m4);
      if (i % 3 === 0) {
        const sg = new THREE.CylinderGeometry(0.006, 0.008, h - 0.4, 5);
        sg.translate(pos.x * 0.5, 0.4 + (h - 0.4) / 2, pos.z * 0.5);
        stemsG.push(sg);
      }
    }
    bigLeaves.castShadow = true;
    planter.add(
      bigLeaves,
      mesh(
        mergeGeometries(stemsG)!,
        new THREE.MeshStandardMaterial({ color: "#3d4a2a" }),
      ),
    );
    planter.position.set(-RX + 0.4, 0, -RZ + 0.4);
    S.add(planter);
    ctx.wall(-RX, -RZ, -RX + 0.65, -RZ + 0.65);

    /* ---- entrance door, switches, outlets, ceiling downlights (off) ---- */
    const doorWood = rep(woodPlanks("#5a3d29", 3, 111), 0.6, 1.2, {
      roughness: 0.5,
    });
    const dx = (DOOR.x0 + DOOR.x1) / 2;
    S.add(
      mesh(
        new THREE.BoxGeometry(DOOR.x1 - DOOR.x0 - 0.02, 2.08, 0.04),
        doorWood,
        dx,
        1.04,
        RZ + 0.06,
      ),
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(0.06, 2.16, 0.18),
        trim,
        DOOR.x0 - 0.03,
        1.08,
        RZ,
        false,
      ),
      mesh(
        new THREE.BoxGeometry(0.06, 2.16, 0.18),
        trim,
        DOOR.x1 + 0.03,
        1.08,
        RZ,
        false,
      ),
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(DOOR.x1 - DOOR.x0 + 0.12, 0.06, 0.18),
        trim,
        dx,
        2.13,
        RZ,
        false,
      ),
    );
    const handle = mesh(
      new THREE.BoxGeometry(0.12, 0.018, 0.02),
      metal("#d0d0d0", 0.2),
      DOOR.x0 + 0.12,
      1.0,
      RZ + 0.025,
      false,
    );
    S.add(handle);
    const plateM = new THREE.MeshStandardMaterial({
      color: "#f5f3ef",
      roughness: 0.4,
    });
    S.add(
      mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.01),
        plateM,
        DOOR.x0 - 0.2,
        1.2,
        RZ - 0.005,
        false,
      ),
    );
    for (const [x, z, ry] of [
      [RX - 0.005, 0.9, -Math.PI / 2],
      [-RX + 0.005, -2.1, Math.PI / 2],
      [0.0, RZ - 0.005, Math.PI],
    ] as const) {
      const o = mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.01),
        plateM,
        x,
        0.3,
        z,
        false,
      );
      o.rotation.y = ry;
      S.add(o);
    }
    const dlOff = new THREE.MeshStandardMaterial({
      color: "#f2f0ea",
      roughness: 0.3,
      metalness: 0.2,
    });
    for (const [x, z] of [
      [1.75, -1.6],
      [1.75, 0.8],
      [-1.9, 1.6],
      [0.3, 1.6],
    ] as const)
      S.add(
        mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.012, 20),
          dlOff,
          x,
          H - 0.006,
          z,
          false,
        ),
      );

    /* ---- ambient fill (very low: it is night) ---- */
    S.add(new THREE.HemisphereLight("#3c3a52", "#1c130c", 0.07));

    batchStatic(S);

    /* ---- people, pack, spawn, exit ---- */
    const outfits = {
      elena: {
        top: "#f6f1ea",
        topStyle: "blouse" as const,
        bottom: "#1f2633",
        bottomStyle: "jeans" as const,
        shoes: "#1a1a1a",
      },
      davi: {
        top: "#5a3b2b",
        topStyle: "tshirt" as const,
        bottom: "#232a36",
        bottomStyle: "jeans" as const,
        shoes: "#2a2622",
      },
    };
    ctx.playerOutfit(outfits);
    const px = TABLE.x + 1.05;
    const pz = TABLE.z + 0.12;
    const spawnX = 2.45;
    const spawnZ = 1.85;
    ctx.partner(
      px,
      pz,
      THREE.MathUtils.radToDeg(Math.atan2(spawnX - px, spawnZ - pz)),
      "stand",
      outfits,
      ctx.player === "elena" ? "Agora é oficial! 💍" : "Sim, sim e sim! 💍🌹",
    );
    // the pack: next to the roses, on the far side of the bouquet
    ctx.pack(TABLE.x - 0.3, TABLE.h, TABLE.z - 0.3, 20);
    ctx.spawn(spawnX, spawnZ, 50);
    ctx.exit(dx, RZ - 0.15, 0.6);

    /* ---- candle flicker ---- */
    const base = candleLight.intensity;
    ctx.onUpdate((t) => {
      const f =
        0.85 +
        Math.sin(t * 11) * 0.05 +
        Math.sin(t * 17.3 + 1) * 0.05 +
        Math.sin(t * 29.1) * 0.04;
      candleLight.intensity = base * f;
      for (const { flame, phase } of flames) {
        const k =
          1 +
          Math.sin(t * 13 + phase) * 0.08 +
          Math.sin(t * 23 + phase * 2) * 0.05;
        flame.scale.set(1, 2.5 * k, 1);
        flame.rotation.z = Math.sin(t * 3 + phase) * 0.06;
      }
    });
  },
};

export default scene;
