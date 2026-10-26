/**
 * What `/api/trackers` returns, shared by the route handler and the Personal
 * tab's game cards. Dependency-free, so the client imports it for the types,
 * the path and the rank names.
 */

export const TRACKERS_PATH = "/api/trackers";

/** The games with stats: `gameProfiles[].id` in `src/content/personal.ts`. */
export type TrackerId = "valorant" | "r6";

/**
 * A rank group, the same word in every division ("gold" in Gold 2 and in
 * Gold III); the page names it in its language.
 */
export type RankTier =
  | "unranked"
  // Valorant
  | "iron"
  | "ascendant"
  | "immortal"
  | "radiant"
  // Rainbow Six Siege
  | "copper"
  | "emerald"
  | "champion"
  // Both
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

export type Rank = {
  tier: RankTier;
  /** As the game writes it: "2" in Valorant, "III" in Rainbow Six Siege; null for a rank without divisions. */
  division: string | null;
  /** The rank's emblem (Valorant only, from media.valorant-api.com), or null. */
  icon: string | null;
};

export type TrackerStats = {
  status: "ok";
  /** null when the player has no rank this season. */
  rank: Rank | null;
  /** Points inside the rank: Valorant's RR (0 to 100), Rainbow Six Siege's RP. */
  points: { value: number; unit: "RR" | "RP" } | null;
  /** Kills per death. */
  kd: number | null;
  /** Share of games won, 0 to 1. */
  winRate: number | null;
  /** Account level. */
  level: number | null;
  /**
   * What K/D and win rate cover: the last `count` competitive matches
   * (Valorant), or this ranked season (Rainbow Six Siege, or Valorant's
   * current act when no recent match is stored).
   */
  scope: { kind: "matches"; count: number } | { kind: "season" } | null;
};

export type TrackerStatus =
  | TrackerStats
  | {
      /** The source could not be reached, or did not know the player. */
      status: "offline";
    }
  | {
      /** The source's key is not set (local builds, previews without it). */
      status: "unconfigured";
    };

export type TrackersResponse = Record<TrackerId, TrackerStatus>;

export function isTrackerId(value: string): value is TrackerId {
  return value === "valorant" || value === "r6";
}
