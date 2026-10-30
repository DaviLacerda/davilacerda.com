/**
 * The ASCII backdrops' drawing surface: a grid of character cells, each
 * holding an amount of ink from 0 (empty) to 1 (the densest glyph). Scenes
 * draw shapes into it in "card units" (the card's height is 1, its width is
 * `field.width`), with soft edges one cell wide, and the renderer turns each
 * cell's ink into a glyph of the ramp (`renderer.ts`). Dependency-free and
 * allocation-free per frame.
 */

export type Field = {
  cols: number;
  rows: number;
  /** Width of the card in units (its aspect ratio: the height is 1). */
  width: number;
  /** A cell's size in units. */
  cw: number;
  ch: number;
  /** Ink per cell, row by row, 0 to 1. */
  ink: Float32Array;
  /** A glyph chosen for the cell instead of the ramp's (1 + its index in `GLYPHS`; 0 for none). */
  marks: Uint8Array;
  /**
   * How clear each cell is of the content the canvas sits under (1: clear,
   * 0: on a word or a picture), when the backdrop keeps clear of it; null
   * otherwise. The backdrop fades the ink by it after every draw, and scenes
   * can read it (see `freeRect`) to compose in the space the content leaves.
   */
  free: Float32Array | null;
  /** Bumped whenever `free` changes, so scenes know to compose again. */
  revision: number;
};

/**
 * Glyphs a scene can place on purpose (heads, waves, arms, a check, a
 * bracket), besides the density ramp. Append only: marks store the index.
 */
export const GLYPHS = "o~/\\|_()-=:.'v*+[]<>#x@`";

/** A field of `cols` by `rows` cells of `cw` by `ch` units on a card `width` units wide. */
export function createField(
  cols: number,
  rows: number,
  width: number,
  cw = width / cols,
  ch = 1 / rows,
): Field {
  return {
    cols,
    rows,
    width,
    cw,
    ch,
    ink: new Float32Array(cols * rows),
    marks: new Uint8Array(cols * rows),
    free: null,
    revision: 0,
  };
}

export function clear(field: Field) {
  field.ink.fill(0);
  field.marks.fill(0);
}

/** Inks the cell at (x, y) with at least `ink` (a single cell of a lattice). */
export function plot(field: Field, x: number, y: number, ink: number) {
  const c = Math.floor(x / field.cw);
  const r = Math.floor(y / field.ch);
  if (c < 0 || r < 0 || c >= field.cols || r >= field.rows) return;
  const i = r * field.cols + c;
  if (ink > (field.ink[i] ?? 0)) field.ink[i] = ink;
}

/**
 * Puts a given glyph (one of `GLYPHS`) in the cell at (x, y), over whatever
 * is there, at `ink` strength (its opacity). Returns false off the grid.
 */
export function mark(
  field: Field,
  x: number,
  y: number,
  glyph: string,
  ink: number,
): boolean {
  const c = Math.floor(x / field.cw);
  const r = Math.floor(y / field.ch);
  if (c < 0 || r < 0 || c >= field.cols || r >= field.rows) return false;
  const code = GLYPHS.indexOf(glyph);
  if (code < 0) return false;
  const i = r * field.cols + c;
  field.ink[i] = ink;
  field.marks[i] = code + 1;
  return true;
}

/** A box in card units. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/**
 * The best rectangle of clear cells (see `free`), by `score(width, height)`
 * in units, e.g. the widest lane at least a few rows tall. Null when the field
 * has no `free` map or nothing scores above 0. One pass over the grid (the
 * largest rectangle under a histogram, row by row); call it when `revision`
 * changes, not every frame.
 */
export function freeRect(
  field: Field,
  score: (width: number, height: number, box: Box) => number,
  threshold = 0.9,
): Box | null {
  const { cols, rows, cw, ch, free } = field;
  if (!free) return null;
  const heights = new Int32Array(cols);
  const stack = new Int32Array(cols + 1);
  let best: Box | null = null;
  let bestScore = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      heights[c] =
        (free[r * cols + c] ?? 0) >= threshold ? (heights[c] ?? 0) + 1 : 0;
    }
    // Every maximal rectangle whose bottom is this row (and every shorter one
    // inside it, so a score can prefer a lane to the tallest box).
    let top = 0;
    for (let c = 0; c <= cols; c++) {
      const h = c < cols ? (heights[c] ?? 0) : 0;
      while (top > 0 && (heights[stack[top - 1] ?? 0] ?? 0) >= h) {
        const height = heights[stack[--top] ?? 0] ?? 0;
        const left = top > 0 ? (stack[top - 1] ?? 0) + 1 : 0;
        for (let k = height; k > 0; k--) {
          const box = {
            x0: left * cw,
            y0: (r + 1 - k) * ch,
            x1: c * cw,
            y1: (r + 1) * ch,
          };
          // (Width and height as whole cells times the cell, so a score's
          // `h >= ch * 5` holds for exactly five rows.)
          const value = score((c - left) * cw, k * ch, box);
          if (value > bestScore) {
            bestScore = value;
            best = box;
          }
        }
      }
      stack[top++] = c;
    }
  }
  return best;
}

export const clamp = (value: number, min = 0, max = 1) =>
  value < min ? min : value > max ? max : value;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** A stable pseudo-random number in [0, 1) for integer inputs (cells, ticks, seeds). */
export function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h = Math.imul(h ^ Math.imul(c | 0, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Smooth 1D value noise in [0, 1). */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u);
}

/** Smooth 2D value noise in [0, 1). */
export function noise2(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

/* ------------------------------------------------------------ Painting */

/**
 * Calls `shade(x, y)` for every cell whose centre lies in the box (units)
 * and keeps the larger ink: shapes add up without darkening each other.
 */
export function paint(
  field: Field,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  shade: (x: number, y: number) => number,
) {
  const { cols, rows, cw, ch, ink } = field;
  const c0 = Math.max(0, Math.floor(x0 / cw));
  const c1 = Math.min(cols - 1, Math.ceil(x1 / cw));
  const r0 = Math.max(0, Math.floor(y0 / ch));
  const r1 = Math.min(rows - 1, Math.ceil(y1 / ch));
  for (let r = r0; r <= r1; r++) {
    const y = (r + 0.5) * ch;
    const row = r * cols;
    for (let c = c0; c <= c1; c++) {
      const value = shade((c + 0.5) * cw, y);
      if (value > (ink[row + c] ?? 0)) ink[row + c] = value;
    }
  }
}

/**
 * Like `paint`, but the shape covers what is under it (a ball in front of a
 * net): `cover(x, y)` is how much of the cell it covers, `shade` its ink there.
 */
export function cover(
  field: Field,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  coverage: (x: number, y: number) => number,
  shade: (x: number, y: number) => number,
) {
  const { cols, rows, cw, ch, ink } = field;
  const c0 = Math.max(0, Math.floor(x0 / cw));
  const c1 = Math.min(cols - 1, Math.ceil(x1 / cw));
  const r0 = Math.max(0, Math.floor(y0 / ch));
  const r1 = Math.min(rows - 1, Math.ceil(y1 / ch));
  for (let r = r0; r <= r1; r++) {
    const y = (r + 0.5) * ch;
    const row = r * cols;
    for (let c = c0; c <= c1; c++) {
      const x = (c + 0.5) * cw;
      const a = coverage(x, y);
      if (a <= 0) continue;
      const below = ink[row + c] ?? 0;
      ink[row + c] = below + (shade(x, y) - below) * a;
      if (a > 0.5) field.marks[row + c] = 0;
    }
  }
}

/** Scales the ink of every cell by `factor(x, y)` (fades, masks). */
export function scale(field: Field, factor: (x: number, y: number) => number) {
  const { cols, rows, cw, ch, ink } = field;
  for (let r = 0; r < rows; r++) {
    const y = (r + 0.5) * ch;
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const value = ink[i] ?? 0;
      if (value > 0) ink[i] = value * factor((c + 0.5) * cw, y);
    }
  }
}

/** Coverage of a stroke of width `w` at distance `d` from its centre line, soft over about a cell. */
function strokeCoverage(field: Field, d: number, w: number) {
  const soft = field.ch * 0.9;
  return clamp((w / 2 - d) / soft + 0.5);
}

function segmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(((px - ax) * dx + (py - ay) * dy) / length) : 0;
  const x = ax + dx * t - px;
  const y = ay + dy * t - py;
  return Math.sqrt(x * x + y * y);
}

/** A straight stroke from a to b. */
export function line(
  field: Field,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  w: number,
  ink: number,
) {
  const pad = w + field.ch;
  paint(
    field,
    Math.min(ax, bx) - pad,
    Math.min(ay, by) - pad,
    Math.max(ax, bx) + pad,
    Math.max(ay, by) + pad,
    (x, y) =>
      ink * strokeCoverage(field, segmentDistance(x, y, ax, ay, bx, by), w),
  );
}

/** A stroke through the points `[x0, y0, x1, y1, ...]`. */
export function polyline(
  field: Field,
  points: ArrayLike<number>,
  w: number,
  ink: number | ((t: number) => number),
) {
  const n = points.length / 2;
  for (let i = 0; i < n - 1; i++) {
    const value = typeof ink === "number" ? ink : ink(i / Math.max(1, n - 2));
    line(
      field,
      points[i * 2] ?? 0,
      points[i * 2 + 1] ?? 0,
      points[i * 2 + 2] ?? 0,
      points[i * 2 + 3] ?? 0,
      w,
      value,
    );
  }
}

/**
 * The outline of an ellipse, optionally only between two angles (radians,
 * 0 to the right, growing clockwise on screen since y points down).
 */
export function ellipse(
  field: Field,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  w: number,
  ink: number,
  from = 0,
  to = Math.PI * 2,
) {
  const full = to - from >= Math.PI * 2 - 1e-6;
  const pad = w + field.ch;
  const k = Math.min(rx, ry);
  paint(
    field,
    cx - rx - pad,
    cy - ry - pad,
    cx + rx + pad,
    cy + ry + pad,
    (x, y) => {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (!full) {
        let a = Math.atan2(dy, dx);
        while (a < from) a += Math.PI * 2;
        while (a > from + Math.PI * 2) a -= Math.PI * 2;
        if (a > to) return 0;
      }
      // Distance to the curve, scaled back to units (good for thin strokes).
      const d = Math.abs(Math.sqrt(dx * dx + dy * dy) - 1) * k;
      return ink * strokeCoverage(field, d, w);
    },
  );
}

/** A filled disc with a soft edge. */
export function disc(
  field: Field,
  cx: number,
  cy: number,
  r: number,
  ink: number,
) {
  const pad = r + field.ch;
  paint(field, cx - pad, cy - pad, cx + pad, cy + pad, (x, y) => {
    const d = Math.hypot(x - cx, y - cy);
    return ink * clamp((r - d) / (field.ch * 0.9) + 0.5);
  });
}

/**
 * A lit sphere that covers what is behind it. `shade(nx, ny, nz)` gets the
 * surface normal (screen space, z towards the viewer) and returns its ink.
 */
export function sphere(
  field: Field,
  cx: number,
  cy: number,
  r: number,
  shade: (nx: number, ny: number, nz: number) => number,
) {
  const pad = r + field.ch;
  const soft = field.ch * 0.9;
  cover(
    field,
    cx - pad,
    cy - pad,
    cx + pad,
    cy + pad,
    (x, y) => clamp((r - Math.hypot(x - cx, y - cy)) / soft + 0.5),
    (x, y) => {
      const nx = clamp((x - cx) / r, -1, 1);
      const ny = clamp((y - cy) / r, -1, 1);
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      return shade(nx, ny, nz);
    },
  );
}

/** Lambert light from the upper left, with a floor of ambient light. */
export function lambert(nx: number, ny: number, nz: number, ambient = 0.28) {
  const d = nx * -0.45 + ny * -0.55 + nz * 0.7;
  return ambient + (1 - ambient) * Math.max(0, d);
}

/** Rotates the vector (x, y, z) by yaw (around y), then pitch (around x), then roll (around z). */
export function rotate(
  out: Float64Array,
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  roll: number,
) {
  let cos = Math.cos(yaw);
  let sin = Math.sin(yaw);
  const x1 = x * cos + z * sin;
  const z1 = -x * sin + z * cos;
  cos = Math.cos(pitch);
  sin = Math.sin(pitch);
  const y2 = y * cos - z1 * sin;
  const z2 = y * sin + z1 * cos;
  cos = Math.cos(roll);
  sin = Math.sin(roll);
  out[0] = x1 * cos - y2 * sin;
  out[1] = x1 * sin + y2 * cos;
  out[2] = z2;
  return out;
}
