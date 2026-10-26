"use client";

import { MusicNotesSimpleIcon } from "@phosphor-icons/react/dist/ssr/MusicNotesSimple";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState, type ReactNode } from "react";

import {
  hasTrack,
  NOW_PLAYING_PATH,
  type NowPlaying,
} from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

export type NowPlayingStrings = {
  /** "Listening now" */
  playing: string;
  /** "Last played" */
  recent: string;
  /** "On Spotify": the card when there is no song to show. */
  onSpotify: string;
  /** "{status} on Spotify: {title}, {artists}" (the link's accessible name). */
  label: string;
  /** "Now playing: {title}, {artists}" (announced when the song changes). */
  changed: string;
  opensInNewTab: string;
};

type NowPlayingCardProps = {
  /** Davi's Spotify profile: the link while loading, without JavaScript and when no song can be shown. */
  profileUrl: string;
  handle: string;
  strings: NowPlayingStrings;
  /** The Spotify logo, rendered on the server (`<BrandLogo id="spotify" />`). */
  logo: ReactNode;
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
 * What Davi is listening to on Spotify, under the hello on the Personal tab.
 *
 * Fetches `/api/now-playing` on mount and every 30 seconds while the tab is
 * visible (it stops when the tab is hidden and catches up when it comes
 * back). One card of fixed size in every state, so nothing on the page moves:
 * a skeleton while loading; the cover, the song and the artists, with a small
 * equalizer while it plays or "Last played" otherwise; and when there is no
 * song to show (Spotify not set up or unreachable), a quiet link to the
 * profile. A new song crossfades in (blur and a 6px rise, 250ms ease-out;
 * reduced motion: a fade) once its cover has loaded, and is announced
 * politely; the first one is not. Without JavaScript the card is the profile
 * link.
 */
export function NowPlayingCard({
  profileUrl,
  handle,
  strings,
  logo,
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
  const label = track
    ? fill(strings.label, { status, title: track.title, artists })
    : `${strings.onSpotify}, ${handle}`;
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

  const profileView = (
    <>
      <span className="grid size-16 shrink-0 place-items-center rounded-[8px] bg-background text-muted-foreground">
        <MusicNotesSimpleIcon aria-hidden="true" className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-6 font-medium">{strings.onSpotify}</span>
        <span className="block truncate text-small leading-5 text-muted-foreground">
          {handle}
        </span>
      </span>
    </>
  );

  return (
    <div className={cn("w-full sm:w-[25rem]", className)}>
      <a
        href={track?.url ?? profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (${strings.opensInNewTab})`}
        aria-busy={data === null}
        className="flex h-[5.5rem] pressable-panel items-center gap-4 rounded-surface bg-surface p-3 pr-5 hover:bg-surface-strong"
      >
        <span className="grid min-w-0 flex-1 *:col-start-1 *:row-start-1">
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
              className="flex min-w-0 items-center gap-4"
            >
              {data === null ? (
                <>
                  <span
                    aria-hidden="true"
                    className="flex min-w-0 flex-1 items-center gap-4 noscript:hidden"
                  >
                    <span className="size-16 shrink-0 rounded-[8px] bg-surface-strong" />
                    <span className="flex flex-1 flex-col gap-2.5">
                      <span className="h-3 w-20 rounded-full bg-surface-strong" />
                      <span className="h-3.5 w-40 max-w-full rounded-full bg-surface-strong" />
                      <span className="h-3 w-28 rounded-full bg-surface-strong" />
                    </span>
                  </span>
                  <span className="hidden min-w-0 flex-1 items-center gap-4 noscript:flex">
                    {profileView}
                  </span>
                </>
              ) : track ? (
                <>
                  {track.albumArt ? (
                    // Spotify's CDN already serves the cover at 300px; the
                    // image optimizer would only re-encode an ever-changing URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={track.albumArt}
                      alt=""
                      width={64}
                      height={64}
                      decoding="async"
                      className="size-16 shrink-0 rounded-[8px] bg-surface-strong object-cover"
                    />
                  ) : (
                    <span className="grid size-16 shrink-0 place-items-center rounded-[8px] bg-background text-muted-foreground">
                      <MusicNotesSimpleIcon
                        aria-hidden="true"
                        className="size-6"
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-small leading-5 text-muted-foreground">
                      {track.status === "playing" ? <Equalizer /> : null}
                      {status}
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
        </span>
        {logo}
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
