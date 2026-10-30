import {
  clamp,
  disc,
  hash,
  lambert,
  lerp,
  line,
  mark,
  paint,
  plot,
  polyline,
  rotate,
  scale,
  smoothstep,
  sphere,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Corinthians: a free kick. The goal stands at the top right of the card,
 * seen from the pitch, its net a soft grid, a stand of heads behind it; the
 * ball waits at the bottom right, rolling to and fro and turning (its
 * pentagons go round). Calm, a slow wave runs along the stand, arms up as it
 * passes (\o/). Lively, the ball is struck and curls into the top corner,
 * smaller as it goes deeper; the net bulges, the whole stand jumps, and a new
 * ball rolls in.
 *
 * Positions are measured from the card's right edge (x <= 0), in card heights.
 */

const G = 5.4;
const BALL = 0.085;
const REST_Y = 0.835;
const GROUND = REST_Y + BALL;
const REST_X = -0.3;
const POST_L = -0.6;
const POST_R = -0.08;
const STEP = 1 / 120;
const TRAIL = 8;
const FLIGHT = 0.62;

/** The twelve pentagons of a football: the vertices of an icosahedron (as six axes). */
const PENTAGONS: number[] = (() => {
  const p = (1 + Math.sqrt(5)) / 2;
  const n = Math.hypot(1, p);
  const out: number[] = [];
  for (const [a, b] of [
    [1, p],
    [-1, p],
  ] as const) {
    out.push(0, a / n, b / n, a / n, b / n, 0, b / n, 0, a / n);
  }
  return out;
})();

type Mode = "rest" | "strike" | "fall" | "gone";

export function soccer(): Scene {
  let mode: Mode = "rest";
  let time = 0;
  let modeTime = 0;
  let x = REST_X;
  let y = REST_Y;
  let vy = 0;
  let size = 1;
  let roll = 0;
  let tumble = 0;
  let fade = 1;
  let impactX = 0;
  let impactY = 0;
  /** Seconds since the ball hit the net, and since the stand started cheering. */
  let bulge = Infinity;
  let cheer = Infinity;
  const trail = new Float64Array(TRAIL * 3);
  let trailHead = 0;
  let trailClock = 0;
  const normal = new Float64Array(3);
  const point = new Float64Array(2);
  /** Where the goal sits; set from the cell size on each draw (the stand takes the top rows). */
  let bar = 0.24;
  let goalLine = 0.44;

  function reset() {
    mode = "rest";
    time = 0;
    modeTime = 0;
    x = REST_X;
    y = REST_Y;
    vy = 0;
    size = 1;
    roll = 0;
    tumble = 0;
    fade = 1;
    bulge = Infinity;
    cheer = Infinity;
    trail.fill(0);
  }

  function integrate(h: number, energy: number) {
    time += h;
    modeTime += h;
    bulge += h;
    cheer += h;
    if (mode === "rest") {
      // Rolling gently to and fro by the spot.
      const before = x;
      const target = REST_X - 0.045 * Math.sin(time * 0.8);
      x = lerp(x, target, Math.min(1, h * 5));
      y = REST_Y;
      roll += (x - before) / BALL;
      tumble += h * 0.35;
      fade = Math.min(1, fade + h * 2.5);
      if (energy > 0.55 && fade >= 1 && modeTime > 0.5) {
        mode = "strike";
        modeTime = 0;
      }
    } else if (mode === "strike") {
      // A quadratic curve: out to the left, then hooking into the top corner.
      const u = Math.min(1, modeTime / FLIGHT);
      const s = 1 - Math.pow(1 - u, 1.4);
      const p0x = REST_X;
      const p0y = REST_Y;
      const p1x = -0.9;
      const p1y = goalLine + 0.08;
      const p2x = POST_L + 0.1;
      const p2y = bar + 0.05;
      const a = (1 - s) * (1 - s);
      const b = 2 * (1 - s) * s;
      const c = s * s;
      x = a * p0x + b * p1x + c * p2x;
      y = a * p0y + b * p1y + c * p2y;
      size = lerp(1, 0.42, s);
      roll += h * 20;
      tumble += h * 8;
      if (u >= 1) {
        mode = "fall";
        modeTime = 0;
        vy = 0.15;
        impactX = x;
        impactY = y;
        bulge = 0;
        cheer = 0;
      }
    } else if (mode === "fall") {
      vy += G * 0.5 * h;
      y += vy * h;
      const floor = goalLine - 0.03 - BALL * size;
      if (y > floor) {
        y = floor;
        vy = -Math.abs(vy) * 0.4;
      }
      roll += h * 3;
      if (modeTime > 1.2) fade = Math.max(0, fade - h * 3);
      if (fade <= 0) {
        mode = "gone";
        modeTime = 0;
      }
    } else if (modeTime > 0.3) {
      // A new ball rolls back in from the right.
      mode = "rest";
      modeTime = 0;
      x = REST_X + 0.25;
      y = REST_Y;
      size = 1;
      fade = 0;
    }

    trailClock += h;
    if (trailClock >= 0.03) {
      trailClock = 0;
      const i = trailHead * 3;
      trail[i] = x;
      trail[i + 1] = y;
      trail[i + 2] = mode === "strike" ? size : 0;
      trailHead = (trailHead + 1) % TRAIL;
    }
  }

  /** A point of the back of the net, pushed out around the ball when it lands. */
  function net(px: number, py: number) {
    const strength =
      bulge < 2.5 ? Math.exp(-bulge / 0.5) * Math.cos(bulge * 8) : 0;
    const dx = px - impactX;
    const dy = py - impactY;
    const f = strength * Math.exp(-(dx * dx + dy * dy) / 0.01);
    point[0] = px + dx * f * 1.1;
    point[1] = py + dy * f * 1.1 - f * 0.02;
    return point;
  }

  /**
   * The goal: its net a lattice in the old ASCII way (| strands, - rows, +
   * where they cross), pushed out around the ball when it lands, inside a
   * frame of posts and bar.
   */
  function drawGoal(field: Field, right: number) {
    const { cw, ch } = field;
    const stepX = cw * 3;
    const stepY = ch * 2;
    const c0 = Math.ceil((right + POST_L) / cw);
    const c1 = Math.floor((right + POST_R) / cw) - 1;
    const r0 = Math.ceil(bar / ch);
    const r1 = Math.floor(goalLine / ch) - 1;
    for (let r = r0; r <= r1; r++) {
      const y = (r + 0.5) * ch;
      for (let c = c0; c <= c1; c++) {
        const x = (c + 0.5) * cw - right;
        // Where the net at this cell came from (the bulge undone).
        const moved = net(x, y);
        const qx = 2 * x - (moved[0] ?? x);
        const qy = 2 * y - (moved[1] ?? y);
        const u = (qx - POST_L) / stepX;
        const v = (qy - bar) / stepY;
        const strand = Math.abs(u - Math.round(u)) * stepX < cw * 0.5;
        const row = Math.abs(v - Math.round(v)) * stepY < ch * 0.5;
        if (strand && row) plot(field, x + right, y, 0.5);
        else if (strand) mark(field, x + right, y, "|", 0.4);
        else if (row) plot(field, x + right, y, 0.32);
      }
    }

    // The frame: posts and bar, the strongest lines.
    polyline(
      field,
      [
        right + POST_L,
        goalLine,
        right + POST_L,
        bar,
        right + POST_R,
        bar,
        right + POST_R,
        goalLine,
      ],
      0.024,
      0.92,
    );
  }

  /** Two rows of heads; standing with arms up (\o/) when the wave passes or after a goal. */
  function drawStand(field: Field, right: number, energy: number) {
    const left = right - 0.66;
    const spacing = field.cw * 4;
    const span = 0.66 + 0.4;
    const waveX = left - 0.2 + ((time * 0.25) % 1) * span;
    for (let row = 0; row < 2; row++) {
      const baseY = (row * 2 + 1.5) * field.ch;
      const offset = row ? spacing / 2 : 0;
      for (let i = 0; ; i++) {
        const px = left + offset + (i + 0.5) * spacing;
        if (px > right) break;
        const seed = hash(i, row, 7);
        if (seed < 0.12) continue;
        const wave =
          Math.exp(-(((px - waveX) / 0.07) ** 2)) * (1 - energy * 0.5);
        const party =
          cheer < 2.4 && Math.sin(cheer * 9 + seed * 12) > -0.2
            ? Math.min(1, (2.4 - cheer) * 1.5)
            : 0;
        const up = Math.max(wave, party) > 0.5;
        const ink = 0.6 + 0.3 * seed;
        const headY = baseY - (up ? field.ch : 0);
        mark(field, px, headY, "o", ink);
        if (up) {
          mark(field, px - field.cw, headY, "\\", ink * 0.85);
          mark(field, px + field.cw, headY, "/", ink * 0.85);
        }
      }
    }
  }

  return {
    step(dt, energy) {
      let remaining = dt * lerp(0.6, 1, energy);
      while (remaining > 1e-6) {
        const h = Math.min(STEP, remaining);
        integrate(h, energy);
        remaining -= h;
      }
    },

    draw(field, energy) {
      const right = field.width;
      bar = Math.max(0.2, field.ch * 4.8) + 0.05;
      goalLine = bar + 0.2;

      // The pitch: the goal line, the six-yard box and sparse grass.
      line(field, right - 1.15, goalLine, right, goalLine, 0.012, 0.36);
      polyline(
        field,
        [
          right - 0.7,
          goalLine,
          right - 0.76,
          goalLine + 0.1,
          right + 0.02,
          goalLine + 0.1,
        ],
        0.01,
        0.26,
      );
      paint(field, right - 1.7, goalLine + 0.12, right, 1, (px, py) => {
        const n = hash(Math.round(px / field.cw), Math.round(py / field.ch), 3);
        return n > 0.95 ? 0.1 : 0;
      });

      drawGoal(field, right);
      drawStand(field, right, energy);

      if (mode !== "gone") {
        // The ball's shadow on the grass (while it is out on the pitch).
        if (mode === "rest" || mode === "strike") {
          const lift = clamp((REST_Y - y) / 0.5);
          paint(
            field,
            right + x - 0.16,
            GROUND - 0.035,
            right + x + 0.16,
            GROUND + 0.035,
            (px, py) => {
              const d = Math.hypot(
                (px - right - x) / (0.13 * size),
                (py - GROUND) / 0.025,
              );
              return (0.42 - lift * 0.42) * clamp(1 - d) * fade;
            },
          );
        }

        // The strike's trail.
        for (let k = 1; k < TRAIL; k++) {
          const i = ((trailHead - k + TRAIL) % TRAIL) * 3;
          const s = trail[i + 2] ?? 0;
          if (s <= 0) continue;
          const f = 1 - k / TRAIL;
          disc(
            field,
            right + (trail[i] ?? 0),
            trail[i + 1] ?? 0,
            BALL * s * (0.3 + 0.45 * f),
            0.4 * f,
          );
        }

        // The ball: lit from the upper left, its pentagons the densest ink.
        sphere(field, right + x, y, BALL * size, (nx, ny, nz) => {
          const light = lambert(nx, ny, nz, 0.25);
          const m = rotate(normal, nx, ny, nz, tumble, 0.4, roll);
          let near = 0;
          for (let i = 0; i < PENTAGONS.length; i += 3) {
            const d = Math.abs(
              (m[0] ?? 0) * (PENTAGONS[i] ?? 0) +
                (m[1] ?? 0) * (PENTAGONS[i + 1] ?? 0) +
                (m[2] ?? 0) * (PENTAGONS[i + 2] ?? 0),
            );
            if (d > near) near = d;
          }
          const value = near > 0.91 ? 0.55 + light * 0.45 : light * 0.55;
          return lerp(0.05, value, fade);
        });
      }

      scale(field, (px) => smoothstep(right - 1.6, right - 0.85, px));
    },

    still() {
      reset();
      mode = "strike";
      for (let t = 0; t < FLIGHT * 0.55; t += STEP) integrate(STEP, 0);
    },
  };
}
