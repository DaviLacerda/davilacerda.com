"use client";

import { animateMini, inView } from "motion";
import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
} from "react";

type RevealProps<T extends ElementType> = {
  as?: T;
  /** Animate the direct children one after another (60ms apart) instead of the block as a whole. */
  stagger?: boolean;
  /**
   * Place in the first-paint entrance (`data-enter`, `--i`). When the block
   * is on the first screen it arrives with the rest of the page on load
   * instead of sitting still; below the fold the scroll entrance takes over.
   */
  enter?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** The heavy, fluid curve (`--ease-fluid` in globals.css). */
const EASE_FLUID = [0.32, 0.72, 0, 1] as const;

/**
 * Scroll entrance for content below the first screen: when the block comes
 * into view it settles into place: it rises 64px out of a 12px blur and
 * fades in over 0.8s on a heavy, fluid curve (children 60ms apart with
 * `stagger`). It plays once and never reverses. `inView` is an
 * IntersectionObserver, so nothing listens to scroll.
 *
 * The server HTML is always the finished page: nothing is hidden without
 * JavaScript, with reduced motion, or for blocks already on screen when the
 * page loads (those take part in the CSS load entrance when given `enter`).
 * Only blocks still below the fold after hydration are set to their
 * starting state, so no visitor ever sees them jump.
 */
export function Reveal<T extends ElementType = "div">({
  as,
  stagger = false,
  enter,
  style,
  ...props
}: RevealProps<T>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    // Below the fold: the scroll entrance replaces the (unseen) load entrance.
    element.removeAttribute("data-enter");
    const targets = stagger
      ? (Array.from(element.children) as HTMLElement[])
      : [element];
    for (const target of targets) {
      target.style.opacity = "0";
      target.style.transform = "translateY(64px)";
      target.style.filter = "blur(12px)";
    }

    const stop = inView(
      element,
      () => {
        targets.forEach((target, index) => {
          animateMini(
            target,
            { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" },
            { duration: 0.8, delay: index * 0.06, ease: EASE_FLUID },
          ).then(() => {
            // A lingering filter would make the block a containing block.
            target.style.removeProperty("filter");
          });
        });
      },
      { amount: 0.15 },
    );
    return () => {
      stop();
    };
  }, [stagger]);

  const Component: ElementType = as ?? "div";
  return (
    <Component
      ref={ref}
      {...(enter === undefined
        ? { style }
        : {
            "data-enter": "",
            style: { ...(style as CSSProperties), "--i": enter },
          })}
      {...props}
    />
  );
}
