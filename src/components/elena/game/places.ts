import * as THREE from "three";

import {
  abstractPainting,
  brickTexture,
  DAVI,
  glow,
  heartGeometry,
  marbleTexture,
  mat,
  type PersonOpts,
  stoneTexture,
  stripesTexture,
  texMat,
  tileTexture,
  woodTexture,
} from "./kit";

/*
 * The places, as open dollhouse rooms: the back wall to the north, the open
 * side to the south (toward the camera). Coordinates are local to the room's
 * center; y is the bottom of each piece. Recreated from the photos and the
 * frames of the videos.
 */

export type Ctx = {
  group: THREE.Group;
  box: (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    o?: { collide?: boolean; occlude?: boolean; shadow?: boolean },
  ) => THREE.Mesh;
  cyl: (
    rTop: number,
    rBottom: number,
    h: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    o?: { collide?: boolean; seg?: number },
  ) => THREE.Mesh;
  collide: (x: number, z: number, w: number, d: number) => void;
  npc: (
    opts: PersonOpts,
    x: number,
    z: number,
    rotY: number,
    text: string | null,
    mode?: "wave" | "sit" | "violin" | "idle",
  ) => void;
  pickup: (id: string, x: number, z: number, y?: number) => void;
  photo: (
    name: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    rotY?: number,
  ) => void;
  sign: (
    text: string,
    x: number,
    y: number,
    z: number,
    o: {
      bg: string;
      fg: string;
      w?: number;
      h?: number;
      rotY?: number;
      border?: string;
      emissive?: boolean;
    },
  ) => void;
  light: (
    color: THREE.ColorRepresentation,
    intensity: number,
    distance: number,
    x: number,
    y: number,
    z: number,
  ) => void;
  animate: (fn: (t: number) => void) => void;
  davi: (id: string) => string;
};

export type Place = {
  id: string;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  build: (c: Ctx) => void;
};

const WALL_H = 3.2;
const T = 0.3;

/** Floor and the three walls of a room. */
function room(
  c: Ctx,
  w: number,
  d: number,
  floor: THREE.Material,
  walls: { back: THREE.Material; left: THREE.Material; right: THREE.Material },
  h = WALL_H,
) {
  c.box(w, 0.12, d, floor, 0, 0, 0, { shadow: false });
  c.box(w, h, T, walls.back, 0, 0.12, -d / 2 + T / 2, {
    collide: true,
    occlude: true,
  });
  c.box(T, h, d, walls.left, -w / 2 + T / 2, 0.12, 0, {
    collide: true,
    occlude: true,
  });
  c.box(T, h, d, walls.right, w / 2 - T / 2, 0.12, 0, {
    collide: true,
    occlude: true,
  });
}

function chair(
  c: Ctx,
  x: number,
  z: number,
  rot: number,
  wood: THREE.Material,
  seat?: THREE.Material,
  cross = false,
) {
  const g = new THREE.Group();
  const add = (
    geo: THREE.BufferGeometry,
    m: THREE.Material,
    px: number,
    py: number,
    pz: number,
  ) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(px, py, pz);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  add(new THREE.BoxGeometry(0.6, 0.08, 0.6), seat ?? wood, 0, 0.5, 0);
  for (const [lx, lz] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ] as const) {
    add(new THREE.BoxGeometry(0.06, 0.5, 0.06), wood, lx, 0.25, lz);
  }
  add(new THREE.BoxGeometry(0.06, 0.6, 0.06), wood, -0.27, 0.85, -0.27);
  add(new THREE.BoxGeometry(0.06, 0.6, 0.06), wood, 0.27, 0.85, -0.27);
  if (cross) {
    const a = add(new THREE.BoxGeometry(0.7, 0.05, 0.04), wood, 0, 0.85, -0.27);
    a.rotation.z = 0.75;
    const b = add(new THREE.BoxGeometry(0.7, 0.05, 0.04), wood, 0, 0.85, -0.27);
    b.rotation.z = -0.75;
    add(new THREE.BoxGeometry(0.6, 0.06, 0.04), wood, 0, 1.12, -0.27);
  } else {
    add(new THREE.BoxGeometry(0.6, 0.35, 0.05), seat ?? wood, 0, 0.95, -0.27);
  }
  g.position.set(x, 0.12, z);
  g.rotation.y = rot;
  c.group.add(g);
}

function plant(c: Ctx, x: number, z: number, s = 1, pot = "#b8754a") {
  c.cyl(0.25 * s, 0.18 * s, 0.4 * s, mat(pot), x, 0.12, z, { collide: true });
  const leaves = mat("#3f8f4a");
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 * s, 0.7 * s, 5),
      leaves,
    );
    leaf.position.set(
      x + Math.cos(i * 1.3) * 0.12 * s,
      0.75 * s,
      z + Math.sin(i * 1.3) * 0.12 * s,
    );
    leaf.rotation.set(Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5);
    leaf.castShadow = true;
    c.group.add(leaf);
  }
}

/* ---------------- 1. Panedoca: the first date ---------------- */

const panedoca: Place = {
  id: "panedoca",
  label: "Panedoca",
  x: -11,
  z: -14,
  w: 13,
  d: 9,
  build(c) {
    const green = mat("#2f4d42");
    const brick = texMat(brickTexture("#e6e2dc", "#b9b3aa", 0.08, [4, 1.6]));
    room(c, 13, 9, texMat(woodTexture("#c79a6b", [3, 3])), {
      back: brick,
      left: green,
      right: green,
    });
    // warm LED strip along the brick wall and a teal one in the corner
    c.box(12.2, 0.06, 0.08, glow("#fff1d0", 2.2), 0, 1.75, -4.25);
    c.box(0.08, 3.0, 0.08, glow("#4fe3d0", 2), -6.15, 0.15, -4.1);
    // teal booth
    const velvet = mat("#1f5f5c", { roughness: 0.95 });
    c.box(6, 0.55, 0.9, velvet, -2.4, 0.12, -3.6, { collide: true });
    c.box(6, 0.9, 0.3, velvet, -2.4, 0.67, -4.0);
    // the marble table of the photos, with the phone, the bottle and the can
    const marble = texMat(marbleTexture(), { roughness: 0.4 });
    c.box(2.3, 0.1, 1.3, marble, -2.4, 0.95, -2.4, { collide: true });
    c.cyl(0.12, 0.25, 0.83, mat("#333"), -2.4, 0.12, -2.4);
    c.box(0.3, 0.03, 0.6, mat("#111", { roughness: 0.2 }), -2.0, 1.05, -2.6);
    c.cyl(
      0.08,
      0.08,
      0.45,
      new THREE.MeshStandardMaterial({
        color: "#cfe9ff",
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
      }),
      -3.0,
      1.05,
      -2.2,
    );
    c.cyl(
      0.06,
      0.06,
      0.2,
      mat("#d52b2b", { metalness: 0.5, roughness: 0.4 }),
      -3.3,
      1.05,
      -2.6,
    );
    c.box(0.25, 0.25, 0.1, mat("#ffffff"), -1.6, 1.05, -2.9);
    chair(c, -2.4, -1.2, Math.PI, mat("#2b2b2b"));
    // bakery counter with bread
    const counter = mat("#3d5a4c");
    c.box(3.6, 1.1, 1.0, counter, 4, 0.12, -3.3, { collide: true });
    c.box(3.7, 0.08, 1.1, marble, 4, 1.22, -3.3);
    const bread = mat("#c98a45", { roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bread);
      b.scale.set(1.5, 0.7, 0.9);
      b.position.set(2.7 + i * 0.5, 1.4, -3.3 + (i % 2) * 0.2);
      b.castShadow = true;
      c.group.add(b);
    }
    // a second table
    c.box(1.2, 0.08, 1.2, marble, 3.6, 0.95, -0.4, { collide: true });
    c.cyl(0.1, 0.25, 0.83, mat("#333"), 3.6, 0.12, -0.4);
    chair(c, 3.6, 0.5, Math.PI, mat("#2b2b2b"));
    chair(c, 3.6, -1.3, 0, mat("#2b2b2b"));
    plant(c, -5.6, 3.2);
    plant(c, 5.6, 3.2);
    c.photo("panedoca-1.webp", 1.2, 1.6, -2.4, 2.35, -4.12);
    c.sign("Panedoca", 0, WALL_H + 0.25, -4.3, {
      bg: "#2f4d42",
      fg: "#f6e7c8",
      w: 512,
      h: 128,
      border: "#f6e7c8",
    });
    c.npc(DAVI, -1.0, -1.0, -0.6, c.davi("panedoca"));
    c.pickup("panedoca", -2.4, -0.6);
  },
};

/* ---------------- 2. Casa da vó: meeting the family ---------------- */

const casaVo: Place = {
  id: "casa-vo",
  label: "Casa da vó",
  x: 11,
  z: -40,
  w: 14,
  d: 11,
  build(c) {
    const white = mat("#ece8df");
    room(
      c,
      14,
      11,
      texMat(tileTexture("#e7dfd2", "#cfc4b3", [6, 5]), { roughness: 0.5 }),
      { back: white, left: white, right: white },
    );
    // window with the red balcony railing and the AC unit
    c.box(5, 2.2, 0.05, glow("#cfe8ff", 0.8), 2.5, 0.7, -5.32);
    const red = mat("#a8322a");
    for (let i = 0; i < 6; i++)
      c.box(0.06, 1.0, 0.06, red, 0.3 + i * 0.9, 0.7, -5.2);
    c.box(5, 0.08, 0.08, red, 2.5, 1.7, -5.2);
    c.box(1.6, 0.5, 0.35, mat("#fafafa"), 2.5, 2.75, -5.1);
    // abstract painting
    const painting = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.4),
      texMat(abstractPainting()),
    );
    painting.position.set(-2.5, 2.0, -5.32);
    c.group.add(painting);
    c.box(1.25, 1.55, 0.04, mat("#d9b26a"), -2.5, 1.22, -5.36);
    // beige sofas in an L and the recliner
    const sofa = mat("#cbbfae", { roughness: 1 });
    c.box(4.2, 0.55, 1.2, sofa, -3.8, 0.12, -4.4, { collide: true });
    c.box(4.2, 0.7, 0.35, sofa, -3.8, 0.6, -4.95);
    c.box(1.2, 0.55, 3.2, sofa, -6.1, 0.12, -2.2, { collide: true });
    c.box(0.35, 0.7, 3.2, sofa, -6.6, 0.6, -2.2);
    for (let i = 0; i < 3; i++)
      c.box(0.8, 0.45, 0.25, mat("#e9e1d3"), -5.2 + i * 1.3, 0.67, -4.7);
    c.box(1.2, 0.6, 1.2, mat("#d8c9a8"), 4.6, 0.12, 2.2, { collide: true });
    c.box(1.2, 0.9, 0.3, mat("#d8c9a8"), 4.6, 0.72, 1.7);
    // dining table with the aqua tablecloth
    c.box(2.6, 0.75, 1.4, mat("#6fd3c4", { roughness: 1 }), 3.6, 0.12, -1.6, {
      collide: true,
    });
    for (const [px, pz] of [
      [2.9, -1.6],
      [4.3, -1.6],
    ] as const)
      c.cyl(0.25, 0.25, 0.03, mat("#ffffff", { roughness: 0.3 }), px, 0.88, pz);
    const darkWood = mat("#5a2d1f");
    chair(c, 2.9, -0.5, Math.PI, darkWood);
    chair(c, 4.3, -0.5, Math.PI, darkWood);
    chair(c, 2.9, -2.7, 0, darkWood);
    // dark wood sideboard
    c.box(0.6, 1.0, 3.0, darkWood, 6.5, 0.12, -2.2, { collide: true });
    c.cyl(0.12, 0.1, 0.3, mat("#c0392b"), 6.5, 1.12, -3.0);
    // the door of the apartment, 302
    c.box(1.1, 2.3, 0.12, mat("#f4f4f2"), -6.4, 0.12, 4.0);
    c.sign("302", -6.4, 2.05, 4.08, {
      bg: "#f4f4f2",
      fg: "#222",
      w: 128,
      h: 64,
    });
    plant(c, -4.5, 3.8, 1.2);
    // the family, waving
    c.npc(
      {
        skin: "#efc6a5",
        hair: "#c9a46b",
        top: "#3f9a5a",
        bottom: "#222",
        scale: 0.95,
      },
      -5.9,
      -2.0,
      Math.PI / 2,
      "Seja bem-vinda, Elena! 💚",
      "sit",
    );
    c.npc(
      {
        skin: "#efc6a5",
        hair: "#d9c08a",
        top: "#1d1d1d",
        bottom: "#1d1d1d",
        glasses: true,
        scale: 0.97,
      },
      -2.6,
      -1.8,
      0.3,
      "Que alegria te conhecer! 😊",
      "wave",
    );
    c.npc(
      {
        skin: "#e7b28f",
        hair: "#3b2a20",
        top: "#222222",
        bottom: "#3a3a3a",
        scale: 1.0,
      },
      0.6,
      -2.6,
      -0.2,
      "Fica à vontade, a casa é sua!",
      "wave",
    );
    c.npc(
      {
        skin: "#e7b28f",
        hair: "#3b2a20",
        top: "#8fbfa8",
        bottom: "#555",
        scale: 1.0,
      },
      1.6,
      1.4,
      -0.6,
      null,
      "idle",
    );
    c.npc(
      { ...DAVI, top: "#1fb7b2", number: "1" },
      -1.4,
      1.6,
      0.4,
      c.davi("casa-vo"),
    );
    c.pickup("casa-vo", -0.6, 0.0);
  },
};

/* ---------------- 3. Caldas Novas: the first trip ---------------- */

const caldas: Place = {
  id: "caldas",
  label: "Caldas Novas",
  x: -10,
  z: -68,
  w: 18,
  d: 14,
  build(c) {
    c.box(
      18,
      0.12,
      14,
      texMat(tileTexture("#e9dcc6", "#d6c6aa", [9, 7]), { roughness: 0.6 }),
      0,
      0,
      0,
      { shadow: false },
    );
    // resort building with warm windows
    c.box(16, 4.2, 2.2, mat("#f6f1ea"), 0, 0.12, -6.0, {
      collide: true,
      occlude: true,
    });
    for (let i = 0; i < 6; i++) {
      c.box(1.3, 1.1, 0.05, glow("#ffd59a", 1.4), -6 + i * 2.4, 1.4, -4.88);
    }
    c.box(16.4, 0.3, 2.6, mat("#e7ddd0"), 0, 4.3, -6.0);
    // the pool
    const water = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader:
        "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform float uTime; varying vec2 vUv; void main(){ vec2 p = vUv * vec2(9.0,5.0); float w = sin(p.x*3.1+uTime*1.3)*sin(p.y*3.7-uTime*1.1) + sin((p.x+p.y)*2.3+uTime*0.9); float c = smoothstep(0.75,1.0,abs(w)*0.6); vec3 col = mix(vec3(0.05,0.55,0.75), vec3(0.15,0.8,0.95), vUv.y); gl_FragColor = vec4(col + c*0.35, 1.0); }",
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-1, 0.14, -1.0);
    c.group.add(pool);
    c.animate((t) => {
      water.uniforms.uTime!.value = t;
    });
    const coping = mat("#fbfbf7");
    c.box(9.6, 0.18, 0.3, coping, -1, 0.12, 1.6);
    c.box(9.6, 0.18, 0.3, coping, -1, 0.12, -3.6);
    c.box(0.3, 0.18, 5.6, coping, -5.65, 0.12, -1.0);
    c.box(0.3, 0.18, 5.6, coping, 3.65, 0.12, -1.0);
    c.collide(-1, -1.0, 9.4, 5.0);
    // pink float ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.22, 10, 24),
      mat("#ff8fb8", { roughness: 0.5 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(1.2, 0.3, -0.4);
    c.group.add(ring);
    c.animate((t) => {
      ring.position.y = 0.3 + Math.sin(t * 1.6) * 0.05;
      ring.rotation.z = t * 0.2;
    });
    // palms
    const trunk = mat("#8d6a48");
    const frond = mat("#2f8a4e");
    for (const [px, pz, h] of [
      [-7.6, -3.5, 5],
      [6.3, -3.8, 5.6],
      [7.5, 2.8, 4.6],
      [-7.8, 3.6, 4.4],
    ] as const) {
      for (let i = 0; i < 6; i++) {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.2, h / 6, 7),
          trunk,
        );
        seg.position.set(
          px + Math.sin(i * 0.4) * 0.15 * i * 0.3,
          0.12 + (i + 0.5) * (h / 6),
          pz,
        );
        seg.castShadow = true;
        c.group.add(seg);
      }
      c.collide(px, pz, 0.5, 0.5);
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 2.4, 4),
          frond,
        );
        const a = (i / 7) * Math.PI * 2;
        leaf.position.set(
          px + Math.cos(a) * 1.0,
          h + 0.1,
          pz + Math.sin(a) * 1.0,
        );
        leaf.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
        leaf.scale.set(1, 1, 0.25);
        leaf.castShadow = true;
        c.group.add(leaf);
      }
    }
    // loungers and garden lamps
    const white = mat("#ffffff", { roughness: 0.6 });
    for (const lx of [5.0, 6.6]) {
      c.box(0.9, 0.35, 2.0, white, lx, 0.12, 0.4, { collide: true });
      const back = c.box(0.9, 0.08, 0.9, white, lx, 0.6, -0.6);
      back.rotation.x = 0.6;
    }
    for (const [lx, lz] of [
      [-8.4, 6],
      [8.4, 6],
      [-8.4, -1],
      [8.4, -1],
    ] as const) {
      c.cyl(0.05, 0.05, 1.3, mat("#333"), lx, 0.12, lz);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        glow("#ffd27a", 2),
      );
      bulb.position.set(lx, 1.55, lz);
      c.group.add(bulb);
    }
    c.light("#7fe9ff", 6, 9, -1, 1.0, -1.0);
    c.sign("Caldas Novas", 6.0, 0.9, 5.6, {
      bg: "#1f7fa8",
      fg: "#ffffff",
      w: 512,
      h: 128,
      border: "#ffffff",
      rotY: -0.3,
    });
    c.cyl(0.06, 0.06, 0.9, mat("#555"), 6.0, 0.12, 5.55);
    c.npc(
      { ...DAVI, top: "#1fb7b2", number: "1" },
      3.2,
      2.6,
      -0.7,
      c.davi("caldas"),
    );
    c.pickup("caldas", 1.2, 2.6);
  },
};

/* ---------------- 4. Cinema ---------------- */

const cinema: Place = {
  id: "cinema",
  label: "Cinema",
  x: 12,
  z: -94,
  w: 13,
  d: 12,
  build(c) {
    const dark = mat("#2a1630");
    room(
      c,
      13,
      12,
      mat("#7a1f2b", { roughness: 1 }),
      { back: dark, left: dark, right: dark },
      3.6,
    );
    // the screen shows them
    c.photo("cinema-1.webp", 2.4, 3.2, 0, 0.25, -5.82);
    c.box(9, 0.08, 0.1, glow("#ffe6b0", 1.5), 0, 3.6, -5.8);
    const seat = mat("#b0162f", { roughness: 0.9 });
    for (let row = 0; row < 3; row++) {
      const z = -2.6 + row * 1.9;
      const y = 0.12 + row * 0.25;
      c.box(11, row * 0.25 + 0.01, 1.9, mat("#5e1622"), 0, 0.12, z + 0.4);
      for (let i = 0; i < 8; i++) {
        if (i === 3 || i === 4) continue; // the aisle
        const x = -4.6 + i * 1.3;
        c.box(1.0, 0.45, 0.9, seat, x, y, z, { collide: row === 0 });
        c.box(1.0, 0.85, 0.2, seat, x, y + 0.45, z + 0.45);
      }
    }
    c.collide(-3.3, -0.7, 4.0, 4.6);
    c.collide(3.3, -0.7, 4.0, 4.6);
    // popcorn
    const bucket = c.cyl(
      0.32,
      0.24,
      0.6,
      texMat(stripesTexture(["#e53935", "#ffffff"], [4, 1])),
      0,
      0.12,
      3.6,
      { collide: true },
    );
    bucket.castShadow = true;
    const corn = mat("#ffe08a", { roughness: 1 });
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), corn);
      p.position.set(
        Math.cos(i) * 0.18,
        0.78 + (i % 3) * 0.05,
        3.6 + Math.sin(i * 1.7) * 0.18,
      );
      c.group.add(p);
    }
    // marquee with bulbs
    c.sign("CINEMA", -4.5, 0.4, 6.2, {
      bg: "#1a0f24",
      fg: "#ffd27a",
      w: 512,
      h: 160,
      border: "#ffd27a",
      emissive: true,
      rotY: 0.2,
    });
    c.cyl(0.07, 0.07, 1.2, mat("#333"), -4.5, 0.12, 6.15);
    c.npc(DAVI, 1.4, 1.6, -0.5, c.davi("cinema"));
    c.pickup("cinema", 0, 1.0);
  },
};

/* ---------------- 5. Casa: the official request and the roses ---------------- */

const casa: Place = {
  id: "casa",
  label: "Casa",
  x: -10,
  z: -120,
  w: 14,
  d: 11,
  build(c) {
    const wall = mat("#d6c2a2");
    room(c, 14, 11, texMat(woodTexture("#6b4630", [4, 4])), {
      back: wall,
      left: wall,
      right: wall,
    });
    // kitchen pass-through with white cabinets behind
    c.box(4, 1.3, 0.05, glow("#fff4dc", 0.6), -3, 1.3, -5.34);
    c.box(4.2, 0.1, 0.5, mat("#3a2a20"), -3, 1.25, -5.1);
    c.box(3.4, 0.7, 0.04, mat("#f4f4f4"), -3, 2.0, -5.3);
    // wooden table with the red roses
    const wood = mat("#8a5a35");
    c.box(2.6, 0.1, 1.4, wood, -2.6, 0.95, -2.6, { collide: true });
    for (const [lx, lz] of [
      [-3.7, -3.1],
      [-1.5, -3.1],
      [-3.7, -2.1],
      [-1.5, -2.1],
    ] as const)
      c.box(0.1, 0.83, 0.1, wood, lx, 0.12, lz);
    const wrap = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.9, 8, 1, true),
      mat("#c3132d", { roughness: 0.6 }),
    );
    wrap.rotation.x = Math.PI;
    wrap.position.set(-2.4, 1.5, -2.6);
    c.group.add(wrap);
    const rose = mat("#a8001f", { roughness: 0.7 });
    for (let i = 0; i < 12; i++) {
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), rose);
      const a = i * 2.4;
      const d = i < 4 ? 0.1 : 0.28;
      r.position.set(
        -2.4 + Math.cos(a) * d,
        1.95 + (i < 4 ? 0.08 : 0),
        -2.6 + Math.sin(a) * d,
      );
      r.castShadow = true;
      c.group.add(r);
    }
    chair(c, -2.6, -1.4, Math.PI, wood);
    // sideboard with the orange glow and the glasses
    c.box(3, 0.9, 0.7, mat("#5a3a26"), 3.8, 0.12, -4.7, { collide: true });
    c.box(2.6, 0.5, 0.05, glow("#ff7a3d", 1.4), 3.8, 0.35, -4.33);
    const glass = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.45,
      roughness: 0.05,
    });
    for (let i = 0; i < 6; i++)
      c.cyl(0.08, 0.06, 0.3, glass, 2.7 + i * 0.42, 1.02, -4.7);
    // ladder shelf with mugs
    const shelf = mat("#9a6a40");
    c.box(0.08, 2.6, 0.08, shelf, 5.9, 0.12, -4.9);
    c.box(0.08, 2.6, 0.08, shelf, 4.9, 0.12, -4.9);
    for (let i = 0; i < 4; i++) {
      c.box(1.1, 0.06, 0.5, shelf, 5.4, 0.5 + i * 0.6, -4.8);
      for (let m = 0; m < 3; m++)
        c.cyl(
          0.08,
          0.08,
          0.16,
          mat(i % 2 ? "#1d2b5a" : "#f2f2f2"),
          5.05 + m * 0.33,
          0.56 + i * 0.6,
          -4.8,
        );
    }
    c.collide(5.4, -4.85, 1.2, 0.6);
    // sofa and the coffee table with the ring box
    const sofa = mat("#3b2b25", { roughness: 1 });
    c.box(1.1, 0.55, 3.4, sofa, 6.1, 0.12, -0.6, { collide: true });
    c.box(0.3, 0.8, 3.4, sofa, 6.6, 0.6, -0.6);
    c.box(1.4, 0.45, 0.9, mat("#7a5232"), 4.0, 0.12, -0.6, { collide: true });
    c.box(0.45, 0.25, 0.4, mat("#5c0a1c", { roughness: 0.9 }), 4.0, 0.57, -0.6);
    const lid = c.box(
      0.45,
      0.06,
      0.4,
      mat("#5c0a1c", { roughness: 0.9 }),
      4.0,
      0.95,
      -0.85,
    );
    lid.rotation.x = -1.1;
    const gold = mat("#f2c14e", { metalness: 0.9, roughness: 0.25 });
    for (const rx of [3.9, 4.1]) {
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.022, 8, 16),
        gold,
      );
      ringMesh.position.set(rx, 0.9, -0.6);
      c.group.add(ringMesh);
    }
    // warm lamp
    c.cyl(0.04, 0.04, 1.8, mat("#222"), -5.8, 0.12, 2.6);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.5, 12, 1, true),
      glow("#ffc27a", 1.2),
    );
    shade.position.set(-5.8, 2.1, 2.6);
    c.group.add(shade);
    c.light("#ffb36b", 10, 12, -1, 3.2, -1);
    c.photo("casa-1.webp", 1.3, 1.7, 1.2, 1.6, -5.32);
    c.sign("Nossa casa", 0, WALL_H + 0.25, -5.3, {
      bg: "#6b4630",
      fg: "#fff3e0",
      w: 512,
      h: 128,
      border: "#fff3e0",
    });
    c.npc(DAVI, 1.6, 0.8, -0.4, c.davi("casa"));
    c.pickup("compromisso", -2.6, -0.7);
    c.pickup("pedido", 4.0, 0.6);
  },
};

/* ---------------- 6. Famiglia Crosara: one month of us ---------------- */

const famiglia: Place = {
  id: "famiglia",
  label: "Famiglia Crosara",
  x: 10,
  z: -146,
  w: 17,
  d: 12,
  build(c) {
    const stone = texMat(stoneTexture([4, 1.4]));
    const darkGreen = mat("#1f2a26");
    room(
      c,
      17,
      12,
      texMat(tileTexture("#bdb8b0", "#a8a39b", [8, 6]), { roughness: 0.5 }),
      { back: stone, left: darkGreen, right: darkGreen },
      4.4,
    );
    // brick arch with the blue glow, in the stone wall
    const brick = texMat(brickTexture("#9c4b30", "#5e2c1c", 0.12, [3, 1], 13));
    c.box(0.5, 2.4, 0.5, brick, -1.6, 0.12, -5.6);
    c.box(0.5, 2.4, 0.5, brick, 1.6, 0.12, -5.6);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.25, 8, 20, Math.PI),
      brick,
    );
    arch.position.set(0, 2.5, -5.6);
    c.group.add(arch);
    c.box(2.7, 2.4, 0.05, glow("#2a6fb0", 1.2), 0, 0.12, -5.82);
    // bamboo wall on the left with the warm LED
    const bamboo = mat("#c9a24a", { roughness: 0.7 });
    for (let i = 0; i < 22; i++) {
      c.cyl(0.06, 0.06, 4.2, bamboo, -8.1, 0.12, -5.5 + i * 0.5);
    }
    c.box(0.06, 4.0, 0.06, glow("#ffd27a", 2.2), -8.25, 0.2, 0);
    // green tile counter with the blue fridge glow on the right
    c.box(
      1.0,
      1.1,
      5.5,
      texMat(tileTexture("#1f5a46", "#14382c", [2, 4])),
      7.6,
      0.12,
      -2.4,
      { collide: true },
    );
    c.box(1.1, 2.6, 1.2, glow("#7fd6ff", 1.0), 7.8, 0.12, 1.2, {
      collide: true,
    });
    c.box(1.1, 2.8, 1.4, mat("#a8794e"), 7.8, 0.12, 2.6, { collide: true });
    // tables with cross-back chairs
    const cloth = mat("#e9e3d6", { roughness: 1 });
    const chairWood = mat("#d8a865");
    const tables: [number, number][] = [
      [-4.5, -3],
      [4.0, -3.2],
      [-4.6, 1.6],
      [3.6, 2.6],
    ];
    for (const [tx, tz] of tables) {
      c.cyl(0.8, 0.8, 0.8, cloth, tx, 0.12, tz, { collide: true, seg: 18 });
      chair(c, tx, tz + 1.2, Math.PI, chairWood, undefined, true);
      chair(c, tx, tz - 1.2, 0, chairWood, undefined, true);
      c.cyl(
        0.05,
        0.03,
        0.25,
        new THREE.MeshStandardMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.5,
        }),
        tx + 0.3,
        0.92,
        tz,
      );
    }
    // their table, in the middle
    c.box(1.6, 0.08, 1.2, mat("#d8a865"), -0.2, 0.92, 0.2, { collide: true });
    c.box(0.12, 0.8, 0.12, chairWood, -0.2, 0.12, 0.2);
    chair(c, -0.2, 1.3, Math.PI, chairWood, undefined, true);
    chair(c, -0.2, -0.9, 0, chairWood, undefined, true);
    c.photo("famiglia-1.webp", 0.5, 0.65, 0.3, 1.0, 0.0);
    // wicker pendant lamps
    const wicker = glow("#e8671c", 0.9);
    const lamps: [number, number, number][] = [
      [-4.5, -3, 3.0],
      [4.0, -3.2, 3.2],
      [-4.6, 1.6, 2.8],
      [3.6, 2.6, 3.0],
      [-0.2, 0.2, 3.0],
      [0, -4.2, 3.4],
    ];
    const lampMeshes: THREE.Mesh[] = [];
    for (const [lx, lz, ly] of lamps) {
      c.cyl(0.01, 0.01, 4.6 - ly, mat("#222"), lx, ly + 0.5, lz);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), wicker);
      l.scale.set(1, 1.15, 1);
      l.position.set(lx, ly, lz);
      c.group.add(l);
      lampMeshes.push(l);
    }
    c.animate((t) =>
      lampMeshes.forEach(
        (l, i) => (l.rotation.z = Math.sin(t * 0.8 + i) * 0.05),
      ),
    );
    c.light("#ffb066", 14, 16, 0, 3.5, -0.5);
    plant(c, -2.8, -5.2, 1.3);
    plant(c, 2.8, -5.2, 1.3);
    plant(c, -7.4, 5.0, 1.1);
    c.sign("Famiglia Crosara", 0, 4.6, -5.8, {
      bg: "#1f2a26",
      fg: "#f6d58f",
      w: 768,
      h: 128,
      border: "#c9a24a",
    });
    // the violinist by the arch
    c.npc(
      {
        skin: "#6b4430",
        hair: "#141010",
        top: "#111111",
        bottom: "#111111",
        beard: true,
        scale: 1.0,
      },
      2.4,
      -4.3,
      -0.3,
      "🎻 ♪ ♫",
      "violin",
    );
    c.npc(DAVI, 1.4, 0.4, -0.5, c.davi("famiglia"), "idle");
    c.pickup("famiglia", -0.2, 2.2);
  },
};

export const PLACES: Place[] = [
  panedoca,
  casaVo,
  caldas,
  cinema,
  casa,
  famiglia,
];

/** Where each memory's heart sits (for the guiding beam), in walking order. */
export const MEMORY_ORDER = [
  "panedoca",
  "casa-vo",
  "caldas",
  "cinema",
  "pedido",
  "compromisso",
  "famiglia",
] as const;

export const FINALE = { x: 0, z: -176 };

export { heartGeometry };
