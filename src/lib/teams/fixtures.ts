import "server-only";

import type { Fetcher } from "./espn";

/*
 * ESPN-shaped fixtures for `/api/teams?mock=<scenario>` (see
 * `src/lib/mock.ts`; never on the live site). The fake fetcher answers the
 * same URLs the real one asks, in the same JSON shapes (schedule: score
 * objects and `logos` arrays; scoreboard: score strings and `logo` /
 * `logoDark`), so the mock runs the real parser and chooser. Like the real
 * API, a schedule still calls the latest game "scheduled" and only the
 * scoreboard knows how it went.
 *
 * Scenarios: live, final (a loss and two wins), upcoming, mixed (live, a
 * draw, the next game) and unavailable (every request fails). Times are
 * relative to now, and the live NBA score and clock move every minute.
 */

export const teamScenarios = [
  "live",
  "final",
  "upcoming",
  "mixed",
  "unavailable",
] as const;

export type TeamScenario = (typeof teamScenarios)[number];

export function isTeamScenario(value: string): value is TeamScenario {
  return (teamScenarios as readonly string[]).includes(value);
}

type Role = "live" | "win" | "loss" | "draw" | "upcoming";

/** Per scenario, what the game in focus is for the Nets, Corinthians and the Vikings. */
const roles: Record<
  Exclude<TeamScenario, "unavailable">,
  [nets: Role, corinthians: Role, vikings: Role]
> = {
  live: ["live", "live", "live"],
  final: ["loss", "win", "win"],
  upcoming: ["upcoming", "upcoming", "upcoming"],
  mixed: ["live", "draw", "upcoming"],
};

type Sport = "basketball" | "football" | "soccer";

/** [ESPN id, abbreviation, location, name, logo path on ESPN's CDN] */
type Club = readonly [string, string, string, string, string];

// prettier-ignore
const clubs = {
  nets: ["17", "BKN", "Brooklyn", "Nets", "nba/bkn"],
  pacers: ["11", "IND", "Indiana", "Pacers", "nba/ind"],
  celtics: ["2", "BOS", "Boston", "Celtics", "nba/bos"],
  knicks: ["18", "NY", "New York", "Knicks", "nba/ny"],
  heat: ["14", "MIA", "Miami", "Heat", "nba/mia"],
  vikings: ["16", "MIN", "Minnesota", "Vikings", "nfl/min"],
  packers: ["9", "GB", "Green Bay", "Packers", "nfl/gb"],
  lions: ["8", "DET", "Detroit", "Lions", "nfl/det"],
  bears: ["3", "CHI", "Chicago", "Bears", "nfl/chi"],
  colts: ["11", "IND", "Indianapolis", "Colts", "nfl/ind"],
  corinthians: ["874", "COR", "Corinthians", "Corinthians", "soccer/874"],
  palmeiras: ["2029", "PAL", "Palmeiras", "Palmeiras", "soccer/2029"],
  inter: ["1936", "INT", "Internacional", "Internacional", "soccer/1936"],
  vasco: ["3454", "VAS", "Vasco da Gama", "Vasco da Gama", "soccer/3454"],
  vitoria: ["3457", "VIT", "Vitória", "Vitória", "soccer/3457"],
} satisfies Record<string, Club>;

const NBA = { slug: "nba", name: "NBA", id: "46" };
const NFL = { slug: "nfl", name: "NFL", id: "28" };
const SERIE_A = { slug: "bra.1", name: "Brazilian Serie A", id: "630" };
const LIBERTADORES = {
  slug: "conmebol.libertadores",
  name: "CONMEBOL Libertadores",
  id: "783",
};

type Status = {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    id: string;
    name: string;
    state: "pre" | "in" | "post";
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
};

function status(
  [id, name, state, description, detail]: [
    string,
    string,
    Status["type"]["state"],
    string,
    string,
  ],
  period = 0,
  displayClock = "0:00",
  clock = 0,
): Status {
  const completed = state === "post";
  return {
    clock,
    displayClock,
    period,
    type: {
      id,
      name,
      state,
      completed,
      description,
      detail,
      shortDetail: detail,
    },
  };
}

// prettier-ignore
const SCHEDULED = status(["1", "STATUS_SCHEDULED", "pre", "Scheduled", "Scheduled"]);
// prettier-ignore
const FINAL = status(["3", "STATUS_FINAL", "post", "Final", "Final"], 4);
// prettier-ignore
const FULL_TIME = status(["28", "STATUS_FULL_TIME", "post", "Full Time", "FT"], 2, "90'+4'", 5400);
// prettier-ignore
const HALFTIME = status(["23", "STATUS_HALFTIME", "in", "Halftime", "Halftime"], 2);
// prettier-ignore
const SECOND_HALF = status(["23", "STATUS_SECOND_HALF", "in", "Second Half", "67'"], 2, "67'", 4020);

type MockGame = {
  id: string;
  sport: Sport;
  league: typeof NBA;
  startMs: number;
  home: Club;
  away: Club;
  /** The truth (the scoreboard). */
  status: Status;
  score?: [home: number, away: number];
  /** The schedule still calls it scheduled, without scores (ESPN's lag). */
  lagging?: boolean;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `utcHours` (23.5 is 23:30) on the day `days` from now. */
function at(now: number, days: number, utcHours: number): number {
  const date = new Date(now + days * DAY);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime() + utcHours * HOUR;
}

// prettier-ignore
function games(now: number, scenario: TeamScenario): MockGame[] {
  if (scenario === "unavailable") return [];
  const [nets, corinthians, vikings] = roles[scenario];
  const { nets: NETS, pacers: PACERS, celtics: CELTICS, knicks: KNICKS, heat: HEAT } = clubs;
  const { vikings: VIKINGS, packers: PACKERS, lions: LIONS, bears: BEARS, colts: COLTS } = clubs;
  const { corinthians: CORINTHIANS, palmeiras: PALMEIRAS, inter: INTER, vasco: VASCO, vitoria: VITORIA } = clubs;
  const tick = Math.floor(now / MINUTE);
  const list: MockGame[] = [];
  const add = (
    id: string,
    sport: Sport,
    league: typeof NBA,
    startMs: number,
    home: Club,
    away: Club,
    truth: Status,
    score?: [number, number],
    lagging = false,
  ) => {
    list.push({ id, sport, league, startMs, home, away, status: truth, lagging, ...(score ? { score } : {}) });
  };

  // Brooklyn Nets: two older results, the game in focus, two next games.
  add("401900001", "basketball", NBA, at(now, -6, 23.5), NETS, HEAT, FINAL, [112, 104]);
  add("401900002", "basketball", NBA, at(now, -4, 0), KNICKS, NETS, FINAL, [118, 99]);
  if (nets === "live") {
    const seconds = 720 - ((tick * 37) % 700);
    const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    const live = status(["2", "STATUS_IN_PROGRESS", "in", "In Progress", "3rd"], 3, clock, seconds);
    const run = (tick % 9) * 2;
    add("401900003", "basketball", NBA, now - 80 * MINUTE, NETS, PACERS, live, [84 + run, 88 + run + (tick % 2)], true);
  } else if (nets === "loss") {
    add("401900003", "basketball", NBA, now - 20 * HOUR, NETS, PACERS, FINAL, [109, 136], true);
  }
  add("401900004", "basketball", NBA, at(now, 1, 23.5), NETS, CELTICS, SCHEDULED);
  add("401900005", "basketball", NBA, at(now, 3, 0), HEAT, NETS, SCHEDULED);

  // Corinthians: the league and the Libertadores.
  add("401841201", "soccer", SERIE_A, at(now, -7, 19), CORINTHIANS, VASCO, FULL_TIME, [1, 0]);
  add("401841202", "soccer", LIBERTADORES, at(now, -4, 0.5), INTER, CORINTHIANS, FULL_TIME, [2, 2]);
  if (corinthians === "live") {
    add("401841203", "soccer", LIBERTADORES, now - 70 * MINUTE, CORINTHIANS, PALMEIRAS, SECOND_HALF, [1, 0], true);
  } else if (corinthians === "win" || corinthians === "draw") {
    add("401841203", "soccer", SERIE_A, now - 4 * HOUR, PALMEIRAS, CORINTHIANS, FULL_TIME, [1, corinthians === "win" ? 2 : 1], true);
  }
  add("401841204", "soccer", SERIE_A, at(now, 2, 19), CORINTHIANS, VITORIA, SCHEDULED);
  add("401841205", "soccer", SERIE_A, at(now, 6, 22), INTER, CORINTHIANS, SCHEDULED);

  // Minnesota Vikings.
  add("401872901", "football", NFL, at(now, -14, 17), BEARS, VIKINGS, FINAL, [17, 23]);
  add("401872902", "football", NFL, at(now, -7, 17), VIKINGS, COLTS, FINAL, [20, 27]);
  if (vikings === "live") {
    add("401872903", "football", NFL, now - 95 * MINUTE, LIONS, VIKINGS, HALFTIME, [10, 14], true);
  } else if (vikings === "win") {
    add("401872903", "football", NFL, now - 30 * HOUR, LIONS, VIKINGS, FINAL, [24, 27], true);
  }
  add("401872904", "football", NFL, at(now, vikings === "upcoming" ? 4 : 6, 18), VIKINGS, PACKERS, SCHEDULED);
  return list;
}

function competitor(
  club: Club,
  homeAway: "home" | "away",
  scores: [own: number, other: number] | null,
  state: Status,
  shape: "schedule" | "scoreboard",
) {
  const [id, abbreviation, location, name, logo] = club;
  const [path, key] = logo.split("/");
  const light = `https://a.espncdn.com/i/teamlogos/${path}/500/${key}.png`;
  const dark = `https://a.espncdn.com/i/teamlogos/${path}/500-dark/${key}.png`;
  const displayName = location === name ? name : `${location} ${name}`;
  const team =
    shape === "schedule"
      ? {
          id,
          location,
          abbreviation,
          displayName,
          shortDisplayName: name,
          logos: [
            {
              href: light,
              width: 500,
              height: 500,
              alt: "",
              rel: ["full", "default"],
              lastUpdated: "2024-06-25T21:17Z",
            },
            {
              href: dark,
              width: 500,
              height: 500,
              alt: "",
              rel: ["full", "dark"],
              lastUpdated: "2024-06-25T21:17Z",
            },
          ],
          links: [],
        }
      : {
          id,
          uid: `s:0~t:${id}`,
          location,
          name,
          abbreviation,
          displayName,
          shortDisplayName: name,
          color: "000000",
          alternateColor: "ffffff",
          isActive: true,
          venue: { id: "1" },
          links: [],
          logo: light,
          logoDark: dark,
        };
  const played = state.type.state !== "pre" && scores !== null;
  return {
    id,
    type: "team",
    order: homeAway === "home" ? 0 : 1,
    homeAway,
    ...(state.type.completed && scores
      ? { winner: scores[0] > scores[1] }
      : {}),
    team,
    // The schedule writes a score as an object, the scoreboard as a string
    // ("0" before kickoff too).
    ...(shape === "scoreboard"
      ? { score: played ? String(scores[0]) : "0" }
      : played
        ? { score: { value: scores[0], displayValue: String(scores[0]) } }
        : {}),
  };
}

function event(game: MockGame, shape: "schedule" | "scoreboard") {
  const state = shape === "schedule" && game.lagging ? SCHEDULED : game.status;
  const date = new Date(game.startMs)
    .toISOString()
    .replace(/:\d\d\.\d{3}Z$/, "Z");
  const [home, away] = game.score ?? [];
  const both = home !== undefined && away !== undefined;
  const sportPath = game.sport === "soccer" ? "soccer" : game.league.slug;
  return {
    id: game.id,
    uid: `s:0~l:${game.league.id}~e:${game.id}`,
    date,
    name: `${game.away[2]} at ${game.home[2]}`,
    shortName: `${game.away[1]} @ ${game.home[1]}`,
    ...(game.sport === "soccer" && shape === "schedule"
      ? {
          league: {
            ...game.league,
            abbreviation: game.league.name,
            isTournament: false,
          },
        }
      : {}),
    competitions: [
      {
        id: game.id,
        date,
        attendance: 0,
        timeValid: true,
        neutralSite: false,
        venue: { fullName: "Stadium" },
        competitors: [
          competitor(
            game.home,
            "home",
            both ? [home, away] : null,
            state,
            shape,
          ),
          competitor(
            game.away,
            "away",
            both ? [away, home] : null,
            state,
            shape,
          ),
        ],
        status: state,
      },
    ],
    status: state,
    links: [
      {
        language: "en-US",
        rel: ["summary", "desktop", "event"],
        href: `https://www.espn.com/${sportPath}/game/_/gameId/${game.id}`,
        text: "Gamecast",
        shortText: "Gamecast",
        isExternal: false,
        isPremium: false,
      },
    ],
  };
}

const easternDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A fetcher that answers ESPN's URLs from the scenario, as of `now`. */
export function mockTeamsFetcher(scenario: TeamScenario, now: number): Fetcher {
  const all = games(now, scenario);
  return async (input) => {
    if (scenario === "unavailable") throw new Error("mock: unavailable");
    const url = new URL(input);
    // /apis/site/v2/sports/<sport>/<league>/(teams/<id>/schedule | scoreboard)
    const parts = url.pathname.split("/");
    const [sport = "", league = ""] = parts.slice(5, 7);
    const teamId = parts[8];
    if (parts[7] === "teams" && teamId) {
      const fixtures = url.searchParams.get("fixture") === "true";
      const events = all
        .filter(
          (game) =>
            game.sport === sport &&
            (game.home[0] === teamId || game.away[0] === teamId),
        )
        .filter((game) => league === "all" || game.league.slug === league)
        .filter(() => url.searchParams.get("seasontype") !== "3")
        .filter((game) =>
          sport !== "soccer"
            ? true
            : fixtures
              ? game.startMs > now || game.lagging
              : game.startMs <= now && !game.lagging,
        )
        // Soccer results come newest first, like ESPN's.
        .sort((a, b) =>
          sport === "soccer" && !fixtures
            ? b.startMs - a.startMs
            : a.startMs - b.startMs,
        )
        .map((game) => event(game, "schedule"));
      return {
        timestamp: new Date(now).toISOString(),
        status: "success",
        team: { id: teamId },
        events,
      };
    }
    if (parts[7] === "scoreboard") {
      const day = url.searchParams.get("dates") ?? "";
      const events = all
        .filter((game) => game.sport === sport && game.league.slug === league)
        .filter(
          (game) => easternDay.format(game.startMs).replaceAll("-", "") === day,
        )
        .map((game) => event(game, "scoreboard"));
      return { leagues: [], day: { date: day }, events };
    }
    throw new Error(`mock: no fixture for ${url.pathname}`);
  };
}
