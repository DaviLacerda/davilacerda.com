import { getNowPlaying } from "@/lib/spotify/now-playing";

/**
 * `/api/now-playing`: what Davi is listening to on Spotify, for the card on
 * the Personal tab (see `src/lib/spotify`). Dynamic, but the CDN keeps each
 * answer for 30s (and serves it stale for a minute while it refetches), so
 * however many people have the page open, Spotify is asked about twice a
 * minute at most. Always 200: "unconfigured" without the env vars and
 * "offline" when Spotify fails. Ephemeral on purpose: it is not part of the
 * Markdown, llms.txt, MCP or OpenAPI surfaces.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getNowPlaying(), {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
