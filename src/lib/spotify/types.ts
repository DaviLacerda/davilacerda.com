/**
 * What `/api/now-playing` returns, shared by the route handler and the
 * Personal tab's card. Dependency-free, so the client imports it for types
 * and the path only.
 */

export const NOW_PLAYING_PATH = "/api/now-playing";

export type NowPlayingTrack = {
  title: string;
  artists: string[];
  album: string;
  /** Album cover on Spotify's CDN (about 300px square), or null when it has none. */
  albumArt: string | null;
  /** The track on open.spotify.com. */
  url: string;
};

export type NowPlaying =
  | (NowPlayingTrack & {
      /** A song is playing right now. */
      status: "playing";
      progressMs?: number;
      durationMs?: number;
    })
  | (NowPlayingTrack & {
      /** Nothing is playing: the last song played (or the one paused). */
      status: "recent";
    })
  | {
      /** Spotify could not be reached, or there is nothing to show. */
      status: "offline";
    }
  | {
      /** The Spotify env vars are not set (local builds, previews without them). */
      status: "unconfigured";
    };

export function hasTrack(
  data: NowPlaying,
): data is Extract<NowPlaying, NowPlayingTrack> {
  return data.status === "playing" || data.status === "recent";
}
