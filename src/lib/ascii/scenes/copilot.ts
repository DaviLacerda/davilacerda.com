import {
  clamp,
  freeRect,
  hash,
  mark,
  noise1,
  smoothstep,
  type Box,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Sales Copilot: a sales call, heard and answered. Along the widest clear
 * lane of the panel a voice comes in from the left as a waveform of bars
 * (|), in phrases with pauses, the line going flat (-) between them; it runs
 * into the copilot, a small spark (*) that flares as it hears; beside the
 * spark a speech bubble types its suggestion in (= words, a block cursor),
 * holds it, and starts the next one when the next phrase arrives. Lively,
 * the call speeds up and gets louder, and the suggestions come faster.
 *
 * Laid out in the space the panel's words leave (`freeRect`): the widest lane
 * at least five rows tall, so on the Work home it runs under the trophy and
 * on the Sales Copilot answer under the award's line, at every width and in
 * both languages. Without room for the bubble, the call and the spark alone.
 */

/** One phrase and its pause, in seconds of scene time. */
const PHRASE = 5.6;
const SPEAKING = 0.58;
/** How fast the voice travels along the lane, units per second. */
const SPEED = 0.24;
/** How long a suggestion takes to type. */
const TYPING = 2.4;

export function copilot(): Scene {
  let time = 0;
  let still = false;
  let lane: Box | null = null;
  let revision = -1;
  let laneField: Field | null = null;

  /** How loud the call is at scene time `t`, 0 to 1: phrases of syllables, then a pause. */
  function voice(t: number) {
    const phase = ((t % PHRASE) + PHRASE) % PHRASE;
    const gate =
      smoothstep(0, 0.25, phase) *
      (1 - smoothstep(PHRASE * SPEAKING - 0.35, PHRASE * SPEAKING, phase));
    const word = smoothstep(0.18, 0.34, noise1(t * 2.6, 5));
    const syllable = 0.35 + 0.65 * noise1(t * 9, 11);
    return gate * word * syllable;
  }

  /** The lane: the widest clear band at least five rows tall, else the upper third. */
  function layout(field: Field): Box {
    if (field === laneField && field.revision === revision && lane) return lane;
    laneField = field;
    revision = field.revision;
    const min = field.ch * 5;
    const max = field.ch * 8;
    const found = freeRect(field, (w, h) =>
      h >= min ? w * Math.min(h, max) : 0,
    );
    if (found) {
      // At most eight rows, near the top of a tall clear area (under the
      // panel's top row rather than in the middle of nowhere).
      const extra = found.y1 - found.y0 - max;
      const shift = extra > 0 ? Math.min(extra, field.ch * 1.5) : 0;
      lane =
        extra > 0
          ? { ...found, y0: found.y0 + shift, y1: found.y0 + shift + max }
          : found;
    } else {
      lane = {
        x0: field.width * 0.06,
        y0: 0.17,
        x1: field.width * 0.96,
        y1: 0.17 + max,
      };
    }
    return lane;
  }

  return {
    step(dt, energy) {
      time += dt * (1 + 1.2 * energy);
    },

    draw(field, energy) {
      const { cw, ch } = field;
      const box = layout(field);
      // Whole cells: columns c0 to c1 around one centre row, so the bubble
      // and the waveform sit on the same grid.
      const c0 = Math.ceil(box.x0 / cw) + 1;
      const c1 = Math.floor(box.x1 / cw) - 2;
      const cols = c1 - c0;
      if (cols < 12) return;
      const row = Math.floor((box.y0 + box.y1) / 2 / ch);
      // Bars reach `half` rows above and below the centre, within the lane.
      const laneRows = Math.floor((box.y1 - box.y0) / ch + 0.01);
      const half = Math.max(1, Math.min(3, Math.floor((laneRows - 1) / 2)));
      const at = (c: number, r: number, glyph: string, ink: number) =>
        mark(field, (c + 0.5) * cw, (r + 0.5) * ch, glyph, ink);

      // The bubble at the lane's right end (when there is room for one), the
      // spark just before it, the call along the rest.
      const roomy = cols >= 40;
      const bubble = roomy ? Math.round(clamp(cols * 0.4, 18, 0.72 / cw)) : 0;
      const spark = roomy ? c1 - bubble - 3 : c0 + Math.round(cols * 0.86);
      const travel = ((spark - c0) * cw) / SPEED;
      const loud = 0.75 + 0.25 * energy;
      if (still) {
        // The still frame: the end of a phrase reaching the spark, the
        // suggestion two thirds typed.
        still = false;
        time = PHRASE * 3 + travel + 0.4 + TYPING * 0.66;
      }

      // The waveform: the sample in column c left the speaker (c0) at
      // time - (c - c0) * cw / SPEED, so the call runs right, into the spark.
      const rate = SPEED / cw;
      const fadeCols = Math.max(4, Math.min(0.5 / cw, cols * 0.25));
      for (let c = c0; c < spark - 2; c++) {
        const sample = Math.floor((time - ((c - c0) * cw) / SPEED) * rate);
        const a = voice(sample / rate) * loud;
        const fade = smoothstep(0, fadeCols, c - c0);
        const h = a * (half + 0.5) * 1.35 * (0.35 + 0.65 * hash(sample, 3));
        if (h < 0.4) {
          // Silence: a flat line.
          at(c, row, "-", 0.42 * fade);
          continue;
        }
        const strength = (0.5 + 0.5 * a) * fade;
        const n = Math.min(half, Math.round(h));
        for (let k = -n; k <= n; k++) {
          const tip = n > 0 && Math.abs(k) === n;
          at(
            c,
            row + k,
            tip ? (k < 0 ? "." : "'") : "|",
            strength * (tip ? 0.7 : 1 - Math.abs(k) * 0.08),
          );
        }
      }

      // The copilot: a spark that flares with what it hears.
      const flare = clamp(voice(time - travel) * loud * 1.4);
      at(spark, row, flare > 0.35 ? "*" : "+", 0.75 + 0.25 * flare);
      if (flare > 0.2) {
        const ink = 0.35 + 0.5 * flare;
        at(spark - 1, row, "-", ink);
        at(spark + 1, row, "-", ink);
        at(spark, row - 1, "|", ink * 0.8);
        at(spark, row + 1, "|", ink * 0.8);
      }
      if (flare > 0.6) {
        const ink = 0.5 * flare;
        at(spark - 1, row - 1, "\\", ink);
        at(spark + 1, row + 1, "\\", ink);
        at(spark + 1, row - 1, "/", ink);
        at(spark - 1, row + 1, "/", ink);
      }
      if (!roomy) return;

      // The suggestion: a bubble beside the spark, from row - 2 (its top) to
      // row + 1 (its bottom), typed once the phrase has been heard.
      const left = spark + 3;
      const right = c1;
      const since = time - travel - 0.4;
      const cycle = Math.floor(since / PHRASE);
      const into = since - cycle * PHRASE;
      const fadeIn = smoothstep(0, 0.25, into);
      const edge = 0.55 * (0.6 + 0.4 * fadeIn);
      at(left - 1, row, "<", edge);
      at(left, row - 2, ".", edge);
      at(right, row - 2, ".", edge);
      at(left, row + 1, "'", edge);
      at(right, row + 1, "'", edge);
      for (let c = left + 1; c < right; c++) {
        at(c, row - 2, "-", edge * 0.8);
        at(c, row + 1, "-", edge * 0.8);
      }
      for (const r of [row - 1, row]) {
        at(left, r, "(", edge);
        at(right, r, ")", edge);
      }

      // Its words, typed in: two lines of = words, a block cursor at the end.
      const space = right - left - 3;
      const lines = [space, Math.floor(space * 0.62)];
      const typed = Math.floor(clamp(into / TYPING) * (space + lines[1]!));
      let count = 0;
      let cursor: [number, number] | null = null;
      for (let line = 0; line < lines.length; line++) {
        const limit = lines[line] ?? 0;
        let c = 0;
        let word = 0;
        while (c < limit && count < typed) {
          const length = 2 + Math.floor(hash(cycle, line * 31 + word, 9) * 5);
          for (let k = 0; k < length && c < limit && count < typed; k++) {
            at(left + 2 + c, row - 1 + line, "=", 0.62 * fadeIn);
            cursor = [left + 3 + c, row - 1 + line];
            count++;
            c++;
          }
          c++;
          word++;
        }
      }
      const blink = Math.floor(time * 2.4) % 2 === 0;
      if (cursor && blink) at(cursor[0], cursor[1], "#", 0.8 * fadeIn);
    },

    still() {
      // Set on the next draw, once the lane (and so the call's travel) is known.
      still = true;
    },
  };
}
