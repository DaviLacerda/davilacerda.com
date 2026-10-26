import "server-only";

/*
 * Defensive reads for the trackers' JSON: an API that changes shape leaves a
 * field empty instead of breaking the card.
 */

export type Json = Record<string, unknown>;

export function record(value: unknown): Json | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : undefined;
}

export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function numeric(value: unknown): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : undefined;
}

/** Kills per death, rounded to two places; null without kills or deaths to go on. */
export function ratio(kills: number, deaths: number): number | null {
  if (kills <= 0 && deaths <= 0) return null;
  return Math.round((kills / Math.max(deaths, 1)) * 100) / 100;
}

/** Wins over games, 0 to 1; null without games. */
export function share(wins: number, games: number): number | null {
  return games > 0 ? wins / games : null;
}

/** A tracker failure as a log line: the message only, never a URL or a key. */
export class TrackerError extends Error {
  override name = "TrackerError";
}

export function describe(error: unknown): string {
  if (error instanceof TrackerError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") {
    return "timed out";
  }
  return "request failed";
}
