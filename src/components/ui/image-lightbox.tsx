"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { animate, type AnimationPlaybackControls } from "motion";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  /** The full-size file. Without JavaScript the link simply opens it. */
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Shown under the image in the viewer (and its accessible name). */
  caption: string;
  /** A second, quieter line under the caption. */
  detail?: string;
  /** Visually hidden text on the link, e.g. "View full size". */
  openLabel: string;
  closeLabel: string;
  /** The thumbnail: a next/image of the same file, rendered by the server. */
  children: ReactNode;
  className?: string;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const MOVE = { type: "spring", duration: 0.42, bounce: 0 } as const;
const MOVE_BACK = { type: "spring", duration: 0.34, bounce: 0 } as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A thumbnail that opens its image full size in a native modal <dialog>
 * (focus moves in and comes back, Escape and a click anywhere close it, the
 * page behind is inert and does not scroll).
 *
 * The picture does not pop in: it lifts off the page. The print on the page
 * hides and the large one starts at exactly its place and size, then grows
 * to the centre of the screen (a FLIP with a no-bounce spring, so a close
 * mid-flight reverses from where it is), while the page fades behind it.
 * Closing runs it back into its slot, a little faster. The large image
 * shows the thumbnail's already decoded file at once and swaps to the
 * full-size file when that has decoded, so there is never an empty frame.
 * With reduced motion it only fades.
 */
export function ImageLightbox({
  src,
  width,
  height,
  alt,
  caption,
  detail,
  openLabel,
  closeLabel,
  children,
  className,
}: ImageLightboxProps) {
  const trigger = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const running = useRef<AnimationPlaybackControls[]>([]);
  const closing = useRef(false);

  const thumb = () => trigger.current?.querySelector("img") ?? null;
  /** The caption and the close button, which fade in once the image is on its way. */
  const chrome = () =>
    Array.from(
      dialog.current?.querySelectorAll<HTMLElement>("[data-chrome]") ?? [],
    );

  const stop = () => {
    for (const controls of running.current) controls.stop();
    running.current = [];
  };

  /** Where the large image must move and how much it must shrink to cover the thumbnail. */
  const offsetToThumb = useCallback(() => {
    const small = thumb()?.getBoundingClientRect();
    const large = frame.current?.getBoundingClientRect();
    if (!small?.width || !large?.width) return null;
    return {
      x: small.left + small.width / 2 - (large.left + large.width / 2),
      y: small.top + small.height / 2 - (large.top + large.height / 2),
      scale: small.width / large.width,
    };
  }, []);

  /** Puts everything back as it was once the dialog has closed (however it closed). */
  const reset = useCallback(() => {
    stop();
    closing.current = false;
    const small = thumb();
    if (small) small.style.removeProperty("opacity");
    for (const el of [image.current, backdrop.current, ...chrome()]) {
      el?.style.removeProperty("transform");
      el?.style.removeProperty("opacity");
    }
    document.documentElement.style.removeProperty("--scrollbar-gap");
    if (document.activeElement === document.body) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, []);

  const close = useCallback(() => {
    const element = dialog.current;
    const large = image.current;
    if (!element?.open || !large || closing.current) return;
    closing.current = true;
    stop();
    const reduce = prefersReducedMotion();
    const back = reduce ? null : offsetToThumb();
    const fade = { duration: reduce ? 0.12 : 0.2, ease: EASE_OUT };
    const moves = [
      animate(backdrop.current!, { opacity: 0 }, fade),
      animate(chrome(), { opacity: 0 }, { duration: 0.1 }),
      back
        ? animate(large, back, MOVE_BACK)
        : animate(large, { opacity: 0 }, fade),
    ];
    running.current = moves;
    void Promise.all(moves).then(() => {
      if (!closing.current) return; // reopened meanwhile
      element.close();
    });
  }, [offsetToThumb]);

  function open(event: MouseEvent<HTMLAnchorElement>) {
    // New tab, new window, download: let the link do it.
    if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
    if (event.shiftKey || event.altKey) return;
    const element = dialog.current;
    const large = image.current;
    if (!element || !large || typeof element.showModal !== "function") return;
    event.preventDefault();
    stop();
    closing.current = false;

    // Show the file the thumbnail already decoded, then the full one.
    const small = thumb();
    if (!large.dataset.full) {
      if (small?.currentSrc) large.src = small.currentSrc;
      const full = new window.Image();
      full.src = src;
      full
        .decode()
        .then(() => {
          large.src = src;
          large.dataset.full = "";
        })
        .catch(() => {});
    }

    // The page stops scrolling while the viewer is open (globals.css); keep
    // the room a classic scrollbar took, so the page does not shift.
    const root = document.documentElement;
    root.style.setProperty(
      "--scrollbar-gap",
      `${window.innerWidth - root.clientWidth}px`,
    );
    element.showModal();

    const reduce = prefersReducedMotion();
    const from = reduce ? null : offsetToThumb();
    if (small && from) small.style.opacity = "0";
    running.current = [
      animate(
        backdrop.current!,
        { opacity: [0, 1] },
        { duration: 0.24, ease: EASE_OUT },
      ),
      animate(
        chrome(),
        { opacity: [0, 1] },
        { duration: 0.2, delay: reduce ? 0 : 0.14, ease: EASE_OUT },
      ),
      from
        ? animate(
            large,
            { x: [from.x, 0], y: [from.y, 0], scale: [from.scale, 1] },
            MOVE,
          )
        : animate(
            large,
            reduce
              ? { opacity: [0, 1] }
              : { opacity: [0, 1], scale: [0.96, 1] },
            { duration: reduce ? 0.15 : 0.24, ease: EASE_OUT },
          ),
    ];
  }

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault(); // Escape: close with the animation
    close();
  }

  const ratio = width / height;
  // As large as the screen allows, up to one and a half times the file.
  const size: CSSProperties = {
    width: `min(calc(100vw - 2rem), calc((100dvh - 9rem) * ${ratio.toFixed(4)}), ${Math.round(width * 1.5)}px)`,
  };

  return (
    <>
      <a
        ref={trigger}
        href={src}
        onClick={open}
        aria-haspopup="dialog"
        data-lightbox=""
        className={cn("block cursor-zoom-in", className)}
      >
        {children}
        <span className="sr-only">{openLabel}</span>
      </a>
      <dialog
        ref={dialog}
        aria-label={caption}
        data-lightbox=""
        onCancel={onCancel}
        onClose={reset}
        onClick={close}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none cursor-zoom-out overflow-hidden border-0 bg-transparent p-0 text-foreground backdrop:bg-transparent open:grid open:place-items-center"
      >
        <div
          ref={backdrop}
          aria-hidden="true"
          className="absolute inset-0 bg-surface"
        />
        <figure className="relative m-0 flex flex-col items-center gap-4 px-4">
          <div ref={frame} style={size}>
            {/* eslint-disable-next-line @next/next/no-img-element -- swapped by hand, see above */}
            <img
              ref={image}
              src={src}
              alt={alt}
              width={width}
              height={height}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block h-auto w-full rounded-[clamp(0.625rem,1.2vw,1rem)] will-change-transform dark:brightness-90"
            />
          </div>
          <figcaption
            data-chrome=""
            className="max-w-[60ch] text-center text-small"
          >
            <span className="block font-medium">{caption}</span>
            {detail ? (
              <span className="block text-muted-foreground">{detail}</span>
            ) : null}
          </figcaption>
        </figure>
        <div
          data-chrome=""
          className="absolute top-4 right-4 sm:top-6 sm:right-6"
        >
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            title={closeLabel}
            className={buttonVariants({
              variant: "raised",
              className: "size-11 px-0",
            })}
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      </dialog>
    </>
  );
}
