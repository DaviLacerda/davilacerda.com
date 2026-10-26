/**
 * What `/api/steam` returns, shared by the route handler and the Personal
 * tab's Steam card. Dependency-free, so the client imports it for the types
 * and the path.
 */

export const STEAM_PATH = "/api/steam";

export type SteamGame = {
  appId: number;
  name: string;
  /** Minutes played in the last two weeks. */
  recentMinutes: number;
};

export type SteamStatus =
  | {
      status: "ok";
      /** Signed in (any persona state but offline). */
      online: boolean;
      /** The game running now (Steam shows it only on a public profile). */
      playing: { appId: number | null; name: string } | null;
      /** Games played in the last two weeks, most played first. */
      recent: SteamGame[];
      /** Minutes across them. */
      recentMinutes: number;
      /** Games in the library, when the profile shows them. */
      gameCount: number | null;
    }
  | {
      /** Steam could not be reached, or the profile is private. */
      status: "offline";
    }
  | {
      /** `STEAM_API_KEY` is not set (local builds, previews without it). */
      status: "unconfigured";
    };
