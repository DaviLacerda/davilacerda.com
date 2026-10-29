import {
  clamp,
  disc,
  ellipse,
  lambert,
  lerp,
  line,
  mark,
  paint,
  polyline,
  rotate,
  scale,
  smoothstep,
  sphere,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Brooklyn Nets: a hoop hanging at the right of the card (backboard, rim,
 * a net of crossed strands) and a ball dribbling slowly beside it, lit from
 * the upper left, its seams turning as it spins. Lively, it rises from the
 * top of a dribble into a jump shot, swishes (the net jumps and sways), comes
 * down with a bounce and is dribbled back; a fading trail follows it.
 *
 * Positions are measured from the card's right edge (x <= 0), in card
 * heights, so the hoop keeps its place and size at every width.
 */

/** Gravity, card heights per second squared. */
const G = 5.4;
const BALL = 0.085;
const FLOOR = 0.95;
const REST = FLOOR - BALL;
/** The ball's centre at the top of a dribble. */
const DRIBBLE_TOP = 0.56;
const DRIBBLE_X = -0.52;
const DRIBBLE_V = Math.sqrt(2 * G * (REST - DRIBBLE_TOP));
const RIM_X = -0.25;
const RIM_Y = 0.4;
const RIM_RX = 0.12;
const RIM_RY = 0.028;
const NET_DEPTH = 0.22;
const TRAIL = 9;
const STEP = 1 / 120;

type Mode = "dribble" | "shot" | "loose";

export function basketball(): Scene {
  let x = DRIBBLE_X;
  let y = DRIBBLE_TOP;
  let vx = 0;
  let vy = 0;
  let spin = 0;
  let mode: Mode = "dribble";
  let cooldown = 0;
  let time = 0;
  /** Time since the last swish, up to 10s (the net's sway decays from it). */
  let swish = 10;
  const trail = new Float64Array(TRAIL * 3);
  let trailHead = 0;
  let trailClock = 0;
  const normal = new Float64Array(3);

  function reset() {
    x = DRIBBLE_X;
    y = DRIBBLE_TOP;
    vx = 0;
    vy = 0;
    spin = 0;
    mode = "dribble";
    cooldown = 0;
    time = 0;
    swish = 10;
    trail.fill(0);
    trailHead = 0;
    trailClock = 0;
  }

  function shoot() {
    const flight = 0.72;
    vx = (RIM_X - x) / flight;
    vy = (RIM_Y - 0.02 - y - 0.5 * G * flight * flight) / flight;
    mode = "shot";
    cooldown = 1.6;
  }

  function integrate(h: number, energy: number) {
    const before = vy;
    const wasAbove = y < RIM_Y;
    vy += G * h;
    x += vx * h;
    y += vy * h;
    time += h;
    swish = Math.min(10, swish + h);
    cooldown -= h;

    if (mode === "dribble") {
      x += (DRIBBLE_X - x) * Math.min(1, h * 3);
      vx = 0;
      // At the top of a dribble, a lively card takes the shot.
      if (before < 0 && vy >= 0 && energy > 0.55 && cooldown <= 0) shoot();
    } else if (
      mode === "shot" &&
      wasAbove &&
      y >= RIM_Y &&
      Math.abs(x - RIM_X) < RIM_RX
    ) {
      swish = 0;
      vx *= 0.15;
      mode = "loose";
    }

    if (y > REST) {
      y = REST;
      if (mode === "dribble") {
        vy = -DRIBBLE_V;
      } else {
        vy = -Math.abs(vy) * 0.72;
        vx = (DRIBBLE_X - x) / ((2 * Math.abs(vy)) / G);
        if (Math.abs(vy) < DRIBBLE_V * 1.05) mode = "dribble";
      }
    }

    spin += (vx / BALL) * h + (mode === "shot" ? -5 * h : 0);

    trailClock += h;
    if (trailClock >= 0.035) {
      trailClock = 0;
      const i = trailHead * 3;
      trail[i] = x;
      trail[i + 1] = y;
      trail[i + 2] = clamp((Math.hypot(vx, vy) - 1.2) / 1.2);
      trailHead = (trailHead + 1) % TRAIL;
    }
  }

  /**
   * The net, in the old ASCII way: rows of crossed strands (\\/\\/), narrowing
   * down from the rim. It sways a little at rest; a swish throws it back and
   * forth and stretches it down.
   */
  function drawNet(field: Field, right: number) {
    const sway = Math.exp(-swish / 0.7);
    const stretch = 0.06 * sway * Math.max(0, Math.cos(swish * 9));
    const top = RIM_Y + field.ch * 0.5;
    const bottom = RIM_Y + NET_DEPTH + stretch;
    for (let r = Math.ceil(top / field.ch - 0.5); ; r++) {
      const y = (r + 0.5) * field.ch;
      if (y > bottom) break;
      const s = (y - RIM_Y) / (bottom - RIM_Y);
      const half = lerp(RIM_RX * 0.92, 0.05, s);
      const centre =
        right +
        RIM_X +
        s *
          (sway * 0.035 * Math.sin(swish * 13) + 0.006 * Math.sin(time * 1.5));
      const c0 = Math.ceil((centre - half) / field.cw - 0.5);
      const c1 = Math.floor((centre + half) / field.cw - 0.5);
      for (let c = c0; c <= c1; c++) {
        mark(
          field,
          (c + 0.5) * field.cw,
          y,
          (c + r) % 2 === 0 ? "\\" : "/",
          lerp(0.62, 0.42, s),
        );
      }
    }
  }

  return {
    step(dt, energy) {
      let remaining = dt * lerp(0.55, 1, energy);
      while (remaining > 1e-6) {
        const h = Math.min(STEP, remaining);
        integrate(h, energy);
        remaining -= h;
      }
    },

    draw(field) {
      const right = field.width;

      // The floor, and the ball's shadow on it (darker as the ball comes down).
      line(field, right - 1.7, FLOOR, right, FLOOR, 0.014, 0.32);
      const lift = clamp((REST - y) / 0.6);
      paint(
        field,
        right + x - 0.16,
        FLOOR - 0.04,
        right + x + 0.16,
        FLOOR + 0.04,
        (px, py) => {
          const d = Math.hypot(
            (px - right - x) / (0.13 - lift * 0.05),
            (py - FLOOR) / 0.03,
          );
          return (0.5 - lift * 0.3) * clamp(1 - d);
        },
      );

      // The hoop: hanger, backboard with its square, back of the rim, net.
      line(field, right + RIM_X, 0, right + RIM_X, 0.08, 0.026, 0.3);
      const [bl, bt, br, bb] = [-0.47, 0.08, -0.03, 0.375];
      polyline(
        field,
        [
          right + bl,
          bt,
          right + br,
          bt,
          right + br,
          bb,
          right + bl,
          bb,
          right + bl,
          bt,
        ],
        0.022,
        0.52,
      );
      polyline(
        field,
        [
          right - 0.33,
          0.37,
          right - 0.33,
          0.24,
          right - 0.17,
          0.24,
          right - 0.17,
          0.37,
        ],
        0.018,
        0.44,
      );
      ellipse(
        field,
        right + RIM_X,
        RIM_Y,
        RIM_RX,
        RIM_RY,
        0.03,
        0.8,
        Math.PI,
        Math.PI * 2,
      );
      drawNet(field, right);

      // The trail: where the ball was, fading.
      for (let k = 1; k < TRAIL; k++) {
        const i = ((trailHead - k + TRAIL) % TRAIL) * 3;
        const speed = trail[i + 2] ?? 0;
        if (speed <= 0) continue;
        const fade = 1 - k / TRAIL;
        disc(
          field,
          right + (trail[i] ?? 0),
          trail[i + 1] ?? 0,
          BALL * (0.25 + 0.4 * fade),
          0.3 * speed * fade,
        );
      }

      // The ball, lit from the upper left, its seams turning with it.
      sphere(field, right + x, y, BALL, (nx, ny, nz) => {
        const light = lambert(nx, ny, nz, 0.3);
        const m = rotate(normal, nx, ny, nz, spin * 0.35, 0.55, spin);
        const seam = Math.min(
          Math.abs(m[0] ?? 0),
          Math.abs(m[1] ?? 0),
          Math.abs(Math.abs(m[2] ?? 0) - 0.72),
        );
        return light * (seam < 0.1 ? 0.3 : 1);
      });

      // The front of the rim, over the ball.
      ellipse(
        field,
        right + RIM_X,
        RIM_Y,
        RIM_RX,
        RIM_RY,
        0.03,
        0.95,
        0,
        Math.PI,
      );

      // Far from the hoop the picture fades out, clear of the card's text.
      scale(field, (px) => smoothstep(right - 1.55, right - 0.85, px));
    },

    still() {
      reset();
      shoot();
      for (let t = 0; t < 0.4; t += STEP) integrate(STEP, 0);
    },
  };
}
