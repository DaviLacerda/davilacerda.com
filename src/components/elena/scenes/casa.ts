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
 * Davi's home, the night of 19/09 (~22:40): he gave Elena the red roses and
 * the rings. Rebuilt from their photos and the (dark) video:
 *  - the living room is dark, lit mostly by the big TV playing a fireplace
 *    video (left wall), the kitchen downlights through the pass-through
 *    (back wall) and the orange glow of a slatted wooden crate + a little
 *    wooden table with glassware under the pass-through;
 *  - greige walls, a plaster "sanca" around the ceiling, wood floor;
 *  - the roses (red cellophane), two Talento bars, the letter and the ring
 *    box on a black granite-topped table with black chairs;
 *  - a wooden ladder shelf with black mugs and white plates next to the grey
 *    curtains, and the dark-wood entrance door (right wall).
 *
 * Plan (meters): room x in [-3.2, 3.2], z in [-2.6, 2.6], ceiling 2.6.
 * Lights: 6 (kitchen spot, crate glow, TV fire spot [the only shadow], window
 * glow, table downlight, hemisphere). Static meshes are merged by material.
 */

const RX = 3.2;
const RZ = 2.6;
const H = 2.6;
const T = 0.15; // wall thickness

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
  const nRoses = quality === "high" ? 12 : 10;
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
    const sc = 1.15 + rand() * 0.15;
    m.compose(pos, q, new THREE.Vector3(sc, sc * 1.4, sc)); // long, tight florist buds
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
  // red cellophane: glossy and see-through, like the florist wrap in the photos
  const redPaper = new THREE.MeshPhysicalMaterial({
    color: "#d4121e",
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerPaper = new THREE.MeshPhysicalMaterial({
    color: "#9e0c16",
    roughness: 0.2,
    clearcoat: 1,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  group.add(mesh(paper(0.03, 0.21, 0.44, 5, 0.09), redPaper));
  const inner = mesh(paper(0.025, 0.17, 0.4, 9, 0.08), innerPaper);
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
    color: "#d8b98a",
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

/* ---------------- the fireplace video on the TV ---------------- */

/** A looping "fireplace" picture painted on a small canvas, redrawn a few times a second. */
function fireplaceScreen() {
  const W = 320;
  const Hc = 180;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Hc;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // static back: red firebrick wall + hearth + logs, drawn once into its own canvas
  const back = document.createElement("canvas");
  back.width = W;
  back.height = Hc;
  const b = back.getContext("2d")!;
  const rand = seeded(123);
  b.fillStyle = "#2a0503";
  b.fillRect(0, 0, W, Hc);
  for (let y = 0; y < Hc * 0.8; y += 14) {
    const off = (y / 14) % 2 ? 0 : 18;
    for (let x = -36; x < W; x += 36) {
      const v = 0.55 + rand() * 0.35;
      b.fillStyle = `rgb(${Math.floor(200 * v)},${Math.floor(40 * v)},${Math.floor(20 * v)})`;
      b.fillRect(x + off + 1, y + 1, 34, 12);
    }
  }
  // side jambs, darker
  const jamb = b.createLinearGradient(0, 0, W, 0);
  jamb.addColorStop(0, "rgba(10,0,0,0.85)");
  jamb.addColorStop(0.15, "rgba(10,0,0,0)");
  jamb.addColorStop(0.85, "rgba(10,0,0,0)");
  jamb.addColorStop(1, "rgba(10,0,0,0.85)");
  b.fillStyle = jamb;
  b.fillRect(0, 0, W, Hc);
  b.fillStyle = "#120302";
  b.fillRect(0, Hc * 0.8, W, Hc * 0.2);
  const logs: [number, number, number, number][] = [
    [70, 142, 190, 16],
    [110, 128, 150, 14],
    [60, 132, 80, 12],
  ];
  const drawLogs = (ctx: CanvasRenderingContext2D) => {
    for (const [x, y, w, h] of logs) {
      ctx.fillStyle = "#2b1408";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,120,30,0.55)";
      ctx.fillRect(x + 10, y + h * 0.35, w - 20, 2);
    }
  };
  const flames = Array.from({ length: 22 }, (_, i) => ({
    x: 75 + (i / 21) * 170 + (rand() - 0.5) * 12,
    h: 40 + rand() * 70,
    w: 10 + rand() * 14,
    ph: rand() * 10,
    sp: 3 + rand() * 4,
    blue: rand() < 0.22,
  }));
  let last = -1;
  const draw = (t: number) => {
    if (t - last < 0.07) return;
    last = t;
    g.globalCompositeOperation = "source-over";
    g.drawImage(back, 0, 0);
    // glow on the bricks
    const glow = g.createRadialGradient(
      W / 2,
      Hc * 0.78,
      10,
      W / 2,
      Hc * 0.7,
      170,
    );
    glow.addColorStop(0, `rgba(255,170,60,${0.55 + Math.sin(t * 7) * 0.08})`);
    glow.addColorStop(1, "rgba(255,80,20,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, W, Hc);
    g.globalCompositeOperation = "lighter";
    for (const f of flames) {
      const k =
        0.75 +
        0.25 * Math.sin(t * f.sp + f.ph) +
        0.12 * Math.sin(t * f.sp * 2.3 + f.ph * 2);
      const h = f.h * k;
      const x = f.x + Math.sin(t * 2 + f.ph) * 4;
      const base = 140;
      const grd = g.createLinearGradient(0, base, 0, base - h);
      if (f.blue) {
        grd.addColorStop(0, "rgba(120,200,255,0.75)");
        grd.addColorStop(1, "rgba(60,120,255,0)");
      } else {
        grd.addColorStop(0, "rgba(255,240,180,0.9)");
        grd.addColorStop(0.35, "rgba(255,170,40,0.75)");
        grd.addColorStop(1, "rgba(255,60,10,0)");
      }
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x - f.w, base);
      g.quadraticCurveTo(
        x - f.w * 0.8,
        base - h * 0.5,
        x + Math.sin(t * 5 + f.ph) * 6,
        base - h,
      );
      g.quadraticCurveTo(x + f.w * 0.8, base - h * 0.5, x + f.w, base);
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
    drawLogs(g);
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

/** A red "Talento" chocolate bar wrapper. */
function chocolateTex() {
  return canvasTex(256, 128, (g) => {
    g.fillStyle = "#b3121b";
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#7a0a10";
    g.fillRect(0, 96, 256, 32);
    g.fillStyle = "#5a2e1a";
    g.beginPath();
    g.moveTo(150, 128);
    g.lineTo(240, 60);
    g.lineTo(256, 128);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = "italic bold 44px Georgia, serif";
    g.fillText("Talento", 18, 62);
    g.fillStyle = "#e8c070";
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(170 + (i % 3) * 22, 20 + Math.floor(i / 3) * 14, 6, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** Black night glimpsed through the curtain gap: dark sky, a few far windows. */
function nightTex() {
  return canvasTex(256, 512, (g) => {
    const rand = seeded(19);
    const sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, "#04050a");
    sky.addColorStop(0.55, "#0c0d16");
    sky.addColorStop(1, "#1b1310");
    g.fillStyle = sky;
    g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 70; i++) {
      g.fillStyle =
        rand() < 0.75
          ? `rgba(255,${180 + rand() * 50},${100 + rand() * 60},${0.4 + rand() * 0.5})`
          : `rgba(190,210,255,${0.3 + rand() * 0.4})`;
      g.fillRect(rand() * 256, 240 + rand() * 260, 3, 4);
    }
  });
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
    ctx.scene.background = new THREE.Color("#020203");
    ctx.scene.environmentIntensity = 0.1; // night: keep the image-based fill low

    /* ---- materials ---- */
    const wallMat = new THREE.MeshStandardMaterial({
      map: plasterTex("#cbbdad", 31),
      roughness: 0.92,
    });
    const ceilMat = new THREE.MeshStandardMaterial({
      map: plasterTex("#ebe6de", 33),
      roughness: 0.95,
    });
    const floorMat = rep(
      woodPlanks("#8f6642", 6, 41),
      (RX * 2) / 1.2,
      (RZ * 2) / 1.2,
      { roughness: 0.55 },
    );
    const lightWood = woodPlanks("#b98c5e", 4, 49);
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: "#3a2214",
      roughness: 0.5,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: "#efe9df",
      roughness: 0.5,
    });
    const granite = rep(marble("#1d1b1a", "rgba(150,140,130,0.0)", 53), 2, 1, {
      roughness: 0.22,
      metalness: 0.05,
    });
    // speckle the granite (the counter in the photos is black-green granite with grey/white flecks)
    granite.map = canvasTex(512, 512, (g) => {
      const rand = seeded(57);
      g.fillStyle = "#181816";
      g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 26000; i++) {
        const v = rand();
        g.fillStyle =
          v < 0.5
            ? `rgba(70,74,66,${0.5 + rand() * 0.5})`
            : v < 0.85
              ? `rgba(20,30,24,${0.7})`
              : `rgba(190,185,175,${0.5 + rand() * 0.5})`;
        const s = 1 + rand() * 3;
        g.fillRect(rand() * 512, rand() * 512, s, s * (0.6 + rand()));
      }
    });
    granite.map.wrapS = granite.map.wrapT = THREE.RepeatWrapping;
    granite.map.repeat.set(2, 1);
    const blackMetal = metal("#161616", 0.45);
    const white = new THREE.MeshStandardMaterial({
      color: "#f2f0ec",
      roughness: 0.35,
    });
    const steel = metal("#c9cbcd", 0.28);

    /* ---- shell: floor, ceiling with a plaster "sanca", walls ---- */
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
    // lowered plaster border around the ceiling (sanca), 0.45 m wide, 0.15 m drop
    const SW = 0.45;
    const sancaY = H - 0.075;
    for (const [w, d, x, z] of [
      [RX * 2, SW, 0, -RZ + SW / 2],
      [RX * 2, SW, 0, RZ - SW / 2],
      [SW, RZ * 2 - SW * 2, -RX + SW / 2, 0],
      [SW, RZ * 2 - SW * 2, RX - SW / 2, 0],
    ] as const)
      S.add(
        mesh(new THREE.BoxGeometry(w, 0.15, d), ceilMat, x, sancaY, z, false),
      );

    const PT = { x0: -1.3, x1: 0.5, y0: 1.05, y1: 2.0 }; // kitchen pass-through (back wall)
    const WIN = { z0: -2.1, z1: -0.5, y0: 0.9, y1: 2.3 }; // window (right wall), behind curtains
    const DOOR = { z0: 1.5, z1: 2.3 }; // entrance (right wall)

    const back = mesh(
      holedWall(-RX, RX, H, [[PT.x0, PT.y0, PT.x1, PT.y1]]),
      wallMat,
      0,
      0,
      -RZ,
      false,
    );
    const left = mesh(holedWall(-RZ, RZ, H, []), wallMat, -RX, 0, 0, false);
    left.rotation.y = Math.PI / 2;
    // right wall: local x = world z (rotation -90°)
    const right = mesh(
      holedWall(-RZ, RZ, H, [
        [WIN.z0, WIN.y0, WIN.z1, WIN.y1],
        [DOOR.z0, 0, DOOR.z1, 2.1],
      ]),
      wallMat,
      RX,
      0,
      0,
      false,
    );
    right.rotation.y = -Math.PI / 2;
    const front = mesh(holedWall(-RX, RX, H, []), wallMat, 0, 0, RZ, false);
    front.rotation.y = Math.PI;
    S.add(back, left, right, front);
    ctx.wall(-RX - 1, -RZ - T, RX + 1, -RZ);
    ctx.wall(-RX - T, -RZ - 1, -RX, RZ + 1);
    ctx.wall(RX, -RZ - 1, RX + T, RZ + 1);
    ctx.wall(-RX - 1, RZ, RX + 1, RZ + T);

    // baseboards
    {
      const parts: THREE.BufferGeometry[] = [];
      const add = (len: number, x: number, z: number, ry: number) => {
        const g = new THREE.BoxGeometry(len, 0.08, 0.015);
        g.rotateY(ry);
        g.translate(x, 0.04, z);
        parts.push(g);
      };
      add(RX * 2, 0, -RZ + 0.008, 0);
      add(RX * 2, 0, RZ - 0.008, 0);
      add(RZ * 2, -RX + 0.008, 0, Math.PI / 2);
      add(
        DOOR.z0 + RZ - 0.05,
        RX - 0.008,
        (-RZ + DOOR.z0 - 0.05) / 2,
        Math.PI / 2,
      );
      add(
        RZ - DOOR.z1 - 0.05,
        RX - 0.008,
        (RZ + DOOR.z1 + 0.05) / 2,
        Math.PI / 2,
      );
      S.add(mesh(mergeGeometries(parts)!, trim, 0, 0, 0, false));
    }

    /* ---- kitchen behind the pass-through ---- */
    const K = { x0: -2.4, x1: 1.4, z0: -4.5, z1: -RZ - T };
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
      2.45,
      (K.z0 + K.z1) / 2,
      false,
    );
    kCeil.rotation.x = Math.PI / 2;
    const kBack = mesh(
      new THREE.PlaneGeometry(K.x1 - K.x0, 2.45),
      rep(kTiles, (K.x1 - K.x0) / 0.6, 2.45 / 0.6, { roughness: 0.3 }),
      (K.x0 + K.x1) / 2,
      1.225,
      K.z0,
      false,
    );
    const kL = mesh(
      new THREE.PlaneGeometry(K.z1 - K.z0, 2.45),
      rep(kTiles, (K.z1 - K.z0) / 0.6, 2.45 / 0.6),
      K.x0,
      1.225,
      (K.z0 + K.z1) / 2,
      false,
    );
    kL.rotation.y = Math.PI / 2;
    const kR = mesh(
      new THREE.PlaneGeometry(K.z1 - K.z0, 2.45),
      rep(kTiles, (K.z1 - K.z0) / 0.6, 2.45 / 0.6),
      K.x1,
      1.225,
      (K.z0 + K.z1) / 2,
      false,
    );
    kR.rotation.y = -Math.PI / 2;
    S.add(kFloor, kCeil, kBack, kL, kR);
    // reveals of the opening + the granite sill
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
        rbox(PT.x1 - PT.x0 + 0.1, 0.03, T + 0.3, 0.006),
        granite,
        (PT.x0 + PT.x1) / 2,
        PT.y0 - 0.015,
        -RZ - T / 2 - 0.05,
      ),
    );
    // base + wall cabinets, cooktop, hood, fridge, kettle, coffee machine (as seen through the opening)
    const kLen = K.x1 - K.x0 - 0.75;
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
    for (let x = kx0 + 0.3; x < kx0 + kLen; x += 0.6) {
      S.add(
        mesh(
          new THREE.BoxGeometry(0.12, 0.012, 0.015),
          steel,
          x,
          0.78,
          K.z0 + 0.59,
          false,
        ),
      );
      S.add(
        mesh(
          new THREE.BoxGeometry(0.58, 0.66, 0.34),
          white,
          x,
          1.9,
          K.z0 + 0.17,
        ),
      );
    }
    S.add(
      mesh(
        new THREE.BoxGeometry(0.6, 0.12, 0.45),
        steel,
        kx0 + 1.65,
        1.5,
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
    S.add(
      mesh(rbox(0.7, 1.85, 0.68, 0.02), steel, K.x1 - 0.37, 0.925, K.z0 + 0.36),
    );
    const kettleProf = [
      [0, 0],
      [0.075, 0],
      [0.08, 0.02],
      [0.078, 0.15],
      [0.06, 0.2],
      [0.03, 0.215],
      [0, 0.215],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    S.add(
      mesh(
        new THREE.LatheGeometry(kettleProf, 20),
        new THREE.MeshStandardMaterial({ color: "#f6f4f0", roughness: 0.2 }),
        kx0 + 0.95,
        0.89,
        K.z0 + 0.3,
      ),
    );
    S.add(
      mesh(
        rbox(0.2, 0.32, 0.3, 0.02),
        white,
        kx0 + 1.25,
        0.89 + 0.16,
        K.z0 + 0.25,
      ),
    );
    S.add(
      mesh(
        rbox(0.16, 0.06, 0.12, 0.01),
        blackMetal,
        kx0 + 1.25,
        0.89 + 0.22,
        K.z0 + 0.42,
      ),
    );
    // downlights in the kitchen ceiling (the brightest spot of the dark flat, as in the video)
    const dlMat = emissive("#fff1d8", 5);
    for (const x of [-1.0, 0.3])
      S.add(
        mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16),
          dlMat,
          x,
          2.445,
          -3.6,
          false,
        ),
      );
    const kitchenLight = new THREE.SpotLight("#ffe7c4", 9, 7, 1.15, 0.7, 2); // light 1
    kitchenLight.position.set(-0.35, 2.4, -3.6);
    kitchenLight.target.position.set(-0.35, 0, -3.9);
    S.add(kitchenLight, kitchenLight.target);

    /* ---- under the pass-through: the glowing wooden slat crate + the little wooden table with glassware ---- */
    const glowOrange = new THREE.MeshStandardMaterial({
      color: "#ff7a30",
      emissive: "#ff5a14",
      emissiveIntensity: 2.4,
      roughness: 0.8,
    });
    const crateWood = rep(lightWood, 0.4, 0.4, { roughness: 0.6 });
    {
      const cx = -0.85;
      const cz = -RZ + 0.24;
      const cw = 0.55;
      const ch = 0.42;
      const cd = 0.36;
      S.add(
        mesh(
          new THREE.BoxGeometry(cw - 0.04, ch - 0.04, cd - 0.04),
          glowOrange,
          cx,
          ch / 2 + 0.02,
          cz,
          false,
        ),
      );
      // horizontal slats with gaps the light shines through
      for (let y = 0.04; y < ch; y += 0.07) {
        S.add(
          mesh(
            new THREE.BoxGeometry(cw, 0.045, 0.012),
            crateWood,
            cx,
            y + 0.02,
            cz + cd / 2,
          ),
        );
        S.add(
          mesh(
            new THREE.BoxGeometry(0.012, 0.045, cd),
            crateWood,
            cx - cw / 2,
            y + 0.02,
            cz,
          ),
          mesh(
            new THREE.BoxGeometry(0.012, 0.045, cd),
            crateWood,
            cx + cw / 2,
            y + 0.02,
            cz,
          ),
        );
      }
      S.add(
        mesh(
          new THREE.BoxGeometry(cw + 0.02, 0.025, cd + 0.02),
          crateWood,
          cx,
          ch + 0.035,
          cz,
        ),
      );
      ctx.wall(cx - cw / 2 - 0.02, -RZ, cx + cw / 2 + 0.02, cz + cd / 2 + 0.02);
    }
    const ST = { x: 0.05, z: -RZ + 0.3, w: 0.62, d: 0.45, h: 0.72 };
    {
      const tw = rep(lightWood, 0.6, 0.4, { roughness: 0.5 });
      S.add(mesh(rbox(ST.w, 0.03, ST.d, 0.006), tw, ST.x, ST.h - 0.015, ST.z));
      // the top glows from an LED strip under the glassware
      S.add(
        mesh(
          new THREE.BoxGeometry(ST.w - 0.08, 0.004, ST.d - 0.1),
          glowOrange,
          ST.x,
          ST.h + 0.002,
          ST.z,
          false,
        ),
      );
      S.add(
        mesh(
          new THREE.BoxGeometry(ST.w - 0.06, 0.02, ST.d - 0.06),
          tw,
          ST.x,
          0.25,
          ST.z,
        ),
      );
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) {
          const leg = mesh(
            new THREE.BoxGeometry(0.035, ST.h - 0.03, 0.035),
            tw,
            ST.x + sx * (ST.w / 2 - 0.04),
            (ST.h - 0.03) / 2,
            ST.z + sz * (ST.d / 2 - 0.04),
          );
          leg.rotation.z = sx * 0.04;
          S.add(leg);
        }
      ctx.wall(ST.x - ST.w / 2, -RZ, ST.x + ST.w / 2, ST.z + ST.d / 2 + 0.02);
      // glassware: wine glasses, tumblers, a candy jar with a lid
      const gm = glassLite("#ffffff", 0.1);
      const placeGlasses = (
        geo: THREE.BufferGeometry,
        spots: [number, number][],
      ) => {
        const im = new THREE.InstancedMesh(geo, gm, spots.length);
        const m4 = new THREE.Matrix4();
        spots.forEach(([dx, dz], i) => {
          m4.makeTranslation(ST.x + dx, ST.h + 0.004, ST.z + dz);
          im.setMatrixAt(i, m4);
        });
        S.add(im);
      };
      placeGlasses(wineGlassGeometry(), [
        [0.12, -0.1],
        [0.2, -0.05],
        [0.22, 0.08],
      ]);
      placeGlasses(tumblerGeometry(), [
        [-0.05, -0.12],
        [0.05, 0.05],
      ]);
      const jarProf = [
        [0, 0],
        [0.06, 0],
        [0.065, 0.02],
        [0.065, 0.16],
        [0.045, 0.19],
        [0.05, 0.2],
      ].map(([r, y]) => new THREE.Vector2(r!, y!));
      S.add(
        mesh(
          new THREE.LatheGeometry(jarProf, 24),
          glassLite("#e8f2ff", 0.14),
          ST.x - 0.17,
          ST.h + 0.004,
          ST.z - 0.05,
          false,
        ),
      );
      S.add(
        mesh(
          new THREE.SphereGeometry(0.03, 12, 8),
          new THREE.MeshStandardMaterial({ color: "#3a7bd5", roughness: 0.3 }),
          ST.x - 0.17,
          ST.h + 0.23,
          ST.z - 0.05,
        ),
      );
    }
    const crateLight = new THREE.PointLight("#ff6a26", 1.6, 4.5, 2); // light 2
    crateLight.position.set(-0.4, 0.8, -RZ + 0.55);
    S.add(crateLight);

    /* ---- TV wall (left): the big TV playing a fireplace video, black rack, a fan ---- */
    const TV = { z: -0.3, y: 1.4, w: 1.45, h: 0.83 };
    const fire = fireplaceScreen();
    {
      S.add(
        mesh(
          rbox(0.04, TV.h + 0.02, TV.w + 0.02, 0.004),
          new THREE.MeshStandardMaterial({
            color: "#0c0c0d",
            roughness: 0.35,
            metalness: 0.3,
          }),
          -RX + 0.04,
          TV.y,
          TV.z,
        ),
      );
      const screen = mesh(
        new THREE.PlaneGeometry(TV.w - 0.02, TV.h - 0.02),
        new THREE.MeshBasicMaterial({
          map: fire.tex,
          color: new THREE.Color(1.5, 1.5, 1.5),
        }),
        -RX + 0.061,
        TV.y,
        TV.z,
        false,
      );
      screen.rotation.y = Math.PI / 2;
      screen.userData.dynamic = true;
      S.add(screen);
      // cable down the wall to the rack
      S.add(
        mesh(
          new THREE.BoxGeometry(0.01, TV.y - TV.h / 2 - 0.45, 0.012),
          new THREE.MeshStandardMaterial({ color: "#151515" }),
          -RX + 0.01,
          (TV.y - TV.h / 2 + 0.45) / 2,
          TV.z + 0.45,
          false,
        ),
      );
      // low black rack
      const rack = new THREE.Group();
      const rackMat = new THREE.MeshStandardMaterial({
        color: "#121212",
        roughness: 0.4,
      });
      rack.add(mesh(rbox(0.42, 0.45, 1.5, 0.01), rackMat, 0, 0.225, 0));
      for (const z of [-0.375, 0.375])
        rack.add(
          mesh(
            new THREE.BoxGeometry(0.005, 0.38, 0.72),
            new THREE.MeshStandardMaterial({
              color: "#1d1d1d",
              roughness: 0.25,
            }),
            0.212,
            0.23,
            z,
            false,
          ),
        );
      rack.add(mesh(rbox(0.15, 0.05, 0.25, 0.01), blackMetal, 0, 0.475, 0.45));
      rack.position.set(-RX + 0.23, 0, TV.z + 0.15);
      S.add(rack);
      ctx.solid(rack, 0.02);
      // white pedestal fan
      const fan = new THREE.Group();
      const fanMat = new THREE.MeshStandardMaterial({
        color: "#eeeeec",
        roughness: 0.4,
      });
      fan.add(
        mesh(
          new THREE.CylinderGeometry(0.15, 0.17, 0.04, 24),
          fanMat,
          0,
          0.02,
          0,
        ),
      );
      fan.add(
        mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8),
          fanMat,
          0,
          0.4,
          0,
        ),
      );
      const cage = mesh(
        new THREE.TorusGeometry(0.2, 0.008, 6, 40),
        fanMat,
        0,
        0.95,
        0,
      );
      fan.add(cage);
      const grill = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 32),
        new THREE.MeshStandardMaterial({
          color: "#dcdcdc",
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      grill.position.y = 0.95;
      fan.add(
        grill,
        mesh(
          new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16),
          fanMat,
          0,
          0.95,
          -0.08,
        ).rotateX(Math.PI / 2),
      );
      fan.position.set(-RX + 0.45, 0, TV.z + 1.25);
      fan.rotation.y = Math.PI / 2 + 0.5;
      S.add(fan);
      ctx.wall(-RX + 0.25, TV.z + 1.05, -RX + 0.65, TV.z + 1.45);
    }
    // the fireplace light on the room (the shadow-casting light, light 3)
    const tvLight = new THREE.SpotLight("#ff8040", 9, 9, 1.25, 1, 2);
    tvLight.position.set(-RX + 0.35, TV.y, TV.z);
    tvLight.target.position.set(1.5, 0.6, TV.z);
    tvLight.castShadow = true;
    tvLight.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
    tvLight.shadow.bias = -0.0005;
    tvLight.shadow.normalBias = 0.02;
    tvLight.shadow.radius = 5;
    S.add(tvLight, tvLight.target);

    /* ---- window behind closed curtains (right wall) ---- */
    {
      const frameMat = new THREE.MeshStandardMaterial({
        color: "#2b2b2d",
        roughness: 0.4,
        metalness: 0.6,
      });
      const wz = (WIN.z0 + WIN.z1) / 2;
      const wy = (WIN.y0 + WIN.y1) / 2;
      const ww = WIN.z1 - WIN.z0;
      const wh = WIN.y1 - WIN.y0;
      S.add(
        mesh(
          new THREE.BoxGeometry(T, 0.04, ww),
          frameMat,
          RX + T / 2,
          WIN.y0,
          wz,
          false,
        ),
        mesh(
          new THREE.BoxGeometry(T, 0.04, ww),
          frameMat,
          RX + T / 2,
          WIN.y1,
          wz,
          false,
        ),
      );
      for (const z of [WIN.z0, WIN.z1, wz])
        S.add(
          mesh(
            new THREE.BoxGeometry(T, wh, 0.04),
            frameMat,
            RX + T / 2,
            wy,
            z,
            false,
          ),
        );
      const night = new THREE.Mesh(
        new THREE.PlaneGeometry(ww, wh),
        new THREE.MeshBasicMaterial({ map: nightTex() }),
      );
      night.position.set(RX + T + 0.3, wy, wz);
      night.rotation.y = -Math.PI / 2;
      S.add(night);
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
          10,
        );
        const p = g.attributes.position!;
        const ph = seeded(seed)() * 6;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const y = p.getY(i);
          const t = (x / width + 0.5) * folds * Math.PI * 2;
          p.setZ(
            i,
            Math.sin(t + ph) * amp * (1 + (0.5 - y / height) * 0.3) +
              Math.sin(t * 2.3) * amp * 0.2,
          );
        }
        g.computeVertexNormals();
        return g;
      };
      const drapeMat = rep(fabric("#857b70", 71), 3, 6, {
        side: THREE.DoubleSide,
      });
      // two grey drapes almost closed, a thin gap of night between them
      for (const [z, w, s] of [
        [WIN.z0 - 0.3 + 0.55, 1.1, 3],
        [WIN.z1 + 0.3 - 0.5, 1.0, 4],
      ] as const) {
        const d = mesh(
          curtain(w, 2.42, 7, 0.04, s),
          drapeMat,
          RX - 0.14,
          2.42 / 2 + 0.02,
          z,
        );
        d.rotation.y = -Math.PI / 2;
        S.add(d);
      }
      const rod = mesh(
        new THREE.CylinderGeometry(0.012, 0.012, ww + 0.8, 8),
        metal("#9a9a9a", 0.35),
        RX - 0.14,
        2.46,
        wz,
        false,
      );
      rod.rotation.x = Math.PI / 2;
      S.add(rod);
      const winGlow = new THREE.RectAreaLight("#7d8cc0", 0.6, 0.25, wh); // light 4: faint night through the gap
      winGlow.position.set(RX - 0.2, wy, wz);
      winGlow.lookAt(0, wy, wz);
      S.add(winGlow);
    }

    /* ---- entrance door (right wall, dark wood) ---- */
    {
      const dz = (DOOR.z0 + DOOR.z1) / 2;
      S.add(
        mesh(
          new THREE.BoxGeometry(0.04, 2.08, DOOR.z1 - DOOR.z0 - 0.02),
          darkWoodMat,
          RX + 0.06,
          1.04,
          dz,
        ),
      );
      for (const z of [DOOR.z0 - 0.035, DOOR.z1 + 0.035])
        S.add(
          mesh(
            new THREE.BoxGeometry(0.2, 2.15, 0.07),
            darkWoodMat,
            RX,
            1.075,
            z,
            false,
          ),
        );
      S.add(
        mesh(
          new THREE.BoxGeometry(0.2, 0.07, DOOR.z1 - DOOR.z0 + 0.14),
          darkWoodMat,
          RX,
          2.135,
          dz,
          false,
        ),
      );
      S.add(
        mesh(
          new THREE.BoxGeometry(0.03, 0.02, 0.12),
          metal("#c9c9c9", 0.25),
          RX + 0.025,
          1.0,
          DOOR.z0 + 0.1,
          false,
        ),
      );
      S.add(
        mesh(
          new THREE.BoxGeometry(0.01, 0.12, 0.08),
          trim,
          RX - 0.005,
          1.2,
          DOOR.z0 - 0.25,
          false,
        ),
      );
    }

    /* ---- wooden ladder shelf with black mugs, white plates, blue glass vases (right wall, by the curtains) ---- */
    {
      const ladder = new THREE.Group();
      const lw = rep(lightWood, 0.2, 1, { roughness: 0.6 });
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
      const shelfX = (y: number) => {
        const depth = 0.42 - y * 0.16;
        return {
          depth,
          x: 0.2 - Math.tan(lean) * (y - 0.9) + depth / 2 - 0.15,
        };
      };
      for (const y of [0.3, 0.68, 1.06, 1.44]) {
        const { depth, x } = shelfX(y);
        ladder.add(
          mesh(new THREE.BoxGeometry(depth, 0.025, 0.72), lw, x, y, 0),
        );
      }
      const m4 = new THREE.Matrix4();
      const rand = seeded(101);
      const mugSpots: [number, number, number][] = [];
      for (const y of [0.68, 1.06])
        for (let i = 0; i < 6; i++)
          mugSpots.push([y, -0.29 + i * 0.115, rand() * 6]);
      const mugs = new THREE.InstancedMesh(
        mugGeometry(),
        new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.2 }),
        mugSpots.length,
      );
      mugSpots.forEach(([y, z, r], i) => {
        m4.compose(
          new THREE.Vector3(shelfX(y).x, y + 0.0125, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r, 0)),
          new THREE.Vector3(1, 1, 1),
        );
        mugs.setMatrixAt(i, m4);
      });
      ladder.add(mugs);
      const plates = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.12, 0.09, 0.018, 24),
        new THREE.MeshStandardMaterial({ color: "#f3f1ec", roughness: 0.25 }),
        16,
      );
      let pi = 0;
      for (const [y, z, n] of [
        [0.3, -0.15, 6],
        [0.3, 0.17, 5],
        [1.44, 0.18, 5],
      ] as const)
        for (let k = 0; k < n; k++) {
          m4.makeTranslation(shelfX(y).x, y + 0.02 + k * 0.016, z);
          plates.setMatrixAt(pi++, m4);
        }
      plates.count = pi;
      ladder.add(plates);
      const vaseProf = [
        [0, 0],
        [0.04, 0],
        [0.05, 0.05],
        [0.06, 0.14],
        [0.07, 0.2],
      ].map(([r, y]) => new THREE.Vector2(r!, y!));
      const blueGlass = new THREE.MeshPhysicalMaterial({
        color: "#2f5f9a",
        roughness: 0.08,
        transparent: true,
        opacity: 0.7,
        clearcoat: 1,
        envMapIntensity: 2,
      });
      for (const z of [-0.2, -0.05])
        ladder.add(
          mesh(
            new THREE.LatheGeometry(vaseProf, 20),
            blueGlass,
            shelfX(1.44).x,
            1.4525,
            z,
            false,
          ),
        );
      ladder.position.set(RX - 0.02, 0, 0.15);
      ladder.rotation.y = Math.PI;
      S.add(ladder);
      ctx.wall(RX - 0.45, -0.25, RX, 0.55);
    }

    /* ---- sofa facing the TV ---- */
    {
      const sofa = new THREE.Group();
      const sofaFab = rep(fabric("#5f5b57", 83), 2, 2);
      sofa.add(mesh(rbox(2.0, 0.24, 0.88, 0.04, 3), sofaFab, 0, 0.2, 0));
      for (const x of [-0.5, 0.5]) {
        sofa.add(mesh(rbox(0.95, 0.16, 0.66, 0.06, 3), sofaFab, x, 0.39, 0.08));
        const bc = mesh(
          rbox(0.95, 0.44, 0.2, 0.08, 3),
          sofaFab,
          x,
          0.66,
          -0.25,
        );
        bc.rotation.x = -0.12;
        sofa.add(bc);
      }
      sofa.add(mesh(rbox(2.0, 0.56, 0.18, 0.04, 3), sofaFab, 0, 0.55, -0.35));
      for (const s of [-1, 1])
        sofa.add(
          mesh(rbox(0.18, 0.58, 0.88, 0.06, 3), sofaFab, s * 0.91, 0.37, 0),
        );
      sofa.position.set(0.85, 0, 1.35);
      sofa.rotation.y = -Math.PI / 2;
      S.add(sofa);
      ctx.solid(sofa, 0.02);
      const rug = mesh(
        new THREE.BoxGeometry(2.0, 0.01, 2.2),
        rep(carpet("#6b6158", 93), 2, 2),
        -1.0,
        0.005,
        0.9,
        false,
      );
      S.add(rug);
    }

    /* ---- the granite-topped table where the roses and the rings were ---- */
    const TB = { x: 1.25, z: -1.3, w: 1.5, d: 0.85, h: 0.78 };
    {
      const top = mesh(
        rbox(TB.w, 0.03, TB.d, 0.006, 2),
        granite,
        TB.x,
        TB.h - 0.015,
        TB.z,
      );
      S.add(top);
      ctx.solid(top, 0.02);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          S.add(
            mesh(
              new THREE.BoxGeometry(0.05, TB.h - 0.03, 0.05),
              blackMetal,
              TB.x + sx * (TB.w / 2 - 0.08),
              (TB.h - 0.03) / 2,
              TB.z + sz * (TB.d / 2 - 0.08),
            ),
          );
      S.add(
        mesh(
          new THREE.BoxGeometry(TB.w - 0.16, 0.06, TB.d - 0.16),
          blackMetal,
          TB.x,
          TB.h - 0.06,
          TB.z,
        ),
      );
      const chairBlack = new THREE.MeshStandardMaterial({
        color: "#151515",
        roughness: 0.45,
      });
      const seatMat = new THREE.MeshStandardMaterial({
        color: "#1d1d1d",
        roughness: 0.6,
      });
      for (const [x, z, r] of [
        [TB.x - 0.35, TB.z - 0.58, 0],
        [TB.x + 0.35, TB.z - 0.58, 0],
        [TB.x - 0.35, TB.z + 0.6, Math.PI],
        [TB.x + 0.45, TB.z + 0.75, Math.PI - 0.4],
      ] as const) {
        const c = chair(chairBlack, seatMat);
        c.position.set(x, 0, z);
        c.rotation.y = r;
        S.add(c);
        ctx.solid(c, 0.02);
      }
    }
    const y0 = TB.h;
    // the bouquet lying on the granite, heads toward the room
    const bq = bouquet(ctx.quality);
    const tilt = new THREE.Group();
    tilt.add(bq);
    tilt.rotation.z = -1.33;
    const bqHolder = new THREE.Group();
    bqHolder.add(tilt);
    bqHolder.position.set(TB.x - 0.5, y0 + 0.035, TB.z - 0.05);
    bqHolder.rotation.y = -0.5;
    S.add(bqHolder);
    // two Talento bars, the letter, the ring box, a glass plate, the cardboard gift box, her black bag
    const choc = chocolateTex();
    const chocMat = new THREE.MeshStandardMaterial({
      map: choc,
      roughness: 0.35,
      metalness: 0.2,
    });
    const chocSide = new THREE.MeshStandardMaterial({
      color: "#a3121b",
      roughness: 0.35,
    });
    for (const [dx, dz, r] of [
      [0.35, 0.22, 0.3],
      [0.47, 0.1, -0.2],
    ] as const) {
      const bar = mesh(
        new THREE.BoxGeometry(0.16, 0.012, 0.08),
        [chocSide, chocSide, chocMat, chocSide, chocSide, chocSide],
        TB.x + dx,
        y0 + 0.006,
        TB.z + dz,
        false,
      );
      bar.rotation.y = r;
      S.add(bar);
    }
    const envelope = mesh(
      new THREE.BoxGeometry(0.22, 0.003, 0.11),
      new THREE.MeshStandardMaterial({ color: "#f1ede6", roughness: 0.8 }),
      TB.x - 0.02,
      y0 + 0.0015,
      TB.z - 0.22,
      false,
    );
    envelope.rotation.y = 0.2;
    S.add(envelope);
    const rb = ringBox();
    rb.position.set(TB.x + 0.18, y0, TB.z + 0.3);
    rb.rotation.y = 0.9;
    S.add(rb);
    S.add(
      mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.012, 32),
        glassLite("#ffffff", 0.2),
        TB.x + 0.22,
        y0 + 0.006,
        TB.z - 0.28,
        false,
      ),
    );
    {
      const kraft = new THREE.MeshStandardMaterial({
        color: "#b48a5c",
        roughness: 0.9,
      });
      const box = new THREE.Group();
      box.add(mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), kraft, 0, 0.1, 0));
      const flap = mesh(
        new THREE.BoxGeometry(0.26, 0.004, 0.11),
        kraft,
        0,
        0.2,
        -0.16,
      );
      flap.rotation.x = -1.1;
      box.add(flap);
      box.add(
        mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.08, 28),
          new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.35 }),
          0.02,
          0.24,
          0.01,
        ),
      );
      box.position.set(TB.x + 0.56, y0, TB.z - 0.22);
      box.rotation.y = -0.2;
      S.add(box);
      const bagLeather = rep(leather("#141215", 81), 1, 1, { roughness: 0.55 });
      const bag = new THREE.Group();
      bag.add(mesh(rbox(0.28, 0.18, 0.1, 0.03, 3), bagLeather, 0, 0.09, 0));
      bag.add(
        mesh(
          new THREE.TorusGeometry(0.09, 0.007, 6, 20, Math.PI),
          bagLeather,
          0,
          0.17,
          0,
        ),
      );
      bag.position.set(TB.x + 0.6, y0, TB.z + 0.32);
      bag.rotation.y = -0.4;
      S.add(bag);
    }
    // the framed rings selfie on the little wooden table under the pass-through
    const PH = { w: 0.18, h: 0.24 };
    ctx.photo(
      "casa-1.webp",
      PH.w,
      PH.h,
      new THREE.Vector3(ST.x - 0.02, ST.h + PH.h / 2 + 0.035, ST.z + 0.08),
      10,
    );
    S.add(
      mesh(
        new THREE.BoxGeometry(0.02, PH.h * 0.8, 0.006),
        new THREE.MeshStandardMaterial({ color: "#1d1a17" }),
        ST.x - 0.02,
        ST.h + PH.h * 0.4,
        ST.z + 0.02,
        false,
      ).rotateX(0.35),
    );

    // one sanca downlight left on, dimmed, over the granite table (light 5)
    S.add(
      mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16),
        emissive("#ffd7a0", 2.2),
        TB.x,
        H - 0.155,
        TB.z,
        false,
      ),
    );
    for (const [x, z] of [
      [-RX + 0.22, 1.5],
      [-RX + 0.22, -1.5],
      [RX - 0.22, 0.9],
      [0, RZ - 0.22],
    ] as const)
      S.add(
        mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16),
          new THREE.MeshStandardMaterial({
            color: "#f2f0ea",
            roughness: 0.3,
            metalness: 0.2,
          }),
          x,
          H - 0.155,
          z,
          false,
        ),
      );
    const tableLight = new THREE.SpotLight("#ffc58a", 3.2, 5, 0.75, 0.8, 2);
    tableLight.position.set(TB.x, H - 0.17, TB.z);
    tableLight.target.position.set(TB.x, 0, TB.z);
    S.add(tableLight, tableLight.target);

    // ambient fill (light 6), very low: it is night
    S.add(new THREE.HemisphereLight("#3a3848", "#1a120c", 0.09));

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
    const spawnX = RX - 0.6;
    const spawnZ = (DOOR.z0 + DOOR.z1) / 2;
    const px = TB.x - 0.95;
    const pz = TB.z + 0.45;
    ctx.partner(
      px,
      pz,
      THREE.MathUtils.radToDeg(Math.atan2(spawnX - px, spawnZ - pz)),
      "stand",
      outfits,
      ctx.player === "elena" ? "Agora é oficial! 💍" : "Sim, sim e sim! 💍🌹",
    );
    // the pack: on the granite, behind the bouquet
    ctx.pack(TB.x - 0.2, TB.h, TB.z - 0.28, 20);
    ctx.spawn(spawnX, spawnZ, 78);
    ctx.exit(RX - 0.1, spawnZ, 0.55);

    /* ---- the fireplace video plays; its light flickers ---- */
    const tvBase = tvLight.intensity;
    const warm = new THREE.Color("#ff8040");
    const hot = new THREE.Color("#ffb060");
    ctx.onUpdate((t) => {
      fire.draw(t);
      const f =
        0.8 +
        Math.sin(t * 7.3) * 0.08 +
        Math.sin(t * 13.1 + 1) * 0.07 +
        Math.sin(t * 23.7) * 0.05;
      tvLight.intensity = tvBase * f;
      tvLight.color.copy(warm).lerp(hot, (f - 0.6) * 1.2);
    });
  },
};

export default scene;
