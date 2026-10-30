import "server-only";

import { gameProfiles, type GameStats } from "@/content/personal";

import { getSiege, type R6Fetcher } from "./r6";
import type { TrackerId, TrackersResponse, TrackerStatus } from "./types";
import { getValorant, type HenrikFetcher } from "./valorant";

/*
 * Rank and stats for the game profiles that have a `stats` source in
 * `src/content/personal.ts`, both asked in parallel. Each source answers
 * "unconfigured" without its key and "offline" when it fails, so one never
 * breaks the other, and the card falls back to the link it always was.
 */

export type TrackerFetchers = { henrik?: HenrikFetcher; r6?: R6Fetcher };

function statsOf(id: TrackerId): GameStats | undefined {
  return gameProfiles.find((game) => game.id === id)?.stats;
}

async function one(
  stats: GameStats | undefined,
  fetchers: TrackerFetchers,
): Promise<TrackerStatus> {
  if (!stats) return { status: "unconfigured" };
  return stats.source === "henrikdev"
    ? getValorant(stats, { fetcher: fetchers.henrik })
    : getSiege(stats, { fetcher: fetchers.r6 });
}

export async function getTrackers(
  fetchers: TrackerFetchers = {},
): Promise<TrackersResponse> {
  const [valorant, r6] = await Promise.all([
    one(statsOf("valorant"), fetchers),
    one(statsOf("r6"), fetchers),
  ]);
  return { valorant, r6 };
}

/** Which trackers have their key: the page reserves room for their stats from the first paint. */
export function trackersConfigured(): Record<TrackerId, boolean> {
  return {
    valorant: Boolean(process.env.HENRIK_API_KEY?.trim()),
    r6: Boolean(process.env.R6DATA_API_KEY?.trim()),
  };
}
