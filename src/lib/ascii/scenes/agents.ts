import {
  freeRect,
  hash,
  mark,
  smoothstep,
  type Box,
  type Field,
} from "../field";
import type { Scene } from "../types";

/*
 * Certifications (multi-agent and agentic AI): a small system of agents at
 * work. An orchestrator ([*]) in the middle of the clear space and four
 * agents ((o)) around it, joined by thin links (- / \ |), two of the agents
 * also to each other. Messages (a bright o with a short trail) run from the
 * orchestrator to an agent and, a moment later, back with the answer; a node
 * lights up as a message reaches it. Lively, the messages come thick and
 * fast, several at once.
 *
 * Laid out in the widest clear box beside the figure and its title
 * (`freeRect`), the nodes placed in fractions of it.
 */

/** Nodes in fractions of the box: the orchestrator first. */
const NODES = [
  [0.52, 0.5],
  [0.1, 0.28],
  [0.26, 0.86],
  [0.84, 0.18],
  [0.93, 0.78],
] as const;
/** Links between nodes (indices into NODES). */
const LINKS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 2],
  [3, 4],
] as const;
const MESSAGES = 6;
/** Seconds a message takes along a link. */
const TRAVEL = 1.1;

type Message = { link: number; back: boolean; start: number };

export function agents(): Scene {
  let time = 0;
  let still = false;
  let next = 0.4;
  let count = 0;
  const messages: (Message | null)[] = Array.from(
    { length: MESSAGES },
    () => null,
  );
  /** When each node last received a message. */
  const lit = NODES.map(() => -Infinity);
  let space: Box | null = null;
  let revision = -1;
  let spaceField: Field | null = null;

  function layout(field: Field): Box | null {
    if (field === spaceField && field.revision === revision) return space;
    spaceField = field;
    revision = field.revision;
    const { cw, ch } = field;
    space = field.free
      ? freeRect(field, (w, h) =>
          w >= cw * 34 && h >= ch * 8 ? Math.min(w, cw * 84) * h : 0,
        )
      : { x0: field.width - 1.6, y0: 0.08, x1: field.width - 0.06, y1: 0.92 };
    return space;
  }

  function send(link: number, back: boolean) {
    const slot = messages.findIndex((m) => m === null);
    if (slot >= 0) messages[slot] = { link, back, start: time };
  }

  function integrate(dt: number, energy: number) {
    time += dt;
    // Orchestrator to an agent; agents answer when a message arrives.
    if (time >= next) {
      const link = Math.floor(hash(count++, 41) * LINKS.length);
      send(link, hash(count, 42) < 0.5);
      next = time + (1.3 - energy * 0.95) * (0.6 + 0.8 * hash(count, 43));
    }
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message || time - message.start < TRAVEL) continue;
      const [a, b] = LINKS[message.link] ?? [0, 0];
      const to = message.back ? a : b;
      lit[to] = time;
      messages[i] = null;
      // The answer goes back the way it came.
      if (to !== 0 && hash(count++, 44) < 0.75)
        send(message.link, !message.back);
    }
  }

  return {
    step(dt, energy) {
      let remaining = dt;
      while (remaining > 1e-6) {
        const h = Math.min(1 / 30, remaining);
        integrate(h, energy);
        remaining -= h;
      }
    },

    draw(field, energy) {
      const { cw, ch } = field;
      const box = layout(field);
      if (!box) return;
      if (still) {
        // A busy moment: several messages in flight.
        still = false;
        for (let k = 0; k < 120; k++) integrate(1 / 30, 0.8);
      }
      // At most 84 columns wide (a system, not a skyline), centred.
      const spare = Math.max(0, Math.floor((box.x1 - box.x0) / cw) - 84);
      const c0 = Math.ceil(box.x0 / cw) + 2 + Math.floor(spare / 2);
      const c1 = Math.floor(box.x1 / cw) - 3 - Math.ceil(spare / 2);
      const r0 = Math.ceil(box.y0 / ch) + 1;
      const r1 = Math.floor(box.y1 / ch) - 2;
      const nodes = NODES.map(([fx, fy]) => [
        Math.round(c0 + (c1 - c0) * fx),
        Math.round(r0 + (r1 - r0) * fy),
      ]);
      const at = (c: number, r: number, glyph: string, ink: number) =>
        mark(field, (c + 0.5) * cw, (r + 0.5) * ch, glyph, ink);

      // The links: dotted, stopping short of the nodes.
      for (const [a, b] of LINKS) {
        const [ax = 0, ay = 0] = nodes[a] ?? [];
        const [bx = 0, by = 0] = nodes[b] ?? [];
        const dx = bx - ax;
        const dy = by - ay;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let s = 2; s <= steps - 2; s++) {
          const c = Math.round(ax + (dx * s) / steps);
          const r = Math.round(ay + (dy * s) / steps);
          at(c, r, ".", 0.6);
        }
      }

      // The messages in flight, with a short trail.
      for (const message of messages) {
        if (!message) continue;
        const [a, b] = LINKS[message.link] ?? [0, 0];
        const [from, to] = message.back ? [b, a] : [a, b];
        const [fx = 0, fy = 0] = nodes[from] ?? [];
        const [tx = 0, ty = 0] = nodes[to] ?? [];
        const u = smoothstep(0, 1, (time - message.start) / TRAVEL);
        for (let k = 2; k >= 0; k--) {
          const v = Math.max(0, u - k * 0.06);
          const c = Math.round(fx + (tx - fx) * v);
          const r = Math.round(fy + (ty - fy) * v);
          at(c, r, k ? ":" : "o", k ? 0.7 - k * 0.15 : 0.95);
        }
      }

      // The nodes: brighter for a moment when a message reaches them.
      nodes.forEach(([c = 0, r = 0], i) => {
        const glow = Math.exp(-(time - (lit[i] ?? -Infinity)) / 0.5);
        const ink = 0.85 + 0.15 * Math.min(1, glow + energy);
        if (i === 0) {
          at(c - 1, r, "[", ink);
          at(c, r, "*", ink);
          at(c + 1, r, "]", ink);
        } else {
          at(c - 1, r, "(", ink);
          at(c, r, glow > 0.3 ? "@" : "o", ink);
          at(c + 1, r, ")", ink);
        }
      });
    },

    still() {
      still = true;
    },
  };
}
