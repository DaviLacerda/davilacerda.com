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
 * Davi's Rainbow Six Siege rank and stats from R6Data's API
 * (public-api.arenyze.com/r6/api, by Arenyze; docs at r6.arenyze.com/api-docs).
 * Ubisoft has no public stats API and Tracker.gg's developer API does not
 * cover Siege, so this is the keyed route: a key from the R6Data dashboard in
 * `R6DATA_API_KEY`, sent as `api-key`.
 *
 * - GET /v2/profile?nameOnPlatform=...&platformType=uplay: the account
 *   (level) and Ubisoft's own ranked "full profile" for this season (rank,
 *   rank points, kills, deaths, wins and losses), in one request.
 */

const API = "https://public-api.arenyze.com/r6/api";
const TIMEOUT_MS = 8000;
/** Data Cache lifetime (seconds). */
const REVALIDATE = 1800;

/** Reads an API path as JSON; `revalidate`: Data Cache lifetime in seconds. */
export type R6Fetcher = (path: string, revalidate: number) => Promise<unknown>;

function r6data(key: string): R6Fetcher {
  return async (path, revalidate) => {
    const response = await fetch(`${API}${path}`, {
      headers: { Accept: "application/json", "api-key": key },
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new TrackerError(
        `${path.split("?")[0]} failed (${response.status})`,
      );
    }
    return response.json();
  };
}

const GROUPS: RankTier[] = [
  "copper",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
];
const DIVISIONS = ["V", "IV", "III", "II", "I"];

/** Siege's rank number (1 is Copper V, 35 Diamond I, 36 Champion; 0 unranked). */
export function siegeRank(id: number): Rank {
  if (id >= 36) return { tier: "champion", division: null, icon: null };
  const group = GROUPS[Math.floor((id - 1) / 5)];
  if (id < 1 || !group) return { tier: "unranked", division: null, icon: null };
  return { tier: group, division: DIVISIONS[(id - 1) % 5] ?? null, icon: null };
}

/** The ranked board's latest season, across the platform families in the answer. */
function rankedProfile(stats: unknown) {
  let best: { season: number; entry: Record<string, unknown> } | null = null;
  for (const family of list(record(stats)?.platform_families_full_profiles)) {
    for (const board of list(record(family)?.board_ids_full_profiles)) {
      if (text(record(board)?.board_id) !== "ranked") continue;
      for (const value of list(record(board)?.full_profiles)) {
        const entry = record(value);
        if (!entry) continue;
        const season =
          numeric(entry.season_id) ??
          numeric(record(entry.profile)?.season_id) ??
          0;
        if (!best || season > best.season) best = { season, entry };
      }
    }
  }
  return best?.entry;
}

/**
 * Rank, RP, K/D, win rate and level for the Ubisoft name in `stats`.
 * "unconfigured" without the key, "offline" on any failure.
 */
export async function getSiege(
  account: Extract<GameStats, { source: "r6data" }>,
  { fetcher }: { fetcher?: R6Fetcher } = {},
): Promise<TrackerStatus> {
  const key = process.env.R6DATA_API_KEY?.trim();
  if (!fetcher && !key) return { status: "unconfigured" };
  const get = fetcher ?? r6data(key ?? "");
  const query = new URLSearchParams({
    nameOnPlatform: account.name,
    platformType: account.platformType,
  });

  try {
    const data = record(await get(`/v2/profile?${query}`, REVALIDATE));
    if (!data || (!data.account && !data.stats)) {
      throw new TrackerError("v2/profile: no player");
    }
    const accountInfo = record(data.account);
    const level =
      numeric(accountInfo?.level) ??
      numeric(record(accountInfo?.profile)?.level) ??
      null;

    const ranked = rankedProfile(data.stats);
    const profile = record(ranked?.profile);
    const season = record(ranked?.season_statistics);
    const outcomes = record(season?.match_outcomes);
    const kills = numeric(season?.kills) ?? numeric(profile?.kills) ?? 0;
    const deaths = numeric(season?.deaths) ?? numeric(profile?.deaths) ?? 0;
    const wins = numeric(outcomes?.wins) ?? numeric(profile?.wins) ?? 0;
    const losses = numeric(outcomes?.losses) ?? numeric(profile?.losses) ?? 0;
    const abandons =
      numeric(outcomes?.abandons) ?? numeric(profile?.abandon) ?? 0;
    const games = wins + losses + abandons;
    const rank = profile ? siegeRank(numeric(profile.rank) ?? 0) : null;
    const rp = numeric(profile?.rank_points);

    return {
      status: "ok",
      rank: rank && (rank.tier !== "unranked" || games > 0) ? rank : null,
      points:
        rank && rank.tier !== "unranked" && rp !== undefined
          ? { value: rp, unit: "RP" }
          : null,
      kd: games > 0 ? ratio(kills, deaths) : null,
      winRate: share(wins, games),
      level,
      scope: games > 0 ? { kind: "season" } : null,
    };
  } catch (error) {
    console.error("[trackers] r6:", describe(error));
    return { status: "offline" };
  }
}
