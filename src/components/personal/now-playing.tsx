"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { MusicNotesSimpleIcon } from "@phosphor-icons/react/dist/ssr/MusicNotesSimple";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import {
  hasTrack,
  NOW_PLAYING_PATH,
  type NowPlaying,
} from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

import { tileClass, tileLinkClass } from "./parts";

export type NowPlayingStrings = {
  /** "Listening now" */
  playing: string;
  /** "Last played" */
  recent: string;
  /** "On Spotify": the card when there is no song to show. */
  onSpotify: string;
  /** "Listen on Spotify": that card's call to action. */
  listen: string;
  /** "{status} on Spotify: {title}, {artists}" (the link's accessible name). */
  label: string;
  /** "Now playing: {title}, {artists}" (announced when the song changes). */
  changed: string;
  opensInNewTab: string;
};

type NowPlayingCardProps = {
  /** Davi's Spotify profile: the link while loading, without JavaScript and when no song can be shown. */
  profileUrl: string;
  /** The profile's handle, shown as "@handle". */
  handle: string;
  strings: NowPlayingStrings;
  /** The Spotify logo, 16px on a phone (it leads the status line) and 24px from 640px (beside the cover), rendered on the server (`<BrandLogo id="spotify" />`). */
  logo: ReactNode;
  /** The same logo at 40px: the picture of the card when there is no song. */
  mark: ReactNode;
  /** Place of the tile in the first-paint entrance (`--i`). */
  enter?: number;
  className?: string;
};

const POLL_MS = 30_000;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type State = {
  data: NowPlaying | null;
  /** What the first answer showed: changes after it are announced, the first one is not. */
  firstKey: string | null;
};

function keyOf(data: NowPlaying): string {
  return hasTrack(data) ? `${data.status}:${data.url}` : data.status;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? (values[key] ?? match) : match,
  );
}

/** Resolves once the cover is in the browser cache (or after 3s), so it swaps in with its text. */
function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new window.Image();
    const done = () => resolve();
    image.onload = done;
    image.onerror = done;
    window.setTimeout(done, 3000);
    image.src = src;
  });
}

/**
 * What Davi is listening to on Spotify: a tile of the Personal tab's bento
 * grid, the whole tile a link.
 *
 * Fetches `/api/now-playing` on mount and every 30 seconds while the tab is
 * visible (it stops when the tab is hidden and catches up when it comes
 * back). The tile keeps its size in every state, so nothing on the page
 * moves: a skeleton while loading; the cover with the Spotify logo beside
 * it, then the song and the artists, with a small equalizer while it plays
 * or "Last played" otherwise (on a phone the cover fills the tile's width
 * and the logo leads that status line instead); and when there is no song to show (Spotify
 * not set up or unreachable), the Spotify logo, the handle and "Listen on
 * Spotify", linking to the profile. A new song crossfades in (blur and a 6px
 * rise, 250ms ease-out; reduced motion: a fade) once its cover has loaded,
 * and is announced politely; the first one is not. Without JavaScript the
 * tile is the profile link.
 */
export function NowPlayingCard({
  profileUrl,
  handle,
  strings,
  logo,
  mark,
  enter,
  className,
}: NowPlayingCardProps) {
  const [{ data, firstKey }, setState] = useState<State>({
    data: null,
    firstKey: null,
  });
  const reduce = useReducedMotion();

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let lastLoad = 0;

    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      lastLoad = Date.now();
      let next: NowPlaying;
      try {
        const response = await fetch(NOW_PLAYING_PATH, {
          cache: "no-store",
          signal: current.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        next = (await response.json()) as NowPlaying;
        if (hasTrack(next) && next.albumArt) await preload(next.albumArt);
      } catch {
        if (current.signal.aborted) return;
        // Keep what is on screen; with nothing yet, show the profile link.
        setState((previous) =>
          previous.data
            ? previous
            : { data: { status: "offline" }, firstKey: "offline" },
        );
        return;
      }
      if (current.signal.aborted) return;
      const key = keyOf(next);
      setState((previous) =>
        previous.data && keyOf(previous.data) === key
          ? previous
          : { data: next, firstKey: previous.firstKey ?? key },
      );
    }

    function schedule(delay: number) {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, delay);
    }

    async function tick() {
      await load();
      if (active && !document.hidden) schedule(POLL_MS);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        window.clearTimeout(timer);
        return;
      }
      schedule(Math.max(0, POLL_MS - (Date.now() - lastLoad)));
    }

    void tick();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const track = data && hasTrack(data) ? data : null;
  const view = data === null ? "loading" : track ? track.url : "profile";
  const artists = track ? track.artists.join(", ") : "";
  const status = track?.status === "playing" ? strings.playing : strings.recent;
  const at = `@${handle}`;
  const label = track
    ? fill(strings.label, { status, title: track.title, artists })
    : `${strings.listen}, ${at}`;
  const announcement =
    data && track?.status === "playing" && keyOf(data) !== firstKey
      ? fill(strings.changed, { title: track.title, artists })
      : "";

  // The settled state is the same with and without reduced motion, so the
  // server HTML and the first client render always match.
  const settled = {
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
  };
  const enterFrom = reduce
    ? { ...settled, opacity: 0 }
    : { opacity: 0, transform: "translateY(6px)", filter: "blur(4px)" };
  const exitTo = reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" };

  // No song: the Spotify mark, the handle and a call to action, quiet and
  // deliberate (also the card without JavaScript).
  const profileView = (
    <>
      <span className="grid aspect-square w-full place-items-center rounded-[10px] bg-background sm:size-20">
        {mark}
      </span>
      <span className="min-w-0">
        <span className="block text-small leading-5 text-muted-foreground">
          {strings.onSpotify}
        </span>
        <span className="block truncate leading-6 font-medium">{at}</span>
        <span className="mt-2 inline-flex max-w-full items-center gap-1 text-small font-medium sm:mt-3 sm:h-8 sm:gap-1.5 sm:rounded-full sm:bg-background sm:px-3">
          <span className="truncate">{strings.listen}</span>
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </span>
      </span>
    </>
  );

  return (
    <div
      {...(enter === undefined
        ? {}
        : { "data-enter": "", style: { "--i": enter } as CSSProperties })}
      className={cn("min-w-0", className)}
    >
      <a
        href={track?.url ?? profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (${strings.opensInNewTab})`}
        aria-busy={data === null}
        className={cn(
          tileClass,
          tileLinkClass,
          "grid h-full min-h-[13rem] p-4 *:col-start-1 *:row-start-1 sm:p-6",
        )}
      >
        <AnimatePresence initial={false}>
          <m.span
            key={view}
            initial={enterFrom}
            animate={settled}
            exit={{
              ...exitTo,
              transition: { duration: 0.15, ease: EASE_OUT },
            }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="flex min-w-0 flex-col justify-between gap-5"
          >
            {data === null ? (
              <>
                <span
                  aria-hidden="true"
                  className="flex min-w-0 flex-1 flex-col justify-between gap-5 noscript:hidden"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="aspect-square w-full rounded-[10px] bg-surface-strong sm:size-20" />
                    <span className="hidden size-6 shrink-0 rounded-full bg-surface-strong sm:block" />
                  </span>
                  <span className="flex flex-col gap-2.5">
                    <span className="h-3 w-20 rounded-full bg-surface-strong" />
                    <span className="h-3.5 w-32 max-w-full rounded-full bg-surface-strong" />
                    <span className="h-3 w-24 max-w-full rounded-full bg-surface-strong" />
                  </span>
                </span>
                <span className="hidden min-w-0 flex-1 flex-col justify-between gap-5 noscript:flex">
                  {profileView}
                </span>
              </>
            ) : track ? (
              <>
                <span className="flex items-start justify-between gap-3">
                  {track.albumArt ? (
                    // Spotify's CDN already serves the cover at 300px; the
                    // image optimizer would only re-encode an ever-changing URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.albumArt}
                      alt=""
                      width={160}
                      height={160}
                      decoding="async"
                      className="aspect-square w-full min-w-0 shrink-0 rounded-[10px] bg-surface-strong object-cover sm:size-20"
                    />
                  ) : (
                    <span className="grid aspect-square w-full shrink-0 place-items-center rounded-[10px] bg-background text-muted-foreground sm:size-20">
                      <MusicNotesSimpleIcon
                        aria-hidden="true"
                        className="size-6"
                      />
                    </span>
                  )}
                  <span className="hidden shrink-0 sm:block">{logo}</span>
                </span>
                <span className="min-w-0">
                  {/* On a phone the tile is narrow: the Spotify mark leads
                      the status line in place of the bars. */}
                  <span className="flex items-center gap-2 text-small leading-5 text-muted-foreground">
                    <span className="flex shrink-0 sm:hidden">{logo}</span>
                    {track.status === "playing" ? (
                      <span className="hidden sm:flex">
                        <Equalizer />
                      </span>
                    ) : null}
                    <span className="min-w-0 truncate">{status}</span>
                  </span>
                  <span className="block truncate leading-6 font-medium">
                    {track.title}
                  </span>
                  <span className="block truncate text-small leading-5 text-muted-foreground">
                    {artists}
                  </span>
                </span>
              </>
            ) : (
              profileView
            )}
          </m.span>
        </AnimatePresence>
      </a>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/**
 * Four bars that bounce while a song plays (CSS, `data-eq` in globals.css;
 * still bars of different heights with reduced motion).
 */
function Equalizer() {
  return (
    <span
      aria-hidden="true"
      className="flex h-3 items-end gap-0.5 text-foreground"
    >
      {[0, 1, 2, 3].map((bar) => (
        <span
          key={bar}
          data-eq=""
          className="h-full w-[3px] rounded-[1px] bg-current"
        />
      ))}
    </span>
  );
}
