"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

import type { Dictionary } from "@/i18n";
import {
  TRACKERS_PATH,
  type Rank,
  type TrackerId,
  type TrackersResponse,
  type TrackerStats,
} from "@/lib/trackers/types";
import { cn } from "@/lib/utils";

import { cardClass, CardText, fill, liveUrl, Tile } from "./parts";

type GamesStrings = Dictionary["personal"]["games"];

export type TrackerStrings = Pick<
  GamesStrings,
  "profile" | "stats" | "ranks"
> & {
  opensInNewTab: string;
};

export type TrackerGame = {
  id: TrackerId;
  title: string;
  handle: string;
  url: string;
  /** What the link opens ("Stats on Tracker.gg"), in the page's language. */
  label: string;
  /** The game's logo at 32px, rendered on the server. */
  logo: ReactNode;
};

type TrackerCardsProps = {
  games: TrackerGame[];
  /** Which games have their key: those reserve room for their stats from the first paint. */
  configured: Record<TrackerId, boolean>;
  strings: TrackerStrings;
  /** `Intl` locale for the numbers ("1.21", "1,21"). */
  locale: string;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** "Gold 2", "Platina III", "Radiant". */
export function rankName(rank: Rank, strings: TrackerStrings): string {
  const name = strings.ranks[rank.tier];
  return rank.division ? `${name} ${rank.division}` : name;
}

/**
 * The Valorant and Rainbow Six Siege rows of the Games tile, as list items.
 *
 * With its key set (`/api/trackers`, asked once on mount), a game shows its
 * rank (Valorant's emblem in the picture, otherwise the game's logo), the
 * points inside it, then K/D, win rate and level, and what they cover.
 * Without the key, while the source fails and without JavaScript, the row
 * is the link it always was: the logo, the game, Davi's name there and
 * "Stats on Tracker.gg". A configured game holds a skeleton of its stats
 * while loading, so nothing moves when they arrive (they crossfade in: a
 * 6px rise out of a 4px blur, 250ms ease-out; reduced motion: a fade). The
 * whole row links to the game's Tracker.gg profile in every state.
 */
export function TrackerCards({
  games,
  configured,
  strings,
  locale,
}: TrackerCardsProps) {
  const [data, setData] = useState<TrackersResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(liveUrl(TRACKERS_PATH), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TrackersResponse>;
      })
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return games.map((game) => {
    const status = data?.[game.id];
    const stats = status?.status === "ok" ? status : null;
    const waiting = !data && !failed && configured[game.id];
    return (
      <li key={game.id} className="min-w-0">
        <TrackerCard
          game={game}
          stats={stats}
          waiting={waiting}
          strings={strings}
          locale={locale}
        />
      </li>
    );
  });
}

function TrackerCard({
  game,
  stats,
  waiting,
  strings,
  locale,
}: {
  game: TrackerGame;
  stats: TrackerStats | null;
  waiting: boolean;
  strings: TrackerStrings;
  locale: string;
}) {
  const reduce = useReducedMotion();
  const view = stats ? "stats" : waiting ? "waiting" : "link";
  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  const percent = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(value);

  const rank = stats?.rank ? rankName(stats.rank, strings) : null;
  const points = stats?.points
    ? `${number(stats.points.value)} ${stats.points.unit}`
    : null;
  const figures = stats
    ? [
        stats.kd !== null
          ? { label: strings.stats.kd, value: number(stats.kd, 2) }
          : null,
        stats.winRate !== null
          ? { label: strings.stats.winRate, value: percent(stats.winRate) }
          : null,
        stats.level !== null
          ? { label: strings.stats.level, value: number(stats.level) }
          : null,
      ].filter((figure) => figure !== null)
    : [];
  const scope =
    stats?.scope?.kind === "matches"
      ? fill(strings.stats.matches, { count: stats.scope.count })
      : stats?.scope?.kind === "season"
        ? strings.stats.season
        : null;

  const link = fill(strings.profile, {
    title: game.title,
    handle: game.handle,
    label: game.label,
  });
  const label = stats
    ? [
        `${game.title}, ${game.handle}: ${[rank ?? strings.ranks.unranked, points].filter(Boolean).join(", ")}`,
        figures.map((figure) => `${figure.label} ${figure.value}`).join(", "),
        scope,
        game.label,
      ]
        .filter(Boolean)
        .join(". ")
    : link;

  const settled = {
    opacity: 1,
    transform: "translateY(0px)",
    filter: "blur(0px)",
  };
  const enterFrom = reduce
    ? { ...settled, opacity: 0 }
    : { opacity: 0, transform: "translateY(6px)", filter: "blur(4px)" };

  return (
    <a
      href={game.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (${strings.opensInNewTab})`}
      aria-busy={waiting}
      className={cn(
        cardClass,
        "grid h-full pressable-panel *:col-start-1 *:row-start-1 hover:bg-surface-strong",
      )}
    >
      <AnimatePresence initial={false}>
        <m.span
          key={view}
          initial={enterFrom}
          animate={settled}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="flex min-w-0 flex-col"
        >
          <span className="flex min-w-0 items-center gap-4">
            <Tile>
              {stats?.rank?.icon ? (
                <Image
                  src={stats.rank.icon}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 object-contain"
                />
              ) : (
                game.logo
              )}
            </Tile>
            {stats ? (
              <CardText
                status={game.title}
                title={rank ?? strings.ranks.unranked}
                detail={points ?? game.handle}
              />
            ) : waiting ? (
              <>
                <span
                  aria-hidden="true"
                  className="flex flex-1 flex-col gap-2.5 noscript:hidden"
                >
                  <span className="h-3 w-20 rounded-full bg-surface-strong" />
                  <span className="h-3.5 w-28 rounded-full bg-surface-strong" />
                  <span className="h-3 w-16 rounded-full bg-surface-strong" />
                </span>
                <span className="hidden min-w-0 flex-1 noscript:flex">
                  <CardText
                    status={game.label}
                    title={game.title}
                    detail={game.handle}
                  />
                </span>
              </>
            ) : (
              <CardText
                status={game.label}
                title={game.title}
                detail={game.handle}
              />
            )}
            <ArrowUpRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          </span>
          {stats && figures.length > 0 ? (
            <>
              <span className="mt-4 grid grid-cols-3 gap-3">
                {figures.map((figure) => (
                  <span key={figure.label} className="flex flex-col">
                    <span className="text-lead leading-7 font-semibold tracking-[-0.01em] tabular-nums">
                      {figure.value}
                    </span>
                    <span className="text-small leading-5 text-muted-foreground">
                      {figure.label}
                    </span>
                  </span>
                ))}
              </span>
              {scope ? (
                <span className="mt-3 block truncate text-small leading-5 text-muted-foreground">
                  {scope}
                </span>
              ) : null}
            </>
          ) : waiting ? (
            <span
              aria-hidden="true"
              className="mt-4 grid grid-cols-3 gap-3 noscript:hidden"
            >
              {[0, 1, 2].map((index) => (
                <span key={index} className="flex flex-col gap-2 py-1">
                  <span className="h-4 w-12 rounded-full bg-surface-strong" />
                  <span className="h-3 w-16 rounded-full bg-surface-strong" />
                </span>
              ))}
            </span>
          ) : null}
        </m.span>
      </AnimatePresence>
    </a>
  );
}
