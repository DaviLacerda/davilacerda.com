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

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Scroll entrance for content below the first screen: when the block comes
 * into view it rises 16px and fades in, 0.5s ease-out (children 60ms apart
 * with `stagger`). It plays once and never reverses.
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
      target.style.transform = "translateY(16px)";
    }

    const stop = inView(
      element,
      () => {
        targets.forEach((target, index) => {
          animateMini(
            target,
            { opacity: 1, transform: "translateY(0px)" },
            { duration: 0.5, delay: index * 0.06, ease: EASE_OUT },
          );
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
