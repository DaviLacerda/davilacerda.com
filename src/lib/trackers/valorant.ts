import "server-only";

import type { GameStats } from "@/content/personal";

import {
  describe,
  list,
  numeric,
  ratio,
  record,
  share,
  text,
  TrackerError,
} from "./json";
import type { Rank, RankTier, TrackerStatus } from "./types";

/*
 * Davi's Valorant rank and stats from HenrikDev's API (api.henrikdev.xyz, an
 * unofficial Valorant API built on Riot's own; docs.henrikdev.xyz). Riot's
 * official API only serves registered products, and Tracker.gg's developer
 * API does not cover Valorant, so this is the keyed route: a free key from
 * the HenrikDev dashboard in `HENRIK_API_KEY`, sent as `Authorization`.
 *
 * - GET /valorant/v3/mmr/{region}/{platform}/{name}/{tag}: the rank, RR and
 *   this act's wins (required).
 * - GET /valorant/v1/stored-matches/{region}/{name}/{tag}?mode=competitive:
 *   the last competitive matches, for K/D and win rate.
 * - GET /valorant/v2/account/{name}/{tag}: the account level.
 *
 * Only the MMR answer is required; the others fill in what they can. Rank
 * emblems come from valorant-api.com's media CDN (no key), by tier number.
 */

const API = "https://api.henrikdev.xyz";
const TIMEOUT_MS = 6000;
/** How many competitive matches K/D and win rate cover. */
const MATCHES = 20;
/** The competitive tier set on valorant-api.com whose emblems the page shows. */
const TIER_SET = "03621f52-342b-cf4e-4f86-9350a49c6d04";

/** Data Cache lifetimes (seconds): the rank moves after a match, the level rarely. */
const REVALIDATE = { mmr: 600, matches: 1800, account: 21_600 };

/** Reads an API path as JSON; `revalidate`: Data Cache lifetime in seconds. */
export type HenrikFetcher = (
  path: string,
  revalidate: number,
) => Promise<unknown>;

function henrik(key: string): HenrikFetcher {
  return async (path, revalidate) => {
    const response = await fetch(`${API}${path}`, {
      headers: { Accept: "application/json", Authorization: key },
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      // The path names the endpoint without the player or the key.
      const endpoint = path.split("/").slice(1, 4).join("/");
      throw new TrackerError(`${endpoint} failed (${response.status})`);
    }
    return response.json();
  };
}

const GROUPS: RankTier[] = [
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "ascendant",
  "immortal",
];

/** Valorant's competitive tier number (3 is Iron 1, 27 Radiant) as a rank with its emblem. */
export function valorantRank(id: number): Rank {
  if (id === 27) {
    return { tier: "radiant", division: null, icon: emblem(id) };
  }
  const group = GROUPS[Math.floor((id - 3) / 3)];
  if (id < 3 || !group) return { tier: "unranked", division: null, icon: null };
  return {
    tier: group,
    division: String(((id - 3) % 3) + 1),
    icon: emblem(id),
  };
}

function emblem(id: number): string {
  return `https://media.valorant-api.com/competitivetiers/${TIER_SET}/${id}/largeicon.png`;
}

type Totals = { kills: number; deaths: number; wins: number; games: number };

/** K/D and wins over the stored competitive matches (the player's line in each). */
function matchTotals(data: unknown, name: string, tag: string): Totals {
  const totals: Totals = { kills: 0, deaths: 0, wins: 0, games: 0 };
  for (const value of list(record(data)?.data).slice(0, MATCHES)) {
    const match = record(value);
    const mode = text(record(match?.meta)?.mode)?.toLowerCase();
    if (mode && mode !== "competitive") continue;
    // `stats` is the player's line; tolerate a list of every player too.
    const stats = Array.isArray(match?.stats)
      ? list(match.stats)
          .map(record)
          .find(
            (line) =>
              text(line?.name)?.toLowerCase() === name.toLowerCase() &&
              text(line?.tag)?.toLowerCase() === tag.toLowerCase(),
          )
      : record(match?.stats);
    const kills = numeric(stats?.kills);
    const deaths = numeric(stats?.deaths);
    const team = text(stats?.team)?.toLowerCase();
    const rounds = record(match?.teams);
    if (kills === undefined || deaths === undefined) continue;
    totals.kills += kills;
    totals.deaths += deaths;
    totals.games += 1;
    if (team === "red" || team === "blue") {
      const own = numeric(rounds?.[team]) ?? 0;
      const other = numeric(rounds?.[team === "red" ? "blue" : "red"]) ?? 0;
      if (own > other) totals.wins += 1;
    }
  }
  return totals;
}

/** This act's wins and games, from the MMR answer (the latest season with games). */
function seasonTotals(mmr: Record<string, unknown> | undefined) {
  const seasons = list(mmr?.seasonal).map(record);
  for (const season of seasons.reverse()) {
    const games = numeric(season?.games) ?? 0;
    if (games > 0) return { wins: numeric(season?.wins) ?? 0, games };
  }
  return null;
}

/**
 * Rank, RR, K/D, win rate and level for the Riot ID in `stats`.
 * "unconfigured" without the key, "offline" on any failure.
 */
export async function getValorant(
  account: Extract<GameStats, { source: "henrikdev" }>,
  { fetcher }: { fetcher?: HenrikFetcher } = {},
): Promise<TrackerStatus> {
  const key = process.env.HENRIK_API_KEY?.trim();
  if (!fetcher && !key) return { status: "unconfigured" };
  const get = fetcher ?? henrik(key ?? "");
  const name = encodeURIComponent(account.name);
  const tag = encodeURIComponent(account.tag);
  const region = encodeURIComponent(account.region);

  try {
    const [mmr, matches, profile] = await Promise.allSettled([
      get(
        `/valorant/v3/mmr/${region}/${account.platform}/${name}/${tag}`,
        REVALIDATE.mmr,
      ),
      get(
        `/valorant/v1/stored-matches/${region}/${name}/${tag}?mode=competitive&size=${MATCHES}`,
        REVALIDATE.matches,
      ),
      get(`/valorant/v2/account/${name}/${tag}`, REVALIDATE.account),
    ]);
    if (mmr.status === "rejected") throw mmr.reason;
    const data = record(record(mmr.value)?.data);
    const current = record(data?.current);
    if (!current) throw new TrackerError("mmr: no current rank");

    const tierId = numeric(record(current.tier)?.id) ?? 0;
    const needed = numeric(current.games_needed_for_rating) ?? 0;
    const rank = valorantRank(needed > 0 ? 0 : tierId);
    const rr = numeric(current.rr);

    const totals =
      matches.status === "fulfilled"
        ? matchTotals(matches.value, account.name, account.tag)
        : null;
    const season = seasonTotals(data);
    const level =
      profile.status === "fulfilled"
        ? (numeric(record(record(profile.value)?.data)?.account_level) ?? null)
        : null;

    const points =
      rank.tier !== "unranked" && rr !== undefined
        ? { value: rr, unit: "RR" as const }
        : null;

    // K/D and win rate from the same recent matches; without any stored,
    // this act's win rate alone.
    if (totals && totals.games > 0) {
      return {
        status: "ok",
        rank,
        points,
        kd: ratio(totals.kills, totals.deaths),
        winRate: share(totals.wins, totals.games),
        level,
        scope: { kind: "matches", count: totals.games },
      };
    }
    return {
      status: "ok",
      rank,
      points,
      kd: null,
      winRate: season ? share(season.wins, season.games) : null,
      level,
      scope: season ? { kind: "season" } : null,
    };
  } catch (error) {
    console.error("[trackers] valorant:", describe(error));
    return { status: "offline" };
  }
}
