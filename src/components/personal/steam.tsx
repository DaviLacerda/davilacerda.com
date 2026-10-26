"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState, type ReactNode } from "react";

import { STEAM_PATH, type SteamStatus } from "@/lib/steam/types";
import { cn } from "@/lib/utils";

import { CardText, cardClass, fill, liveUrl, LiveDot, Tile } from "./parts";

export type SteamStrings = {
  /** "Playing now" */
  playing: string;
  /** "Last two weeks" */
  recent: string;
  /** "On Steam": the card when there is nothing live to show. */
  onSteam: string;
  /** "{count} games" */
  library: string;
  /** "{status} on Steam: {game}" (the link's accessible name). */
  label: string;
  /** "Now playing on Steam: {game}" (announced when it changes). */
  changed: string;
  opensInNewTab: string;
};

type SteamCardProps = {
  profileUrl: string;
  handle: string;
  strings: SteamStrings;
  /** `Intl` locale for the hours ("18 hours", "18 horas"). */
  locale: string;
  /** The Steam logo, rendered on the server (`<BrandLogo id="steam" />`). */
  logo: ReactNode;
  className?: string;
};

const POLL_MS = 60_000;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type View =
  | { kind: "loading" }
  | { kind: "playing"; game: string }
  | { kind: "recent"; game: string; minutes: number }
  | { kind: "profile"; gameCount: number | null };

function viewOf(data: SteamStatus | null): View {
  if (!data) return { kind: "loading" };
  if (data.status !== "ok") return { kind: "profile", gameCount: null };
  if (data.playing) return { kind: "playing", game: data.playing.name };
  const top = data.recent[0];
  if (top)
    return { kind: "recent", game: top.name, minutes: top.recentMinutes };
  return { kind: "profile", gameCount: data.gameCount };
}

function keyOf(view: View): string {
  return view.kind === "playing" || view.kind === "recent"
    ? `${view.kind}:${view.game}`
    : view.kind;
}

/** Playtime in words: "18 hours", "1.5 hours", "40 minutes" (or "18 horas"...). */
function playtime(minutes: number, locale: string): string {
  const unit = minutes < 60 ? "minute" : "hour";
  const value = unit === "minute" ? minutes : minutes / 60;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    unitDisplay: "long",
    maximumFractionDigits: value < 10 && unit === "hour" ? 1 : 0,
  }).format(value);
}

/**
 * Davi on Steam, in the Games section: the game running now (with the live
 * dot), else the one he played most in the last two weeks and for how long,
 * else the profile (and the library's size when known). Fetches
 * `/api/steam` on mount and every minute while the tab is visible, like the
 * Spotify card; the whole card links to the Steam profile, which is also
 * what shows while loading fails, without the key and without JavaScript.
 * A new game crossfades in (6px rise out of a 4px blur, 250ms; reduced
 * motion: a fade) and is announced politely.
 */
export function SteamCard({
  profileUrl,
  handle,
  strings,
  locale,
  logo,
  className,
}: SteamCardProps) {
  const [{ data, firstKey }, setState] = useState<{
    data: SteamStatus | null;
    firstKey: string | null;
  }>({ data: null, firstKey: null });
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
      let next: SteamStatus;
      try {
        const response = await fetch(liveUrl(STEAM_PATH), {
          cache: "no-store",
          signal: current.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        next = (await response.json()) as SteamStatus;
      } catch {
        if (current.signal.aborted) return;
        setState((previous) =>
          previous.data
            ? previous
            : { data: { status: "offline" }, firstKey: "profile" },
        );
        return;
      }
      if (current.signal.aborted) return;
      setState((previous) => ({
        data: next,
        firstKey: previous.firstKey ?? keyOf(viewOf(next)),
      }));
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

  const view = viewOf(data);
  const key = keyOf(view);
  const status =
    view.kind === "playing"
      ? strings.playing
      : view.kind === "recent"
        ? strings.recent
        : strings.onSteam;
  const label =
    view.kind === "playing" || view.kind === "recent"
      ? fill(strings.label, { status, game: view.game })
      : `${strings.onSteam}, ${handle}`;
  const announcement =
    view.kind === "playing" && key !== firstKey
      ? fill(strings.changed, { game: view.game })
      : "";

  const settled = {
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
  };
  const enterFrom = reduce
    ? { ...settled, opacity: 0 }
    : { opacity: 0, transform: "translateY(6px)", filter: "blur(4px)" };
  const exitTo = reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" };

  const profileText = (gameCount: number | null) => (
    <CardText
      status={strings.onSteam}
      title={handle}
      detail={
        gameCount
          ? fill(strings.library, {
              count: new Intl.NumberFormat(locale).format(gameCount),
            })
          : undefined
      }
    />
  );

  return (
    <div className={cn("w-full", className)}>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (${strings.opensInNewTab})`}
        aria-busy={data === null}
        className={cn(cardClass, "pressable-panel hover:bg-surface-strong")}
      >
        <Tile>{logo}</Tile>
        <span className="grid min-w-0 flex-1 *:col-start-1 *:row-start-1">
          <AnimatePresence initial={false}>
            <m.span
              key={key}
              initial={enterFrom}
              animate={settled}
              exit={{
                ...exitTo,
                transition: { duration: 0.15, ease: EASE_OUT },
              }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="flex min-w-0"
            >
              {view.kind === "loading" ? (
                <>
                  <span
                    aria-hidden="true"
                    className="flex flex-1 flex-col gap-2.5 noscript:hidden"
                  >
                    <span className="h-3 w-20 rounded-full bg-surface-strong" />
                    <span className="h-3.5 w-36 max-w-full rounded-full bg-surface-strong" />
                    <span className="h-3 w-24 rounded-full bg-surface-strong" />
                  </span>
                  <span className="hidden min-w-0 flex-1 noscript:flex">
                    {profileText(null)}
                  </span>
                </>
              ) : view.kind === "profile" ? (
                profileText(view.gameCount)
              ) : (
                <CardText
                  status={
                    <>
                      {view.kind === "playing" ? <LiveDot /> : null}
                      {status}
                    </>
                  }
                  title={view.game}
                  detail={
                    view.kind === "recent"
                      ? playtime(view.minutes, locale)
                      : undefined
                  }
                />
              )}
            </m.span>
          </AnimatePresence>
        </span>
        <ArrowUpRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </a>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
