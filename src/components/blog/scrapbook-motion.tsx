"use client";

import { useEffect } from "react";

/**
 * Plays a post's notebook touches once, as they scroll into view: prints and
 * notes settle onto the page and scribbles draw themselves (the CSS is in
 * globals.css, section 7). Renders nothing. Without JavaScript, or with
 * reduced motion, everything is simply there. What is already on screen
 * when the script runs is marked shown first, so nothing blinks out.
 */
export function ScrapbookMotion({
  selector = ".markdown",
}: {
  selector?: string;
}) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal], [data-scribble]"),
    );
    if (!items.length) return;

    const show = (item: Element) => item.setAttribute("data-shown", "");
    const height = window.innerHeight;
    for (const item of items) {
      const box = item.getBoundingClientRect();
      // Prints already on screen stay put; scribbles on screen still draw.
      if (
        item.hasAttribute("data-reveal") &&
        box.top < height &&
        box.bottom > 0
      ) {
        show(item);
      }
    }
    root.setAttribute("data-motion", "");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    for (const item of items) {
      if (!item.hasAttribute("data-shown")) observer.observe(item);
    }
    return () => observer.disconnect();
  }, [selector]);

  return null;
}
