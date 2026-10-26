"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import {
  competitionLabel,
  regulationPeriods,
  TEAMS_PATH,
  type Game,
  type Side,
  type Sport,
  type TeamLogo,
  type TeamStatus,
  type TeamsResponse,
} from "@/lib/teams/types";
import { cn } from "@/lib/utils";

import { fill, liveUrl, LiveDot } from "./parts";

export type TeamsStrings = Dictionary["personal"]["teams"] & {
  opensInNewTab: string;
};

type TeamsBoardProps = {
  /** The teams from `src/content/personal.ts` (`game: null`): what shows before the first answer. */
  teams: TeamStatus[];
  lang: Locale;
  /** `Intl` locale for dates and times. */
  locale: string;
  strings: TeamsStrings;
  /** Place in the first-paint entrance (see `Reveal`). */
  enter?: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** While a game is live (or about to start), ask again every minute. */
const POLL_MS = MINUTE;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type State = {
  data: TeamsResponse | null;
  /** When the data arrived: "today" and "tomorrow" are counted from here. */
  at: number;
  /** The request failed before anything arrived. */
  failed: boolean;
  /** The answer before this one: a game going live or ending is announced (never on the first answer). */
  previous: TeamsResponse | null;
};

/**
 * When to ask again: every minute while a game is live or its start has
 * come; at the start of a game within the next six hours; otherwise never
 * (the page shows what it loaded with).
 */
function nextDelay(data: TeamsResponse, now: number): number | null {
  let delay: number | null = null;
  for (const { game } of data.teams) {
    if (game?.state === "live") return POLL_MS;
    if (game?.state !== "upcoming") continue;
    const until = Date.parse(game.start) - now;
    if (until > 6 * HOUR || until < -3 * HOUR) continue;
    const wait = Math.max(POLL_MS, until);
    delay = delay === null ? wait : Math.min(delay, wait);
  }
  return delay;
}

/* ------------------------------------------------------------- Formats */

function dayOffset(time: number, now: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / DAY);
}

function capitalize(value: string, locale: string): string {
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

/** "today", "yesterday", "tomorrow", a weekday this week ahead, else "Oct 25" (in the viewer's time zone). */
function dayLabel(time: number, now: number, locale: string): string {
  const offset = dayOffset(time, now);
  if (Math.abs(offset) <= 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      offset,
      "day",
    );
  }
  if (offset > 1 && offset < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(time);
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(time);
}

/** "Q3 7:32", "OT 2:10", "Halftime", "67'". */
function liveDetail(
  game: Extract<Game, { state: "live" }>,
  sport: Sport,
  strings: TeamsStrings,
): string {
  if (game.phase === "halftime") return strings.halftime;
  if (game.phase === "shootout") return strings.shootout;
  if (game.phase === "delayed") return strings.delayed;
  if (sport === "soccer") return game.clock;
  const regulation = regulationPeriods[sport];
  const { period } = game;
  if (period < 1) return game.clock;
  if (game.phase === "break") {
    return period <= regulation
      ? fill(strings.endOf, { n: period })
      : strings.overtime;
  }
  const name =
    period <= regulation
      ? fill(strings.quarter, { n: period })
      : period === regulation + 1
        ? strings.overtime
        : fill(strings.overtimeN, { n: period - regulation });
  return game.clock ? `${name} ${game.clock}` : name;
}

/** The status line's right side as text: "Final, yesterday", "Tomorrow, 7:30 PM". */
function whenText(
  game: Game,
  now: number,
  locale: string,
  strings: TeamsStrings,
): string {
  const start = Date.parse(game.start);
  if (game.state === "final") {
    const offset = dayOffset(start, now);
    const when =
      offset === 0 || offset === -1
        ? dayLabel(start, now, locale)
        : new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
          }).format(start);
    return fill(strings.final, { when });
  }
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  return `${capitalize(dayLabel(start, now, locale), locale)}, ${time}`;
}

/* ------------------------------------------------------------ Board */

/**
 * Live or last results of Davi's teams, under "My teams" on the Personal
 * tab: one card per team (three across from 640px, stacked on a phone) with
 * the competition, the state of the game, and Davi's team and the opponent
 * with their logos and scores.
 *
 * - Data: `/api/teams` once on mount; again every minute only while a game
 *   is live (or its start has come) and the tab is visible, and once at the
 *   start of a game due within six hours. Hidden tabs stop asking and catch
 *   up when they return.
 * - States, all the same size: a skeleton while loading; live (an ink dot
 *   with a soft pulse, "Live", the period and clock); final (with the day;
 *   the losing side in grey); the next game (day and time in the viewer's
 *   time zone and the page's language); and when ESPN cannot be read, the
 *   team and a quiet "—". Without JavaScript: the teams and the "—".
 * - Motion: a score that changes rolls, the old number leaving upward and
 *   the new one rising out of a 3px blur (280ms ease-out; reduced motion:
 *   a fade). A game going live or ending is announced politely.
 * - Each card links to the game on espn.com when there is one.
 */
export function TeamsBoard({
  teams,
  lang,
  locale,
  strings,
  enter,
}: TeamsBoardProps) {
  const [{ data, at, failed, previous }, setState] = useState<State>({
    data: null,
    at: 0,
    failed: false,
    previous: null,
  });
  const news = previous && data ? announce(previous, data, strings) : "";

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let latest: TeamsResponse | null = null;

    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      let next: TeamsResponse;
      try {
        const response = await fetch(liveUrl(TEAMS_PATH), {
          cache: "no-store",
          signal: current.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        next = (await response.json()) as TeamsResponse;
        if (!Array.isArray(next.teams)) throw new Error("bad answer");
      } catch {
        if (current.signal.aborted) return;
        // Keep what is on screen; with nothing yet, show the quiet "—".
        setState((previous) =>
          previous.data ? previous : { ...previous, failed: true },
        );
        return;
      }
      if (current.signal.aborted) return;
      latest = next;
      const at = Date.now();
      setState((state) => ({
        data: next,
        at,
        failed: false,
        previous: state.data,
      }));
    }

    function schedule() {
      window.clearTimeout(timer);
      if (!active || document.hidden || !latest) return;
      const delay = nextDelay(latest, Date.now());
      if (delay !== null) timer = window.setTimeout(tick, delay);
    }

    async function tick() {
      await load();
      schedule();
    }

    function onVisibilityChange() {
      if (document.hidden) {
        window.clearTimeout(timer);
        return;
      }
      // Back on the tab: catch up at once if a game is live or due.
      if (latest && nextDelay(latest, Date.now()) !== null) void tick();
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

  return (
    <>
      <Reveal
        as="ul"
        stagger
        enter={enter}
        className="mt-4 grid gap-3 sm:grid-cols-3"
      >
        {teams.map((team) => {
          const shown = data?.teams.find((item) => item.id === team.id);
          return (
            <li key={team.id}>
              <TeamCard
                team={team}
                game={shown?.game ?? null}
                mode={data ? "ready" : failed ? "failed" : "loading"}
                lang={lang}
                locale={locale}
                strings={strings}
                now={at}
              />
            </li>
          );
        })}
      </Reveal>
      <p role="status" className="sr-only">
        {news}
      </p>
    </>
  );
}

/** "Brooklyn Nets game is live", "Final: Brooklyn Nets 109, Indiana Pacers 136"; empty when nothing changed. */
function announce(
  previous: TeamsResponse,
  next: TeamsResponse,
  strings: TeamsStrings,
): string {
  const lines: string[] = [];
  for (const team of next.teams) {
    const game = team.game;
    const before = previous.teams.find((item) => item.id === team.id)?.game;
    if (game?.state === "live" && before?.state !== "live") {
      lines.push(fill(strings.started, { team: team.name }));
    } else if (
      game?.state === "final" &&
      before?.state === "live" &&
      before.id === game.id
    ) {
      lines.push(
        fill(strings.ended, { score: scoreLine(team, game, strings) }),
      );
    }
  }
  return lines.join(". ");
}

function scoreLine(team: TeamStatus, game: Game, strings: TeamsStrings) {
  return fill(strings.score, {
    team: team.name,
    teamScore: game.team.score ?? "",
    opponent: game.opponent.fullName || game.opponent.name,
    opponentScore: game.opponent.score ?? "",
  });
}

/* ------------------------------------------------------------- Card */

function TeamCard({
  team,
  game,
  mode,
  lang,
  locale,
  strings,
  now,
}: {
  team: TeamStatus;
  game: Game | null;
  mode: "loading" | "ready" | "failed";
  lang: Locale;
  locale: string;
  strings: TeamsStrings;
  now: number;
}) {
  const competition = competitionLabel(game?.competition ?? team.league, lang);
  const ours: Side = game
    ? { ...game.team, name: team.shortName, fullName: team.name }
    : {
        name: team.shortName,
        fullName: team.name,
        logo: team.logo,
        score: null,
        home: true,
      };
  const loser =
    game?.state === "final" && game.result !== "draw"
      ? game.result === "win"
        ? "opponent"
        : "team"
      : null;

  let status: ReactNode;
  let statusText: string;
  if (mode === "loading") {
    statusText = "";
    status = (
      <>
        <span
          aria-hidden="true"
          className="h-3 w-16 rounded-full bg-surface-strong noscript:hidden"
        />
        <Unavailable
          label={strings.unavailable}
          className="hidden noscript:inline"
        />
      </>
    );
  } else if (!game) {
    statusText = strings.unavailable;
    status = <Unavailable label={strings.unavailable} />;
  } else if (game.state === "live") {
    const detail = liveDetail(game, team.sport, strings);
    statusText = detail ? `${strings.live}, ${detail}` : strings.live;
    status = (
      <span className="flex shrink-0 items-center gap-2 font-medium">
        <LiveDot />
        {strings.live}
        {detail ? (
          <span className="font-normal text-muted-foreground tabular-nums">
            {detail}
          </span>
        ) : null}
      </span>
    );
  } else {
    statusText = whenText(game, now, locale, strings);
    status = (
      <span className="shrink-0 text-muted-foreground">{statusText}</span>
    );
  }

  const matchup = game
    ? game.state === "upcoming"
      ? fill(strings.matchup, {
          team: team.name,
          opponent: game.opponent.fullName || game.opponent.name,
        })
      : scoreLine(team, game, strings)
    : team.name;
  const label = `${competition}: ${matchup}. ${statusText}`;

  const body = (
    <>
      <span className="flex h-5 items-center justify-between gap-3 text-small leading-5">
        <span className="min-w-0 truncate text-muted-foreground">
          {competition}
        </span>
        {status}
      </span>
      <span className="mt-3 grid min-h-16 content-center gap-2">
        <Row side={ours} muted={loser === "team"} strong />
        {game ? (
          <Row side={game.opponent} muted={loser === "opponent"} />
        ) : mode === "loading" ? (
          <span
            aria-hidden="true"
            className="flex h-7 items-center gap-3 noscript:hidden"
          >
            <span className="size-7 rounded-full bg-surface-strong" />
            <span className="h-3.5 w-20 rounded-full bg-surface-strong" />
          </span>
        ) : null}
      </span>
    </>
  );

  const className = "block rounded-surface bg-surface p-4";
  return game?.url ? (
    <a
      href={game.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (${strings.opensInNewTab})`}
      className={cn(className, "pressable-panel hover:bg-surface-strong")}
    >
      {body}
    </a>
  ) : (
    <div
      role="group"
      aria-label={label}
      aria-busy={mode === "loading"}
      className={className}
    >
      {body}
    </div>
  );
}

function Unavailable({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("shrink-0 text-muted-foreground", className)}>
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Row({
  side,
  muted = false,
  strong = false,
}: {
  side: Side;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-7 items-center gap-3",
        muted && "text-muted-foreground",
      )}
    >
      <TeamMark logo={side.logo} name={side.name} mark={side.abbreviation} />
      <span className={cn("min-w-0 flex-1 truncate", strong && "font-medium")}>
        {side.name}
      </span>
      {side.score !== null ? <Score value={side.score} /> : null}
    </span>
  );
}

/** A score that rolls when it changes: the old number leaves upward, the new one rises out of a blur. */
function Score({ value }: { value: string }) {
  const reduce = useReducedMotion();
  const settled = {
    opacity: 1,
    transform: "translateY(0%)",
    filter: "blur(0px)",
  };
  return (
    <span className="grid justify-items-end overflow-hidden text-lead leading-7 font-semibold tabular-nums *:col-start-1 *:row-start-1">
      <AnimatePresence initial={false}>
        <m.span
          key={value}
          initial={
            reduce
              ? { ...settled, opacity: 0 }
              : {
                  opacity: 0,
                  transform: "translateY(60%)",
                  filter: "blur(3px)",
                }
          }
          animate={settled}
          exit={{
            ...(reduce
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  transform: "translateY(-60%)",
                  filter: "blur(3px)",
                }),
            transition: { duration: 0.18, ease: EASE_OUT },
          }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

/* ------------------------------------------------------------- Logos */

/**
 * A team logo from ESPN's CDN through the image optimizer, the dark variant
 * in dark mode (only the visible one loads: both are lazy). If a file fails,
 * the dark one falls back to the light one, then to the team's letters.
 */
function TeamMark({
  logo,
  name,
  mark,
}: {
  logo: TeamLogo | null;
  name: string;
  mark?: string;
}) {
  const letters = (mark ?? name.charAt(0)).slice(0, 3).toUpperCase();
  if (!logo) return <Monogram letters={letters} />;
  return (
    <span aria-hidden="true" className="size-7 shrink-0">
      <span className="contents dark:hidden">
        <LogoImage key={logo.light} src={logo.light} letters={letters} />
      </span>
      <span className="hidden dark:contents">
        <LogoImage
          key={logo.dark ?? logo.light}
          src={logo.dark ?? logo.light}
          fallback={logo.light}
          letters={letters}
        />
      </span>
    </span>
  );
}

function LogoImage({
  src,
  fallback,
  letters,
}: {
  src: string;
  fallback?: string;
  letters: string;
}) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  if (failed) return <Monogram letters={letters} />;
  return (
    <Image
      src={current}
      alt=""
      width={28}
      height={28}
      className="size-7 object-contain"
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
    />
  );
}

function Monogram({ letters }: { letters: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-full bg-background text-[0.625rem] leading-none font-semibold text-muted-foreground"
    >
      {letters}
    </span>
  );
}
