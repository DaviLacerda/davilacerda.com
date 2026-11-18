import * as THREE from "three";

import {
  abstractPainting,
  brickTexture,
  glow,
  marbleTexture,
  mat,
  type PersonOpts,
  stripesTexture,
  texMat,
  tileTexture,
  woodTexture,
} from "./kit";

/*
 * The places, as open dollhouse rooms that sit on their islands: the back wall
 * to the north, the open side to the south (toward the camera). Coordinates are
 * local to the room's center; y is the bottom of each piece. Recreated from the
 * photos, the frames of the videos and the references Davi sent.
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
  /** The other person (not the one being played), in this island's outfit. */
  partner: (
    x: number,
    z: number,
    rotY: number,
    outfit?: Partial<PersonOpts>,
  ) => void;
  /** The card pack of this island. */
  pack: (x: number, z: number) => void;
  /** A framed photo that stays covered until the island's pack is opened. */
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
  /** A texture taken from the photos (served decrypted by the media route), tiled rx by ry. */
  tex: (name: string, rx: number, ry: number) => THREE.Texture;
};

export type Place = {
  id: string;
  label: string;
  /** Room footprint, to keep trees and flowers out of it. */
  w: number;
  d: number;
  /** Island radius and colours of its theme. */
  radius: number;
  theme: { grass: string; accent: string; sign: string };
  build: (c: Ctx) => void;
  /** A big floating landmark above the island, like a park land's icon. */
  landmark: (
    g: THREE.Group,
    animate: (fn: (t: number) => void) => void,
  ) => void;
};

const WALL_H = 3.2;
const T = 0.3;

const TEAL_JERSEY: Partial<PersonOpts> = { top: "#1fb7b2", number: "1" };

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

function addTo(
  g: THREE.Group,
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  g.add(o);
  return o;
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
  addTo(g, new THREE.BoxGeometry(0.6, 0.08, 0.6), seat ?? wood, 0, 0.5, 0);
  for (const [lx, lz] of [
    [-0.25, -0.25],
    [0.25, -0.25],
    [-0.25, 0.25],
    [0.25, 0.25],
  ] as const)
    addTo(g, new THREE.BoxGeometry(0.06, 0.5, 0.06), wood, lx, 0.25, lz);
  addTo(g, new THREE.BoxGeometry(0.06, 0.6, 0.06), wood, -0.27, 0.85, -0.27);
  addTo(g, new THREE.BoxGeometry(0.06, 0.6, 0.06), wood, 0.27, 0.85, -0.27);
  if (cross) {
    addTo(
      g,
      new THREE.BoxGeometry(0.7, 0.05, 0.04),
      wood,
      0,
      0.85,
      -0.27,
    ).rotation.z = 0.75;
    addTo(
      g,
      new THREE.BoxGeometry(0.7, 0.05, 0.04),
      wood,
      0,
      0.85,
      -0.27,
    ).rotation.z = -0.75;
    addTo(g, new THREE.BoxGeometry(0.6, 0.06, 0.04), wood, 0, 1.12, -0.27);
  } else {
    addTo(
      g,
      new THREE.BoxGeometry(0.6, 0.35, 0.05),
      seat ?? wood,
      0,
      0.95,
      -0.27,
    );
  }
  g.position.set(x, 0.12, z);
  g.rotation.y = rot;
  c.group.add(g);
}

function plant(c: Ctx, x: number, z: number, s = 1, pot = "#b8754a") {
  c.cyl(0.25 * s, 0.18 * s, 0.4 * s, mat(pot), x, 0.12, z, { collide: true });
  const leaves = mat("#3f8f4a");
  for (let i = 0; i < 5; i++) {
    const leaf = addTo(
      c.group,
      new THREE.ConeGeometry(0.12 * s, 0.7 * s, 5),
      leaves,
      x + Math.cos(i * 1.3) * 0.12 * s,
      0.75 * s,
      z + Math.sin(i * 1.3) * 0.12 * s,
    );
    leaf.rotation.set(Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5);
  }
}

function palm(c: Ctx, px: number, pz: number, h: number) {
  const trunk = mat("#8d6a48");
  const frond = mat("#2f8a4e");
  for (let i = 0; i < 6; i++)
    addTo(
      c.group,
      new THREE.CylinderGeometry(0.16, 0.2, h / 6, 7),
      trunk,
      px + i * 0.03,
      0.12 + (i + 0.5) * (h / 6),
      pz,
    );
  c.collide(px, pz, 0.5, 0.5);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = addTo(
      c.group,
      new THREE.ConeGeometry(0.35, 2.4, 4),
      frond,
      px + Math.cos(a),
      h + 0.1,
      pz + Math.sin(a),
    );
    leaf.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
    leaf.scale.set(1, 1, 0.25);
  }
}

function spin(
  g: THREE.Group,
  animate: (fn: (t: number) => void) => void,
  y: number,
) {
  g.position.y = y;
  animate((t) => {
    g.rotation.y = t * 0.4;
    g.position.y = y + Math.sin(t * 1.2) * 0.4;
  });
}

/* ---------------- 1. Panedoca: the first date ---------------- */

const panedoca: Place = {
  id: "panedoca",
  label: "Panedoca",
  w: 13,
  d: 9,
  radius: 13,
  theme: { grass: "#a8d98f", accent: "#2f4d42", sign: "#f6e7c8" },
  build(c) {
    const green = mat("#2f4d42");
    const brick = texMat(brickTexture("#dcd8d2", "#a9a39a", 0.1, [3, 2.2]), {
      roughness: 0.9,
    });
    room(c, 13, 9, texMat(woodTexture("#c79a6b", [3, 3])), {
      back: brick,
      left: green,
      right: green,
    });
    c.box(12.2, 0.06, 0.08, glow("#fff1d0", 2.2), 0, 1.75, -4.25);
    c.box(0.08, 3.0, 0.08, glow("#4fe3d0", 2), -6.15, 0.15, -4.1);
    const velvet = mat("#1f5f5c", { roughness: 0.95 });
    c.box(6, 0.55, 0.9, velvet, -2.4, 0.12, -3.6, { collide: true });
    c.box(6, 0.9, 0.3, velvet, -2.4, 0.67, -4.0);
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
    const counter = mat("#3d5a4c");
    c.box(3.6, 1.1, 1.0, counter, 4, 0.12, -3.3, { collide: true });
    c.box(3.7, 0.08, 1.1, marble, 4, 1.22, -3.3);
    const bread = mat("#c98a45", { roughness: 0.8 });
    for (let i = 0; i < 6; i++)
      addTo(
        c.group,
        new THREE.SphereGeometry(0.2, 10, 8),
        bread,
        2.7 + i * 0.5,
        1.4,
        -3.3 + (i % 2) * 0.2,
      ).scale.set(1.5, 0.7, 0.9);
    c.box(1.2, 0.08, 1.2, marble, 3.6, 0.95, -0.4, { collide: true });
    c.cyl(0.1, 0.25, 0.83, mat("#333"), 3.6, 0.12, -0.4);
    chair(c, 3.6, 0.5, Math.PI, mat("#2b2b2b"));
    chair(c, 3.6, -1.3, 0, mat("#2b2b2b"));
    plant(c, -5.6, 3.2);
    plant(c, 5.6, 3.2);
    c.photo("panedoca-1.webp", 1.2, 1.6, -2.4, 2.0, -4.12);
    c.photo("panedoca-2.webp", 1.2, 1.6, 2.0, 1.4, -4.12);
    c.sign("Panedoca", 0, WALL_H + 0.25, -4.3, {
      bg: "#2f4d42",
      fg: "#f6e7c8",
      border: "#f6e7c8",
    });
    c.partner(-1.0, -1.0, -0.6);
    c.pack(-2.4, -0.4);
  },
  landmark(g, animate) {
    // a giant coffee cup with steam
    const cup = new THREE.Group();
    addTo(
      cup,
      new THREE.CylinderGeometry(1.6, 1.2, 2.2, 20),
      mat("#ffffff", { roughness: 0.4 }),
      0,
      0,
      0,
    );
    addTo(
      cup,
      new THREE.CylinderGeometry(1.45, 1.45, 0.1, 20),
      mat("#6b3e26"),
      0,
      1.06,
      0,
    );
    const handle = addTo(
      cup,
      new THREE.TorusGeometry(0.6, 0.18, 8, 16),
      mat("#ffffff"),
      1.7,
      0.1,
      0,
    );
    handle.rotation.z = Math.PI / 2;
    addTo(
      cup,
      new THREE.CylinderGeometry(2.4, 2.4, 0.15, 24),
      mat("#ffffff"),
      0,
      -1.15,
      0,
    );
    for (let i = 0; i < 3; i++)
      addTo(
        cup,
        new THREE.SphereGeometry(0.35 - i * 0.06, 10, 8),
        mat("#ffffff", { roughness: 1 }),
        Math.sin(i) * 0.4,
        1.6 + i * 0.6,
        0,
      );
    g.add(cup);
    spin(g, animate, 9);
  },
};

/* ---------------- 2. Casa da vó: meeting the family ---------------- */

const casaVo: Place = {
  id: "casa-vo",
  label: "Casa da vó",
  w: 14,
  d: 11,
  radius: 14,
  theme: { grass: "#b5dc95", accent: "#a8322a", sign: "#fff4e6" },
  build(c) {
    const white = mat("#ece8df");
    room(
      c,
      14,
      11,
      texMat(tileTexture("#e7dfd2", "#cfc4b3", [6, 5]), { roughness: 0.5 }),
      { back: white, left: white, right: white },
    );
    c.box(5, 2.2, 0.05, glow("#cfe8ff", 0.8), 2.5, 0.7, -5.32);
    const red = mat("#a8322a");
    for (let i = 0; i < 6; i++)
      c.box(0.06, 1.0, 0.06, red, 0.3 + i * 0.9, 0.7, -5.2);
    c.box(5, 0.08, 0.08, red, 2.5, 1.7, -5.2);
    c.box(1.6, 0.5, 0.35, mat("#fafafa"), 2.5, 2.75, -5.1);
    const painting = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.4),
      texMat(abstractPainting()),
    );
    painting.position.set(-2.5, 2.0, -5.32);
    c.group.add(painting);
    c.box(1.25, 1.55, 0.04, mat("#d9b26a"), -2.5, 1.22, -5.36);
    const sofa = mat("#cbbfae", { roughness: 1 });
    c.box(4.2, 0.55, 1.2, sofa, -3.8, 0.12, -4.4, { collide: true });
    c.box(4.2, 0.7, 0.35, sofa, -3.8, 0.6, -4.95);
    c.box(1.2, 0.55, 3.2, sofa, -6.1, 0.12, -2.2, { collide: true });
    c.box(0.35, 0.7, 3.2, sofa, -6.6, 0.6, -2.2);
    for (let i = 0; i < 3; i++)
      c.box(0.8, 0.45, 0.25, mat("#e9e1d3"), -5.2 + i * 1.3, 0.67, -4.7);
    c.box(1.2, 0.6, 1.2, mat("#d8c9a8"), 4.6, 0.12, 2.2, { collide: true });
    c.box(1.2, 0.9, 0.3, mat("#d8c9a8"), 4.6, 0.72, 1.7);
    c.box(2.6, 0.75, 1.4, mat("#6fd3c4", { roughness: 1 }), 3.6, 0.12, -1.6, {
      collide: true,
    });
    for (const px of [2.9, 4.3])
      c.cyl(
        0.25,
        0.25,
        0.03,
        mat("#ffffff", { roughness: 0.3 }),
        px,
        0.88,
        -1.6,
      );
    const darkWood = mat("#5a2d1f");
    chair(c, 2.9, -0.5, Math.PI, darkWood);
    chair(c, 4.3, -0.5, Math.PI, darkWood);
    chair(c, 2.9, -2.7, 0, darkWood);
    c.box(0.6, 1.0, 3.0, darkWood, 6.5, 0.12, -2.2, { collide: true });
    c.cyl(0.12, 0.1, 0.3, mat("#c0392b"), 6.5, 1.12, -3.0);
    c.box(1.1, 2.3, 0.12, mat("#f4f4f2"), -6.4, 0.12, 4.0);
    c.sign("302", -6.4, 2.05, 4.08, {
      bg: "#f4f4f2",
      fg: "#222",
      w: 128,
      h: 64,
    });
    plant(c, -4.5, 3.8, 1.2);
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
      { skin: "#e7b28f", hair: "#3b2a20", top: "#222222", bottom: "#3a3a3a" },
      0.6,
      -2.6,
      -0.2,
      "Fica à vontade, a casa é sua!",
      "wave",
    );
    c.npc(
      { skin: "#e7b28f", hair: "#3b2a20", top: "#8fbfa8", bottom: "#555" },
      1.6,
      1.4,
      -0.6,
      null,
      "idle",
    );
    c.partner(-1.4, 1.6, 0.4, TEAL_JERSEY);
    c.pack(-0.4, 0.2);
  },
  landmark(g, animate) {
    // a giant house with a heart window
    addTo(g, new THREE.BoxGeometry(3, 2.2, 2.4), mat("#fff4e6"), 0, 0, 0);
    const roof = addTo(
      g,
      new THREE.ConeGeometry(2.4, 1.6, 4),
      mat("#c0392b"),
      0,
      1.9,
      0,
    );
    roof.rotation.y = Math.PI / 4;
    addTo(
      g,
      new THREE.BoxGeometry(0.7, 1.2, 0.1),
      mat("#8a4b2a"),
      0,
      -0.5,
      1.22,
    );
    addTo(
      g,
      new THREE.SphereGeometry(0.3, 10, 8),
      glow("#ff6fa5", 1.5),
      0.9,
      0.4,
      1.2,
    );
    spin(g, animate, 9);
  },
};

/* ---------------- 3. Caldas Novas: the apart-hotel room and its pool ---------------- */

const caldas: Place = {
  id: "caldas",
  label: "Caldas Novas",
  w: 18,
  d: 12,
  radius: 15,
  theme: { grass: "#9fd99a", accent: "#1f7fa8", sign: "#ffffff" },
  build(c) {
    // the room (left half): light wood headboard wall, white bed with a brown skirt
    const beige = mat("#e6d8c2");
    c.box(
      18,
      0.12,
      12,
      texMat(tileTexture("#e9e3d8", "#d4ccbe", [9, 6]), { roughness: 0.6 }),
      0,
      0,
      0,
      { shadow: false },
    );
    c.box(
      8.5,
      WALL_H,
      T,
      texMat(woodTexture("#d9b98e", [1, 4])),
      -4.6,
      0.12,
      -5.85,
      { collide: true, occlude: true },
    );
    c.box(T, WALL_H, 12, beige, -8.85, 0.12, 0, {
      collide: true,
      occlude: true,
    });
    c.box(T, WALL_H, 6, beige, -0.35, 0.12, -2.85, {
      collide: true,
      occlude: true,
    });
    c.box(3.4, 0.45, 4.2, mat("#6b4a35"), -4.6, 0.12, -3.6, { collide: true });
    c.box(3.3, 0.35, 4.1, mat("#ffffff", { roughness: 1 }), -4.6, 0.57, -3.6);
    for (const px of [-5.4, -3.8])
      c.box(1.1, 0.3, 0.6, mat("#fdfdfd"), px, 0.92, -5.2);
    c.box(1.4, 0.2, 0.5, mat("#f2efe8"), -4.6, 0.92, -2.2);
    for (const px of [-7.0, -2.2]) {
      c.box(0.8, 0.6, 0.6, mat("#d2b48c"), px, 0.12, -5.3, { collide: true });
      c.box(0.15, 0.4, 0.15, glow("#fff1d0", 1.2), px, 0.72, -5.3);
    }
    c.photo("caldas-1.webp", 2.0, 1.5, -4.6, 1.75, -5.68);
    c.box(1.6, 2.8, 0.8, mat("#cfa978"), -8.1, 0.12, -1.0, { collide: true });
    c.box(0.05, 2.6, 2.4, mat("#f7f3ea", { roughness: 1 }), -8.66, 0.4, 2.6);
    // the pool outside (right half): curvy pool, thatched kiosk, palms, loungers
    const water = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader:
        "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform float uTime; varying vec2 vUv; void main(){ vec2 p = vUv * 6.0; float w = sin(p.x*3.1+uTime*1.3)*sin(p.y*3.7-uTime*1.1) + sin((p.x+p.y)*2.3+uTime*0.9); float c = smoothstep(0.75,1.0,abs(w)*0.6); float r = length(vUv-0.5); vec3 col = mix(vec3(0.1,0.65,0.85), vec3(0.05,0.35,0.75), r*1.4); gl_FragColor = vec4(col + c*0.3, 1.0); }",
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(3.6, 0.14, 0.4);
    pool.scale.set(1.35, 1, 1);
    c.group.add(pool);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.62, 0.18, 6, 40),
      mat("#f4f1ea"),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(3.6, 0.16, 0.4);
    rim.scale.set(1.35, 1, 1);
    c.group.add(rim);
    c.collide(3.6, 0.4, 6.6, 4.8);
    c.animate((t) => (water.uniforms.uTime!.value = t));
    const ring = addTo(
      c.group,
      new THREE.TorusGeometry(0.5, 0.2, 10, 24),
      mat("#ff8fb8", { roughness: 0.5 }),
      4.6,
      0.3,
      0.8,
    );
    ring.rotation.x = Math.PI / 2;
    c.animate((t) => (ring.position.y = 0.3 + Math.sin(t * 1.6) * 0.05));
    // thatched kiosk
    for (const [kx, kz] of [
      [5.2, -4.6],
      [7.8, -4.6],
      [5.2, -2.6],
      [7.8, -2.6],
    ] as const)
      c.cyl(0.12, 0.12, 2.4, mat("#7a5532"), kx, 0.12, kz, { collide: true });
    const thatch = addTo(
      c.group,
      new THREE.ConeGeometry(2.6, 1.3, 8),
      mat("#b88a4a", { roughness: 1 }),
      6.5,
      3.1,
      -3.6,
    );
    thatch.rotation.y = Math.PI / 8;
    c.box(2.2, 0.9, 0.6, mat("#8a5a35"), 6.5, 0.12, -3.6, { collide: true });
    palm(c, 1.2, -4.6, 4.8);
    palm(c, 8.2, 3.6, 4.2);
    const white = mat("#ffffff", { roughness: 0.6 });
    for (const lz of [3.2, 4.6]) {
      c.box(1.8, 0.35, 0.8, white, 5.6, 0.12, lz, { collide: true });
      c.box(0.6, 0.08, 0.8, white, 6.6, 0.55, lz).rotation.z = 0.6;
    }
    c.sign("Caldas Novas", 0.9, 0.9, 5.4, {
      bg: "#1f7fa8",
      fg: "#ffffff",
      border: "#ffffff",
      rotY: -0.2,
    });
    c.cyl(0.06, 0.06, 0.9, mat("#555"), 0.9, 0.12, 5.35);
    c.light("#7fe9ff", 5, 8, 3.6, 1.0, 0.4);
    c.partner(1.8, 2.0, -0.7, { ...TEAL_JERSEY });
    c.pack(-4.6, -0.4);
  },
  landmark(g, animate) {
    // a giant smiling sun over a palm
    addTo(
      g,
      new THREE.SphereGeometry(1.5, 16, 12),
      glow("#ffc94a", 0.8),
      0,
      0.6,
      0,
    );
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const ray = addTo(
        g,
        new THREE.ConeGeometry(0.25, 0.9, 6),
        glow("#ffb02e", 0.8),
        Math.cos(a) * 2.1,
        0.6 + Math.sin(a) * 2.1,
        0,
      );
      ray.rotation.z = a - Math.PI / 2;
    }
    spin(g, animate, 10);
  },
};

/* ---------------- 4. Famiglia Crosara: one month of us ---------------- */

function upholsteredChair(c: Ctx, x: number, z: number, rot: number) {
  const g = new THREE.Group();
  const wood = mat("#b07a45", { roughness: 0.55 });
  const fabric = mat("#cdb59a", { roughness: 1 });
  addTo(g, new THREE.BoxGeometry(0.62, 0.14, 0.6), fabric, 0, 0.52, 0);
  const back = addTo(
    g,
    new THREE.BoxGeometry(0.62, 0.42, 0.1),
    fabric,
    0,
    0.88,
    -0.27,
  );
  back.rotation.x = -0.12;
  for (const [lx, lz] of [
    [-0.26, -0.24],
    [0.26, -0.24],
    [-0.26, 0.24],
    [0.26, 0.24],
  ] as const) {
    const leg = addTo(
      g,
      new THREE.CylinderGeometry(0.03, 0.025, 0.5, 8),
      wood,
      lx,
      0.25,
      lz,
    );
    leg.rotation.x = lz > 0 ? 0.12 : -0.12;
  }
  g.position.set(x, 0.12, z);
  g.rotation.y = rot;
  c.group.add(g);
}

const famiglia: Place = {
  id: "famiglia",
  label: "Famiglia Crosara",
  w: 17,
  d: 12,
  radius: 15,
  theme: { grass: "#a3d48c", accent: "#1f2a26", sign: "#f6d58f" },
  build(c) {
    // the white stone wall, the beige plaster wall and the bamboo screen, from the photos
    const stone = texMat(c.tex("tex-stone.webp", 4, 1.6), { roughness: 0.95 });
    const plaster = mat("#e9d7bf", { roughness: 0.95 });
    const darkGreen = mat("#1f2a26");
    room(
      c,
      17,
      12,
      texMat(tileTexture("#c9c2b8", "#b3aca2", [8, 6]), { roughness: 0.35 }),
      { back: stone, left: plaster, right: darkGreen },
      4.4,
    );
    // brick arch with the blue-lit room behind it
    const brick = texMat(brickTexture("#a5532f", "#5e2c1c", 0.14, [2, 1], 13));
    c.box(0.55, 2.6, 0.55, brick, 3.0, 0.12, -5.6);
    c.box(0.55, 2.6, 0.55, brick, 6.2, 0.12, -5.6);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.28, 12, 32, Math.PI),
      brick,
    );
    arch.position.set(4.6, 2.7, -5.6);
    arch.castShadow = true;
    c.group.add(arch);
    c.box(2.7, 2.6, 0.05, glow("#3b82d6", 1.1), 4.6, 0.12, -5.66);
    // upholstered bench along the stone wall, with the warm LED under the plants
    c.box(7.5, 0.5, 0.8, mat("#9c8f84", { roughness: 1 }), -3.2, 0.12, -5.2, {
      collide: true,
    });
    c.box(7.5, 0.7, 0.25, mat("#8d8076", { roughness: 1 }), -3.2, 0.62, -5.55);
    c.box(7.5, 0.05, 0.08, glow("#fff1c9", 2.4), -3.2, 1.36, -5.6);
    for (let i = 0; i < 5; i++) plant(c, -6.4 + i * 1.6, -5.6, 0.7, "#f4f1ea");
    // bamboo screen on the right, from the video
    const bamboo = texMat(c.tex("tex-bamboo.webp", 3, 1), { roughness: 0.7 });
    c.box(0.12, 4.2, 6, bamboo, 7.9, 0.12, 1.5);
    const cane = mat("#caa255", { roughness: 0.5 });
    for (let i = 0; i < 16; i++)
      c.cyl(0.05, 0.05, 4.3, cane, 7.6 - (i % 2) * 0.12, 0.12, -1.3 + i * 0.38);
    c.box(0.06, 4.0, 0.06, glow("#ffd27a", 2.4), 7.85, 0.2, -1.6);
    c.box(
      1.0,
      1.1,
      2.5,
      texMat(tileTexture("#1f5a46", "#14382c", [2, 2])),
      7.4,
      0.12,
      -3.8,
      { collide: true },
    );
    c.box(1.1, 2.6, 0.05, glow("#9fe2ff", 0.8), 7.0, 0.12, -5.62);
    // round tables with beige cloths and upholstered chairs
    const cloth = mat("#d9cbb8", { roughness: 1 });
    for (const [tx, tz] of [
      [-4.8, -2.4],
      [0.4, -2.8],
      [-4.6, 2.2],
      [3.4, 2.4],
    ] as const) {
      c.cyl(0.95, 1.05, 0.8, cloth, tx, 0.12, tz, { collide: true, seg: 32 });
      for (const [cx2, cz2, rot] of [
        [0, 1.25, Math.PI],
        [0, -1.25, 0],
        [1.25, 0, -Math.PI / 2],
        [-1.25, 0, Math.PI / 2],
      ] as const)
        upholsteredChair(c, tx + cx2, tz + cz2, rot);
      for (const gx of [-0.3, 0.3])
        c.cyl(
          0.05,
          0.03,
          0.25,
          new THREE.MeshPhysicalMaterial({
            color: "#ffffff",
            transmission: 0.9,
            roughness: 0.05,
            thickness: 0.1,
          }),
          tx + gx,
          0.92,
          tz + 0.2,
        );
      c.cyl(
        0.18,
        0.18,
        0.02,
        mat("#5b5f58", { roughness: 0.4 }),
        tx,
        0.93,
        tz - 0.3,
      );
    }
    // their table, wood with cross-back chairs, in the middle
    const chairWood = mat("#d8a865", { roughness: 0.55 });
    c.box(1.6, 0.08, 1.2, chairWood, -0.6, 0.92, 0.6, { collide: true });
    c.box(0.12, 0.8, 0.12, chairWood, -0.6, 0.12, 0.6);
    chair(c, -0.6, 1.7, Math.PI, chairWood, undefined, true);
    chair(c, -0.6, -0.5, 0, chairWood, undefined, true);
    c.photo("famiglia-1.webp", 0.9, 1.2, -7.6, 1.6, 2.0, Math.PI / 2);
    c.photo("famiglia-3.webp", 0.9, 1.2, -7.6, 1.6, -1.0, Math.PI / 2);
    // wicker pendant lamps: elongated woven pills glowing warm
    const wicker = new THREE.MeshStandardMaterial({
      color: "#e09a55",
      emissive: "#ff9a40",
      emissiveIntensity: 1.6,
      roughness: 0.8,
    });
    const wire = mat("#222");
    const lampMeshes: THREE.Mesh[] = [];
    for (const [lx, lz, ly, tall] of [
      [-4.8, -2.4, 3.0, 1.2],
      [0.4, -2.8, 3.3, 1.0],
      [-4.6, 2.2, 2.9, 1.25],
      [3.4, 2.4, 3.1, 0.9],
      [-0.6, 0.6, 3.0, 1.1],
      [-2.4, -4.4, 3.5, 0.8],
      [1.6, -4.0, 3.4, 0.7],
    ] as const) {
      c.cyl(0.008, 0.008, 4.6 - ly, wire, lx, ly + tall * 0.5, lz);
      const l = addTo(
        c.group,
        new THREE.CapsuleGeometry(0.3, tall * 0.5, 8, 20),
        wicker,
        lx,
        ly,
        lz,
      );
      l.castShadow = false;
      lampMeshes.push(l);
      const ring = addTo(
        c.group,
        new THREE.TorusGeometry(0.31, 0.015, 6, 24),
        mat("#8a5a2a"),
        lx,
        ly,
        lz,
      );
      ring.rotation.x = Math.PI / 2;
    }
    c.animate((t) =>
      lampMeshes.forEach(
        (l, i) => (l.rotation.z = Math.sin(t * 0.8 + i) * 0.04),
      ),
    );
    c.light("#ffb066", 18, 14, -2.5, 3.2, -0.5);
    c.light("#ffb066", 12, 12, 3, 3.2, 1.5);
    plant(c, -7.2, 4.8, 1.2);
    plant(c, 1.4, -5.3, 1.1);
    c.sign("Famiglia Crosara", -1.6, 4.6, -5.8, {
      bg: "#1f2a26",
      fg: "#f6d58f",
      w: 768,
      border: "#c9a24a",
    });
    c.npc(
      {
        skin: "#6b4430",
        hair: "#141010",
        top: "#111111",
        bottom: "#111111",
        beard: true,
      },
      3.2,
      -4.3,
      -0.3,
      "🎻 ♪ ♫",
      "violin",
    );
    c.partner(0.9, 0.9, -0.5);
    c.pack(-0.6, 2.6);
  },
  landmark(g, animate) {
    // a giant violin
    addTo(
      g,
      new THREE.SphereGeometry(1.1, 24, 16),
      mat("#9a4416", { roughness: 0.35 }),
      0,
      -0.6,
      0,
    ).scale.set(1, 1.1, 0.35);
    addTo(
      g,
      new THREE.SphereGeometry(0.85, 24, 16),
      mat("#9a4416", { roughness: 0.35 }),
      0,
      0.9,
      0,
    ).scale.set(1, 1, 0.35);
    addTo(
      g,
      new THREE.BoxGeometry(0.25, 2.6, 0.2),
      mat("#1a1a1a"),
      0,
      2.2,
      0.15,
    );
    addTo(g, new THREE.BoxGeometry(0.3, 0.5, 0.3), mat("#5a2a0e"), 0, 3.6, 0.1);
    spin(g, animate, 10);
  },
};

/* ---------------- 5. Casa: the official request and the roses ---------------- */

const casa: Place = {
  id: "casa",
  label: "Nossa casa",
  w: 14,
  d: 11,
  radius: 14,
  theme: { grass: "#b2d896", accent: "#6b4630", sign: "#fff3e0" },
  build(c) {
    const wall = mat("#d6c2a2");
    room(c, 14, 11, texMat(woodTexture("#6b4630", [4, 4])), {
      back: wall,
      left: wall,
      right: wall,
    });
    c.box(4, 1.3, 0.05, glow("#fff4dc", 0.6), -3, 1.3, -5.34);
    c.box(4.2, 0.1, 0.5, mat("#3a2a20"), -3, 1.25, -5.1);
    c.box(3.4, 0.7, 0.04, mat("#f4f4f4"), -3, 2.0, -5.3);
    const wood = mat("#8a5a35");
    c.box(2.6, 0.1, 1.4, wood, -2.6, 0.95, -2.6, { collide: true });
    for (const [lx, lz] of [
      [-3.7, -3.1],
      [-1.5, -3.1],
      [-3.7, -2.1],
      [-1.5, -2.1],
    ] as const)
      c.box(0.1, 0.83, 0.1, wood, lx, 0.12, lz);
    const wrap = addTo(
      c.group,
      new THREE.ConeGeometry(0.45, 0.9, 8, 1, true),
      mat("#c3132d", { roughness: 0.6 }),
      -2.4,
      1.5,
      -2.6,
    );
    wrap.rotation.x = Math.PI;
    const rose = mat("#a8001f", { roughness: 0.7 });
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      const d = i < 4 ? 0.1 : 0.28;
      addTo(
        c.group,
        new THREE.SphereGeometry(0.13, 8, 6),
        rose,
        -2.4 + Math.cos(a) * d,
        1.95 + (i < 4 ? 0.08 : 0),
        -2.6 + Math.sin(a) * d,
      );
    }
    chair(c, -2.6, -1.4, Math.PI, wood);
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
    const sofa = mat("#3b2b25", { roughness: 1 });
    c.box(1.1, 0.55, 3.4, sofa, 6.1, 0.12, -0.6, { collide: true });
    c.box(0.3, 0.8, 3.4, sofa, 6.6, 0.6, -0.6);
    c.box(1.4, 0.45, 0.9, mat("#7a5232"), 4.0, 0.12, -0.6, { collide: true });
    c.box(0.45, 0.25, 0.4, mat("#5c0a1c", { roughness: 0.9 }), 4.0, 0.57, -0.6);
    c.box(
      0.45,
      0.06,
      0.4,
      mat("#5c0a1c", { roughness: 0.9 }),
      4.0,
      0.95,
      -0.85,
    ).rotation.x = -1.1;
    const gold = mat("#f2c14e", { metalness: 0.9, roughness: 0.25 });
    for (const rx of [3.9, 4.1])
      addTo(
        c.group,
        new THREE.TorusGeometry(0.07, 0.022, 8, 16),
        gold,
        rx,
        0.9,
        -0.6,
      );
    c.cyl(0.04, 0.04, 1.8, mat("#222"), -5.8, 0.12, 2.6);
    addTo(
      c.group,
      new THREE.ConeGeometry(0.45, 0.5, 12, 1, true),
      glow("#ffc27a", 1.2),
      -5.8,
      2.1,
      2.6,
    );
    c.light("#ffb36b", 10, 12, -1, 3.2, -1);
    c.photo("casa-1.webp", 1.3, 1.7, 1.2, 1.4, -5.32);
    c.sign("Nossa casa", 0, WALL_H + 0.25, -5.3, {
      bg: "#6b4630",
      fg: "#fff3e0",
      border: "#fff3e0",
    });
    c.partner(1.6, 0.8, -0.4);
    c.pack(0.2, -0.6);
  },
  landmark(g, animate) {
    // two giant golden rings
    const gold = mat("#f2c14e", { metalness: 0.8, roughness: 0.25 });
    addTo(
      g,
      new THREE.TorusGeometry(1.2, 0.3, 12, 32),
      gold,
      -0.6,
      0,
      0,
    ).rotation.y = 0.5;
    addTo(
      g,
      new THREE.TorusGeometry(1.2, 0.3, 12, 32),
      gold,
      0.6,
      0,
      0,
    ).rotation.y = -0.5;
    spin(g, animate, 10);
  },
};

/* ---------------- 6. Cinema VIP ---------------- */

const cinema: Place = {
  id: "cinema",
  label: "Cinema VIP",
  w: 14,
  d: 12,
  radius: 14,
  theme: { grass: "#a9d3a0", accent: "#1a1430", sign: "#ffd27a" },
  build(c) {
    const dark = mat("#2a2238");
    room(
      c,
      14,
      12,
      texMat(tileTexture("#5a3550", "#4a2a42", [7, 6]), { roughness: 1 }),
      { back: dark, left: dark, right: dark },
      3.8,
    );
    // starry blue screen and the warm LED line of the VIP sign
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 3.0),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader:
          "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform float uTime; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); } void main(){ vec3 c = mix(vec3(0.05,0.1,0.35), vec3(0.2,0.35,0.85), vUv.y); vec2 g = floor(vUv*vec2(120.0,36.0)); float s = step(0.985, h(g)) * (0.6+0.4*sin(uTime*2.0+h(g)*20.0)); gl_FragColor = vec4(c + s, 1.0); }",
      }),
    );
    screen.position.set(0, 2.2, -5.66);
    c.group.add(screen);
    c.animate(
      (t) =>
        ((screen.material as THREE.ShaderMaterial).uniforms.uTime!.value = t),
    );
    c.box(13.4, 0.06, 0.08, glow("#ffd27a", 1.8), 0, 0.5, -5.62);
    for (const side of [-1, 1])
      c.box(0.06, 3.0, 0.06, glow("#6a5cff", 1.6), side * 6.75, 0.3, -2);
    // big dark leather recliners in pairs with little tables and lamps
    const leather = mat("#141216", { roughness: 0.45 });
    for (let row = 0; row < 2; row++) {
      const z = -2.2 + row * 3.0;
      for (const x of [-4.6, -2.8, 2.8, 4.6]) {
        c.box(1.4, 0.6, 1.5, leather, x, 0.12, z, { collide: true });
        c.box(1.4, 1.0, 0.35, leather, x, 0.55, z + 0.65);
        c.box(0.25, 0.35, 1.4, leather, x - 0.65, 0.65, z);
        c.box(0.25, 0.35, 1.4, leather, x + 0.65, 0.65, z);
      }
      for (const x of [-3.7, 3.7]) {
        c.cyl(0.25, 0.25, 0.7, mat("#2a2230"), x, 0.12, z + 0.2);
        c.cyl(
          0.04,
          0.04,
          0.4,
          mat("#888", { metalness: 0.8 }),
          x,
          0.82,
          z + 0.2,
        );
        addTo(
          c.group,
          new THREE.ConeGeometry(0.18, 0.22, 10, 1, true),
          glow("#ffe0a8", 1.3),
          x,
          1.3,
          z + 0.2,
        );
      }
    }
    const bucket = c.cyl(
      0.3,
      0.22,
      0.55,
      texMat(stripesTexture(["#e53935", "#ffffff"], [4, 1])),
      0,
      0.12,
      4.2,
      { collide: true },
    );
    bucket.castShadow = true;
    const corn = mat("#ffe08a", { roughness: 1 });
    for (let i = 0; i < 10; i++)
      addTo(
        c.group,
        new THREE.SphereGeometry(0.1, 6, 5),
        corn,
        Math.cos(i) * 0.17,
        0.72 + (i % 3) * 0.05,
        4.2 + Math.sin(i * 1.7) * 0.17,
      );
    c.photo("cinema-1.webp", 1.0, 1.35, -5.2, 1.1, 5.0, Math.PI / 2);
    c.sign("VIP", 0, 3.85, -5.9, {
      bg: "#1a1430",
      fg: "#ffd27a",
      w: 256,
      h: 128,
      border: "#ffd27a",
      emissive: true,
    });
    c.light("#9aa8ff", 14, 16, 0, 3.2, -1);
    c.partner(1.0, 2.6, -0.5);
    c.pack(0, 0.2);
  },
  landmark(g, animate) {
    // a giant popcorn bucket
    addTo(
      g,
      new THREE.CylinderGeometry(1.3, 0.9, 2.2, 16),
      texMat(stripesTexture(["#e53935", "#ffffff"], [6, 1])),
      0,
      0,
      0,
    );
    for (let i = 0; i < 16; i++)
      addTo(
        g,
        new THREE.SphereGeometry(0.45, 8, 6),
        mat("#ffe08a", { roughness: 1 }),
        Math.cos(i * 1.7) * 0.8,
        1.2 + (i % 3) * 0.25,
        Math.sin(i * 1.7) * 0.8,
      );
    spin(g, animate, 10);
  },
};

export const PLACES: Place[] = [
  panedoca,
  casaVo,
  caldas,
  famiglia,
  casa,
  cinema,
];
