"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/** Marks <html> once the visitor navigates inside the site (see globals.css, "Motion"). */
export function markClientNavigation() {
  document.documentElement.dataset.nav = "";
}

/**
 * Root of every animation on the site:
 * - LazyMotion with `strict`: components use the small `m.*` elements and the
 *   feature bundle loads asynchronously after hydration.
 * - `reducedMotion="user"`: with "reduce motion" on, Motion drops transforms
 *   and layout animations and keeps short opacity fades.
 * - Sets `data-nav` on <html> on the first in-site navigation (a same-origin
 *   link click, captured before next/link handles it, or back/forward), which
 *   switches off the CSS first-paint entrance for every later page.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
      if (event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target || anchor.hasAttribute("download")) return;
      if (anchor.hasAttribute("data-lightbox")) return; // opens a viewer, not a page
      if (anchor.origin !== window.location.origin) return;
      markClientNavigation();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", markClientNavigation);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", markClientNavigation);
    };
  }, []);

  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
