import type { NextRequest } from "next/server";

import { mockParam, noStoreHeaders } from "@/lib/mock";
import { getTeams, teamsMaxAge } from "@/lib/teams/espn";

/**
 * `/api/teams`: live or last results of Davi's teams, for the scoreboard on
 * the Personal tab (see `src/lib/teams`). ESPN is asked server side, the
 * three teams in parallel, through the Data Cache (schedules for 10
 * minutes, a scoreboard for 15 seconds around a game). The CDN keeps each
 * answer 30 seconds while a game is live, a minute around a start or a fresh
 * result, ten minutes otherwise (`teamsMaxAge`). Always 200: a team ESPN
 * cannot answer for comes back with `game: null`. Ephemeral on purpose: not
 * part of the Markdown, llms.txt, MCP or OpenAPI surfaces.
 */
export async function GET(request: NextRequest) {
  const mock = mockParam(request);
  if (mock) {
    const { isTeamScenario, mockTeamsFetcher } =
      await import("@/lib/teams/fixtures");
    if (isTeamScenario(mock)) {
      const now = Date.now();
      return Response.json(
        await getTeams({ fetcher: mockTeamsFetcher(mock, now), now }),
        { headers: noStoreHeaders },
      );
    }
  }

  const data = await getTeams();
  const maxAge = teamsMaxAge(data);
  return Response.json(data, {
    headers: {
      "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
