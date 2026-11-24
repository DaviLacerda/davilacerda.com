"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { PietFigure, type PietPose } from "@/components/piet/piet-figure";
import { pietShapePaths, type PietShape } from "@/lib/piet";

/**
 * Piet, piecet's mascot, keeps the reader company down a page: he rides in
 * the margin beside `target` (or peeks in from the right edge when there is
 * no margin), sliding down as the reader moves through it, leaning with the
 * scroll. He waves and says hello at the top, nods along while the page
 * moves, jumps when a print comes into view, dozes off when the reader stops
 * for a while and dances at the end. With `shapes`, he also changes form
 * from section to section (one form per `h2`, the first for what comes
 * before it), his outline morphing as each heading crosses the middle of
 * the screen, like on piecet.com. At the end of a post he flies into the
 * next part of the series (`data-piet-slot`, an empty piece in the series
 * list) and fits there, like the last piece of a puzzle. Decorative: hidden from assistive tech
 * and never in the way of a click. With reduced motion he simply sits in
 * the corner.
 */
export function PietGuide({
  target = ".markdown",
  hello,
  shapes,
}: {
  /** The element whose progress he follows. */
  target?: string;
  /** His form in each section of `target`, in order. */
  shapes?: readonly PietShape[];
  /** What he says at the top of the page. */
  hello: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<PietPose>("wave");
  // Rendered into <body>: a transformed ancestor (the page's entrance
  // motion) would otherwise pin "fixed" to itself instead of the screen.
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  useEffect(() => {
    const node = ref.current;
    const root = document.querySelector<HTMLElement>(target);
    if (!node || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.dataset.pietStill = "";
      return;
    }

    let frame = 0;
    let y = -1;
    let x = -1;
    let tilt = 0;
    let lastScroll = window.scrollY;
    let lastMove = performance.now();
    let joyUntil = 0;
    let current: PietPose = "wave";
    const seen = new WeakSet<Element>();
    const prints = Array.from(root.querySelectorAll(".print, video"));

    const morph = shapes?.length ? createMorph(node, root, shapes) : null;
    // The next part of the series, at the end of a post: he fits into it.
    const slot = document.querySelector<HTMLElement>("[data-piet-slot]");
    let fittedAt = 0;

    const set = (next: PietPose) => {
      if (next === current) return;
      current = next;
      setPose(next);
    };

    const tick = (now: number) => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const box = root.getBoundingClientRect();
      const size = node.offsetWidth;
      const progress = Math.min(
        1,
        Math.max(0, (vh * 0.5 - box.top) / Math.max(1, box.height)),
      );

      // In the margin when there is room for him; otherwise peeking in.
      const room = vw - box.right;
      const margin = room > size + 40;
      const tx = margin
        ? box.right + Math.min(room - size - 16, 56)
        : vw - size * 0.62;
      const ty = vh * 0.18 + progress * vh * 0.52;

      const scroll = window.scrollY;
      const velocity = scroll - lastScroll;
      lastScroll = scroll;
      if (Math.abs(velocity) > 0.5) lastMove = now;

      // As the slot comes up the screen, he flies into it and shrinks to fit.
      let dock = 0;
      let dx = tx;
      let dy = ty;
      let scale = 1;
      if (slot) {
        const r = slot.getBoundingClientRect();
        dock = ease(Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.3))));
        dx = tx + (r.left - tx) * dock;
        dy = ty + (r.top - ty) * dock;
        scale = 1 + (r.width / size - 1) * dock;
      }
      const follow = 0.1 + 0.9 * dock * dock;
      x = x < 0 ? dx : x + (dx - x) * Math.max(0.18, follow);
      y = y < 0 ? dy : y + (dy - y) * Math.max(0.1, follow);
      const lean = Math.max(-14, Math.min(14, velocity * 0.6));
      tilt += ((lean + (margin ? 0 : -10)) * (1 - dock) - tilt) * 0.12;
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      const fitted = dock > 0.97;
      if (slot && fitted !== slot.hasAttribute("data-filled")) {
        slot.toggleAttribute("data-filled", fitted);
        fittedAt = fitted ? now : 0;
      }

      // A print reaching the middle of the screen: a little jump, once each.
      for (const item of prints) {
        if (seen.has(item)) continue;
        const r = item.getBoundingClientRect();
        if (r.top < vh * 0.6 && r.bottom > vh * 0.3) {
          seen.add(item);
          joyUntil = now + 1300;
        }
      }

      morph?.(vh, dock);

      const still = now - lastMove;
      if (fittedAt) set(now - fittedAt < 1100 ? "joy" : "idle");
      else if (dock > 0) set("listen");
      else if (progress >= 0.97) set("dance");
      else if (now < joyUntil) set("joy");
      else if (box.top > vh * 0.15) set("wave");
      else if (still > 6000) set("rest");
      else if (still < 400) set("listen");
      else set("idle");

      frame = requestAnimationFrame(tick);
    };
    node.dataset.pietOn = "";
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, client, shapes]);

  if (!client) return null;
  return createPortal(
    <div ref={ref} className="piet-guide" aria-hidden="true">
      {pose === "wave" ? (
        <span className="piet-guide-bubble">{hello}</span>
      ) : null}
      <PietFigure pose={pose} morph={Boolean(shapes?.length)} />
    </div>,
    document.body,
  );
}

const POINTS = 160;
type Points = Float32Array;

/** A path's outline as POINTS points, clockwise, from the top middle. */
function sample(d: string, svg: SVGSVGElement): Points {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  const length = path.getTotalLength();
  const raw: [number, number][] = [];
  for (let i = 0; i < POINTS; i++) {
    const p = path.getPointAtLength((i / POINTS) * length);
    raw.push([p.x, p.y]);
  }
  path.remove();
  let area = 0;
  for (let i = 0; i < POINTS; i++) {
    const [x1, y1] = raw[i]!;
    const [x2, y2] = raw[(i + 1) % POINTS]!;
    area += x1 * y2 - x2 * y1;
  }
  if (area < 0) raw.reverse();
  // Start at the top middle, so every form lines up with the next.
  let start = 0;
  let best = Infinity;
  raw.forEach(([x, y], i) => {
    if (y > 297) return;
    const score = Math.abs(x - 411);
    if (score < best) {
      best = score;
      start = i;
    }
  });
  const out = new Float32Array(POINTS * 2);
  for (let i = 0; i < POINTS; i++) {
    const [x, y] = raw[(start + i) % POINTS]!;
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  }
  return out;
}

/** A smooth closed path through the points (Catmull-Rom as cubic Béziers). */
function toPath(p: Points): string {
  const n = p.length / 2;
  const at = (i: number) => {
    const k = ((i % n) + n) % n;
    return [p[k * 2]!, p[k * 2 + 1]!] as const;
  };
  let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1);
    const [x1, y1] = at(i);
    const [x2, y2] = at(i + 1);
    const [x3, y3] = at(i + 2);
    d += `C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return `${d}Z`;
}

const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Blends his outline between the forms of the sections around the middle
 * of the screen. Returns the per-frame update.
 */
function createMorph(
  node: HTMLElement,
  root: HTMLElement,
  shapes: readonly PietShape[],
) {
  const body = node.querySelector<SVGPathElement>("[data-piet-shape]");
  const svg = node.querySelector("svg");
  if (!body || !svg) return null;
  const cache = new Map<PietShape, Points>();
  const form = (shape: PietShape) => {
    let points = cache.get(shape);
    if (!points) {
      points = sample(pietShapePaths[shape], svg);
      cache.set(shape, points);
    }
    return points;
  };
  const headings = Array.from(root.querySelectorAll("h2"));
  const forms = shapes.slice(0, headings.length + 1);
  const out = new Float32Array(POINTS * 2);
  let last = "";

  return (vh: number, dock = 0) => {
    // How far each heading has crossed the middle of the screen, 0 to 1.
    const amounts = headings.slice(0, forms.length - 1).map((heading) => {
      const top = heading.getBoundingClientRect().top;
      return ease(Math.min(1, Math.max(0, (vh * 0.55 - top) / 260 + 0.5)));
    });
    const key = `${amounts.map((t) => t.toFixed(3)).join()}|${dock.toFixed(3)}`;
    if (key === last) return;
    last = key;

    out.set(form(forms[0]!));
    let piece = forms[0] === "piece" ? 1 : 0;
    let brain = forms[0] === "brain" ? 1 : 0;
    amounts.forEach((t, i) => {
      if (t <= 0) return;
      const next = forms[i + 1]!;
      const target = form(next);
      for (let k = 0; k < out.length; k++) {
        out[k] = out[k]! + (target[k]! - out[k]!) * t;
      }
      piece += ((next === "piece" ? 1 : 0) - piece) * t;
      brain += ((next === "brain" ? 1 : 0) - brain) * t;
    });
    // Fitting into the next part: back to a piece, arms tucked in.
    if (dock > 0) {
      const target = form("piece");
      for (let k = 0; k < out.length; k++) {
        out[k] = out[k]! + (target[k]! - out[k]!) * dock;
      }
      brain *= 1 - dock;
      piece = (piece + (1 - piece) * dock) * (1 - dock);
    }
    body.setAttribute("d", toPath(out));
    svg.style.setProperty("--piet-piece", piece.toFixed(3));
    svg.style.setProperty("--piet-brain", brain.toFixed(3));
  };
}

function noop() {
  return () => {};
}
