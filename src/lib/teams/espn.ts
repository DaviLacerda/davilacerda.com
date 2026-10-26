import "server-only";

import { teams, type Sport, type Team } from "@/content/personal";

import type {
  Game,
  LivePhase,
  Side,
  TeamLogo,
  TeamStatus,
  TeamsResponse,
} from "./types";

/*
 * Live and last results for Davi's teams, from ESPN's public site API (no
 * key, undocumented but stable for years; server only).
 *
 * For each team, in parallel:
 * 1. The schedule: the team's games with dates. NBA and NFL: the default
 *    season type plus the regular season and the postseason (the default can
 *    lag on the preseason well into the season). Soccer: every competition
 *    ESPN has for the club (`soccer/all/...`) and its league, results and
 *    fixtures (`?fixture=true`).
 * 2. The scoreboard of the day of the latest game that has started, for its
 *    real state: the schedule's status and scores can lag by days.
 *
 * Then one game is chosen: live; else the last result while it is recent
 * (and the next game is not about to start); else the next game; else the
 * last result of any age. Parsing never trusts the shape: every field is
 * checked, and a team whose data cannot be read gets `game: null`.
 */

const API = "https://site.api.espn.com/apis/site/v2/sports";
const TIMEOUT_MS = 5000;
const HOUR = 3_600_000;

/** How long a result stays on the card after the game started. */
const RECENT_HOURS: Record<Sport, number> = {
  basketball: 36,
  football: 72,
  soccer: 48,
};
/** A result gives way to the next game once that one is this close. */
const NEXT_SOON_HOURS = 3;
/** Games that started longer ago than this are not looked up on a scoreboard. */
const LOOKBACK_DAYS = 10;
/** A game whose start has passed but ESPN still calls "scheduled" (delayed, or stale data) is shown as next for this long. */
const LATE_START_HOURS = 3;

/** Data Cache lifetimes (seconds). */
const REVALIDATE = {
  schedule: 600,
  /** The scoreboard of a game that may be live or just ended. */
  live: 15,
  /** The scoreboard of an older game. */
  settled: 3600,
};

/** Reads a URL as JSON; `revalidate`: how long the Data Cache may keep it, in seconds. */
export type Fetcher = (url: string, revalidate: number) => Promise<unknown>;

const espnFetch: Fetcher = async (url, revalidate) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

/* -------------------------------------------------------- Defensive reads */

type Json = Record<string, unknown>;

function record(value: unknown): Json | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : undefined;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function strings(value: unknown): string[] {
  return list(value).filter((item): item is string => typeof item === "string");
}

/* --------------------------------------------------------------- Parsing */

/** A game as read from ESPN, before it is chosen and trimmed for the card. */
type ParsedEvent = {
  id: string;
  startMs: number;
  state: "pre" | "in" | "post";
  completed: boolean;
  statusName: string;
  period: number;
  clock: string;
  competition: string;
  team: Side;
  opponent: Side;
  teamWinner: boolean;
  opponentWinner: boolean;
  url: string | null;
};

/** Only ESPN's image CDN (allowed in `next.config.ts` `images.remotePatterns`). */
function cdnUrl(value: unknown): string | undefined {
  const url = text(value);
  return url?.startsWith("https://a.espncdn.com/i/") ? url : undefined;
}

/**
 * The logo pair from a team object: `logo` / `logoDark` strings on the
 * scoreboard, a `logos` array with `rel` ["full", "default"] or
 * ["full", "dark"] on the schedule.
 */
function logoOf(team: Json): TeamLogo | null {
  let light = cdnUrl(team.logo);
  let dark = cdnUrl(team.logoDark);
  let other: string | undefined;
  for (const entry of list(team.logos)) {
    const logo = record(entry);
    const href = cdnUrl(logo?.href);
    if (!logo || !href) continue;
    const rel = strings(logo.rel);
    if (rel.includes("dark")) dark ??= href;
    else if (rel.includes("default")) light ??= href;
    else other ??= href;
  }
  light ??= other;
  if (!light) return null;
  return dark ? { light, dark } : { light };
}

/** "109", 109, or { value: 109, displayValue: "109" } -> "109". */
function scoreOf(value: unknown): string | null {
  const score = record(value);
  const raw = score ? (score.displayValue ?? score.value) : value;
  const parsed = numeric(raw);
  return parsed === undefined ? null : String(Math.round(parsed));
}

function sideOf(competitor: Json): Side & { winner: boolean } {
  const team = record(competitor.team) ?? {};
  const fullName =
    text(team.displayName) ??
    text(team.name) ??
    text(team.location) ??
    text(team.abbreviation) ??
    "";
  return {
    name:
      text(team.shortDisplayName) ??
      text(team.name) ??
      text(team.abbreviation) ??
      fullName,
    fullName,
    ...(text(team.abbreviation)
      ? { abbreviation: text(team.abbreviation) }
      : {}),
    logo: logoOf(team),
    score: scoreOf(competitor.score),
    home: competitor.homeAway === "home",
    winner: competitor.winner === true,
  };
}

/** The game on espn.com: the "summary" link (Gamecast), else any event link. */
function gameUrl(event: Json): string | null {
  let fallback: string | null = null;
  for (const entry of list(event.links)) {
    const link = record(entry);
    const href = text(link?.href);
    if (!link || !href?.startsWith("https://www.espn.com/")) continue;
    const rel = strings(link.rel);
    if (rel.includes("summary")) return href;
    if (rel.includes("event")) fallback ??= href;
  }
  return fallback;
}

/** One event of a schedule or scoreboard, seen from `teamId`; null if it cannot be read. */
function parseEvent(
  value: unknown,
  teamId: string,
  competition: string,
): ParsedEvent | null {
  const event = record(value);
  const comp = record(list(event?.competitions)[0]);
  const id = text(event?.id);
  if (!event || !comp || !id) return null;

  const startMs = Date.parse(text(event.date) ?? text(comp.date) ?? "");
  if (!Number.isFinite(startMs)) return null;

  const competitors = list(comp.competitors)
    .map(record)
    .filter((competitor): competitor is Json => competitor !== undefined);
  const ours = competitors.find(
    (competitor) =>
      text(competitor.id) === teamId ||
      text(record(competitor.team)?.id) === teamId,
  );
  const theirs = competitors.find((competitor) => competitor !== ours);
  if (!ours || !theirs) return null;

  const status = record(comp.status) ?? record(event.status) ?? {};
  const type = record(status.type) ?? {};
  const completed = type.completed === true;
  const rawState = text(type.state);
  const state =
    rawState === "pre" || rawState === "in" || rawState === "post"
      ? rawState
      : completed
        ? "post"
        : "pre";

  const { winner: teamWinner, ...team } = sideOf(ours);
  const { winner: opponentWinner, ...opponent } = sideOf(theirs);

  return {
    id,
    startMs,
    state,
    completed,
    statusName: text(type.name) ?? "",
    period: Math.max(0, Math.round(numeric(status.period) ?? 0)),
    clock: text(status.displayClock) ?? "",
    competition: text(record(event.league)?.slug) ?? competition,
    team,
    opponent,
    teamWinner,
    opponentWinner,
    url: gameUrl(event),
  };
}

function eventsOf(
  data: unknown,
  teamId: string,
  competition: string,
): ParsedEvent[] {
  return list(record(data)?.events)
    .map((event) => parseEvent(event, teamId, competition))
    .filter((event): event is ParsedEvent => event !== null);
}

/* ------------------------------------------------------------- Choosing */

function isFinal(event: ParsedEvent): boolean {
  return (
    event.state === "post" &&
    event.completed &&
    event.team.score !== null &&
    event.opponent.score !== null
  );
}

/** How far along ESPN says a game is, to keep the freshest copy of a duplicate. */
function progress(event: ParsedEvent): number {
  if (isFinal(event)) return 3;
  return event.state === "in" ? 2 : event.state === "post" ? 1 : 0;
}

function phaseOf(statusName: string): LivePhase {
  if (statusName.includes("HALFTIME")) return "halftime";
  if (statusName.includes("END_PERIOD") || statusName.includes("END_OF"))
    return "break";
  if (statusName.includes("SHOOTOUT")) return "shootout";
  if (statusName.includes("DELAY")) return "delayed";
  return "play";
}

function toGame(event: ParsedEvent, state: Game["state"], team: Team): Game {
  const base = {
    id: event.id,
    start: new Date(event.startMs).toISOString(),
    competition: event.competition,
    team: { ...event.team, logo: event.team.logo ?? team.logo },
    opponent: event.opponent,
    url: event.url,
  };
  if (state === "live") {
    return {
      ...base,
      state,
      period: event.period,
      clock: event.clock,
      phase: phaseOf(event.statusName),
    };
  }
  if (state === "final") {
    const ours = numeric(event.team.score) ?? 0;
    const theirs = numeric(event.opponent.score) ?? 0;
    const result = event.teamWinner
      ? "win"
      : event.opponentWinner
        ? "loss"
        : ours === theirs
          ? "draw"
          : ours > theirs
            ? "win"
            : "loss";
    return { ...base, state, result };
  }
  return {
    ...base,
    state,
    team: { ...base.team, score: null },
    opponent: { ...base.opponent, score: null },
  };
}

/** The scoreboard day of a game: ESPN dates them in US Eastern time ("20261025"). */
const espnDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function scheduleUrls(team: Team): string[] {
  if (team.sport === "soccer") {
    const all = `${API}/soccer/all/teams/${team.espnId}/schedule`;
    const league = `${API}/soccer/${team.league}/teams/${team.espnId}/schedule`;
    return [all, `${all}?fixture=true`, league, `${league}?fixture=true`];
  }
  const base = `${API}/${team.sport}/${team.league}/teams/${team.espnId}/schedule`;
  return [base, `${base}?seasontype=2`, `${base}?seasontype=3`];
}

async function gameFor(
  team: Team,
  fetcher: Fetcher,
  now: number,
): Promise<Game | null> {
  const schedules = await Promise.allSettled(
    scheduleUrls(team).map((url) => fetcher(url, REVALIDATE.schedule)),
  );
  if (schedules.every((result) => result.status === "rejected")) {
    throw new Error("no schedule could be read");
  }

  const byId = new Map<string, ParsedEvent>();
  for (const result of schedules) {
    if (result.status !== "fulfilled") continue;
    for (const event of eventsOf(result.value, team.espnId, team.league)) {
      const known = byId.get(event.id);
      if (!known || progress(event) > progress(known))
        byId.set(event.id, event);
    }
  }
  const events = [...byId.values()];

  // The latest game that has started, checked against its day's scoreboard.
  let focus = events
    .filter(
      (event) =>
        event.startMs <= now && now - event.startMs < LOOKBACK_DAYS * 24 * HOUR,
    )
    .sort((a, b) => b.startMs - a.startMs)[0];
  if (focus) {
    const day = espnDay.format(focus.startMs).replaceAll("-", "");
    const recent = now - focus.startMs < 6 * HOUR;
    try {
      const board = await fetcher(
        `${API}/${team.sport}/${focus.competition}/scoreboard?dates=${day}`,
        recent ? REVALIDATE.live : REVALIDATE.settled,
      );
      const id = focus.id;
      const fresh = eventsOf(board, team.espnId, focus.competition).find(
        (event) => event.id === id,
      );
      if (fresh) focus = { ...fresh, url: fresh.url ?? focus.url };
    } catch {
      // Keep the schedule's copy.
    }
  }

  const next = events
    .filter((event) => event.startMs > now && event.state === "pre")
    .sort((a, b) => a.startMs - b.startMs)[0];

  if (focus?.state === "in") return toGame(focus, "live", team);
  if (focus && isFinal(focus)) {
    const recent = now - focus.startMs < RECENT_HOURS[team.sport] * HOUR;
    const nextSoon = next && next.startMs - now < NEXT_SOON_HOURS * HOUR;
    return next && (!recent || nextSoon)
      ? toGame(next, "upcoming", team)
      : toGame(focus, "final", team);
  }
  if (focus?.state === "pre" && now - focus.startMs < LATE_START_HOURS * HOUR) {
    return toGame(focus, "upcoming", team);
  }
  if (next) return toGame(next, "upcoming", team);
  const last = events.filter(isFinal).sort((a, b) => b.startMs - a.startMs)[0];
  return last ? toGame(last, "final", team) : null;
}

/* ------------------------------------------------------------------ API */

/**
 * Every team in `src/content/personal.ts` with the game to show, in
 * parallel. Never throws: a team ESPN cannot answer for gets `game: null`
 * (logged without details beyond the message).
 */
export async function getTeams({
  fetcher = espnFetch,
  now = Date.now(),
}: { fetcher?: Fetcher; now?: number } = {}): Promise<TeamsResponse> {
  const statuses = await Promise.all(
    teams.map(async (team): Promise<TeamStatus> => {
      let game: Game | null = null;
      try {
        game = await gameFor(team, fetcher, now);
      } catch (error) {
        console.error(
          "[teams]",
          team.id,
          error instanceof Error ? error.message : "request failed",
        );
      }
      return {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        sport: team.sport,
        league: team.league,
        logo: team.logo,
        game,
      };
    }),
  );
  return { teams: statuses, updatedAt: new Date(now).toISOString() };
}

/**
 * How long the CDN may keep an answer (seconds): 30 while a game is live,
 * a minute around a start or a fresh result (or after a failure, to retry
 * soon), ten minutes otherwise.
 */
export function teamsMaxAge(data: TeamsResponse, now = Date.now()): number {
  const games = data.teams.map((team) => team.game);
  if (games.some((game) => game?.state === "live")) return 30;
  const near = games.some((game) => {
    if (!game) return true;
    const offset = Date.parse(game.start) - now;
    return game.state === "upcoming"
      ? offset < HOUR
      : game.state === "final" && -offset < 4 * HOUR;
  });
  return near ? 60 : 600;
}
