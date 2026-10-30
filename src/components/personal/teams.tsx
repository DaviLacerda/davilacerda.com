"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { AsciiBackdrop } from "@/components/ui/ascii-backdrop";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import type { AsciiScene } from "@/lib/ascii/types";
import {
  articles,
  competitionLabel,
  regulationPeriods,
  TEAMS_PATH,
  type Game,
  type Sport,
  type TeamLogo,
  type TeamStatus,
  type TeamsResponse,
} from "@/lib/teams/types";
import { cn } from "@/lib/utils";

import { fill, fillNodes, liveUrl, LiveDot } from "./parts";

export type TeamsStrings = Dictionary["personal"]["teams"] & {
  opensInNewTab: string;
};

/** A team as the page passes it: its status before the first answer, and its card's effects. */
export type BoardTeam = TeamStatus & {
  /** The ASCII animation behind the card. */
  ascii?: AsciiScene;
};

type TeamsBoardProps = {
  /** The teams from `src/content/personal.ts` (`game: null`): what shows before the first answer. */
  teams: BoardTeam[];
  lang: Locale;
  /** `Intl` locale for dates and times. */
  locale: string;
  strings: TeamsStrings;
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

/** "Final, yesterday", "Final, Oct 25". */
function finalText(
  game: Game,
  now: number,
  locale: string,
  strings: TeamsStrings,
) {
  const start = Date.parse(game.start);
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

/** "Tomorrow, 7:30 PM", "Sun, 1:00 PM" (the viewer's time zone, the page's language). */
function startText(game: Game, now: number, locale: string): string {
  const start = Date.parse(game.start);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);
  return `${capitalize(dayLabel(start, now, locale), locale)}, ${time}`;
}

type Outcome = keyof TeamsStrings["result"];

/** The game from Davi's team's side: won, lost, drew; live, leading, trailing or tied. */
function outcomeOf(game: Game): Outcome | null {
  if (game.state === "final") return game.result;
  if (game.state !== "live") return null;
  const ours = Number(game.team.score);
  const theirs = Number(game.opponent.score);
  if (game.team.score === null || game.opponent.score === null) return null;
  if (!Number.isFinite(ours) || !Number.isFinite(theirs)) return null;
  return ours > theirs ? "leading" : ours < theirs ? "trailing" : "tied";
}

/** The two scores, the higher first ("136", "109"), as ESPN writes them; null before a score. */
function scoresOf(game: Game): { high: string; low: string } | null {
  const ours = game.team.score;
  const theirs = game.opponent.score;
  if (ours === null || theirs === null) return null;
  return Number(ours) >= Number(theirs)
    ? { high: ours, low: theirs }
    : { high: theirs, low: ours };
}

/** The opponent line's template and its values ("at {opponent}", "para o {opponent}, fora de casa"). */
function againstParts(game: Game, strings: TeamsStrings) {
  const outcome = outcomeOf(game);
  const name = game.opponent.name;
  return {
    template: strings.against[outcome ?? "upcoming"],
    values: {
      venue: strings.venue[game.team.home ? "home" : "away"],
      ...articles(name),
    },
    name,
  };
}

/** The card's lines as plain text: for its accessible name and the announcements. */
function describe(
  team: TeamStatus,
  game: Game,
  now: number,
  locale: string,
  strings: TeamsStrings,
) {
  const outcome = outcomeOf(game);
  const scores = scoresOf(game);
  const result =
    game.state === "upcoming"
      ? startText(game, now, locale)
      : outcome && scores
        ? fill(strings.result[outcome], scores)
        : outcome
          ? strings.resultWord[outcome]
          : strings.live;
  const { template, values, name } = againstParts(game, strings);
  const against = fill(template, {
    ...values,
    opponent: game.opponent.fullName || name,
  });
  return { result, against, text: `${team.name}, ${result} ${against}` };
}

/* ------------------------------------------------------------ Board */

/**
 * Live or last results of Davi's teams, inside the "My teams" tile of the
 * Personal tab: one card per team (stacked on a phone; from 640px a row
 * each, the team on the left and the game on the right; three across from
 * 1024px), each told from his team's side. His team leads the card (its logo
 * large, its name, the competition), then the state of the game, then the
 * result in words with the higher score first ("Lost 136 to 109"), then the
 * opponent, small, with its logo and where the game is ("at Pacers").
 *
 * - Data: `/api/teams` once on mount; again every minute only while a game
 *   is live (or its start has come) and the tab is visible, and once at the
 *   start of a game due within six hours. Hidden tabs stop asking and catch
 *   up when they return.
 * - States, all the same size: a skeleton while loading; live (an ink dot
 *   with a soft pulse, "Live", the period and clock; "Leading 14 to 10");
 *   final ("Final, yesterday"; "Won 27 to 24"); the next game ("Next game";
 *   the day and time in the viewer's time zone and the page's language);
 *   and when ESPN cannot be read, the team and "No game data right now".
 *   Without JavaScript: the teams and that line.
 * - Motion: a score that changes rolls, the old number leaving upward and
 *   the new one rising out of a 3px blur (280ms ease-out; reduced motion:
 *   a fade). A game going live or ending is announced politely.
 * - Each card links to the game on espn.com when there is one.
 * - Behind each card, its team's ASCII animation (`AsciiBackdrop`), calm,
 *   livelier while the card is hovered, focused or tapped.
 */
export function TeamsBoard({ teams, lang, locale, strings }: TeamsBoardProps) {
  const [{ data, at, failed, previous }, setState] = useState<State>({
    data: null,
    at: 0,
    failed: false,
    previous: null,
  });
  const news =
    previous && data ? announce(previous, data, at, locale, strings) : "";

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
        // Keep what is on screen; with nothing yet, say there is no data.
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
      <ul className="-mx-2 mt-3 grid gap-1 sm:-mx-3 lg:grid-cols-3 lg:gap-2">
        {teams.map((team) => {
          const shown = data?.teams.find((item) => item.id === team.id);
          return (
            <li key={team.id} className="min-w-0">
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
      </ul>
      <p role="status" className="sr-only">
        {news}
      </p>
    </>
  );
}

/** "Brooklyn Nets game is live", "Final: Brooklyn Nets, Lost 136 to 109 at Indiana Pacers"; empty when nothing changed. */
function announce(
  previous: TeamsResponse,
  next: TeamsResponse,
  now: number,
  locale: string,
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
        fill(strings.ended, {
          result: describe(team, game, now, locale, strings).text,
        }),
      );
    }
  }
  return lines.join(". ");
}

/* ------------------------------------------------------------- Card */

/** How long a tap keeps a card lively on a touch screen. */
const TAP_MS = 1600;

/**
 * A card's hover, focus and tap: `active` while pointed at (mouse or pen),
 * focused from the keyboard, or for a moment after a tap (the card still
 * opens the game).
 */
function useCardMoments() {
  const [active, setActive] = useState(false);
  const tap = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(tap.current), []);

  function start() {
    window.clearTimeout(tap.current);
    setActive(true);
  }

  function end() {
    setActive(false);
  }

  return {
    active,
    handlers: {
      onPointerEnter(event: PointerEvent<HTMLElement>) {
        if (event.pointerType !== "touch") start();
      },
      onPointerLeave(event: PointerEvent<HTMLElement>) {
        if (event.pointerType !== "touch") end();
      },
      onFocus(event: FocusEvent<HTMLElement>) {
        if (event.currentTarget.matches(":focus-visible")) start();
      },
      onBlur: end,
      onPointerUp(event: PointerEvent<HTMLElement>) {
        if (event.pointerType !== "touch") return;
        setActive(true);
        window.clearTimeout(tap.current);
        tap.current = window.setTimeout(() => setActive(false), TAP_MS);
      },
    },
  };
}

function TeamCard({
  team,
  game,
  mode,
  lang,
  locale,
  strings,
  now,
}: {
  team: BoardTeam;
  game: Game | null;
  mode: "loading" | "ready" | "failed";
  lang: Locale;
  locale: string;
  strings: TeamsStrings;
  now: number;
}) {
  const { active, handlers } = useCardMoments();
  const competition = competitionLabel(game?.competition ?? team.league, lang);
  const logo = game?.team.logo ?? team.logo;
  const outcome = game ? outcomeOf(game) : null;
  const scores = game ? scoresOf(game) : null;

  let status: ReactNode = null;
  let statusText = "";
  let result: ReactNode = null;
  let against: ReactNode = null;
  let label = `${team.name}, ${competition}`;

  if (mode === "loading") {
    status = (
      <span
        aria-hidden="true"
        className="inline-block h-3 w-20 rounded-full bg-surface-strong noscript:hidden"
      />
    );
    result = (
      <>
        <span
          aria-hidden="true"
          className="block h-6 w-44 max-w-full rounded-full bg-surface-strong noscript:hidden"
        />
        <span className="hidden text-body font-normal text-muted-foreground noscript:block">
          {strings.unavailable}
        </span>
      </>
    );
    against = (
      <span
        aria-hidden="true"
        className="inline-block h-3 w-28 rounded-full bg-surface-strong noscript:hidden"
      />
    );
  } else if (!game) {
    result = (
      <span className="text-body font-normal text-muted-foreground">
        {strings.unavailable}
      </span>
    );
    label = `${label}: ${strings.unavailable}`;
  } else {
    if (game.state === "live") {
      const detail = liveDetail(game, team.sport, strings);
      statusText = detail ? `${strings.live}, ${detail}` : strings.live;
      status = (
        <span className="flex items-center gap-2 font-medium text-foreground">
          <LiveDot />
          {strings.live}
          {detail ? (
            <span className="font-normal text-muted-foreground tabular-nums">
              {detail}
            </span>
          ) : null}
        </span>
      );
    } else if (game.state === "final") {
      statusText = finalText(game, now, locale, strings);
      status = statusText;
    } else {
      statusText = strings.next;
      status = statusText;
    }

    result =
      game.state === "upcoming"
        ? startText(game, now, locale)
        : outcome && scores
          ? fillNodes(strings.result[outcome], {
              high: <Score value={scores.high} />,
              low: <Score value={scores.low} />,
            })
          : outcome
            ? strings.resultWord[outcome]
            : strings.live;

    const parts = againstParts(game, strings);
    against = fillNodes(parts.template, {
      ...parts.values,
      opponent: (
        <span className="whitespace-nowrap">
          <TeamMark
            logo={game.opponent.logo}
            name={game.opponent.name}
            mark={game.opponent.abbreviation}
            size="inline"
          />
          {parts.name}
        </span>
      ),
    });

    const text = describe(team, game, now, locale, strings);
    label = `${text.text}. ${competition}, ${statusText}`;
  }

  const body = (
    <>
      {team.ascii ? <AsciiBackdrop scene={team.ascii} active={active} /> : null}
      <span className="flex items-center gap-4">
        <TeamMark
          logo={logo}
          name={team.shortName}
          mark={game?.team.abbreviation}
          size="hero"
        />
        <span className="min-w-0">
          <span className="block truncate text-lead leading-6 font-semibold tracking-[-0.015em]">
            {team.name}
          </span>
          <span className="block truncate text-small leading-5 text-muted-foreground">
            {competition}
          </span>
        </span>
      </span>
      <span className="mt-6 block min-w-0 sm:mt-0 lg:mt-6">
        <span className="flex h-5 items-center text-small leading-5 text-muted-foreground">
          {status}
        </span>
        <span className="mt-1 block text-[clamp(1.25rem,1rem+0.6vw,1.5rem)] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
          {result}
        </span>
        <span className="mt-1.5 block min-h-5 truncate text-small leading-5 text-muted-foreground">
          {against}
        </span>
      </span>
    </>
  );

  // Stacked on a phone and in the three columns from 1024px; in between, a
  // row: the team on the left, the game on the right.
  // The animation sits under the content, clipped to the card's corners.
  const className =
    "relative isolate block h-full overflow-hidden rounded-surface p-3 sm:grid sm:grid-cols-2 sm:items-center sm:gap-6 sm:p-4 lg:block";
  return game?.url ? (
    <a
      href={game.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (${strings.opensInNewTab})`}
      className={cn(className, "pressable-panel hover:bg-surface-strong")}
      {...handlers}
    >
      {body}
    </a>
  ) : (
    <div
      role="group"
      aria-label={label}
      aria-busy={mode === "loading"}
      className={className}
      {...handlers}
    >
      {body}
    </div>
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
    <span className="inline-grid overflow-hidden align-top *:col-start-1 *:row-start-1">
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

const markSizes = {
  /** Davi's team, leading its card. */
  hero: { box: "size-12 sm:size-14", px: 56, letters: "text-small" },
  /** The opponent, inline in its line. */
  inline: {
    box: "mr-1.5 inline-grid size-5 align-[-0.3125rem]",
    px: 20,
    letters: "text-[0.5rem]",
  },
} as const;

/**
 * A team logo from ESPN's CDN through the image optimizer, the dark variant
 * in dark mode (only the visible one loads: both are lazy). If a file fails,
 * the dark one falls back to the light one, then to the team's letters.
 */
function TeamMark({
  logo,
  name,
  mark,
  size,
}: {
  logo: TeamLogo | null;
  name: string;
  mark?: string;
  size: keyof typeof markSizes;
}) {
  const { box, px, letters: text } = markSizes[size];
  const letters = (mark ?? name.charAt(0)).slice(0, 3).toUpperCase();
  if (!logo) return <Monogram letters={letters} className={cn(box, text)} />;
  return (
    <span aria-hidden="true" className={cn("shrink-0", box)}>
      <span className="contents dark:hidden">
        <LogoImage
          key={logo.light}
          src={logo.light}
          letters={letters}
          px={px}
          text={text}
        />
      </span>
      <span className="hidden dark:contents">
        <LogoImage
          key={logo.dark ?? logo.light}
          src={logo.dark ?? logo.light}
          fallback={logo.light}
          letters={letters}
          px={px}
          text={text}
        />
      </span>
    </span>
  );
}

function LogoImage({
  src,
  fallback,
  letters,
  px,
  text,
}: {
  src: string;
  fallback?: string;
  letters: string;
  px: number;
  text: string;
}) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  if (failed)
    return <Monogram letters={letters} className={cn("size-full", text)} />;
  return (
    <Image
      src={current}
      alt=""
      width={px}
      height={px}
      className="size-full object-contain"
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
        else setFailed(true);
      }}
    />
  );
}

function Monogram({
  letters,
  className,
}: {
  letters: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-background leading-none font-semibold text-muted-foreground",
        className,
      )}
    >
      {letters}
    </span>
  );
}
