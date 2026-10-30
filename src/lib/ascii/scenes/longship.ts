import {
  clamp,
  cover,
  hash,
  lerp,
  mark,
  noise2,
  paint,
  polyline,
  scale,
  smoothstep,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Minnesota Vikings: a longship at the right of the card, sailing left, its
 * striped square sail on the mast, round shields along the side (o o o), oars
 * in the water and a dragon's head on the prow, riding swells drawn as a line
 * of tildes that runs under the whole card. Calm, it rocks slowly and the sail
 * breathes. Lively, the sea rises, the oars pull, the sail fills and the horn
 * sounds: arcs of sound, ( ( (, open out ahead of the prow.
 *
 * Positions are measured from the card's right edge (x <= 0), in card heights.
 * The ship's own drawing is in "ship units": u along the keel (positive
 * towards the prow), v down; it is mirrored to face left, pitched along the
 * swell and lifted on it.
 */

const STEP = 1 / 60;
/** The ship's centre from the right edge, the sea level, and how deep the hull sits. */
const SHIP_X = -0.36;
const SEA = 0.9;
const DRAFT = 0.03;
const HALF = 0.26;
/** The ship faces left. */
const FACE = -1;
const RING_LIFE = 1.2;

export function longship(): Scene {
  let time = 0;
  let swell = 0;
  let row = 0;
  let billow = 0;
  /** Seconds since each arc of the horn left the prow (Infinity: none in flight). */
  const rings = [Infinity, Infinity, Infinity];
  let sinceRing = 0;

  function reset() {
    time = 0;
    swell = 0;
    row = 0;
    billow = 0;
    rings.fill(Infinity);
    sinceRing = 0;
  }

  function integrate(h: number, energy: number) {
    time += h;
    swell += h * lerp(1, 1.8, energy);
    row += h * lerp(0.5, 1.6, energy);
    billow += (energy - billow) * Math.min(1, h * 2);
    for (let i = 0; i < rings.length; i++) rings[i] = (rings[i] ?? 0) + h;
    sinceRing += h;
    if (energy > 0.5 && sinceRing >= 0.45) {
      const oldest = rings.indexOf(Math.max(...rings));
      rings[oldest] = 0;
      sinceRing = 0;
    }
  }

  /** The sea's surface at x (units from the right edge), higher when lively. */
  function surface(x: number, energy: number) {
    const a = lerp(1, 1.7, energy);
    return (
      SEA +
      a *
        (0.014 * Math.sin(x * 9 - swell * 1.3) +
          0.008 * Math.sin(x * 19 + swell * 1.9) +
          0.01 * Math.sin(x * 4.3 - swell * 0.7))
    );
  }

  return {
    step(dt, energy) {
      let remaining = dt;
      while (remaining > 1e-6) {
        const h = Math.min(STEP, remaining);
        integrate(h, energy);
        remaining -= h;
      }
    },

    draw(field: Field, energy: number) {
      const right = field.width;
      const cx = right + SHIP_X;
      // The ship rides the swell: lifted on it and pitched along its slope.
      const slope =
        (surface(SHIP_X + 0.15, energy) - surface(SHIP_X - 0.15, energy)) / 0.3;
      const angle = Math.atan(slope) * 0.8;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cy = surface(SHIP_X, energy) - DRAFT;
      const toX = (u: number, v: number) => cx + FACE * u * cos - v * sin;
      const toY = (u: number, v: number) => cy + FACE * u * sin + v * cos;
      const path = (points: number[]) => {
        const out: number[] = [];
        for (let i = 0; i < points.length; i += 2) {
          const u = points[i] ?? 0;
          const v = points[i + 1] ?? 0;
          out.push(toX(u, v), toY(u, v));
        }
        return out;
      };
      /** Screen to ship units. */
      const local = (x: number, y: number) => {
        const dx = x - cx;
        const dy = y - cy;
        return [FACE * (dx * cos + dy * sin), -dx * sin + dy * cos] as const;
      };

      // The sail: five vertical stripes, bellying out when lively.
      const belly = 0.012 + 0.03 * billow + 0.008 * Math.sin(time * 1.3);
      const sailTop = -0.52;
      const sailBottom = -0.19;
      paint(field, cx - 0.25, cy - 0.6, cx + 0.25, cy - 0.1, (x, y) => {
        const [u, v] = local(x, y);
        const t = (v - sailTop) / (sailBottom - sailTop);
        if (t < 0) return 0;
        const half = 0.155 + belly * Math.sin(Math.PI * clamp(t));
        if (Math.abs(u) > half) return 0;
        const hem =
          sailBottom + belly * 1.4 * Math.cos((u / half) * Math.PI * 0.5);
        if (v > hem) return 0;
        const band = Math.floor(((u / half) * 0.5 + 0.5) * 5);
        const shade = 1 - (u / half) ** 2 * 0.3;
        return (band % 2 === 0 ? 0.7 : 0.3) * shade;
      });
      // Mast, yard, and the stays to the stems.
      polyline(field, path([0, -0.05, 0, -0.6]), 0.02, 0.62);
      polyline(field, path([-0.19, -0.53, 0.19, -0.53]), 0.018, 0.6);
      polyline(field, path([0, -0.58, HALF + 0.02, -0.14]), 0.008, 0.28);
      polyline(field, path([0, -0.58, -HALF - 0.02, -0.14]), 0.008, 0.28);

      // Oars, pulling in time, their blades in the water behind.
      const sweep = Math.sin(row * Math.PI * 2) * 0.045;
      for (const u of [-0.15, -0.05, 0.05, 0.15]) {
        polyline(field, path([u, -0.04, u - 0.08 + sweep, 0.1]), 0.01, 0.42);
      }

      // The hull: two strakes between the gunwale and the keel.
      paint(
        field,
        cx - HALF - 0.04,
        cy - 0.16,
        cx + HALF + 0.04,
        cy + 0.1,
        (x, y) => {
          const [u, v] = local(x, y);
          if (Math.abs(u) > HALF) return 0;
          const k = u / HALF;
          const top = -0.06 - 0.07 * k ** 4;
          const keel = 0.06 * (1 - k * k);
          if (v < top || v > keel) return 0;
          return (v - top) / (keel - top) < 0.5 ? 0.85 : 0.55;
        },
      );
      // The prow rising into a dragon's head (with an eye); the stern curling back.
      polyline(
        field,
        path([
          HALF - 0.01,
          -0.12,
          0.29,
          -0.17,
          0.31,
          -0.23,
          0.3,
          -0.28,
          0.275,
          -0.3,
          0.25,
          -0.285,
        ]),
        0.024,
        0.85,
      );
      polyline(field, path([0.3, -0.28, 0.34, -0.27]), 0.016, 0.7);
      polyline(
        field,
        path([
          -HALF + 0.01,
          -0.12,
          -0.29,
          -0.17,
          -0.3,
          -0.22,
          -0.285,
          -0.25,
          -0.262,
          -0.24,
          -0.26,
          -0.215,
        ]),
        0.022,
        0.8,
      );
      // Round shields along the side.
      let shield = 0;
      for (let u = -0.19; u <= 0.191; u += field.cw * 2) {
        mark(
          field,
          toX(u, -0.075),
          toY(u, -0.075),
          "o",
          shield % 2 ? 0.6 : 0.95,
        );
        shield++;
      }

      // The horn: arcs of sound opening out ahead of the prow.
      const headX = toX(0.33, -0.28);
      const headY = toY(0.33, -0.28);
      for (const age of rings) {
        if (age > RING_LIFE) continue;
        const r = 0.06 + age * 0.34;
        const ink = 0.75 * (1 - age / RING_LIFE) ** 1.2;
        const reach = Math.min(0.75, (field.ch * 3.2) / r);
        const steps = Math.max(2, Math.ceil((r * reach * 2) / field.ch));
        for (let k = 0; k <= steps; k++) {
          const a = Math.PI + lerp(-reach, reach, k / steps);
          mark(
            field,
            headX + r * Math.cos(a),
            headY + r * Math.sin(a),
            "(",
            ink,
          );
        }
      }

      // The sea: water in drifting streaks under the surface (hiding the
      // hull below the waterline), and the crest as a line of tildes.
      cover(
        field,
        right - 1.9,
        SEA - 0.08,
        right,
        1,
        (x, y) => (y > surface(x - right, energy) + field.ch * 0.5 ? 0.85 : 0),
        (x, y) => {
          const depth = y - surface(x - right, energy);
          const streak = noise2((x - swell * 0.05) * 8, y * 24, 5);
          return streak > 0.58 ? 0.24 - depth * 0.8 : 0.03;
        },
      );
      for (let c = 0; c < field.cols; c++) {
        const x = (c + 0.5) * field.cw;
        if (x < right - 1.9) continue;
        const foam = hash(c, Math.floor(swell * 2.5), 2);
        mark(
          field,
          x,
          surface(x - right, energy),
          "~",
          foam > 0.85 ? 0.95 : 0.7,
        );
      }

      scale(field, (px) => smoothstep(right - 1.7, right - 0.85, px));
    },

    still() {
      reset();
      for (let t = 0; t < 1.2; t += STEP) integrate(STEP, 0);
      rings[0] = 0.3;
      rings[1] = 0.75;
    },
  };
}
