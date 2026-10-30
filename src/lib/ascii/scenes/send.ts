import {
  freeRect,
  lerp,
  mark,
  smoothstep,
  type Box,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Contact: a paper plane on its way. A line-drawn plane (the outline, its
 * notch and the fold to the nose, like the send icon) glides across the
 * clear space of the email panel from left to right, rising and dipping on
 * a gentle swell, a dotted trail behind it along the path it came; it fades
 * out at the far side and the next one sets off. Lively (pointing at the
 * panel or its buttons), it flies faster on a wider swoop with a longer
 * trail.
 *
 * Laid out in the widest clear lane of the panel (`freeRect`): between the
 * email and the line under it on a wide panel, beside the buttons on a phone.
 * The larger plane where the lane is tall enough, a small one in the gap
 * between the lines of a phone's panel.
 */

/** The plane, drawn on whole cells: the notch's row and column, the nose's column. */
type Sprite = { rows: string[]; notch: [number, number]; nose: number };

const LARGE: Sprite = {
  rows: [
    "`-._",
    "\\   `-._",
    " \\      `-._",
    "  >--------->",
    " /      _.-'",
    "/   _.-'",
    "_.-'",
  ],
  notch: [3, 2],
  nose: 12,
};

const SMALL: Sprite = {
  rows: ["`-._", "\\   `-._", " >------->", "/   _.-'", "_.-'"],
  notch: [2, 1],
  nose: 9,
};

const TINY: Sprite = {
  rows: ["`-._", " >--->", "_.-'"],
  notch: [1, 1],
  nose: 5,
};

/** Seconds to cross the lane when calm. */
const CROSSING = 8;
/** Dots in the trail (calm; lively, twice as many), one every `GAP` columns. */
const TRAIL = 9;
const GAP = 3;

type Lane = { c0: number; c1: number; r0: number; r1: number; sprite: Sprite };

export function send(): Scene {
  /** Progress across the lane, 0 to 1 (a little before and past, to arrive and leave). */
  let progress = 0.35;
  let swell = 0;
  let space: Box | null = null;
  let revision = -1;
  let spaceField: Field | null = null;

  function layout(field: Field): Box | null {
    if (field === spaceField && field.revision === revision) return space;
    spaceField = field;
    revision = field.revision;
    const { cw, ch } = field;
    const score = (w: number, h: number) =>
      w >= cw * 30 && h >= ch * 3 ? w * Math.min(h, ch * 11) : 0;
    // On a phone the only lane is the gap between two lines: let the
    // plane's edge come a little closer to the words there.
    space = field.free
      ? (freeRect(field, score) ?? freeRect(field, score, 0.6))
      : { x0: field.width - 1.4, y0: 0.2, x1: field.width - 0.08, y1: 0.8 };
    return space;
  }

  /** The lane in whole cells, and the plane that fits it. */
  function grid(field: Field, box: Box): Lane {
    const c0 = Math.ceil(box.x0 / field.cw);
    const c1 = Math.floor(box.x1 / field.cw) - 1;
    const r0 = Math.ceil(box.y0 / field.ch);
    const r1 = Math.floor(box.y1 / field.ch) - 1;
    const rows = r1 - r0 + 1;
    const sprite =
      rows >= LARGE.rows.length + 3
        ? LARGE
        : rows >= SMALL.rows.length
          ? SMALL
          : TINY;
    return { c0, c1, r0, r1, sprite };
  }

  /** Where the notch is at progress `p`: its column and (fractional) row. */
  function flight(lane: Lane, p: number, energy: number): [number, number] {
    const { c0, c1, r0, r1, sprite } = lane;
    const room = Math.max(0, (r1 - r0 + 1 - sprite.rows.length) / 2);
    const amp = Math.min(room, lerp(1, 2.2, energy));
    const column = lerp(c0, c1 - (sprite.nose - sprite.notch[1]), p);
    const row = (r0 + r1) / 2 + amp * Math.sin(p * Math.PI * 2 * 1.1 + swell);
    return [column, row];
  }

  return {
    step(dt, energy) {
      swell += dt * 0.35;
      progress += (dt / CROSSING) * lerp(1, 2.2, energy);
      if (progress > 1.12) progress = -0.08;
    },

    draw(field, energy) {
      const box = layout(field);
      if (!box) return;
      const lane = grid(field, box);
      const { c0, c1, sprite } = lane;
      const span = c1 - c0 - (sprite.nose - sprite.notch[1]);
      if (span < 12) return;
      const at = (c: number, r: number, glyph: string, ink: number) => {
        if (c < c0 || c > c1) return;
        mark(field, (c + 0.5) * field.cw, (r + 0.5) * field.ch, glyph, ink);
      };

      const [column, row] = flight(lane, progress, energy);
      // In from the left, out at the right: faded over the lane's ends.
      const fade =
        smoothstep(-0.08, 0.08, progress) *
        (1 - smoothstep(0.9, 1.1, progress));

      // The trail: dots back along the path it came, fading with distance.
      const dots = Math.round(lerp(TRAIL, TRAIL * 2, energy));
      for (let k = 1; k <= dots; k++) {
        const p = progress - (k * GAP + 1) / span;
        if (p < 0) break;
        const [c, r] = flight(lane, p, energy);
        at(
          Math.round(c),
          Math.round(r),
          ".",
          0.75 * (1 - k / (dots + 1)) * fade,
        );
      }

      // The plane: the outline strong, the fold lighter, the nose strongest.
      const top = Math.round(row) - sprite.notch[0];
      const left = Math.round(column) - sprite.notch[1];
      sprite.rows.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
          const glyph = line[c] ?? " ";
          if (glyph === " ") continue;
          const fold = r === sprite.notch[0] && glyph === "-";
          const nose = r === sprite.notch[0] && c === sprite.nose;
          at(left + c, top + r, glyph, (fold ? 0.5 : nose ? 1 : 0.85) * fade);
        }
      });
    },

    still() {
      progress = 0.58;
    },
  };
}
