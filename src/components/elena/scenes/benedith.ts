import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  bricks,
  concrete,
  emissive,
  metal,
  pbr,
  plaster,
  repeat,
  seeded,
  woodPlanks,
} from "../fp/materials";
import type { Outfit, SceneModule } from "../fp/types";

/*
 * Benedith Cervejaria (Uberlândia), 02/10/2026, a rock night.
 *
 * Everything here comes from the couple's own selfies and the stage video
 * (IMG_5968): a big hall with a white drop ceiling (0.625 m mineral tiles)
 * under galvanised steel beams, slate-blue painted walls, polished grey
 * concrete floor, golden dome pendants with a bare bulb. At the back, a low
 * stage faced with exposed brick and a worn cement top, in front of a big
 * painted mural (pink segmented worms, orange guitars, beer mugs, moon and
 * stars on a deep blue sky lit purple/blue/green by the stage light), two
 * black PA speakers, a projector-screen case over the mural, a little
 * German flag in the corner, a white louvered door at stage right, a steel
 * post with a dome lamp at stage left and a moving-head fixture on the
 * ceiling. Band: singer-guitarist in the middle, drummer (light grey tee)
 * behind a kit with a white "LUEN" bass-drum head, bassist (black, white
 * bass) at stage right, music stand, mic stands, amps.
 *
 * On the left, the bar (selfies IMG_5962/5964): a black wall with the red
 * neon "Benedith" sign, "OKTOBERFEST / CANECA CHEIA!" and "SAÚDE E CANECA
 * CHEIA!" in chalk lettering, a row of blue backlit panels over the tap
 * wall, a long wooden counter with stools, glass shelves at the end. On the
 * right, a wall ledge with stools and framed pictures and a vertical German
 * flag. Wooden tables with black metal chairs fill the floor.
 *
 * Plan (meters): x ∈ [-7, 7], z ∈ [-9, 6], ceiling 4.2. Stage against the
 * back wall z = -9; entrance (glass door) in the front wall z = 6 at x = 4.5.
 */

const D = Math.PI / 180;
const X0 = -7;
const X1 = 7;
const Z0 = -9;
const Z1 = 6;
const H = 4.2;
const ST = { x0: -3.2, x1: 3.2, z0: Z0, z1: -6.3, h: 0.38 };
const COUPLE = { x: -3.3, z: -3.8 };

const OUTFITS: { davi: Outfit; elena: Outfit } = {
  davi: {
    top: "#5a3b2b",
    topStyle: "tshirt",
    bottom: "#2f3542",
    bottomStyle: "jeans",
    shoes: "#2a2523",
  },
  elena: {
    top: "#1d1d1d",
    topStyle: "blouse",
    bottom: "#22252d",
    bottomStyle: "jeans",
    shoes: "#141414",
  },
};

/* ---------------- geometry helpers ---------------- */

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

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

/** Non-indexed copy (position/normal/uv), transformed; optional world-projected UVs (meters per tile). */
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

/** Static geometry collected per material and merged into one mesh per material. */
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

/** Merges local parts into one geometry (for instancing or a small group). */
function merged(parts: [THREE.BufferGeometry, THREE.Matrix4][]) {
  const g = mergeGeometries(
    parts.map(([geo, m]) => prep(geo, m)),
    false,
  );
  if (!g) throw new Error("merge failed");
  return g;
}

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 18);
const cylLo = new THREE.CylinderGeometry(1, 1, 1, 8);
const rbCache = new Map<string, THREE.BufferGeometry>();
function rbox(w: number, h: number, d: number, r: number, seg = 2) {
  const k = `${w}:${h}:${d}:${r}:${seg}`;
  let g = rbCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    rbCache.set(k, g);
  }
  return g;
}

function lathe(pts: [number, number][], seg = 24) {
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );
}

function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, rand: () => number) => void,
  seed = 1,
  srgb = true,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d canvas unavailable");
  draw(g, seeded(seed));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function noCast<T extends THREE.Material>(m: T) {
  m.userData.noCast = true;
  return m;
}

function std(
  color: THREE.ColorRepresentation,
  roughness = 0.7,
  metalness = 0,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extra,
  });
}

/* ---------------- painted textures ---------------- */

/** The stage mural: pink segmented worms, orange guitars and beer on a starry blue sky. */
function muralTexture() {
  return canvasTex(
    2048,
    1152,
    (g, rand) => {
      const W = 2048;
      const Hh = 1152;
      const sky = g.createRadialGradient(1000, 600, 40, 1000, 600, 1250);
      sky.addColorStop(0, "#ff3db0");
      sky.addColorStop(0.18, "#c42fa8");
      sky.addColorStop(0.42, "#5a2d9a");
      sky.addColorStop(0.7, "#22337a");
      sky.addColorStop(1, "#16204f");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, Hh);
      // stars and dots
      for (let i = 0; i < 700; i++) {
        const r = rand() < 0.08 ? 3 + rand() * 3 : 0.8 + rand() * 1.6;
        g.fillStyle = `rgba(255,255,255,${0.5 + rand() * 0.5})`;
        g.beginPath();
        g.arc(rand() * W, rand() * Hh, r, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 26; i++) {
        const x = rand() * W;
        const y = rand() * Hh;
        const s = 8 + rand() * 10;
        g.strokeStyle = "rgba(255,255,255,0.85)";
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(x - s, y);
        g.lineTo(x + s, y);
        g.moveTo(x, y - s);
        g.lineTo(x, y + s);
        g.stroke();
      }
      // moon, top left
      g.fillStyle = "#cfcabb";
      g.strokeStyle = "#111";
      g.lineWidth = 8;
      g.beginPath();
      g.arc(150, 130, 105, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = "rgba(90,85,80,0.45)";
      for (const [cx, cy, r] of [
        [120, 100, 22],
        [185, 150, 30],
        [130, 175, 14],
        [195, 85, 12],
      ] as const) {
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fill();
      }

      const outline = "#141016";
      // a segmented worm / tentacle along a smooth path
      const worm = (pts: [number, number][], w: number, tone = "#ef8a7a") => {
        const curve = new THREE.CatmullRomCurve3(
          pts.map(([x, y]) => new THREE.Vector3(x, y, 0)),
        );
        const n = 140;
        const p = curve.getSpacedPoints(n);
        const path = () => {
          g.beginPath();
          p.forEach((v, i) => (i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)));
        };
        g.lineCap = "round";
        g.lineJoin = "round";
        path();
        g.strokeStyle = outline;
        g.lineWidth = w + 16;
        g.stroke();
        path();
        g.strokeStyle = tone;
        g.lineWidth = w;
        g.stroke();
        path();
        g.strokeStyle = "rgba(255,210,190,0.55)";
        g.lineWidth = w * 0.22;
        g.stroke();
        // rings
        const step = Math.max(3, Math.round(w / 12));
        for (let i = step; i < n - 2; i += step) {
          const a = p[i - 1];
          const b = p[i + 1];
          const c = p[i];
          if (!a || !b || !c) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const l = Math.hypot(dx, dy) || 1;
          const nx = -dy / l;
          const ny = dx / l;
          g.strokeStyle = "rgba(150,60,70,0.85)";
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(c.x + nx * w * 0.48, c.y + ny * w * 0.48);
          g.quadraticCurveTo(
            c.x + (dx / l) * 6,
            c.y + (dy / l) * 6,
            c.x - nx * w * 0.48,
            c.y - ny * w * 0.48,
          );
          g.stroke();
        }
        const tip = p[n];
        if (tip) {
          g.fillStyle = tone;
          g.strokeStyle = outline;
          g.lineWidth = 6;
          g.beginPath();
          g.arc(tip.x, tip.y, w * 0.42, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
      };

      // an electric guitar, drawn along its neck direction
      const guitar = (
        x: number,
        y: number,
        rot: number,
        s: number,
        body: string,
      ) => {
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        g.scale(s, s);
        g.lineWidth = 7;
        g.strokeStyle = outline;
        // neck and headstock
        g.fillStyle = "#3b2416";
        g.fillRect(-14, -330, 28, 280);
        g.strokeRect(-14, -330, 28, 280);
        g.fillStyle = "#2a2a2a";
        g.beginPath();
        g.moveTo(-18, -330);
        g.lineTo(-24, -420);
        g.lineTo(20, -430);
        g.lineTo(18, -330);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = "#d9d0c0";
        for (let k = 0; k < 8; k++) g.fillRect(-14, -320 + k * 34, 28, 3);
        // body
        g.fillStyle = body;
        g.beginPath();
        g.moveTo(0, -60);
        g.bezierCurveTo(60, -90, 120, -60, 95, 0);
        g.bezierCurveTo(80, 40, 140, 80, 110, 150);
        g.bezierCurveTo(80, 210, -80, 210, -110, 150);
        g.bezierCurveTo(-140, 80, -80, 40, -95, 0);
        g.bezierCurveTo(-120, -50, -60, -110, 0, -60);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = "#f2eee6";
        g.beginPath();
        g.ellipse(-20, 70, 55, 75, 0.2, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = "#1a1a1a";
        g.fillRect(-35, 20, 50, 14);
        g.fillRect(-35, 70, 50, 14);
        g.fillRect(-30, 125, 40, 10);
        g.restore();
      };

      // a mug of beer with foam
      const mug = (x: number, y: number, s: number, tulip = false) => {
        g.save();
        g.translate(x, y);
        g.scale(s, s);
        g.lineWidth = 7;
        g.strokeStyle = outline;
        const beer = g.createLinearGradient(-80, 0, 80, 0);
        beer.addColorStop(0, "#f39a1f");
        beer.addColorStop(0.5, "#ffc84a");
        beer.addColorStop(1, "#e07d16");
        g.fillStyle = beer;
        g.beginPath();
        if (tulip) {
          g.moveTo(-70, -110);
          g.bezierCurveTo(-90, 0, -40, 60, -30, 120);
          g.lineTo(30, 120);
          g.bezierCurveTo(40, 60, 90, 0, 70, -110);
        } else {
          g.moveTo(-80, -100);
          g.lineTo(-75, 130);
          g.lineTo(75, 130);
          g.lineTo(80, -100);
        }
        g.closePath();
        g.fill();
        g.stroke();
        if (!tulip) {
          g.beginPath();
          g.lineWidth = 22;
          g.strokeStyle = outline;
          g.arc(100, 10, 50, -Math.PI / 2, Math.PI / 2);
          g.stroke();
          g.lineWidth = 12;
          g.strokeStyle = "#ffcf6a";
          g.stroke();
        }
        g.fillStyle = "rgba(255,255,255,0.6)";
        for (let k = 0; k < 14; k++) {
          g.beginPath();
          g.arc(-40 + rand() * 80, -60 + rand() * 170, 3 + rand() * 5, 0, 7);
          g.fill();
        }
        g.fillStyle = "#fbf6ea";
        g.strokeStyle = outline;
        g.lineWidth = 6;
        for (let k = 0; k < 6; k++) {
          g.beginPath();
          g.arc(-70 + k * 28, -105 - (k % 2) * 14, 34, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
        g.fillStyle = "#fbf6ea";
        g.fillRect(-82, -112, 164, 24);
        g.restore();
      };

      // back layer: worms coming out of the bottom
      worm(
        [
          [420, 1250],
          [460, 900],
          [330, 700],
          [430, 520],
          [610, 560],
        ],
        120,
      );
      worm(
        [
          [1620, 1260],
          [1560, 980],
          [1700, 760],
          [1620, 600],
          [1480, 640],
        ],
        115,
        "#ea8476",
      );
      worm(
        [
          [1340, 1250],
          [1280, 1020],
          [1420, 900],
          [1500, 700],
          [1420, 440],
          [1260, 360],
        ],
        92,
        "#f2988a",
      );
      guitar(640, 420, -1.15, 1.25, "#f07a22");
      guitar(1750, 520, 0.12, 1.05, "#e86f1f");
      // the central worm, lit magenta, rising to the top
      worm(
        [
          [1000, 1260],
          [960, 1000],
          [1060, 820],
          [980, 620],
          [1040, 420],
          [960, 240],
        ],
        130,
        "#ff6f8e",
      );
      worm(
        [
          [780, 1260],
          [820, 1060],
          [700, 900],
          [760, 760],
          [880, 760],
        ],
        86,
        "#ee8c7d",
      );
      worm(
        [
          [1180, 120],
          [1300, 260],
          [1250, 380],
          [1120, 420],
        ],
        70,
        "#f19a88",
      );
      mug(250, 650, 1.05);
      mug(1560, 330, 0.85, true);
      mug(1180, 760, 0.6, true);
      // a smaller guitar at the right edge
      guitar(1920, 620, 0, 0.75, "#c45a20");
      // paint grain
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},0.035)`;
        g.fillRect(rand() * W, rand() * Hh, 2, 2);
      }
    },
    41,
  );
}

/** Drop-ceiling tile: off-white mineral fibre with a grey T-bar rim. */
function ceilingTexture() {
  const t = canvasTex(
    256,
    256,
    (g, rand) => {
      g.fillStyle = "#e8e7e2";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = `rgba(90,88,84,${0.08 + rand() * 0.18})`;
        g.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1);
      }
      g.fillStyle = "#c4c3be";
      g.fillRect(0, 0, 256, 5);
      g.fillRect(0, 0, 5, 256);
      g.fillStyle = "#a9a8a3";
      g.fillRect(5, 5, 251, 2);
      g.fillRect(5, 5, 2, 251);
    },
    5,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Transparent lettering texture (neon or chalk). */
function lettering(
  w: number,
  h: number,
  lines: {
    text: string;
    font: string;
    color: string;
    y: number;
    glow?: number;
  }[],
  chalk = false,
) {
  return canvasTex(
    w,
    h,
    (g, rand) => {
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const l of lines) {
        g.font = l.font;
        g.fillStyle = l.color;
        if (l.glow) {
          g.shadowColor = l.color;
          g.shadowBlur = l.glow;
        }
        g.fillText(l.text, w / 2, l.y);
        g.shadowBlur = 0;
      }
      if (chalk) {
        // break the strokes up like chalk / brush paint
        g.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 9000; i++) {
          g.fillStyle = `rgba(0,0,0,${0.2 + rand() * 0.5})`;
          g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
        }
        g.globalCompositeOperation = "source-over";
      }
    },
    3,
  );
}

/** Bass-drum front head: white with a round black "LUEN" logo. */
function drumHeadTexture() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = "#efeadf";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#151515";
    g.beginPath();
    g.ellipse(128, 70, 62, 22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#efeadf";
    g.font = "bold 30px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("LUEN", 128, 71);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(128, 128, 122, 0, Math.PI * 2);
    g.stroke();
  });
}

/** A framed picture: muted, blurry print (the selfies only show them out of focus). */
function printTexture(seed: number, hue: number) {
  return canvasTex(
    256,
    320,
    (g, rand) => {
      const gr = g.createLinearGradient(0, 0, 256, 320);
      gr.addColorStop(0, `hsl(${hue},35%,${30 + rand() * 20}%)`);
      gr.addColorStop(1, `hsl(${hue + 40},30%,${15 + rand() * 15}%)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 320);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `hsla(${hue + rand() * 60},40%,${40 + rand() * 40}%,0.5)`;
        g.beginPath();
        g.ellipse(
          40 + rand() * 176,
          40 + rand() * 240,
          20 + rand() * 60,
          20 + rand() * 60,
          rand() * 3,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      g.fillStyle = "rgba(240,235,220,0.85)";
      g.fillRect(40, 250, 176, 10);
      g.fillRect(70, 268, 116, 6);
    },
    seed,
  );
}

/* ---------------- props ---------------- */

/** Electric guitar (or bass) in its own frame: body faces +Z, neck along +Y, lower bout at the origin. */
function makeGuitar(bodyColor: string, bass: boolean) {
  const grp = new THREE.Group();
  const s = bass ? 1.08 : 1;
  const shape = new THREE.Shape();
  const P = (x: number, y: number) => new THREE.Vector2(x * s, y * s);
  shape.moveTo(0, -0.25 * s);
  shape.splineThru([
    P(0.13, -0.22),
    P(0.17, -0.1),
    P(0.13, 0.0),
    P(0.12, 0.08),
    P(0.15, 0.17),
    P(0.11, 0.23),
    P(0.06, 0.15),
    P(0.025, 0.12),
    P(-0.03, 0.12),
    P(-0.07, 0.17),
    P(-0.11, 0.15),
    P(-0.12, 0.07),
    P(-0.13, 0.0),
    P(-0.17, -0.1),
    P(-0.13, -0.22),
    P(0, -0.25),
  ]);
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 20,
  });
  bodyGeo.translate(0, 0, -0.02);
  const body = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  );
  grp.add(body);
  const guard = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 12),
    std(bass ? "#5b2c1c" : "#f1ede4", 0.4),
  );
  guard.scale.setScalar(0.62);
  guard.position.set(-0.025, -0.02, 0.0225);
  grp.add(guard);
  const neckLen = bass ? 0.86 : 0.64;
  const parts: [THREE.BufferGeometry, THREE.Matrix4][] = [
    [
      box,
      M(
        0,
        0.1 + neckLen / 2,
        0.012,
        0,
        0,
        0,
        bass ? 0.048 : 0.044,
        neckLen,
        0.022,
      ),
    ],
  ];
  const neck = new THREE.Mesh(merged(parts), std("#c08a52", 0.5));
  grp.add(neck);
  const board = new THREE.Mesh(box, std("#2b1a12", 0.6));
  board.scale.set(bass ? 0.046 : 0.042, neckLen - 0.02, 0.006);
  board.position.set(0, 0.1 + neckLen / 2, 0.026);
  grp.add(board);
  const head = new THREE.Mesh(box, std(bass ? "#c08a52" : "#151515", 0.4));
  head.scale.set(0.07, 0.17, 0.016);
  head.position.set(0.012, 0.1 + neckLen + 0.08, 0.008);
  head.rotation.z = -0.08;
  grp.add(head);
  // pickups, bridge, knobs, strings
  const black = std("#111", 0.4);
  const chrome = metal("#d8d8d8", 0.2);
  const pk = (y: number) => {
    const m = new THREE.Mesh(box, black);
    m.scale.set(bass ? 0.07 : 0.075, 0.018, 0.012);
    m.position.set(0, y, 0.026);
    grp.add(m);
  };
  pk(0.06);
  if (!bass) pk(-0.02);
  pk(-0.1);
  const bridge = new THREE.Mesh(box, chrome);
  bridge.scale.set(0.08, 0.03, 0.01);
  bridge.position.set(0, -0.16, 0.025);
  grp.add(bridge);
  for (let k = 0; k < 3; k++) {
    const kn = new THREE.Mesh(cylLo, chrome);
    kn.scale.set(0.011, 0.012, 0.011);
    kn.rotation.x = Math.PI / 2;
    kn.position.set(0.085 - k * 0.012, -0.12 - k * 0.035, 0.03);
    grp.add(kn);
  }
  const strings = new THREE.Mesh(box, metal("#e6e2d6", 0.25));
  strings.scale.set(bass ? 0.03 : 0.034, neckLen + 0.26, 0.002);
  strings.position.set(0, -0.16 + (neckLen + 0.26) / 2, 0.031);
  grp.add(strings);
  grp.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return grp;
}

/* ---------------- the scene ---------------- */

const scene: SceneModule = {
  id: "benedith",
  title: "Benedith Cervejaria",
  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    ctx.scene.background = new THREE.Color("#050608");
    const B = new Batch();
    const rand = seeded(2026);

    /* ---------- materials ---------- */
    const wallM = pbr(repeat(plaster("#46515c", 31), 1, 1));
    const blackWallM = pbr(repeat(plaster("#17181b", 33), 1, 1), {
      roughness: 0.95,
    });
    const floorM = pbr(repeat(concrete("#77736d", 35), 1, 1), {
      roughness: 0.55,
    });
    const ceilTex = ceilingTexture();
    ceilTex.repeat.set(1, 1);
    const ceilM = noCast(std("#ffffff", 0.95, 0, { map: ceilTex }));
    const brickM = pbr(repeat(bricks("#93573b", "#6a564a", 8, 37), 1, 1));
    const stageTopM = pbr(repeat(concrete("#a59c8d", 39), 1, 1), {
      roughness: 0.85,
    });
    const steelM = metal("#8d9197", 0.45);
    const blackMetal = metal("#19191b", 0.55);
    const chromeM = metal("#d6d6d6", 0.18);
    const darkWoodM = pbr(repeat(woodPlanks("#5a3823", 6, 41), 1, 1), {
      roughness: 0.6,
    });
    const tableWoodM = pbr(repeat(woodPlanks("#8a5a34", 5, 43), 1, 1), {
      roughness: 0.42,
    });
    const seatWoodM = std("#6b4529", 0.5);
    const speakerM = std("#141416", 0.75);
    const grilleM = std("#1f2023", 0.95);
    const brassM = metal("#b8903e", 0.32);
    const whiteM = std("#eceae4", 0.6);
    const tolexM = std("#121213", 0.85);

    /* ---------- shell: floor, walls, ceiling ---------- */
    const floor = new THREE.Mesh(
      prep(
        new THREE.PlaneGeometry(X1 - X0, Z1 - Z0),
        M(0, 0, 0, 0, -Math.PI / 2),
        3,
      ),
      floorM,
    );
    floor.position.set((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    floor.receiveShadow = true;
    root.add(floor);

    const ceil = new THREE.Mesh(
      prep(
        new THREE.PlaneGeometry(X1 - X0, Z1 - Z0),
        M(0, 0, 0, 0, Math.PI / 2),
        0.625,
      ),
      ceilM,
    );
    ceil.position.set((X0 + X1) / 2, H, (Z0 + Z1) / 2);
    root.add(ceil);

    const wallT = 0.2;
    // back wall (stage), front wall (entrance), right wall
    B.add(
      box,
      wallM,
      M(0, H / 2, Z0 - wallT / 2, 0, 0, 0, X1 - X0 + 0.4, H, wallT),
      2.5,
    );
    B.add(
      box,
      wallM,
      M(0, H / 2, Z1 + wallT / 2, 0, 0, 0, X1 - X0 + 0.4, H, wallT),
      2.5,
    );
    B.add(
      box,
      wallM,
      M(X1 + wallT / 2, H / 2, (Z0 + Z1) / 2, 0, 0, 0, wallT, H, Z1 - Z0),
      2.5,
    );
    // left wall: slate, with the black bar section
    B.add(
      box,
      wallM,
      M(X0 - wallT / 2, H / 2, (Z0 + Z1) / 2, 0, 0, 0, wallT, H, Z1 - Z0),
      2.5,
    );
    B.add(
      box,
      blackWallM,
      M(X0 + 0.01, H / 2, -0.6, 0, 0, 0, 0.02, H, 9.6),
      2.5,
    );
    ctx.wall(X0 - 1, Z0 - 1, X1 + 1, Z0);
    ctx.wall(X0 - 1, Z1, X1 + 1, Z1 + 1);
    ctx.wall(X0 - 1, Z0 - 1, X0, Z1 + 1);
    ctx.wall(X1, Z0 - 1, X1 + 1, Z1 + 1);
    // dark baseboards
    const baseM = std("#22262b", 0.6);
    B.add(box, baseM, M(0, 0.05, Z1 - 0.01, 0, 0, 0, X1 - X0, 0.1, 0.02));
    B.add(
      box,
      baseM,
      M(X1 - 0.01, 0.05, (Z0 + Z1) / 2, 0, 0, 0, 0.02, 0.1, Z1 - Z0),
    );

    /* ---------- ceiling: galvanised beams, downlights, moving head ---------- */
    const ibeam = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ry = Math.atan2(x1 - x0, z1 - z0);
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const y = H - 0.14;
      B.add(box, steelM, M(cx, y + 0.11, cz, ry, 0, 0, 0.12, 0.012, len));
      B.add(box, steelM, M(cx, y - 0.11, cz, ry, 0, 0, 0.12, 0.012, len));
      B.add(box, steelM, M(cx, y, cz, ry, 0, 0, 0.008, 0.22, len));
    };
    ibeam(-4.3, Z0, -4.3, Z1);
    ibeam(4.3, Z0, 4.3, Z1);
    ibeam(X0, -5.9, X1, -5.9);
    ibeam(X0, 1.0, X1, 1.0);
    // round downlights in the tiles
    const dlGeo = new THREE.CircleGeometry(0.07, 20);
    const dlM = noCast(emissive("#fff1d8", 2.2));
    for (const [x, z] of [
      [-1.9, -3.2],
      [1.9, -3.2],
      [-1.9, 0.6],
      [1.9, 0.6],
      [-1.9, 3.6],
      [1.9, 3.6],
      [5.8, -6.5],
      [5.8, -1.5],
      [5.8, 3],
      [-5.8, -6.5],
    ] as const) {
      B.add(dlGeo, dlM, M(x, H - 0.005, z, 0, Math.PI / 2));
      B.add(cylLo, chromeM, M(x, H - 0.006, z, 0, 0, 0, 0.09, 0.004, 0.09));
    }
    // moving-head fixture hanging from the cross beam over the stage
    {
      const mx = 0.2;
      const mz = -5.9;
      B.add(rbox(0.3, 0.12, 0.24, 0.02), speakerM, M(mx, H - 0.32, mz));
      B.add(
        box,
        speakerM,
        M(mx - 0.13, H - 0.43, mz, 0, 0, 0, 0.03, 0.18, 0.06),
      );
      B.add(
        box,
        speakerM,
        M(mx + 0.13, H - 0.43, mz, 0, 0, 0, 0.03, 0.18, 0.06),
      );
      B.add(rbox(0.2, 0.18, 0.2, 0.04), speakerM, M(mx, H - 0.5, mz, 0, -0.5));
      B.add(
        new THREE.CircleGeometry(0.06, 18),
        noCast(emissive("#c79bff", 3)),
        M(mx, H - 0.59, mz - 0.06, 0, Math.PI / 2 + 0.5),
      );
    }

    /* ---------- the stage ---------- */
    const sw = ST.x1 - ST.x0;
    const sd = ST.z1 - ST.z0;
    const scx = (ST.x0 + ST.x1) / 2;
    const scz = (ST.z0 + ST.z1) / 2;
    // brick faces (front and sides) and the worn cement top
    B.add(
      box,
      brickM,
      M(scx, ST.h / 2, ST.z1 - 0.06, 0, 0, 0, sw, ST.h, 0.12),
      0.55,
    );
    B.add(
      box,
      brickM,
      M(ST.x0 + 0.06, ST.h / 2, scz, 0, 0, 0, 0.12, ST.h, sd),
      0.55,
    );
    B.add(
      box,
      brickM,
      M(ST.x1 - 0.06, ST.h / 2, scz, 0, 0, 0, 0.12, ST.h, sd),
      0.55,
    );
    B.add(
      box,
      brickM,
      M(scx, ST.h / 2, scz, 0, 0, 0, sw - 0.24, ST.h - 0.04, sd - 0.12),
      0.55,
    );
    // brick coping row on the edge
    B.add(
      box,
      brickM,
      M(scx, ST.h + 0.01, ST.z1 - 0.07, 0, 0, 0, sw + 0.04, 0.03, 0.16),
      0.55,
    );
    B.add(
      box,
      stageTopM,
      M(scx, ST.h + 0.005, scz - 0.06, 0, 0, 0, sw - 0.02, 0.02, sd - 0.12),
      1.6,
    );
    ctx.wall(ST.x0, ST.z0, ST.x1, ST.z1);
    // black rubber mat under the drums
    B.add(
      box,
      std("#0d0d0e", 0.95),
      M(0.1, ST.h + 0.018, -7.95, 0, 0, 0, 2.2, 0.01, 1.8),
    );

    // the mural on the back wall
    const muralW = 5.0;
    const muralH = 2.82;
    const mural = new THREE.Mesh(
      new THREE.PlaneGeometry(muralW, muralH),
      std("#ffffff", 0.85, 0),
    );
    {
      const mt = muralTexture();
      mural.material.map = mt;
      mural.material.emissiveMap = mt;
      mural.material.emissive.set("#ffffff");
      mural.material.emissiveIntensity = 0.1;
    }
    mural.position.set(0, ST.h + muralH / 2, Z0 + 0.012);
    mural.receiveShadow = true;
    root.add(mural);
    // projector screen case over the mural
    B.add(
      rbox(5.2, 0.11, 0.12, 0.03),
      whiteM,
      M(0, ST.h + muralH + 0.08, Z0 + 0.08),
    );
    B.add(
      box,
      std("#9a9a9a", 0.5),
      M(0, ST.h + muralH + 0.02, Z0 + 0.13, 0, 0, 0, 5.0, 0.012, 0.02),
    );

    // PA speakers: left on a pole, right mounted high on the wall
    const speaker = (
      x: number,
      y: number,
      z: number,
      s: number,
      ry: number,
    ) => {
      B.add(rbox(0.4 * s, 0.62 * s, 0.36 * s, 0.03), speakerM, M(x, y, z, ry));
      B.add(
        box,
        grilleM,
        M(
          x + Math.sin(ry) * 0.18 * s,
          y - 0.04 * s,
          z + Math.cos(ry) * 0.18 * s,
          ry,
          0,
          0,
          0.36 * s,
          0.5 * s,
          0.01,
        ),
      );
      B.add(
        new THREE.CircleGeometry(0.012, 8),
        noCast(emissive("#40ff70", 3)),
        M(
          x + Math.sin(ry) * 0.186 * s,
          y - 0.27 * s,
          z + Math.cos(ry) * 0.186 * s,
          ry,
        ),
      );
    };
    speaker(-2.85, 2.75, -8.55, 1, 0.25);
    B.add(
      cyl,
      blackMetal,
      M(-2.85, (ST.h + 2.42) / 2, -8.55, 0, 0, 0, 0.018, 2.42 - ST.h, 0.018),
    );
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      B.add(
        cyl,
        blackMetal,
        M(
          -2.85 + Math.sin(a) * 0.25,
          ST.h + 0.22,
          -8.55 + Math.cos(a) * 0.25,
          a,
          -0.98,
          0,
          0.012,
          0.6,
          0.012,
        ),
      );
    }
    speaker(2.95, 3.3, -8.62, 1.15, -0.2);
    B.add(box, blackMetal, M(2.95, 2.88, -8.88, 0, 0, 0, 0.3, 0.04, 0.2));

    // German pennant at the right top corner of the mural
    {
      const flag = canvasTex(64, 96, (g) => {
        g.fillStyle = "#121212";
        g.fillRect(0, 0, 22, 96);
        g.fillStyle = "#d61f26";
        g.fillRect(22, 0, 21, 96);
        g.fillStyle = "#f2c230";
        g.fillRect(43, 0, 21, 96);
      });
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.6, 4, 4),
        std("#ffffff", 0.9, 0, { map: flag, side: THREE.DoubleSide }),
      );
      m.position.set(2.62, 2.9, Z0 + 0.05);
      m.rotation.z = 0.12;
      root.add(m);
    }

    // white louvered door at stage right
    {
      const dx = 4.1;
      const frameM = std("#e9e7e1", 0.55);
      B.add(box, frameM, M(dx, 1.05, Z0 + 0.03, 0, 0, 0, 0.9, 2.1, 0.04));
      for (let k = 0; k < 22; k++)
        B.add(
          box,
          frameM,
          M(dx, 0.18 + k * 0.085, Z0 + 0.065, 0, -0.5, 0, 0.78, 0.07, 0.012),
        );
      B.add(
        box,
        frameM,
        M(dx - 0.47, 1.08, Z0 + 0.05, 0, 0, 0, 0.06, 2.16, 0.08),
      );
      B.add(
        box,
        frameM,
        M(dx + 0.47, 1.08, Z0 + 0.05, 0, 0, 0, 0.06, 2.16, 0.08),
      );
      B.add(box, frameM, M(dx, 2.15, Z0 + 0.05, 0, 0, 0, 1.0, 0.06, 0.08));
      B.add(
        cyl,
        chromeM,
        M(dx + 0.34, 1.0, Z0 + 0.1, 0, Math.PI / 2, 0, 0.012, 0.1, 0.012),
      );
      B.add(
        box,
        whiteM,
        M(dx + 0.85, 1.55, Z0 + 0.01, 0, 0, 0, 0.2, 0.28, 0.01),
      );
    }

    // steel post at stage left with a dome lamp on an arm
    B.add(box, steelM, M(-3.5, H / 2, -6.7, 0, 0, 0, 0.12, H, 0.12));
    B.add(box, steelM, M(-3.2, 2.95, -6.7, 0, 0, 0, 0.6, 0.04, 0.04));

    /* ---------- drum kit ---------- */
    const shellM = new THREE.MeshPhysicalMaterial({
      color: "#1a1a1e",
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    const headM = std("#efe9dc", 0.65);
    const cymbalM = metal("#c7a04c", 0.28);
    const sy = ST.h;
    // bass drum, front head facing the audience
    B.add(
      cyl,
      shellM,
      M(0.05, sy + 0.29, -7.45, 0, Math.PI / 2, 0, 0.28, 0.42, 0.28),
    );
    {
      const front = new THREE.Mesh(
        new THREE.CircleGeometry(0.275, 32),
        std("#ffffff", 0.6, 0, { map: drumHeadTexture() }),
      );
      front.position.set(0.05, sy + 0.29, -7.235);
      front.castShadow = true;
      root.add(front);
    }
    B.add(
      new THREE.TorusGeometry(0.28, 0.012, 6, 32),
      chromeM,
      M(0.05, sy + 0.29, -7.235),
    );
    B.add(
      new THREE.TorusGeometry(0.28, 0.012, 6, 32),
      chromeM,
      M(0.05, sy + 0.29, -7.665),
    );
    const drum = (
      x: number,
      y: number,
      z: number,
      r: number,
      h: number,
      tilt: number,
    ) => {
      B.add(cyl, shellM, M(x, y, z, 0, tilt, 0, r, h, r));
      B.add(cyl, headM, M(x, y, z, 0, tilt, 0, r * 0.99, h + 0.006, r * 0.99));
      B.add(
        new THREE.TorusGeometry(r, 0.008, 6, 28),
        chromeM,
        M(
          x,
          y + (Math.cos(tilt) * h) / 2,
          z + (Math.sin(tilt) * h) / 2,
          0,
          Math.PI / 2 + tilt,
        ),
      );
    };

    drum(-0.12, sy + 0.72, -7.5, 0.13, 0.2, -0.35);
    drum(0.2, sy + 0.72, -7.5, 0.14, 0.2, -0.35);
    drum(0.38, sy + 0.6, -7.78, 0.18, 0.13, -0.12); // snare
    drum(-0.45, sy + 0.42, -7.85, 0.2, 0.36, -0.05); // floor tom
    for (const [x, z] of [
      [-0.45 - 0.15, -7.75],
      [-0.45 + 0.15, -7.75],
      [-0.45, -8.02],
    ] as const)
      B.add(cylLo, chromeM, M(x, sy + 0.12, z, 0, 0, 0, 0.008, 0.24, 0.008));
    // stands
    const stand = (x: number, z: number, top: number) => {
      B.add(cylLo, chromeM, M(x, sy + top / 2, z, 0, 0, 0, 0.01, top, 0.01));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.3;
        B.add(
          cylLo,
          chromeM,
          M(
            x + Math.sin(a) * 0.12,
            sy + 0.1,
            z + Math.cos(a) * 0.12,
            a,
            -0.95,
            0,
            0.007,
            0.3,
            0.007,
          ),
        );
      }
    };
    stand(0.38, -7.78, 0.53);
    stand(0.68, -7.95, 0.9);
    B.add(cyl, cymbalM, M(0.68, sy + 0.9, -7.95, 0, 0, 0, 0.18, 0.006, 0.18));
    B.add(cyl, cymbalM, M(0.68, sy + 0.875, -7.95, 0, 0, 0, 0.18, 0.006, 0.18));
    stand(-0.62, -7.35, 1.3);
    B.add(
      cyl,
      cymbalM,
      M(-0.62, sy + 1.32, -7.35, 0, 0.35, 0.15, 0.23, 0.005, 0.23),
    );
    stand(0.62, -7.35, 1.22);
    B.add(
      cyl,
      cymbalM,
      M(0.62, sy + 1.24, -7.35, 0, 0.3, -0.2, 0.2, 0.005, 0.2),
    );
    stand(-0.78, -7.7, 1.08);
    B.add(
      cyl,
      cymbalM,
      M(-0.78, sy + 1.1, -7.7, 0, 0.2, 0.25, 0.26, 0.005, 0.26),
    );
    // throne
    B.add(
      cyl,
      std("#151515", 0.6),
      M(0.05, sy + 0.43, -8.18, 0, 0, 0, 0.17, 0.07, 0.17),
    );
    B.add(cylLo, chromeM, M(0.05, sy + 0.2, -8.18, 0, 0, 0, 0.02, 0.4, 0.02));
    // pedal
    B.add(box, chromeM, M(0.05, sy + 0.04, -7.75, 0, 0, 0, 0.08, 0.04, 0.25));

    /* ---------- amps, mic stands, music stand, cables ---------- */
    const amp = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      ry: number,
    ) => {
      B.add(rbox(w, h, d, 0.015), tolexM, M(x, sy + h / 2, z, ry));
      B.add(
        box,
        grilleM,
        M(
          x + Math.sin(ry) * (d / 2 + 0.002),
          sy + h * 0.42,
          z + Math.cos(ry) * (d / 2 + 0.002),
          ry,
          0,
          0,
          w - 0.06,
          h * 0.7,
          0.005,
        ),
      );
      B.add(
        box,
        std("#d9d4c8", 0.4),
        M(
          x + Math.sin(ry) * (d / 2 + 0.004),
          sy + h * 0.88,
          z + Math.cos(ry) * (d / 2 + 0.004),
          ry,
          0,
          0,
          w * 0.3,
          0.035,
          0.004,
        ),
      );
    };
    amp(-2.1, -8.45, 0.62, 0.5, 0.28, 0.25);
    amp(2.55, -8.35, 0.6, 0.95, 0.45, -0.25);
    amp(-1.15, -8.6, 0.5, 0.42, 0.26, 0.1);
    const micStand = (
      x: number,
      y: number,
      z: number,
      h: number,
      boomYaw: number,
    ) => {
      B.add(cylLo, blackMetal, M(x, y + h / 2, z, 0, 0, 0, 0.009, h, 0.009));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        B.add(
          cylLo,
          blackMetal,
          M(
            x + Math.sin(a) * 0.14,
            y + 0.1,
            z + Math.cos(a) * 0.14,
            a,
            -1.0,
            0,
            0.007,
            0.34,
            0.007,
          ),
        );
      }
      const bx = x + Math.sin(boomYaw) * 0.12;
      const bz = z + Math.cos(boomYaw) * 0.12;
      B.add(
        cylLo,
        blackMetal,
        M(
          bx,
          y + h + 0.02,
          bz,
          boomYaw,
          Math.PI / 2 - 0.3,
          0,
          0.007,
          0.3,
          0.007,
        ),
      );
      B.add(
        cyl,
        std("#202022", 0.5),
        M(
          x + Math.sin(boomYaw) * 0.27,
          y + h + 0.07,
          z + Math.cos(boomYaw) * 0.27,
          boomYaw,
          Math.PI / 2 - 0.3,
          0,
          0.02,
          0.15,
          0.02,
        ),
      );
      B.add(
        new THREE.SphereGeometry(0.027, 12, 8),
        std("#8a8a8a", 0.4, 0.8),
        M(
          x + Math.sin(boomYaw) * 0.35,
          y + h + 0.1,
          z + Math.cos(boomYaw) * 0.35,
        ),
      );
    };
    micStand(0.25, sy, -6.62, 1.5, Math.PI);
    micStand(-1.95, sy, -7.2, 1.38, Math.PI * 0.95);
    micStand(0.55, 0, -5.75, 1.38, Math.PI);
    micStand(-0.85, sy, -7.5, 0.9, Math.PI * 0.7);
    // music stand at the bassist
    {
      const x = 1.55;
      const z = -6.95;
      B.add(cylLo, blackMetal, M(x, sy + 0.55, z, 0, 0, 0, 0.008, 1.1, 0.008));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        B.add(
          cylLo,
          blackMetal,
          M(
            x + Math.sin(a) * 0.14,
            sy + 0.1,
            z + Math.cos(a) * 0.14,
            a,
            -1.0,
            0,
            0.006,
            0.34,
            0.006,
          ),
        );
      }
      B.add(
        box,
        blackMetal,
        M(x, sy + 1.18, z, 0.35, -0.45, 0, 0.48, 0.32, 0.006),
      );
      B.add(
        box,
        whiteM,
        M(x + 0.01, sy + 1.19, z + 0.02, 0.35, -0.45, 0, 0.42, 0.29, 0.004),
      );
    }
    // a guitar on its stand by the left amp
    {
      const g = makeGuitar("#e9e2d2", false);
      g.position.set(-1.75, sy + 0.32, -8.1);
      g.rotation.set(-0.22, 0.3, 0);
      root.add(g);
      B.add(
        box,
        blackMetal,
        M(-1.75, sy + 0.08, -8.05, 0.3, 0, 0, 0.3, 0.03, 0.25),
      );
    }
    // pedal board
    B.add(
      rbox(0.5, 0.06, 0.25, 0.01),
      std("#0f0f10", 0.7),
      M(0.75, sy + 0.03, -6.62),
    );
    for (let k = 0; k < 4; k++)
      B.add(
        rbox(0.07, 0.04, 0.11, 0.008),
        std(["#c22", "#e8b020", "#2a6be0", "#1fae5a"][k] ?? "#888", 0.5),
        M(0.57 + k * 0.12, sy + 0.08, -6.62),
      );
    // cables on the stage floor
    {
      const cableM = std("#0b0b0b", 0.5);
      const cable = (pts: [number, number][], y: number) => {
        const c = new THREE.CatmullRomCurve3(
          pts.map(([x, z]) => new THREE.Vector3(x, y, z)),
        );
        B.add(
          new THREE.TubeGeometry(c, 40, 0.006, 5),
          cableM,
          new THREE.Matrix4(),
        );
      };
      cable(
        [
          [0.75, -6.62],
          [0.7, -6.9],
          [0.4, -7.3],
          [-0.6, -7.2],
          [-2.0, -8.25],
        ],
        sy + 0.025,
      );
      cable(
        [
          [1.5, -7.3],
          [1.9, -7.6],
          [2.4, -8.1],
        ],
        sy + 0.025,
      );
      cable(
        [
          [0.25, -6.65],
          [-0.4, -6.8],
          [-1.2, -7.9],
          [-1.15, -8.4],
        ],
        sy + 0.025,
      );
      cable(
        [
          [0.55, -5.75],
          [0.9, -6.0],
          [1.6, -6.1],
          [3.3, -6.15],
        ],
        0.008,
      );
    }

    /* ---------- the bar (left wall) ---------- */
    const barX = -5.0; // front face of the counter
    const barZ0 = -4.5;
    const barZ1 = 3.0;
    const barLen = barZ1 - barZ0;
    const barCz = (barZ0 + barZ1) / 2;
    // counter body clad in dark wood, thick top, steel foot rail
    B.add(
      box,
      darkWoodM,
      M(barX - 0.3, 0.52, barCz, 0, 0, 0, 0.6, 1.04, barLen),
      1.2,
    );
    B.add(
      rbox(0.72, 0.06, barLen + 0.06, 0.012),
      tableWoodM,
      M(barX - 0.3, 1.07, barCz),
    );
    B.add(
      cyl,
      chromeM,
      M(barX + 0.16, 0.2, barCz, 0, Math.PI / 2, 0, 0.022, barLen, 0.022),
    );
    for (let z = barZ0 + 0.3; z < barZ1; z += 1.2)
      B.add(box, chromeM, M(barX + 0.08, 0.2, z, 0, 0, 0, 0.16, 0.02, 0.02));
    // warm LED under the counter overhang
    B.add(
      box,
      noCast(emissive("#ffb060", 2.4)),
      M(barX + 0.02, 1.02, barCz, 0, 0, 0, 0.02, 0.012, barLen),
    );
    ctx.wall(X0, barZ0, barX + 0.08, barZ1 + 0.1);
    // back counter with stainless top and the tap wall
    B.add(
      box,
      std("#1c1c1e", 0.7),
      M(X0 + 0.28, 0.45, barCz, 0, 0, 0, 0.56, 0.9, barLen),
      1.2,
    );
    B.add(
      box,
      metal("#bfc2c6", 0.35),
      M(X0 + 0.29, 0.91, barCz, 0, 0, 0, 0.6, 0.02, barLen),
    );
    // row of blue backlit panels and the chrome taps under them
    const panelM = noCast(emissive("#2f5dff", 3.2));
    const tapCount = 13;
    for (let i = 0; i < tapCount; i++) {
      const z = barZ0 + 0.35 + i * ((barLen - 0.7) / (tapCount - 1));
      B.add(
        box,
        std("#0c0c0e", 0.5),
        M(X0 + 0.03, 1.82, z, 0, 0, 0, 0.04, 0.2, 0.3),
      );
      B.add(box, panelM, M(X0 + 0.055, 1.82, z, 0, 0, 0, 0.01, 0.15, 0.24));
      // tap: wall shank, faucet, black handle
      B.add(
        cylLo,
        chromeM,
        M(X0 + 0.1, 1.38, z, 0, 0, Math.PI / 2, 0.012, 0.18, 0.012),
      );
      B.add(cyl, chromeM, M(X0 + 0.2, 1.35, z, 0, 0, 0, 0.018, 0.09, 0.018));
      B.add(cylLo, chromeM, M(X0 + 0.2, 1.29, z, 0, 0, 0, 0.007, 0.05, 0.007));
      B.add(
        cyl,
        std("#111", 0.4),
        M(X0 + 0.2, 1.47, z, 0, 0, 0, 0.012, 0.15, 0.012),
      );
    }
    B.add(
      box,
      metal("#a9adb2", 0.4),
      M(X0 + 0.22, 0.95, barCz, 0, 0, 0, 0.16, 0.03, barLen - 0.6),
    );
    // neon "Benedith" and chalk lettering on the black wall
    {
      const neonTex = lettering(1024, 256, [
        {
          text: "★★★★★",
          font: "bold 42px serif",
          color: "#ff3030",
          y: 40,
          glow: 18,
        },
        {
          text: "Benedith",
          font: "bold 168px 'Times New Roman', Georgia, serif",
          color: "#ff2b2b",
          y: 160,
          glow: 26,
        },
      ]);
      const neon = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.65),
        new THREE.MeshBasicMaterial({
          map: neonTex,
          transparent: true,
          depthWrite: false,
          color: new THREE.Color(3.2, 2.2, 2.2),
        }),
      );
      neon.position.set(X0 + 0.04, 3.32, -2.2);
      neon.rotation.y = Math.PI / 2;
      root.add(neon);
      const okt = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.8),
        new THREE.MeshStandardMaterial({
          map: lettering(
            1024,
            342,
            [
              {
                text: "OKTOBERFEST",
                font: "bold 84px Arial Black, Impact, sans-serif",
                color: "#e9b54a",
                y: 80,
              },
              {
                text: "CANECA CHEIA!",
                font: "italic bold 120px 'Comic Sans MS', 'Segoe Print', cursive",
                color: "#f2efe6",
                y: 230,
              },
            ],
            true,
          ),
          transparent: true,
          depthWrite: false,
          roughness: 0.9,
          emissive: "#ffffff",
          emissiveIntensity: 0.08,
        }),
      );
      okt.material.emissiveMap = okt.material.map;
      okt.position.set(X0 + 0.03, 2.62, -2.2);
      okt.rotation.y = Math.PI / 2;
      root.add(okt);
      const saude = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 0.45),
        new THREE.MeshStandardMaterial({
          map: lettering(
            1536,
            204,
            [
              {
                text: "SAÚDE E CANECA CHEIA!",
                font: "italic bold 130px 'Comic Sans MS', 'Segoe Print', cursive",
                color: "#f2efe6",
                y: 104,
              },
            ],
            true,
          ),
          transparent: true,
          depthWrite: false,
          roughness: 0.9,
          emissive: "#ffffff",
          emissiveIntensity: 0.08,
        }),
      );
      saude.material.emissiveMap = saude.material.map;
      saude.position.set(X0 + 0.03, 2.5, 1.35);
      saude.rotation.y = Math.PI / 2;
      root.add(saude);
    }
    // glass shelves at the end of the bar
    const glassM = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      specularIntensity: 1,
      envMapIntensity: 2,
    });
    noCast(glassM);
    const beerM = new THREE.MeshPhysicalMaterial({
      color: "#e08a1a",
      emissive: "#6a2d00",
      emissiveIntensity: 0.35,
      roughness: 0.12,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1,
    });
    const foamM = std("#f4ecd9", 0.85);
    const glassProfile: [number, number][] = [
      [0, 0],
      [0.03, 0],
      [0.031, 0.006],
      [0.028, 0.03],
      [0.033, 0.09],
      [0.039, 0.14],
      [0.037, 0.17],
      [0.0355, 0.17],
      [0.0375, 0.14],
      [0.0315, 0.09],
      [0.0265, 0.03],
      [0, 0.012],
    ];
    const glassGeo = lathe(glassProfile, 20);
    const beerGeo = lathe(
      [
        [0, 0.013],
        [0.026, 0.013],
        [0.027, 0.03],
        [0.031, 0.09],
        [0.036, 0.13],
        [0, 0.13],
      ],
      20,
    );
    const foamGeo = lathe(
      [
        [0, 0.13],
        [0.036, 0.13],
        [0.0372, 0.152],
        [0.03, 0.158],
        [0, 0.16],
      ],
      20,
    );
    const fullGlasses: THREE.Matrix4[] = [];
    const emptyGlasses: THREE.Matrix4[] = [];
    {
      const sx = X0 + 0.18;
      for (let s = 0; s < 3; s++) {
        const y = 1.35 + s * 0.42;
        B.add(box, darkWoodM, M(sx, y - 0.02, 4.0, 0, 0, 0, 0.32, 0.03, 1.6));
        for (let k = 0; k < 10; k++)
          emptyGlasses.push(
            M(sx + (k % 2) * 0.1 - 0.05, y, 3.3 + k * 0.15, rand() * 6),
          );
      }
      B.add(box, darkWoodM, M(sx, 1.95, 3.18, 0, 0, 0, 0.32, 1.3, 0.03));
      B.add(box, darkWoodM, M(sx, 1.95, 4.82, 0, 0, 0, 0.32, 1.3, 0.03));
      ctx.wall(X0, 3.1, X0 + 0.4, 4.9);
      // glasses waiting on the counter
      for (const z of [-3.2, -1.1, 0.4, 1.9])
        fullGlasses.push(M(barX - 0.2, 1.1, z + rand() * 0.3, 0));
      for (const z of [-2.4, 2.4]) emptyGlasses.push(M(X0 + 0.45, 0.92, z, 0));
      // a few brown bottles on the back counter
      const bottleGeo = lathe(
        [
          [0, 0],
          [0.032, 0],
          [0.033, 0.16],
          [0.026, 0.19],
          [0.012, 0.23],
          [0.012, 0.29],
          [0, 0.29],
        ],
        14,
      );
      const bottleM = std("#3b1d08", 0.15, 0, {
        transparent: true,
        opacity: 0.92,
      });
      for (let k = 0; k < 7; k++)
        B.add(bottleGeo, bottleM, M(X0 + 0.42, 0.92, -4.1 + k * 0.09));
    }
    // bar stools along the counter
    {
      const parts: [THREE.BufferGeometry, THREE.Matrix4][] = [];
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        parts.push([
          cylLo,
          M(
            Math.sin(a) * 0.13,
            0.37,
            Math.cos(a) * 0.13,
            a,
            0.08,
            0,
            0.013,
            0.74,
            0.013,
          ),
        ]);
      }
      parts.push([
        new THREE.TorusGeometry(0.15, 0.008, 5, 20),
        M(0, 0.28, 0, 0, Math.PI / 2),
      ]);
      const legGeo = merged(parts);
      const seatGeo = merged([[cyl, M(0, 0.76, 0, 0, 0, 0, 0.18, 0.04, 0.18)]]);
      const spots: THREE.Matrix4[] = [];
      for (let z = -2.6; z <= 2.5; z += 0.85)
        spots.push(M(barX + 0.42, 0, z, rand()));
      for (let z = -4.8; z <= 2.8; z += 1.2)
        spots.push(M(X1 - 0.62, 0, z, rand()));
      const legs = new THREE.InstancedMesh(legGeo, blackMetal, spots.length);
      const seats = new THREE.InstancedMesh(seatGeo, seatWoodM, spots.length);
      spots.forEach((m, i) => {
        legs.setMatrixAt(i, m);
        seats.setMatrixAt(i, m);
      });
      for (const m of [legs, seats]) {
        m.castShadow = true;
        m.receiveShadow = true;
        root.add(m);
      }
    }

    /* ---------- right wall: ledge, pictures, flag ---------- */
    B.add(rbox(0.32, 0.05, 8.0, 0.01), tableWoodM, M(X1 - 0.16, 1.08, -1.0));
    for (let z = -4.8; z <= 2.8; z += 1.9)
      B.add(box, blackMetal, M(X1 - 0.1, 0.98, z, 0, 0, 0, 0.18, 0.12, 0.03));
    ctx.wall(X1 - 0.34, -5.0, X1, 3.0);
    for (let k = 0; k < 4; k++) {
      const z = -4.4 + k * 2.1;
      const pic = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.62),
        std("#ffffff", 0.5, 0, {
          map: printTexture(60 + k, [210, 30, 190, 20][k] ?? 200),
        }),
      );
      pic.position.set(X1 - 0.035, 1.75, z);
      pic.rotation.y = -Math.PI / 2;
      root.add(pic);
      B.add(
        box,
        std("#101012", 0.5),
        M(X1 - 0.02, 1.75, z, 0, 0, 0, 0.03, 0.7, 0.58),
      );
    }
    // vertical German flag hanging high on the right wall
    {
      const flag = canvasTex(96, 160, (g) => {
        g.fillStyle = "#141414";
        g.fillRect(0, 0, 32, 160);
        g.fillStyle = "#d01f27";
        g.fillRect(32, 0, 32, 160);
        g.fillStyle = "#f0c02f";
        g.fillRect(64, 0, 32, 160);
      });
      const geo = new THREE.PlaneGeometry(1.0, 1.7, 10, 4);
      const p = geo.getAttribute("position");
      for (let i = 0; i < p.count; i++)
        p.setZ(i, Math.sin(p.getX(i) * 14) * 0.025);
      geo.computeVertexNormals();
      const f = new THREE.Mesh(
        geo,
        std("#ffffff", 0.85, 0, { map: flag, side: THREE.DoubleSide }),
      );
      f.position.set(X1 - 0.06, 3.1, -6.6);
      f.rotation.y = -Math.PI / 2;
      root.add(f);
      B.add(
        cyl,
        std("#2a2a2a", 0.5),
        M(X1 - 0.08, 3.97, -6.6, 0, Math.PI / 2, 0, 0.012, 1.1, 0.012),
      );
    }

    /* ---------- entrance (front wall) ---------- */
    {
      const dx = 4.5;
      const frameM = std("#1a1b1d", 0.45, 0.6);
      B.add(box, frameM, M(dx, 2.3, Z1 - 0.04, 0, 0, 0, 1.9, 0.08, 0.1));
      B.add(
        box,
        frameM,
        M(dx - 0.93, 1.15, Z1 - 0.04, 0, 0, 0, 0.06, 2.3, 0.1),
      );
      B.add(
        box,
        frameM,
        M(dx + 0.93, 1.15, Z1 - 0.04, 0, 0, 0, 0.06, 2.3, 0.1),
      );
      B.add(box, frameM, M(dx, 1.15, Z1 - 0.04, 0, 0, 0, 0.05, 2.3, 0.08));
      B.add(
        box,
        std("#06080c", 0.05, 0.2),
        M(dx, 1.15, Z1 - 0.03, 0, 0, 0, 1.8, 2.26, 0.02),
      );
      B.add(
        cyl,
        chromeM,
        M(dx - 0.12, 1.05, Z1 - 0.12, 0, 0, 0, 0.012, 0.6, 0.012),
      );
      B.add(
        cyl,
        chromeM,
        M(dx + 0.12, 1.05, Z1 - 0.12, 0, 0, 0, 0.012, 0.6, 0.012),
      );
    }

    /* ---------- tables, chairs, pendants ---------- */
    const tables: { x: number; z: number; chairs: number[] }[] = [
      { x: COUPLE.x, z: COUPLE.z, chairs: [90, 270] },
      { x: -1.0, z: -4.2, chairs: [0, 180, 90] },
      { x: 1.5, z: -4.3, chairs: [0, 180, 270] },
      { x: 3.9, z: -4.0, chairs: [0, 180] },
      { x: -2.3, z: -1.2, chairs: [0, 180, 270] },
      { x: 0.5, z: -1.1, chairs: [0, 90, 180, 270] },
      { x: 3.1, z: -1.3, chairs: [0, 180] },
      { x: -1.7, z: 1.9, chairs: [0, 180, 90] },
      { x: 1.1, z: 2.1, chairs: [0, 180] },
      { x: 3.5, z: 2.6, chairs: [90, 270] },
    ];
    {
      // table: wood top on a black square-tube frame
      const tw = 0.8;
      const topGeo = merged([[rbox(tw, 0.04, tw, 0.008), M(0, 0.73, 0)]]);
      const frameParts: [THREE.BufferGeometry, THREE.Matrix4][] = [];
      for (const [sx, sz] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const)
        frameParts.push([
          box,
          M(sx * 0.35, 0.355, sz * 0.35, 0, 0, 0, 0.03, 0.71, 0.03),
        ]);
      frameParts.push([box, M(0, 0.69, 0.35, 0, 0, 0, 0.7, 0.05, 0.02)]);
      frameParts.push([box, M(0, 0.69, -0.35, 0, 0, 0, 0.7, 0.05, 0.02)]);
      frameParts.push([box, M(0.35, 0.69, 0, 0, 0, 0, 0.02, 0.05, 0.7)]);
      frameParts.push([box, M(-0.35, 0.69, 0, 0, 0, 0, 0.02, 0.05, 0.7)]);
      const frameGeo = merged(frameParts);
      // chair: black metal frame, wood seat, curved two-rail back; faces +Z, origin under the seat centre
      const cf: [THREE.BufferGeometry, THREE.Matrix4][] = [];
      for (const [sx, sz] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const)
        cf.push([
          cylLo,
          M(
            sx * 0.18,
            0.215,
            sz * 0.18,
            0,
            sz * 0.04,
            -sx * 0.04,
            0.011,
            0.44,
            0.011,
          ),
        ]);
      for (const sx of [1, -1])
        cf.push([
          cylLo,
          M(sx * 0.18, 0.65, -0.205, 0, -0.1, 0, 0.011, 0.42, 0.011),
        ]);
      for (const y of [0.64, 0.82])
        cf.push([
          box,
          M(0, y, -0.205 - (y - 0.45) * 0.1, 0, -0.1, 0, 0.38, 0.045, 0.012),
        ]);
      cf.push([box, M(0, 0.14, 0, 0, 0, 0, 0.36, 0.012, 0.012)]);
      cf.push([box, M(0, 0.14, 0, 0, 0, 0, 0.012, 0.012, 0.36)]);
      const chairFrameGeo = merged(cf);
      const chairSeatGeo = merged([
        [rbox(0.42, 0.03, 0.42, 0.01), M(0, 0.435, 0)],
      ]);

      const tableMs: THREE.Matrix4[] = [];
      const chairMs: THREE.Matrix4[] = [];
      for (const t of tables) {
        tableMs.push(M(t.x, 0, t.z, (rand() - 0.5) * 0.06));
        ctx.wall(t.x - 0.45, t.z - 0.45, t.x + 0.45, t.z + 0.45);
        for (const a of t.chairs) {
          // chair at angle a around the table (0 = on the +Z side), facing the table
          const r = 0.6 + rand() * 0.06;
          const cx = t.x + Math.sin(a * D) * r;
          const cz = t.z + Math.cos(a * D) * r;
          chairMs.push(M(cx, 0, cz, a * D + Math.PI + (rand() - 0.5) * 0.25));
        }
      }
      const inst = (
        geo: THREE.BufferGeometry,
        mat: THREE.Material,
        ms: THREE.Matrix4[],
      ) => {
        const m = new THREE.InstancedMesh(geo, mat, ms.length);
        ms.forEach((x, i) => m.setMatrixAt(i, x));
        m.castShadow = true;
        m.receiveShadow = true;
        root.add(m);
      };
      inst(topGeo, tableWoodM, tableMs);
      inst(frameGeo, blackMetal, tableMs);
      inst(chairFrameGeo, blackMetal, chairMs);
      inst(chairSeatGeo, seatWoodM, chairMs);

      // drinks left on the other tables
      for (const t of tables.slice(1)) {
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const m = M(
            t.x + (rand() - 0.5) * 0.5,
            0.75,
            t.z + (rand() - 0.5) * 0.5,
            rand() * 6,
          );
          (rand() < 0.6 ? fullGlasses : emptyGlasses).push(m);
        }
      }
    }

    // golden dome pendants with a bare bulb
    {
      const domeGeo = new THREE.SphereGeometry(
        0.21,
        24,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      const domeM = new THREE.MeshStandardMaterial({
        color: "#c39a45",
        metalness: 1,
        roughness: 0.32,
        side: THREE.DoubleSide,
      });
      const bulbM = noCast(emissive("#ffc070", 7));
      const cordM = std("#111", 0.6);
      const pend = (x: number, y: number, z: number, cord = true) => {
        B.add(domeGeo, domeM, M(x, y, z));
        B.add(
          new THREE.SphereGeometry(0.05, 14, 10),
          bulbM,
          M(x, y - 0.03, z, 0, 0, 0, 1, 1.3, 1),
        );
        B.add(cylLo, brassM, M(x, y + 0.24, z, 0, 0, 0, 0.022, 0.07, 0.022));
        if (cord)
          B.add(
            cylLo,
            cordM,
            M(x, (y + 0.24 + H) / 2, z, 0, 0, 0, 0.004, H - y - 0.24, 0.004),
          );
      };
      pend(-2.95, 2.62, -6.7, false);
      B.add(cylLo, cordM, M(-2.95, 2.8, -6.7, 0, 0, 0, 0.004, 0.2, 0.004));
      for (const t of tables) pend(t.x, 2.55, t.z);
      for (let z = -3.2; z <= 2.6; z += 1.45) pend(barX - 0.3, 2.45, z);
    }

    /* ---------- the couple's table ---------- */
    {
      const tx = COUPLE.x;
      const tz = COUPLE.z;
      const ty = 0.75;
      // two full glasses on coasters, one each side
      for (const [gx, gz] of [
        [tx - 0.22, tz + 0.12],
        [tx + 0.24, tz - 0.08],
      ] as const) {
        fullGlasses.push(M(gx, ty + 0.003, gz, rand() * 6));
        B.add(
          cylLo,
          std("#d8c7a0", 0.9),
          M(gx, ty + 0.0015, gz, 0, 0, 0, 0.05, 0.003, 0.05),
        );
      }
      // a portion of fries on an oval white plate, with a little sauce bowl
      const plateM = std("#f2f0ea", 0.3);
      B.add(
        lathe(
          [
            [0, 0],
            [0.1, 0],
            [0.13, 0.012],
            [0.14, 0.02],
            [0.13, 0.016],
            [0, 0.008],
          ],
          28,
        ),
        plateM,
        M(tx + 0.02, ty, tz + 0.05, 0.4, 0, 0, 1.3, 1, 1),
      );
      const fryM = std("#e2a640", 0.6);
      const fries = new THREE.InstancedMesh(box, fryM, 34);
      for (let i = 0; i < 34; i++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 0.09;
        fries.setMatrixAt(
          i,
          M(
            tx + 0.02 + Math.cos(a) * r * 1.2,
            ty + 0.02 + rand() * 0.035,
            tz + 0.05 + Math.sin(a) * r,
            rand() * 6,
            (rand() - 0.5) * 0.6,
            0,
            0.009,
            0.009,
            0.06 + rand() * 0.03,
          ),
        );
      }
      fries.castShadow = true;
      root.add(fries);
      B.add(
        lathe(
          [
            [0, 0],
            [0.025, 0],
            [0.035, 0.03],
            [0.032, 0.03],
            [0.02, 0.004],
            [0, 0.004],
          ],
          18,
        ),
        plateM,
        M(tx + 0.16, ty, tz + 0.2),
      );
      B.add(
        cyl,
        std("#b32014", 0.3),
        M(tx + 0.16, ty + 0.022, tz + 0.2, 0, 0, 0, 0.03, 0.004, 0.03),
      );
      // napkin holder
      B.add(
        box,
        metal("#c9c9c9", 0.3),
        M(tx - 0.28, ty + 0.05, tz - 0.25, 0.3, 0, 0, 0.13, 0.1, 0.06),
      );
      B.add(
        box,
        std("#ffffff", 0.9),
        M(tx - 0.28, ty + 0.085, tz - 0.25, 0.3, 0, 0, 0.12, 0.08, 0.04),
      );
    }

    // all drinks as three instanced meshes
    {
      const inst = (
        geo: THREE.BufferGeometry,
        mat: THREE.Material,
        ms: THREE.Matrix4[],
        cast: boolean,
      ) => {
        if (!ms.length) return;
        const m = new THREE.InstancedMesh(geo, mat, ms.length);
        ms.forEach((x, i) => m.setMatrixAt(i, x));
        m.castShadow = cast;
        m.receiveShadow = true;
        root.add(m);
      };
      const all = [...fullGlasses, ...emptyGlasses];
      inst(glassGeo, glassM, all, false);
      inst(beerGeo, beerM, fullGlasses, true);
      inst(foamGeo, foamM, fullGlasses, true);
    }

    B.flush(root);

    /* ---------- the band ---------- */
    const singer = ctx.person(
      { skin: "#e2b391", hair: "#4a3324", hairStyle: "short", height: 1.78 },
      {
        top: "#1e1f24",
        topStyle: "hoodie",
        bottom: "#47566e",
        bottomStyle: "jeans",
        shoes: "#1b1b1b",
      },
      0.25,
      -6.98,
      0,
      "talk",
    );
    singer.position.y = sy;
    const g1 = makeGuitar("#121214", false);
    g1.position.set(-0.05, 0.98, 0.17);
    g1.rotation.set(0.05, 0.2, -70 * D);
    singer.add(g1);

    const drummer = ctx.person(
      {
        skin: "#c88f6c",
        hair: "#1d1916",
        hairStyle: "short",
        height: 1.74,
        beard: true,
      },
      {
        top: "#a3a7ad",
        topStyle: "tshirt",
        bottom: "#2a2d33",
        bottomStyle: "pants",
        shoes: "#202020",
      },
      0.05,
      -8.15,
      0,
      "sit",
    );
    drummer.position.y = sy;

    const bassist = ctx.person(
      { skin: "#d8a585", hair: "#2a221c", hairStyle: "short", height: 1.76 },
      {
        top: "#151517",
        topStyle: "tshirt",
        bottom: "#151517",
        bottomStyle: "pants",
        shoes: "#0f0f0f",
      },
      2.15,
      -7.45,
      -14,
      "talk",
    );
    bassist.position.y = sy;
    const g2 = makeGuitar("#eeeae0", true);
    g2.position.set(-0.05, 0.96, 0.17);
    g2.rotation.set(0.05, 0.2, -72 * D);
    bassist.add(g2);

    /* ---------- partner, photo, pack ---------- */
    const line =
      ctx.player === "elena"
        ? "Esse solo foi pra você 🎸"
        : "Rock, cerveja gelada e você. Noite perfeita 🤘";
    ctx.partner(COUPLE.x - 0.62, COUPLE.z, 90, "sit", OUTFITS, line);
    ctx.playerOutfit(OUTFITS);
    ctx.pack(COUPLE.x + 0.12, 0.752, COUPLE.z - 0.24, 25);
    ctx.photo(
      "benedith-1.webp",
      0.45,
      0.6,
      new THREE.Vector3(-5.2, 1.7, Z0 + 0.03),
      0,
    );
    ctx.ambient("amb-benedith.m4a", 0.5);

    /* ---------- lights (8, one shadow caster) ---------- */
    ctx.scene.add(new THREE.HemisphereLight("#55597a", "#5c4c42", 0.32));

    const stageA = new THREE.SpotLight("#b04cff", 46, 0, 0.62, 0.65, 2);
    stageA.position.set(0.2, H - 0.5, -5.2);
    stageA.target.position.set(0, 1.3, -8.9);
    stageA.castShadow = true;
    stageA.shadow.mapSize.set(1024, 1024);
    stageA.shadow.bias = -0.0004;
    stageA.shadow.normalBias = 0.02;
    stageA.shadow.camera.near = 0.5;
    stageA.shadow.camera.far = 9;
    ctx.scene.add(stageA, stageA.target);

    const stageB = new THREE.SpotLight("#3a6cff", 26, 0, 0.55, 0.7, 2);
    stageB.position.set(-2.6, H - 0.3, -4.6);
    stageB.target.position.set(1.2, 1.4, -8.9);
    ctx.scene.add(stageB, stageB.target);

    const warm = (
      x: number,
      y: number,
      z: number,
      i: number,
      color = "#ffb468",
    ) => {
      const p = new THREE.PointLight(color, i, 0, 2);
      p.position.set(x, y, z);
      ctx.scene.add(p);
      return p;
    };
    warm(COUPLE.x, 2.35, COUPLE.z, 2.6);
    warm(0.8, 2.4, -1.6, 3.2);
    warm(2.6, 2.4, 2.4, 2.6);
    warm(barX - 0.2, 2.3, -0.6, 3.4, "#ffc890");
    warm(X0 + 0.6, 3.2, -2.2, 1.4, "#ff3030");

    // the stage light drifts purple → blue → green like in the video
    const ca = new THREE.Color();
    ctx.onUpdate((t) => {
      const h = 0.62 + 0.2 * Math.sin(t * 0.33);
      stageA.color.copy(ca.setHSL(h, 0.85, 0.6));
      stageB.color.copy(ca.setHSL((h + 0.08) % 1, 0.8, 0.55));
    });

    /* ---------- spawn and exit ---------- */
    ctx.spawn(4.5, 5.0, 19);
    ctx.exit(4.5, 5.65, 0.6);
  },
};

export default scene;
