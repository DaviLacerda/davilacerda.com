import "server-only";

import type { NowPlaying, NowPlayingTrack } from "./types";

/*
 * What Davi is listening to, from the Spotify Web API (server only).
 *
 * Auth is the authorization-code flow done once by hand
 * (`yarn spotify:token`, see README): the long-lived refresh token lives in
 * `SPOTIFY_REFRESH_TOKEN` and is exchanged here for a short-lived access
 * token, kept in memory until a minute before it expires. Scopes:
 * `user-read-currently-playing user-read-recently-played`.
 *
 * Nothing secret ever leaves this module: errors are reduced to "offline"
 * and logged without tokens or response bodies.
 */

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
const TIMEOUT_MS = 5000;
/** Cover size to pick: the smallest at least this wide (Spotify sends 64, 300 and 640). */
const ART_MIN_WIDTH = 128;

type Credentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type SpotifyImage = { url: string; width: number | null };

type SpotifyTrack = {
  type?: string;
  name?: string;
  duration_ms?: number;
  external_urls?: { spotify?: string };
  artists?: { name?: string }[];
  album?: { name?: string; images?: SpotifyImage[] };
};

type CurrentlyPlaying = {
  is_playing?: boolean;
  progress_ms?: number | null;
  currently_playing_type?: "track" | "episode" | "ad" | "unknown";
  item?: SpotifyTrack | null;
};

type RecentlyPlayed = { items?: { track?: SpotifyTrack }[] };

class SpotifyError extends Error {
  override name = "SpotifyError";
}

function readCredentials(): Credentials | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(
  credentials: Credentials,
  { force = false } = {},
): Promise<string> {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    cachedToken = null;
    throw new SpotifyError(`token exchange failed (${response.status})`);
  }
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) throw new SpotifyError("token exchange: no token");
  // Refresh a minute early, so a token never expires mid-request.
  const lifetime = Math.max((data.expires_in ?? 3600) - 60, 30);
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + lifetime * 1000,
  };
  return cachedToken.value;
}

/** GET on the Web API; a rejected token is refreshed once and the call retried. */
async function spotifyGet(
  path: string,
  credentials: Credentials,
): Promise<Response> {
  const request = (token: string) =>
    fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  const response = await request(await getAccessToken(credentials));
  if (response.status !== 401) return response;
  return request(await getAccessToken(credentials, { force: true }));
}

function pickAlbumArt(images: SpotifyImage[] = []): string | null {
  const sorted = images
    .filter((image) => image.url.startsWith("https://"))
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const image =
    sorted.find((candidate) => (candidate.width ?? 0) >= ART_MIN_WIDTH) ??
    sorted.at(-1);
  return image?.url ?? null;
}

/** The fields the card shows, or null for anything that is not a playable song. */
function toTrack(
  item: SpotifyTrack | null | undefined,
): NowPlayingTrack | null {
  if (!item || (item.type && item.type !== "track")) return null;
  const url = item.external_urls?.spotify;
  const artists = (item.artists ?? [])
    .map((artist) => artist.name?.trim())
    .filter((name): name is string => Boolean(name));
  if (!item.name || !url?.startsWith("https://open.spotify.com/")) return null;
  return {
    title: item.name,
    artists,
    album: item.album?.name ?? "",
    albumArt: pickAlbumArt(item.album?.images),
    url,
  };
}

/**
 * The song playing now; when nothing is (or a podcast or an ad is), the one
 * paused or the last one played. "unconfigured" without the env vars and
 * "offline" on any failure, so the page never breaks because of Spotify.
 */
export async function getNowPlaying(): Promise<NowPlaying> {
  const credentials = readCredentials();
  if (!credentials) return { status: "unconfigured" };

  try {
    const current = await spotifyGet(
      "/me/player/currently-playing",
      credentials,
    );
    if (current.status === 200) {
      const data = (await current.json()) as CurrentlyPlaying;
      const track =
        data.currently_playing_type === "track" ? toTrack(data.item) : null;
      if (track && data.is_playing) {
        return {
          status: "playing",
          ...track,
          ...(typeof data.progress_ms === "number"
            ? { progressMs: data.progress_ms }
            : {}),
          ...(typeof data.item?.duration_ms === "number"
            ? { durationMs: data.item.duration_ms }
            : {}),
        };
      }
      // Paused: that song is the last one played.
      if (track) return { status: "recent", ...track };
    } else if (current.status !== 204) {
      throw new SpotifyError(`currently-playing failed (${current.status})`);
    }

    const recent = await spotifyGet(
      "/me/player/recently-played?limit=1",
      credentials,
    );
    if (!recent.ok) {
      throw new SpotifyError(`recently-played failed (${recent.status})`);
    }
    const data = (await recent.json()) as RecentlyPlayed;
    const track = toTrack(data.items?.[0]?.track);
    return track ? { status: "recent", ...track } : { status: "offline" };
  } catch (error) {
    // Messages only: tokens travel in headers and bodies, never in these.
    console.error(
      "[now-playing]",
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : "request failed",
    );
    return { status: "offline" };
  }
}
