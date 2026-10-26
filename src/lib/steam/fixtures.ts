import "server-only";

import type { SteamFetcher } from "./steam";

/*
 * Steam Web API-shaped fixtures for `/api/steam?mock=<scenario>` (see
 * `src/lib/mock.ts`): the fake fetcher answers the same methods the real one
 * calls, in the API's JSON shapes, so the mock runs the real parser.
 *
 * Scenarios: playing (in a game), recent (not in a game, hours in the last
 * two weeks), idle (online, nothing played lately), offline (every request
 * fails). The teams' scenario names also work, so one `?mock=` drives the
 * whole page: live and mixed -> playing, final -> recent, upcoming -> idle,
 * unavailable -> offline.
 */

const aliases = {
  playing: "playing",
  recent: "recent",
  idle: "idle",
  offline: "offline",
  live: "playing",
  mixed: "playing",
  final: "recent",
  upcoming: "idle",
  unavailable: "offline",
} as const;

type SteamScenario = (typeof aliases)[keyof typeof aliases];

export function steamScenario(value: string): SteamScenario | null {
  return Object.hasOwn(aliases, value)
    ? aliases[value as keyof typeof aliases]
    : null;
}

const STEAM_ID = "76561198000000000";
const siege = { appid: 359550, name: "Tom Clancy's Rainbow Six Siege" };
const counterStrike = { appid: 730, name: "Counter-Strike 2" };

export function mockSteamFetcher(scenario: SteamScenario): SteamFetcher {
  return async (method) => {
    if (scenario === "offline") throw new Error("mock: offline");
    if (method.startsWith("ISteamUser/ResolveVanityURL")) {
      return { response: { steamid: STEAM_ID, success: 1 } };
    }
    if (method.startsWith("ISteamUser/GetPlayerSummaries")) {
      return {
        response: {
          players: [
            {
              steamid: STEAM_ID,
              communityvisibilitystate: 3,
              profilestate: 1,
              personaname: "davi16lacerda",
              profileurl: "https://steamcommunity.com/id/davi16lacerda/",
              avatar: "",
              personastate: scenario === "recent" ? 0 : 1,
              lastlogoff: 1_761_400_000,
              ...(scenario === "playing"
                ? { gameid: String(siege.appid), gameextrainfo: siege.name }
                : {}),
            },
          ],
        },
      };
    }
    if (method.startsWith("IPlayerService/GetRecentlyPlayedGames")) {
      return scenario === "idle"
        ? { response: { total_count: 0 } }
        : {
            response: {
              total_count: 2,
              games: [
                {
                  ...siege,
                  playtime_2weeks: 1094,
                  playtime_forever: 48_210,
                  img_icon_url: "",
                },
                {
                  ...counterStrike,
                  playtime_2weeks: 186,
                  playtime_forever: 9_420,
                  img_icon_url: "",
                },
              ],
            },
          };
    }
    if (method.startsWith("IPlayerService/GetOwnedGames")) {
      return { response: { game_count: 64, games: [] } };
    }
    throw new Error(`mock: no fixture for ${method}`);
  };
}
