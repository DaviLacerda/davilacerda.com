import type { NextRequest } from "next/server";

import { mockParam, noStoreHeaders } from "@/lib/mock";
import { getSteam } from "@/lib/steam/steam";

/**
 * `/api/steam`: whether Davi is in a game on Steam and what he played in the
 * last two weeks, for the Steam card on the Personal tab (see
 * `src/lib/steam`). The CDN keeps each answer for a minute (and serves it
 * stale for two while it refetches). Always 200: "unconfigured" without
 * `STEAM_API_KEY`, "offline" when Steam fails. Ephemeral on purpose: not
 * part of the Markdown, llms.txt, MCP or OpenAPI surfaces.
 */
export async function GET(request: NextRequest) {
  const mock = mockParam(request);
  if (mock) {
    const { mockSteamFetcher, steamScenario } =
      await import("@/lib/steam/fixtures");
    const scenario = steamScenario(mock);
    if (scenario) {
      return Response.json(
        await getSteam({ fetcher: mockSteamFetcher(scenario) }),
        { headers: noStoreHeaders },
      );
    }
  }

  return Response.json(await getSteam(), {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
