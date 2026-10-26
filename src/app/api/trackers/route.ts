import type { NextRequest } from "next/server";

import { mockParam, noStoreHeaders } from "@/lib/mock";
import { getTrackers } from "@/lib/trackers/trackers";

/**
 * `/api/trackers`: Davi's rank, K/D, win rate and level in Valorant
 * (HenrikDev, `HENRIK_API_KEY`) and Rainbow Six Siege (R6Data,
 * `R6DATA_API_KEY`), for the game cards on the Personal tab (see
 * `src/lib/trackers`). Upstream answers stay in the Data Cache for 10 to 30
 * minutes; the CDN keeps each answer 10 minutes and serves it stale for an
 * hour while it refetches. Always 200: a game without its key answers
 * "unconfigured" and a failing source "offline", and the card stays a link.
 * Ephemeral on purpose: not part of the Markdown, llms.txt, MCP or OpenAPI
 * surfaces.
 */
export async function GET(request: NextRequest) {
  const mock = mockParam(request);
  if (mock) {
    const { mockTrackerFetchers, trackerScenario } =
      await import("@/lib/trackers/fixtures");
    const scenario = trackerScenario(mock);
    if (scenario) {
      return Response.json(await getTrackers(mockTrackerFetchers(scenario)), {
        headers: noStoreHeaders,
      });
    }
  }

  return Response.json(await getTrackers(), {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
