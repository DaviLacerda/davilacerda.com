"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { PietFigure, type PietPose } from "@/components/piet/piet-figure";

/**
 * Piet, piecet's mascot, keeps the reader company down a page: he rides in
 * the margin beside `target` (or peeks in from the right edge when there is
 * no margin), sliding down as the reader moves through it, leaning with the
 * scroll. He waves and says hello at the top, nods along while the page
 * moves, jumps when a print comes into view, dozes off when the reader stops
 * for a while and dances at the end. Decorative: hidden from assistive tech
 * and never in the way of a click. With reduced motion he simply sits in
 * the corner.
 */
export function PietGuide({
  target = ".markdown",
  hello,
}: {
  /** The element whose progress he follows. */
  target?: string;
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

      x = x < 0 ? tx : x + (tx - x) * 0.18;
      y = y < 0 ? ty : y + (ty - y) * 0.1;
      const lean = Math.max(-14, Math.min(14, velocity * 0.6));
      tilt += (lean + (margin ? 0 : -10) - tilt) * 0.12;
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;

      // A print reaching the middle of the screen: a little jump, once each.
      for (const item of prints) {
        if (seen.has(item)) continue;
        const r = item.getBoundingClientRect();
        if (r.top < vh * 0.6 && r.bottom > vh * 0.3) {
          seen.add(item);
          joyUntil = now + 1300;
        }
      }

      const still = now - lastMove;
      if (progress >= 0.97) set("dance");
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
  }, [target, client]);

  if (!client) return null;
  return createPortal(
    <div ref={ref} className="piet-guide" aria-hidden="true">
      {pose === "wave" ? (
        <span className="piet-guide-bubble">{hello}</span>
      ) : null}
      <PietFigure pose={pose} />
    </div>,
    document.body,
  );
}

function noop() {
  return () => {};
}
