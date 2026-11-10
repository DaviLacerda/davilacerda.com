"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import { interpolate } from "@/i18n";
import { cn } from "@/lib/utils";

export type WallItem = {
  id: string;
  name: string;
  brand: string;
  /** "Laptop", "Sneakers, white". */
  kind: string;
  facts: string[];
  url: string;
  /** "apple.com". */
  store: string;
  /** The drawing, rendered on the server. */
  art: ReactNode;
};

export type WallStrings = {
  /** Accessible name of the wall. */
  label: string;
  /** A tile's accessible name: "Zoom into MacBook Air M3". */
  zoomIn: string;
  zoomOut: string;
  previous: string;
  next: string;
  /** "{index} of {total}". */
  position: string;
  /** The link's label: "See it on {store}". */
  link: string;
  opensInNewTab: string;
  facts: string;
};

/** The camera's move: heavy and fluid, so the zoom settles instead of snapping. */
const CAMERA = "transform 700ms cubic-bezier(0.32, 0.72, 0, 1)";
/** How much of the free area the zoomed drawing fills. */
const FILL = 0.82;
const MAX_SCALE = 3;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** An element's layout box inside an ancestor, ignoring transforms. */
function boxWithin(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}

/**
 * The Things wall: every object on its plate, on one surface panel. Picking
 * one moves the camera: the whole wall scales and slides until that drawing
 * fills the free side of the panel (the left on a wide screen, the top on a
 * phone), the others dim, and a card beside it says what it is, a few facts
 * and where to get it. Another tile, the arrows or the arrow keys fly the
 * camera to the next thing; Escape, the close button, the zoomed thing or
 * the empty panel zoom back out. The hash follows (`#macbook-air-m3`), so a
 * link opens zoomed in.
 *
 * The camera is one CSS transform on the wall (translate, then scale, from
 * its top left corner), written straight to the element after layout, so a
 * new pick interrupts the move in flight from where it is. Reduced motion:
 * the camera cuts. Without JavaScript the tiles stay a plain grid with each
 * thing's link under its name.
 */
export function ThingsWall({
  items,
  strings,
}: {
  items: WallItem[];
  strings: WallStrings;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [size, setSize] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLUListElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  /** Skip the move once (opening from the URL's hash). */
  const cut = useRef(false);
  const current = active === null ? null : items[active];

  /** Scrolls so the whole panel shows (or its top, when it is taller than the window). */
  const bringIntoView = useCallback(() => {
    const panel = stage.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    // The sticky header covers the top of the window.
    const header = document.querySelector("header")?.offsetHeight ?? 0;
    const room = window.innerHeight - header;
    if (rect.top >= header && rect.bottom <= window.innerHeight) return;
    const top =
      rect.height >= room - 32
        ? rect.top - header - 16
        : rect.top - header - (room - rect.height) / 2;
    window.scrollBy({
      top,
      behavior: reducedMotion() ? "instant" : "smooth",
    });
  }, []);

  const open = useCallback(
    (index: number, focus = true) => {
      const item = items[index];
      if (!item) return;
      setActive(index);
      history.replaceState(history.state, "", `#${item.id}`);
      bringIntoView();
      if (focus) {
        requestAnimationFrame(() =>
          heading.current?.focus({ preventScroll: true }),
        );
      }
    },
    [items, bringIntoView],
  );

  const close = useCallback(() => {
    if (active === null) return;
    const tile = tiles.current[active];
    setActive(null);
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${location.search}`,
    );
    tile?.focus({ preventScroll: true });
  }, [active]);

  const step = useCallback(
    (by: number) => {
      if (active === null) return;
      open((active + by + items.length) % items.length);
    },
    [active, items.length, open],
  );

  // Open the thing named in the hash: on load without the move, then on
  // every in-page link to one (`#nike-book-1`).
  useEffect(() => {
    const fromHash = (instant: boolean) => {
      const id = decodeURIComponent(location.hash.slice(1));
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      cut.current = instant;
      setActive(index);
      requestAnimationFrame(bringIntoView);
    };
    fromHash(true);
    const onHashChange = () => fromHash(false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [items, bringIntoView]);

  // Re-aim when the panel changes size (rotation, a resized window).
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keys while zoomed: Escape out, arrows to the neighbours.
  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, close, step]);

  // Aim the camera: after layout, so the card's real size is known.
  useLayoutEffect(() => {
    const wall = world.current;
    const panel = stage.current;
    if (!wall || !panel) return;
    const instant = cut.current || reducedMotion();
    cut.current = false;
    wall.style.transition = instant ? "none" : CAMERA;

    const art =
      active === null
        ? null
        : tiles.current[active]?.querySelector<HTMLElement>("[data-art]");
    if (!art) {
      wall.style.transform = "";
      return;
    }

    const width = panel.clientWidth;
    const height = panel.clientHeight;
    const wide = width >= 640;
    const cardBox = card.current;
    // The free area: beside the card on a wide panel, above it on a phone.
    const free = wide
      ? { x: 0, y: 0, width: width - (cardBox?.offsetWidth ?? 0) - 16, height }
      : {
          x: 0,
          y: 0,
          width,
          height: height - (cardBox?.offsetHeight ?? 0) - 12,
        };
    const box = boxWithin(art, wall);
    const scale = Math.min(
      MAX_SCALE,
      (free.width * FILL) / box.width,
      (free.height * FILL) / box.height,
    );
    const x = free.x + free.width / 2 - scale * (box.x + box.width / 2);
    const y = free.y + free.height / 2 - scale * (box.y + box.height / 2);
    wall.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, [active, size]);

  const onStageClick = (event: MouseEvent<HTMLDivElement>) => {
    // A click on the empty panel (not a tile, not the card) zooms out.
    if (
      event.target === event.currentTarget ||
      event.target === world.current
    ) {
      close();
    }
  };

  return (
    <div
      ref={stage}
      role="region"
      aria-label={strings.label}
      data-zoomed={current ? "" : undefined}
      onClick={onStageClick}
      className="group/stage relative overflow-clip rounded-panel bg-surface"
    >
      <ul
        ref={world}
        className="relative grid origin-top-left grid-cols-2 gap-x-3 gap-y-2 p-3 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-3 sm:p-4"
      >
        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <li
              key={item.id}
              id={item.id}
              data-active={isActive ? "" : undefined}
              className="scroll-mt-24 transition-opacity duration-300 ease-out group-data-zoomed/stage:opacity-25 data-active:opacity-100"
            >
              <button
                ref={(node) => {
                  tiles.current[index] = node;
                }}
                type="button"
                onClick={() => (isActive ? close() : open(index))}
                aria-label={
                  isActive
                    ? strings.zoomOut
                    : interpolate(strings.zoomIn, { name: item.name })
                }
                aria-expanded={isActive}
                aria-controls={isActive ? "thing-card" : undefined}
                className={cn(
                  "group/tile block w-full rounded-surface text-left",
                  isActive ? "cursor-zoom-out" : "cursor-zoom-in",
                )}
              >
                <span className="block aspect-[4/3] rounded-surface bg-background p-[9%] transition-colors duration-200 ease-out dark:bg-surface-strong">
                  <span
                    data-art=""
                    className="block size-full transition-transform duration-300 ease-out group-hover/tile:scale-[1.04] group-data-zoomed/stage:group-hover/tile:scale-100 [&>svg]:size-full"
                  >
                    {item.art}
                  </span>
                </span>
                <span className="block px-1 pt-2.5 pb-2 transition-opacity duration-200 ease-out group-data-zoomed/stage:opacity-0">
                  <span className="block truncate leading-6 font-medium">
                    {item.name}
                  </span>
                  <span className="block truncate text-small text-muted-foreground">
                    {item.brand}
                  </span>
                </span>
              </button>
              {/* Without JavaScript the tiles do nothing: the link sits under the name. */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-1 mb-2 hidden items-center gap-1 text-small text-muted-foreground link-underline noscript:inline-flex"
              >
                {item.store}
                <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                <span className="sr-only"> ({strings.opensInNewTab})</span>
              </a>
            </li>
          );
        })}
      </ul>

      {current && active !== null ? (
        <div
          ref={card}
          id="thing-card"
          key={current.id}
          data-thing-card=""
          className="absolute inset-x-3 bottom-3 flex flex-col rounded-surface bg-background p-5 sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-4 sm:w-[min(22rem,42%)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <p className="pt-1 text-small text-muted-foreground">
              {current.kind}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label={strings.zoomOut}
              className="-mt-1.5 -mr-1.5 grid size-9 shrink-0 pressable place-items-center rounded-full text-muted-foreground transition-colors duration-200 ease-out hover:bg-surface hover:text-foreground"
            >
              <XIcon aria-hidden="true" className="size-4.5" />
            </button>
          </div>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-1 text-heading outline-none sm:mt-3"
          >
            {current.name}
          </h2>
          <p className="text-small text-muted-foreground">{current.brand}</p>

          <ul
            aria-label={strings.facts}
            className="mt-4 flex flex-wrap gap-2 sm:mt-6"
          >
            {current.facts.map((fact) => (
              <li
                key={fact}
                className="rounded-full bg-surface px-3 py-1 text-small leading-6"
              >
                {fact}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center justify-between gap-3 sm:mt-auto sm:pt-8">
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: "min-w-0" })}
            >
              <span className="truncate">
                {interpolate(strings.link, { store: current.store })}
              </span>
              <ArrowUpRightIcon aria-hidden="true" className="size-4" />
              <span className="sr-only"> ({strings.opensInNewTab})</span>
            </a>
            <div className="flex shrink-0 items-center gap-1">
              <span className="sr-only" aria-live="polite">
                {interpolate(strings.position, {
                  index: active + 1,
                  total: items.length,
                })}
              </span>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={strings.previous}
                className="grid size-11 pressable place-items-center rounded-full bg-surface transition-colors duration-200 ease-out hover:bg-surface-strong"
              >
                <ArrowLeftIcon aria-hidden="true" className="size-4.5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={strings.next}
                className="grid size-11 pressable place-items-center rounded-full bg-surface transition-colors duration-200 ease-out hover:bg-surface-strong"
              >
                <ArrowRightIcon aria-hidden="true" className="size-4.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
