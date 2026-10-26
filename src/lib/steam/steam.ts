import "server-only";

import { steam } from "@/content/personal";

import type { SteamGame, SteamStatus } from "./types";

/*
 * Davi's Steam status from the Steam Web API (server only; documented at
 * partner.steamgames.com/doc/webapi). Needs `STEAM_API_KEY`
 * (steamcommunity.com/dev/apikey); `STEAM_ID` (the 17-digit SteamID64) is
 * optional and saves resolving the vanity name in `src/content/personal.ts`.
 *
 * - ISteamUser/ResolveVanityURL: vanity name -> SteamID64 (kept a day).
 * - ISteamUser/GetPlayerSummaries: online, and the game running now.
 * - IPlayerService/GetRecentlyPlayedGames: the last two weeks.
 * - IPlayerService/GetOwnedGames: the library size.
 *
 * Only the summary is required; the other two fill in what they can (a
 * private game list just leaves them empty). The key travels in the query
 * string, so errors are logged as the method name and status only.
 */

const API = "https://api.steampowered.com";
const TIMEOUT_MS = 5000;

/** Reads a Web API method as JSON; `revalidate`: Data Cache lifetime in seconds. */
export type SteamFetcher = (
  method: string,
  params: Record<string, string>,
  revalidate: number,
) => Promise<unknown>;

class SteamError extends Error {
  override name = "SteamError";
}

function webApi(key: string): SteamFetcher {
  return async (method, params, revalidate) => {
    const url = new URL(`/${method}/`, API);
    url.search = new URLSearchParams({ ...params, key }).toString();
    const response = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new SteamError(`${method} failed (${response.status})`);
    }
    return response.json();
  };
}

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
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numeric(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : undefined;
}

const STEAM_ID = /^\d{17}$/;
let resolvedId: string | null = null;

/** The SteamID64: `STEAM_ID`, or the vanity name resolved once per instance (not cached for a mock). */
async function steamId(fetcher: SteamFetcher, cache: boolean): Promise<string> {
  const fromEnv = process.env.STEAM_ID?.trim();
  if (cache && fromEnv && STEAM_ID.test(fromEnv)) return fromEnv;
  if (cache && resolvedId) return resolvedId;
  const data = await fetcher(
    "ISteamUser/ResolveVanityURL/v1",
    { vanityurl: steam.vanity },
    86_400,
  );
  const response = record(record(data)?.response);
  const id = text(response?.steamid);
  if (response?.success !== 1 || !id || !STEAM_ID.test(id)) {
    throw new SteamError("ResolveVanityURL: no match");
  }
  if (cache) resolvedId = id;
  return id;
}

function recentGames(data: unknown): SteamGame[] {
  return list(record(record(data)?.response)?.games)
    .map((value) => {
      const game = record(value);
      const appId = numeric(game?.appid);
      const name = text(game?.name);
      const recentMinutes = numeric(game?.playtime_2weeks) ?? 0;
      return appId !== undefined && name
        ? { appId, name, recentMinutes }
        : null;
    })
    .filter(
      (game): game is SteamGame => game !== null && game.recentMinutes > 0,
    )
    .sort((a, b) => b.recentMinutes - a.recentMinutes);
}

/**
 * Online, the game running now, the last two weeks and the library size.
 * "unconfigured" without the key, "offline" on any failure, so the page
 * never breaks because of Steam.
 */
export async function getSteam({
  fetcher,
}: { fetcher?: SteamFetcher } = {}): Promise<SteamStatus> {
  const key = process.env.STEAM_API_KEY?.trim();
  if (!fetcher && !key) return { status: "unconfigured" };
  const get = fetcher ?? webApi(key ?? "");

  try {
    const id = await steamId(get, !fetcher);
    const [summary, recent, owned] = await Promise.allSettled([
      get("ISteamUser/GetPlayerSummaries/v2", { steamids: id }, 30),
      get(
        "IPlayerService/GetRecentlyPlayedGames/v1",
        { steamid: id, count: "5" },
        300,
      ),
      get(
        "IPlayerService/GetOwnedGames/v1",
        { steamid: id, include_played_free_games: "1" },
        86_400,
      ),
    ]);
    if (summary.status === "rejected") throw summary.reason;
    const player = record(
      list(record(record(summary.value)?.response)?.players)[0],
    );
    if (!player) throw new SteamError("GetPlayerSummaries: no player");

    const games =
      recent.status === "fulfilled" ? recentGames(recent.value) : [];
    const playingName = text(player.gameextrainfo);
    const gameCount =
      owned.status === "fulfilled"
        ? (numeric(record(record(owned.value)?.response)?.game_count) ?? null)
        : null;

    return {
      status: "ok",
      online: (numeric(player.personastate) ?? 0) > 0,
      playing: playingName
        ? { appId: numeric(player.gameid) ?? null, name: playingName }
        : null,
      recent: games.slice(0, 3),
      recentMinutes: games.reduce((sum, game) => sum + game.recentMinutes, 0),
      gameCount,
    };
  } catch (error) {
    console.error(
      "[steam]",
      error instanceof SteamError
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "timed out"
          : "request failed",
    );
    return { status: "offline" };
  }
}
