import * as THREE from "three";

/*
 * Procedural PBR materials for realistic interiors: every surface gets an
 * albedo, a normal map (derived from a height field) and a roughness map,
 * all drawn on canvases at load time. Use with MeshStandardMaterial /
 * MeshPhysicalMaterial. Sizes are in meters through `repeat`.
 */

export type Maps = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
};

type Painter = (
  g: CanvasRenderingContext2D,
  h: CanvasRenderingContext2D,
  r: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
) => void;

const cache = new Map<string, Maps>();

export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("2d canvas unavailable");
  return { c, g };
}

/** Sobel normal map from a grayscale height canvas. */
function normalFromHeight(h: HTMLCanvasElement, strength: number) {
  const size = h.width;
  const src = h.getContext("2d")!.getImageData(0, 0, size, size).data;
  const { c, g } = canvas(size);
  const out = g.createImageData(size, size);
  const at = (x: number, y: number) =>
    src[(((y + size) % size) * size + ((x + size) % size)) * 4]! / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / len) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

function build(
  key: string,
  size: number,
  strength: number,
  paint: Painter,
  seed = 1,
): Maps {
  const hit = cache.get(key);
  if (hit) return hit;
  const a = canvas(size);
  const h = canvas(size);
  const r = canvas(size);
  h.g.fillStyle = "#808080";
  h.g.fillRect(0, 0, size, size);
  r.g.fillStyle = "#c0c0c0";
  r.g.fillRect(0, 0, size, size);
  paint(a.g, h.g, r.g, size, seeded(seed));
  const n = normalFromHeight(h.c, strength);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const maps = {
    map: tex(a.c, true),
    normalMap: tex(n, false),
    roughnessMap: tex(r.c, false),
  };
  cache.set(key, maps);
  return maps;
}

/** Clones the maps with a repeat, so one painted set serves many surfaces. */
export function repeat(maps: Maps, x: number, y: number): Maps {
  const c = (t: THREE.Texture) => {
    const k = t.clone();
    k.repeat.set(x, y);
    k.needsUpdate = true;
    return k;
  };
  return {
    map: c(maps.map),
    normalMap: c(maps.normalMap),
    roughnessMap: c(maps.roughnessMap),
  };
}

export function pbr(
  maps: Maps,
  opts: THREE.MeshStandardMaterialParameters = {},
) {
  return new THREE.MeshStandardMaterial({
    ...maps,
    roughness: 1,
    normalScale: new THREE.Vector2(1, 1),
    ...opts,
  });
}

const hsl = (base: string, dl: number, ds = 0) =>
  `#${new THREE.Color(base).offsetHSL(0, ds, dl).getHexString()}`;

function noise(
  g: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
  amount: number,
  alpha: number,
  light = true,
) {
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(rand() * 255);
    g.fillStyle = light
      ? `rgba(${v},${v},${v},${alpha})`
      : `rgba(0,0,0,${alpha * rand()})`;
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
}

/* ---------------- the library ---------------- */

/** Wood planks running along X. `plankWidth` in texture units (1 texture = 1 repeat). */
export function woodPlanks(base = "#8a5a35", planks = 6, seed = 3): Maps {
  return build(
    `wood:${base}:${planks}`,
    1024,
    3,
    (g, h, r, s, rand) => {
      const ph = s / planks;
      for (let p = 0; p < planks; p++) {
        const y = p * ph;
        const tone = (rand() - 0.5) * 0.08;
        g.fillStyle = hsl(base, tone);
        g.fillRect(0, y, s, ph);
        // grain
        for (let k = 0; k < 90; k++) {
          const yy = y + rand() * ph;
          g.strokeStyle = `rgba(${rand() < 0.5 ? "40,20,10" : "255,230,200"},${0.05 + rand() * 0.08})`;
          g.lineWidth = 0.5 + rand() * 1.5;
          g.beginPath();
          g.moveTo(0, yy);
          for (let x = 0; x <= s; x += 32)
            g.lineTo(x, yy + Math.sin(x * 0.01 + k) * 2 * rand());
          g.stroke();
        }
        // knots
        if (rand() < 0.5) {
          const kx = rand() * s;
          const ky = y + ph * (0.3 + rand() * 0.4);
          g.fillStyle = "rgba(50,25,10,0.35)";
          g.beginPath();
          g.ellipse(
            kx,
            ky,
            10 + rand() * 12,
            4 + rand() * 4,
            0,
            0,
            Math.PI * 2,
          );
          g.fill();
        }
        // seams
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.fillRect(0, y, s, 2);
        h.fillStyle = "#303030";
        h.fillRect(0, y, s, 3);
        const cut = rand() * s;
        g.fillRect(cut, y, 2, ph);
        h.fillRect(cut, y, 3, ph);
        r.fillStyle = `rgb(${150 + rand() * 40},${150 + rand() * 40},${150 + rand() * 40})`;
        r.fillRect(0, y + 3, s, ph - 3);
      }
    },
    seed,
  );
}

/** Square floor or wall tiles with grout. */
export function tiles(
  base = "#e7dfd2",
  grout = "#b9b0a2",
  count = 4,
  seed = 5,
  gloss = 0.35,
): Maps {
  return build(
    `tiles:${base}:${grout}:${count}:${gloss}`,
    1024,
    4,
    (g, h, r, s, rand) => {
      const t = s / count;
      const gw = Math.max(3, s / 256);
      g.fillStyle = grout;
      g.fillRect(0, 0, s, s);
      h.fillStyle = "#202020";
      h.fillRect(0, 0, s, s);
      const rv = Math.floor(gloss * 255);
      r.fillStyle = "#e0e0e0";
      r.fillRect(0, 0, s, s);
      for (let y = 0; y < count; y++) {
        for (let x = 0; x < count; x++) {
          g.fillStyle = hsl(base, (rand() - 0.5) * 0.04);
          g.fillRect(x * t + gw, y * t + gw, t - gw * 2, t - gw * 2);
          h.fillStyle = "#909090";
          h.fillRect(x * t + gw, y * t + gw, t - gw * 2, t - gw * 2);
          r.fillStyle = `rgb(${rv},${rv},${rv})`;
          r.fillRect(x * t + gw, y * t + gw, t - gw * 2, t - gw * 2);
        }
      }
      noise(g, s, rand, 6000, 0.03);
    },
    seed,
  );
}

/** Painted plaster (walls), with a faint trowel texture. */
export function plaster(base = "#ece6dc", seed = 7): Maps {
  return build(
    `plaster:${base}`,
    512,
    1.2,
    (g, h, r, s, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 400; i++) {
        const x = rand() * s;
        const y = rand() * s;
        const rad = 10 + rand() * 40;
        const grd = h.createRadialGradient(x, y, 0, x, y, rad);
        const v = 110 + rand() * 40;
        grd.addColorStop(0, `rgba(${v},${v},${v},0.25)`);
        grd.addColorStop(1, "rgba(128,128,128,0)");
        h.fillStyle = grd;
        h.fillRect(x - rad, y - rad, rad * 2, rad * 2);
        g.fillStyle = `rgba(${rand() < 0.5 ? "0,0,0" : "255,255,255"},0.015)`;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      noise(g, s, rand, 3000, 0.02);
      r.fillStyle = "#e6e6e6";
      r.fillRect(0, 0, s, s);
    },
    seed,
  );
}

/** Running-bond bricks (Panedoca's white-grey wall, the Famiglia arch). */
export function bricks(
  base = "#d9d5cf",
  mortar = "#a7a199",
  rows = 8,
  seed = 9,
): Maps {
  return build(
    `bricks:${base}:${mortar}:${rows}`,
    1024,
    5,
    (g, h, r, s, rand) => {
      const bh = s / rows;
      const bw = bh * 3.2;
      g.fillStyle = mortar;
      g.fillRect(0, 0, s, s);
      h.fillStyle = "#2a2a2a";
      h.fillRect(0, 0, s, s);
      for (let row = 0; row < rows; row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let x = -bw; x < s + bw; x += bw) {
          const px = x + off + 4;
          const py = row * bh + 4;
          const w = bw - 8;
          const hh = bh - 8;
          g.fillStyle = hsl(base, (rand() - 0.5) * 0.12);
          g.fillRect(px, py, w, hh);
          const v = 140 + rand() * 50;
          h.fillStyle = `rgb(${v},${v},${v})`;
          h.fillRect(px, py, w, hh);
          for (let k = 0; k < 30; k++) {
            const cx = px + rand() * w;
            const cy = py + rand() * hh;
            const vv = v - 30 - rand() * 40;
            h.fillStyle = `rgb(${vv},${vv},${vv})`;
            h.fillRect(cx, cy, 2 + rand() * 8, 1 + rand() * 4);
            g.fillStyle = `rgba(0,0,0,${0.04 + rand() * 0.06})`;
            g.fillRect(cx, cy, 2 + rand() * 8, 1 + rand() * 4);
          }
        }
      }
      r.fillStyle = "#f0f0f0";
      r.fillRect(0, 0, s, s);
    },
    seed,
  );
}

/** Polished stone (marble or granite tabletops and counters). */
export function marble(
  base = "#e9e0d2",
  vein = "rgba(120,100,80,0.35)",
  seed = 11,
): Maps {
  return build(
    `marble:${base}:${vein}`,
    1024,
    0.6,
    (g, h, r, s, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = vein;
        g.lineWidth = 0.5 + rand() * 3;
        g.beginPath();
        let x = rand() * s;
        let y = 0;
        g.moveTo(x, y);
        while (y < s) {
          x += (rand() - 0.5) * 40;
          y += 10 + rand() * 30;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      noise(g, s, rand, 9000, 0.03);
      r.fillStyle = "#383838";
      r.fillRect(0, 0, s, s);
    },
    seed,
  );
}

/** Woven fabric (sofas, chairs, tablecloths, bedding). */
export function fabric(base = "#cbbfae", seed = 13): Maps {
  return build(
    `fabric:${base}`,
    512,
    2,
    (g, h, r, s, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 4) {
        h.fillStyle = y % 8 ? "#9a9a9a" : "#6a6a6a";
        h.fillRect(0, y, s, 2);
        g.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.02})`;
        g.fillRect(0, y, s, 1);
      }
      for (let x = 0; x < s; x += 4) {
        h.fillStyle = "rgba(160,160,160,0.5)";
        h.fillRect(x, 0, 2, s);
      }
      noise(g, s, rand, 4000, 0.03);
      r.fillStyle = "#f2f2f2";
      r.fillRect(0, 0, s, s);
    },
    seed,
  );
}

/** Leather (cinema recliners, booths). */
export function leather(base = "#1b181c", seed = 17): Maps {
  return build(
    `leather:${base}`,
    512,
    1.6,
    (g, h, r, s, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2500; i++) {
        const x = rand() * s;
        const y = rand() * s;
        const v = 100 + rand() * 60;
        h.fillStyle = `rgba(${v},${v},${v},0.6)`;
        h.beginPath();
        h.arc(x, y, 1 + rand() * 3, 0, Math.PI * 2);
        h.fill();
      }
      r.fillStyle = "#5a5a5a";
      r.fillRect(0, 0, s, s);
      noise(r, s, rand, 3000, 0.2);
    },
    seed,
  );
}

/** Short-pile carpet. */
export function carpet(base = "#5a2a3a", seed = 19): Maps {
  return build(
    `carpet:${base}`,
    512,
    1.5,
    (g, h, r, s, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      noise(g, s, rand, 30000, 0.05);
      noise(h, s, rand, 30000, 0.3);
      r.fillStyle = "#fafafa";
      r.fillRect(0, 0, s, s);
    },
    seed,
  );
}

/** Rough stone or concrete. */
export function concrete(base = "#b9b4ab", seed = 23): Maps {
  return build(
    `concrete:${base}`,
    512,
    2,
    (g, h, r, s, rand) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      noise(g, s, rand, 20000, 0.05);
      noise(h, s, rand, 20000, 0.25);
      r.fillStyle = "#e0e0e0";
      r.fillRect(0, 0, s, s);
    },
    seed,
  );
}

/** A photo or image as a plain material (screens, posters, menus). */
export function imageMaterial(texture: THREE.Texture, glow = 0) {
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.5,
    ...(glow
      ? { emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: glow }
      : {}),
  });
}

/** Emissive material for lamps, LEDs and screens; values above 1 bloom. */
export function emissive(color: THREE.ColorRepresentation, intensity = 3) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
  });
}

/** Clear glass (drinks, windows, bottles). */
export function glass(
  tint: THREE.ColorRepresentation = "#ffffff",
  opacity = 0.25,
) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.95,
    thickness: 0.02,
    transparent: true,
    opacity: Math.max(opacity, 0.15),
    ior: 1.5,
  });
}

/** Metal (cutlery, frames, rings, legs). */
export function metal(
  color: THREE.ColorRepresentation = "#c8c8c8",
  roughness = 0.3,
) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness });
}
