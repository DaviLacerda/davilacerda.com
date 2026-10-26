/**
 * What `/api/teams` returns, shared by the route handler and the Personal
 * tab's scoreboard. Dependency-free (type imports only), so the client
 * imports it for the types and the path.
 */
import type { Sport, TeamLogo } from "@/content/personal";
import type { Locale } from "@/i18n/config";

export type { Sport, TeamLogo };

export const TEAMS_PATH = "/api/teams";

/** One side of a game. */
export type Side = {
  /** Short name ("Pacers"). */
  name: string;
  /** Full name ("Indiana Pacers"), for screen readers. */
  fullName: string;
  /** "IND": the monogram when the logo cannot load. */
  abbreviation?: string;
  /** ESPN CDN logo (a.espncdn.com), or null for a monogram. */
  logo: TeamLogo | null;
  /** The score as ESPN writes it ("109"); null before the game. */
  score: string | null;
  home: boolean;
};

/** What the clock is doing during a live game. */
export type LivePhase = "play" | "halftime" | "break" | "shootout" | "delayed";

type GameBase = {
  /** ESPN event id. */
  id: string;
  /** Start time, ISO 8601 (UTC). */
  start: string;
  /** ESPN league slug of this game ("nba", "bra.1", "conmebol.libertadores"). */
  competition: string;
  team: Side;
  opponent: Side;
  /** The game on espn.com (Gamecast or recap), when ESPN gives one. */
  url: string | null;
};

export type Game =
  | (GameBase & {
      state: "live";
      /** 1-based quarter or half; above the regulation count it is overtime or extra time. */
      period: number;
      /** ESPN's clock: "7:32" (NBA, NFL), "67'" or "45'+2'" (soccer). */
      clock: string;
      phase: LivePhase;
    })
  | (GameBase & { state: "final"; result: "win" | "loss" | "draw" })
  | (GameBase & { state: "upcoming" });

export type TeamStatus = {
  /** `teams[].id` in `src/content/personal.ts`. */
  id: string;
  name: string;
  shortName: string;
  sport: Sport;
  league: string;
  logo: TeamLogo;
  /** The game to show: live, the last result or the next one; null when ESPN could not be read. */
  game: Game | null;
};

export type TeamsResponse = {
  teams: TeamStatus[];
  /** When the server built this answer (ISO). */
  updatedAt: string;
};

/** How a competition is named on a card, by ESPN league slug. */
const competitions: Record<string, string | Record<Locale, string>> = {
  nba: "NBA",
  nfl: "NFL",
  "bra.1": "Brasileirão",
  "bra.copa_do_brazil": "Copa do Brasil",
  "bra.copa_do_brasil": "Copa do Brasil",
  "bra.camp.paulista": "Paulistão",
  "conmebol.libertadores": "Libertadores",
  "conmebol.sudamericana": { en: "Sudamericana", "pt-br": "Sul-Americana" },
  "conmebol.recopa": {
    en: "Recopa Sudamericana",
    "pt-br": "Recopa Sul-Americana",
  },
  "fifa.cwc": { en: "Club World Cup", "pt-br": "Mundial de Clubes" },
};

/** "bra.1" -> "Brasileirão"; an unknown slug shows its last part in capitals. */
export function competitionLabel(slug: string, lang: Locale): string {
  const label = competitions[slug];
  if (typeof label === "string") return label;
  if (label) return label[lang];
  return (slug.split(".").at(-1) ?? slug).replaceAll("_", " ").toUpperCase();
}

/** Regulation periods: after these, a live period is overtime (or extra time). */
export const regulationPeriods: Record<Sport, number> = {
  basketball: 4,
  football: 4,
  soccer: 2,
};
