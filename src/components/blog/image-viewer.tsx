"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useCallback, useEffect, useRef, useState } from "react";

type Shot = { src: string; alt: string; caption: string };

/**
 * A post's prints open full size on the page itself: a click on a print
 * (its link goes to the image file, which is what happens without
 * JavaScript) opens a native modal dialog with the image and its caption.
 * Escape, the close button or a click outside closes it; the arrow keys and
 * buttons step through the post's other prints. Focus returns to the print.
 */
export function ImageViewer({
  selector = ".markdown",
  labels,
}: {
  selector?: string;
  labels: { close: string; open: string; previous: string; next: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) return;
    const links = Array.from(
      root.querySelectorAll<HTMLAnchorElement>("a.print-image"),
    );
    const list = links.map((link) => {
      const img = link.querySelector("img");
      return {
        src: link.href,
        alt: img?.alt ?? "",
        caption:
          link.parentElement?.querySelector("figcaption")?.textContent ?? "",
      };
    });
    for (const link of links) {
      if (!link.getAttribute("aria-label")) {
        const alt = link.querySelector("img")?.alt;
        link.setAttribute(
          "aria-label",
          alt ? `${labels.open}: ${alt}` : labels.open,
        );
      }
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as Element).closest("a.print-image");
      if (!link) return;
      const at = links.indexOf(link as HTMLAnchorElement);
      if (at < 0) return;
      event.preventDefault();
      opener.current = link as HTMLElement;
      setShots(list);
      setIndex(at);
      dialog.current?.showModal();
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [selector, labels.open]);

  const close = useCallback(() => dialog.current?.close(), []);
  const step = useCallback(
    (by: number) =>
      setIndex((i) =>
        shots.length ? (i + by + shots.length) % shots.length : i,
      ),
    [shots.length],
  );

  const shot = shots[index];

  return (
    <dialog
      ref={dialog}
      aria-label={shot?.caption || shot?.alt || labels.open}
      className="image-viewer"
      onClose={() => {
        setIndex(-1);
        opener.current?.focus();
      }}
      onClick={(event) => {
        // A click on the backdrop (the dialog itself, outside the figure).
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") step(1);
        if (event.key === "ArrowLeft") step(-1);
      }}
    >
      {shot ? (
        <figure key={shot.src} className="image-viewer-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- the post's own, already optimized WebP */}
          <img src={shot.src} alt={shot.alt} decoding="async" />
          {shot.caption ? <figcaption>{shot.caption}</figcaption> : null}
        </figure>
      ) : null}
      <button
        type="button"
        onClick={close}
        aria-label={labels.close}
        className="image-viewer-button image-viewer-close"
        autoFocus
      >
        <XIcon aria-hidden="true" className="size-5" />
      </button>
      {shots.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={labels.previous}
            className="image-viewer-button image-viewer-prev"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={labels.next}
            className="image-viewer-button image-viewer-next"
          >
            <ArrowRightIcon aria-hidden="true" className="size-5" />
          </button>
        </>
      ) : null}
    </dialog>
  );
}
