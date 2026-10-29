import {
  clamp,
  freeRect,
  hash,
  mark,
  smoothstep,
  type Box,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Billy: an invoice read and checked. A page stands in the panel's clear
 * space (between the figure and the words on a wide panel): a header, line
 * items (= words and a --.-- amount each), a rule and the total. A scanner
 * beam runs down it, and every line it passes is ticked (v) beside the page,
 * now and then one flagged (x) for a person to look at; at the foot the total
 * is ticked, the page slides up and out, and the next one rises in. Lively,
 * the scanner runs two and a half times as fast and the pages fly by, the
 * 96% at work.
 *
 * The page is sized to the tallest clear column of the panel (`freeRect`),
 * at most 26 cells wide.
 */

/** One page: scanning, holding, leaving and arriving, in seconds of scene time. */
const SCAN = 3.2;
const HOLD = 1.1;
const LEAVE = 0.55;
const ARRIVE = 0.65;
const CYCLE = SCAN + HOLD + LEAVE + ARRIVE;

export function invoice(): Scene {
  let time = 0;
  let still = false;
  let space: Box | null = null;
  let revision = -1;
  let spaceField: Field | null = null;

  /**
   * The page's column: the tallest clear box at least 16 cells wide and 11
   * tall; none when the panel has no such room (the page is not drawn), and
   * the right of the card when the backdrop keeps clear of nothing.
   */
  function layout(field: Field): Box | null {
    if (field === spaceField && field.revision === revision) return space;
    spaceField = field;
    revision = field.revision;
    const { cw, ch } = field;
    space = field.free
      ? freeRect(field, (w, h) =>
          w >= cw * 16 && h >= ch * 11 ? Math.min(w, cw * 28) * h * h : 0,
        )
      : { x0: field.width - 0.75, y0: 0.1, x1: field.width - 0.08, y1: 0.9 };
    return space;
  }

  return {
    step(dt, energy) {
      time += dt * (1 + 1.5 * energy);
    },

    draw(field, energy) {
      const { cw, ch } = field;
      const box = layout(field);
      if (!box) return;
      // The page in whole cells, centred in its column; the ticks need two
      // columns on its right.
      const avail = Math.floor((box.x1 - box.x0) / cw) - 2;
      const width = Math.min(24, avail - 2);
      const height = Math.min(18, Math.floor((box.y1 - box.y0) / ch));
      if (width < 12 || height < 10) return;
      const left = Math.round((box.x0 + box.x1) / 2 / cw - (width + 2) / 2);
      const top = Math.round((box.y0 + box.y1) / 2 / ch - height / 2);
      if (still) {
        still = false;
        time = CYCLE * 2 + SCAN * 0.62;
      }

      const page = Math.floor(time / CYCLE);
      const t = time - page * CYCLE;
      // Sliding: up and out after the hold, up and in from below after that.
      let shift = 0;
      let alpha = 1;
      if (t > SCAN + HOLD && t <= SCAN + HOLD + LEAVE) {
        const u = smoothstep(0, 1, (t - SCAN - HOLD) / LEAVE);
        shift = -u * height * 0.6;
        alpha = 1 - u;
      } else if (t > SCAN + HOLD + LEAVE) {
        const u = smoothstep(0, 1, (t - SCAN - HOLD - LEAVE) / ARRIVE);
        shift = (1 - u) * height * 0.6;
        alpha = u;
      }
      // The page on show while arriving is the next one.
      const id = t > SCAN + HOLD + LEAVE ? page + 1 : page;
      const scanning = t <= SCAN + HOLD + LEAVE;
      const beam = scanning ? clamp(t / SCAN) * (height - 1) : -1;
      const off = Math.round(shift);
      const bottom = top + height - 1;
      const at = (c: number, r: number, glyph: string, ink: number) => {
        const row = r + off;
        if (row < top - 1 || row > bottom + 1) return;
        // Fade at the edges of the column it slides through.
        const edge = row < top ? 0.35 : row > bottom ? 0.35 : 1;
        mark(
          field,
          (c + 0.5) * cw,
          (row + 0.5) * ch,
          glyph,
          ink * alpha * edge,
        );
      };

      const right = left + width - 1;
      // The sheet: corners, edges.
      at(left, top, ".", 0.6);
      at(right, top, ".", 0.6);
      at(left, bottom, "'", 0.6);
      at(right, bottom, "'", 0.6);
      for (let c = left + 1; c < right; c++) {
        at(c, top, "-", 0.5);
        at(c, bottom, "-", 0.5);
      }
      for (let r = top + 1; r < bottom; r++) {
        at(left, r, "|", 0.5);
        at(right, r, "|", 0.5);
      }

      // The header: a logo block and the bill's title.
      const inner = width - 4;
      at(left + 2, top + 2, "#", 0.75);
      at(left + 3, top + 2, "#", 0.75);
      for (let c = 0; c < Math.min(9, inner - 4); c++) {
        at(left + 5 + c, top + 2, "=", 0.62);
      }
      for (let c = 0; c < Math.min(6, inner - 6); c++) {
        at(right - 2 - c, top + 3, "-", 0.4);
      }

      // The lines: words on the left, an amount on the right, ticked once scanned.
      const first = top + 5;
      const totalRow = bottom - 2;
      const lines = Math.max(1, totalRow - 2 - first + 1);
      const flagged =
        hash(id, 77) < 0.4 ? Math.floor(hash(id, 78) * lines) : -1;
      const amount = Math.min(5, Math.floor(inner / 3));
      for (let k = 0; k < lines; k++) {
        const r = first + k;
        const words = inner - amount - 2;
        let c = 0;
        let w = 0;
        const end = Math.floor(words * (0.55 + 0.45 * hash(id, k, 5)));
        while (c < end) {
          const length = 2 + Math.floor(hash(id, k * 13 + w, 6) * 4);
          for (let j = 0; j < length && c < end; j++, c++) {
            at(left + 2 + c, r, "=", 0.5);
          }
          c++;
          w++;
        }
        for (let j = 0; j < amount; j++) {
          at(right - 1 - amount + j, r, j === amount - 3 ? "." : "-", 0.55);
        }
        if (beam >= r - top + 0.5) {
          const since = (beam - (r - top)) / (height - 1);
          const pop = smoothstep(0, 0.04, since);
          at(right + 2, r, k === flagged ? "x" : "v", 0.9 * pop);
        }
      }
      // The rule and the total.
      for (let c = right - 1 - amount - 3; c < right - 1; c++) {
        at(c, totalRow - 1, "-", 0.35);
      }
      for (let c = 0; c < 4; c++) at(left + 2 + c, totalRow, "=", 0.7);
      for (let j = 0; j < amount; j++) {
        at(right - 1 - amount + j, totalRow, j === amount - 3 ? "." : "#", 0.7);
      }
      if (beam >= totalRow - top + 0.5) at(right + 2, totalRow, "v", 0.95);

      // The scanner: a bright line across the page with an afterglow above.
      if (scanning && t < SCAN + 0.15) {
        const r = top + Math.round(beam);
        const glow = 0.6 + 0.4 * energy;
        for (let c = left - 1; c <= right + 1; c++) {
          mark(field, (c + 0.5) * cw, (r + 0.5) * ch, "=", glow);
          if (r - 1 > top) {
            mark(field, (c + 0.5) * cw, (r - 0.5) * ch, "-", glow * 0.35);
          }
        }
        mark(field, (left - 2 + 0.5) * cw, (r + 0.5) * ch, ">", glow);
      }
    },

    still() {
      // Set on the next draw: a page two thirds scanned, its ticks so far.
      still = true;
    },
  };
}
