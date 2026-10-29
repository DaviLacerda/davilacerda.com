"use client";

import { inView } from "motion";
import { useLayoutEffect, useRef, type CSSProperties } from "react";

/** "96%" -> "", "96", "%"; "40%+" -> "", "40", "%+"; words ("Millions") -> null. */
function split(value: string) {
  const match = /^(\D*?)(\d{1,4})(\D*)$/.exec(value);
  if (!match) return null;
  const [, prefix = "", digits = "", suffix = ""] = match;
  return { prefix, digits, suffix };
}

/**
 * A result set large ("96%") whose number counts up from zero once, when it
 * first shows (see `[data-count]` in globals.css). The digits are a CSS
 * counter, so the count runs on the first paint without JavaScript and
 * without a flash of the final number; screen readers and crawlers get the
 * value as text.
 *
 * - First load, on screen: the CSS entrance counts it.
 * - First load, below the fold: held at zero, counted when 60% of it is in view.
 * - After a client navigation: counted at once when on screen, else on view.
 * - Reduced motion: the number, still.
 */
export function Figure({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const parts = split(value);

  useLayoutEffect(() => {
    const counter = ref.current?.querySelector<HTMLElement>("[data-count]");
    if (!counter) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { top, bottom } = counter.getBoundingClientRect();
    const onScreen = top < window.innerHeight && bottom > 0;
    const firstLoad = !document.documentElement.hasAttribute("data-nav");
    if (onScreen) {
      if (!firstLoad) counter.dataset.countState = "go";
      return;
    }
    counter.dataset.countState = "wait";
    return inView(
      counter,
      () => {
        counter.dataset.countState = "go";
      },
      { amount: 0.6 },
    );
  }, []);

  if (!parts) return <span className={className}>{value}</span>;
  // The figure is drawn by CSS (`::before`, the count, over `::after`, the
  // final value, invisible); the DOM text is the value, once, for readers.
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span
        aria-hidden="true"
        data-count={parts.digits}
        data-prefix={parts.prefix}
        data-suffix={parts.suffix}
        style={{ "--count-to": Number(parts.digits) } as CSSProperties}
      />
    </span>
  );
}
