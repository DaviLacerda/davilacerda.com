"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

export type LatestPostNoticeProps = {
  /** Remembered once read or dismissed, so the notice shows once per post. */
  id: string;
  url: string;
  /** The post's URL in every language, so reading either one counts. */
  urls: string[];
  title: string;
  description: string;
  cover?: string;
  accent?: string;
  labels: { newPost: string; readNow: string; dismiss: string };
};

const KEY = "latest-post-seen";
const DELAY_MS = 2200;

function seen(id: string): boolean {
  try {
    return window.localStorage.getItem(KEY) === id;
  } catch {
    return false;
  }
}

function remember(id: string) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Private mode or blocked storage: the notice may come back, that's all.
  }
}

/**
 * "New on the blog": a small card that slides in at the corner of every
 * page but the home (which features the post) and the post itself, a moment
 * after the page settles. Not a modal: the page stays usable and nothing
 * takes focus. It shows once per post: opening the post or closing the card
 * remembers it in this browser.
 */
export function LatestPostNotice({
  id,
  url,
  urls,
  title,
  description,
  cover,
  accent,
  labels,
}: LatestPostNoticeProps) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  const isHome = /^\/[a-z-]+\/?$/.test(pathname);
  const onPost = urls.includes(pathname);

  // Opening the post counts as reading it.
  useEffect(() => {
    if (onPost) remember(id);
  }, [id, onPost]);

  // Elsewhere (but home), the card arrives a moment after the page settles.
  useEffect(() => {
    if (onPost || isHome || seen(id)) return;
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [id, isHome, onPost]);

  const visible = open && !onPost && !isHome;

  const close = () => {
    remember(id);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          aria-label={labels.newPost}
          data-notice=""
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", duration: 0.45, bounce: 0.12 }}
          style={{ "--accent": accent ?? "currentColor" } as CSSProperties}
          className="fixed inset-x-4 top-4 z-40 mx-auto max-w-sm rounded-[1.25rem] bg-background p-2 shadow-[0_0_0_1px_var(--border),0_24px_48px_-20px_rgb(0_0_0/0.35)] sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:mx-0"
        >
          <div className="flex items-stretch gap-3">
            <Link
              href={url}
              onClick={() => remember(id)}
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-[0.9rem] p-2 transition-colors duration-200 ease-out hover:bg-surface"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- a small, already optimized WebP
                <img
                  src={cover}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rotate-[-2deg] rounded-md bg-surface object-cover shadow-[0_6px_14px_-8px_rgb(0_0_0/0.45)] transition-transform duration-300 ease-out group-hover:rotate-0"
                />
              ) : null}
              <span className="min-w-0">
                <span className="block font-hand text-[1.3rem] leading-none font-semibold text-(--accent)">
                  {labels.newPost}
                </span>
                <span className="mt-1 line-clamp-2 block text-small font-semibold">
                  {title}
                </span>
                <span className="sr-only">{description}</span>
                <span className="mt-1 block text-[0.8rem] text-muted-foreground">
                  {labels.readNow} →
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label={labels.dismiss}
              className="grid size-8 shrink-0 place-items-center self-start rounded-full text-muted-foreground transition-colors duration-200 ease-out hover:bg-surface hover:text-foreground"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
