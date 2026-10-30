import "server-only";

import type { TrackerFetchers } from "./trackers";

/*
 * API-shaped fixtures for `/api/trackers?mock=<scenario>` (see
 * `src/lib/mock.ts`; never on the live site): the fake fetchers answer the
 * same paths the real ones ask, in HenrikDev's and R6Data's JSON shapes, so
 * the mock runs the real parsers. The numbers are made up.
 *
 * Scenarios: ranked (both answer with a rank and stats), offline (every
 * request fails). The teams' scenario names also work, so one `?mock=`
 * drives the whole page: unavailable -> offline, anything else -> ranked.
 */

type TrackerScenario = "ranked" | "offline";

export function trackerScenario(value: string): TrackerScenario | null {
  if (value === "offline" || value === "unavailable") return "offline";
  return [
    "ranked",
    "live",
    "final",
    "upcoming",
    "mixed",
    "playing",
    "recent",
    "idle",
  ].includes(value)
    ? "ranked"
    : null;
}

/** Twenty competitive matches: [kills, deaths, own rounds, their rounds, own team]. */
// prettier-ignore
const MATCHES: [number, number, number, number, "Red" | "Blue"][] = [
  [21, 14, 13, 9, "Red"], [17, 16, 11, 13, "Blue"], [24, 15, 13, 7, "Blue"],
  [12, 17, 8, 13, "Red"], [19, 18, 13, 11, "Red"], [15, 15, 10, 13, "Blue"],
  [22, 13, 13, 6, "Red"], [16, 19, 9, 13, "Blue"], [18, 14, 14, 12, "Red"],
  [20, 17, 13, 10, "Blue"], [11, 16, 5, 13, "Red"], [23, 16, 13, 11, "Blue"],
  [14, 15, 12, 14, "Red"], [19, 13, 13, 8, "Blue"], [17, 18, 11, 13, "Red"],
  [26, 17, 13, 10, "Red"], [13, 16, 7, 13, "Blue"], [18, 15, 13, 11, "Red"],
  [16, 14, 13, 9, "Blue"], [15, 17, 10, 13, "Red"],
];

function storedMatches() {
  const start = Date.UTC(2026, 9, 25, 22);
  return {
    status: 200,
    results: {
      total: MATCHES.length,
      returned: MATCHES.length,
      before: 0,
      after: 0,
    },
    data: MATCHES.map(([kills, deaths, own, other, team], index) => ({
      meta: {
        id: `mock-${index}`,
        map: { id: "", name: "Ascent" },
        version: "release-11.08",
        mode: "Competitive",
        started_at: new Date(start - index * 7_200_000).toISOString(),
        season: { id: "", short: "e11a3" },
        region: "br",
        cluster: "São Paulo",
      },
      stats: {
        puuid: "mock-puuid",
        team,
        level: 214,
        character: { id: "", name: "Sova" },
        tier: 15,
        score: kills * 250,
        kills,
        deaths,
        assists: 6,
        shots: { head: 22, body: 61, leg: 4 },
        damage: { made: kills * 140, received: deaths * 140 },
        name: "davi",
        tag: "XVI",
      },
      teams:
        team === "Red" ? { red: own, blue: other } : { red: other, blue: own },
    })),
  };
}

const MMR = {
  status: 200,
  data: {
    account: { name: "davi", tag: "XVI", puuid: "mock-puuid" },
    current: {
      tier: { id: 16, name: "Platinum 2" },
      rr: 47,
      last_change: 18,
      elo: 1347,
      games_needed_for_rating: 0,
      rank_protection_shields: 0,
      leaderboard_placement: null,
    },
    peak: {
      season: { id: "", short: "e10a2" },
      ranking_schema: "base",
      rr: 12,
      tier: { id: 17, name: "Platinum 3" },
    },
    seasonal: [
      {
        season: { id: "", short: "e11a3" },
        wins: 23,
        games: 41,
        end_tier: { id: 16, name: "Platinum 2" },
        end_rr: 47,
        ranking_schema: "base",
        act_wins: [],
        leaderboard_placement: null,
      },
    ],
  },
};

const ACCOUNT = {
  status: 200,
  data: {
    puuid: "mock-puuid",
    region: "br",
    account_level: 214,
    name: "davi",
    tag: "XVI",
    card: "",
    title: "",
    platforms: ["PC"],
    updated_at: "2026-10-25T22:00:00Z",
  },
};

const SIEGE_PROFILE = {
  player: {
    nameOnPlatform: "Hydroon.",
    platformType: "uplay",
    platformFamilies: "pc",
  },
  stats: {
    platform_families_full_profiles: [
      {
        profile_id: "mock-profile",
        board_ids_full_profiles: [
          {
            board_id: "casual",
            full_profiles: [
              {
                season_id: 39,
                profile: {
                  rank: 0,
                  rank_points: 0,
                  max_rank: 0,
                  max_rank_points: 0,
                  kills: 140,
                  deaths: 151,
                  wins: 9,
                  losses: 12,
                  abandon: 0,
                  update_time: "",
                },
                season_statistics: {
                  kills: 140,
                  deaths: 151,
                  match_outcomes: { wins: 9, losses: 12, abandons: 0 },
                },
              },
            ],
          },
          {
            board_id: "ranked",
            full_profiles: [
              {
                season_id: 39,
                profile: {
                  rank: 23,
                  rank_points: 3246,
                  max_rank: 24,
                  max_rank_points: 3318,
                  kills: 412,
                  deaths: 379,
                  wins: 27,
                  losses: 22,
                  abandon: 0,
                  update_time: "2026-10-25T22:00:00Z",
                },
                season_statistics: {
                  kills: 412,
                  deaths: 379,
                  match_outcomes: { wins: 27, losses: 22, abandons: 0 },
                },
              },
            ],
          },
        ],
      },
    ],
  },
  account: {
    level: 287,
    xp: 0,
    profilePicture: null,
    profile: { level: 287, xp: 0 },
    profiles: [{ platformType: "uplay", nameOnPlatform: "Hydroon." }],
  },
  banned: { isBanned: false, banAlerts: [] },
  seasons: null,
  history: null,
  meta: { included: ["stats", "account"], partial: false, errors: {} },
};

export function mockTrackerFetchers(
  scenario: TrackerScenario,
): Required<TrackerFetchers> {
  const offline = async () => {
    throw new Error("mock: offline");
  };
  if (scenario === "offline") return { henrik: offline, r6: offline };
  return {
    henrik: async (path) => {
      if (path.startsWith("/valorant/v3/mmr/")) return MMR;
      if (path.startsWith("/valorant/v1/stored-matches/"))
        return storedMatches();
      if (path.startsWith("/valorant/v2/account/")) return ACCOUNT;
      throw new Error(`mock: no fixture for ${path}`);
    },
    r6: async (path) => {
      if (path.startsWith("/v2/profile")) return SIEGE_PROFILE;
      throw new Error(`mock: no fixture for ${path}`);
    },
  };
}
