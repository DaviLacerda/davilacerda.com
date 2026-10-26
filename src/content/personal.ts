/**
 * The Personal tab's small facts that change often: the show Davi is
 * watching, the teams he follows and where he plays. Edit this file; the
 * page, its Markdown rendition and llms-full.txt follow. (Facts about his
 * work stay in `profile.ts`.)
 *
 * - Watching: replace the entry (one line); add a second one to show two.
 * - Teams: add, remove or reorder entries. `espnId` is ESPN's number for
 *   the team: for a club it is in its espn.com URL
 *   (espn.com/soccer/team/_/id/874/corinthians); for an NBA or NFL team,
 *   open site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/<abbr>
 *   (football/nfl for the NFL) and read `team.id`. Scores come from ESPN's
 *   public site API through `/api/teams` (see ARCHITECTURE.md, "My teams").
 * - Games: Steam needs `STEAM_API_KEY` for the live part (see README); the
 *   other profiles are links.
 */
import type { Localizable } from "@/i18n";
import type { LogoId } from "@/lib/logos/registry";

/* ---------------------------------------------------------------- Watching */

export type Watching = {
  title: string;
  /** First aired. */
  year: number;
  /** Where it airs. */
  network?: string;
  /** A page about it (opens in a new tab). */
  url?: string;
  /** A poster you are allowed to use, as a file in /public (2:3), e.g. "/images/watching/show.webp". Without one the card sets the title's initials. */
  poster?: string;
};

export const watching: Watching[] = [
  {
    title: "Georgie & Mandy's First Marriage",
    year: 2024,
    network: "CBS",
    url: "https://en.wikipedia.org/wiki/Georgie_%26_Mandy%27s_First_Marriage",
  },
];

/* ------------------------------------------------------------------- Teams */

export type Sport = "basketball" | "football" | "soccer";

export type TeamLogo = {
  /** For light backgrounds. */
  light: string;
  /** For dark backgrounds (ESPN's dark variant); falls back to `light`. */
  dark?: string;
};

export type Team = {
  /** Stable key, any slug. */
  id: string;
  /** Full name, for screen readers and the Markdown. */
  name: string;
  /** Name on the score rows. */
  shortName: string;
  sport: Sport;
  /**
   * ESPN league slug: "nba", "nfl", "bra.1" (Brasileirão Série A)... For
   * soccer the schedule covers every competition ESPN has for the club
   * (Libertadores, Copa do Brasil...); this is the one shown by default.
   */
  league: string;
  /** ESPN team id (numeric). */
  espnId: string;
  /** Shown before the scores load and when ESPN cannot be reached. */
  logo: TeamLogo;
};

/** A team logo on ESPN's CDN: `espnLogo("nba", "bkn")`, `espnLogo("soccer", "874")`. */
function espnLogo(path: string, key: string): TeamLogo {
  return {
    light: `https://a.espncdn.com/i/teamlogos/${path}/500/${key}.png`,
    dark: `https://a.espncdn.com/i/teamlogos/${path}/500-dark/${key}.png`,
  };
}

export const teams: Team[] = [
  {
    id: "nets",
    name: "Brooklyn Nets",
    shortName: "Nets",
    sport: "basketball",
    league: "nba",
    espnId: "17",
    logo: espnLogo("nba", "bkn"),
  },
  {
    id: "corinthians",
    name: "Corinthians",
    shortName: "Corinthians",
    sport: "soccer",
    league: "bra.1",
    espnId: "874",
    logo: espnLogo("soccer", "874"),
  },
  {
    id: "vikings",
    name: "Minnesota Vikings",
    shortName: "Vikings",
    sport: "football",
    league: "nfl",
    espnId: "16",
    logo: espnLogo("nfl", "min"),
  },
];

/* ------------------------------------------------------------------- Games */

export type GameProfile = {
  id: string;
  /** The game or platform. */
  title: string;
  /** Davi's name there. */
  handle: string;
  /** Brand logo from the registry (`src/lib/logos/registry.ts`). */
  logo: LogoId;
  url: string;
  /** What the link opens, on the card's first line. */
  label: Localizable;
};

/** Steam: live status and hours through `/api/steam` once `STEAM_API_KEY` is set; a profile link otherwise. */
export const steam = {
  /** The custom URL name (steamcommunity.com/id/<vanity>), resolved to a SteamID64 on the server. */
  vanity: "davi16lacerda",
  url: "https://steamcommunity.com/id/davi16lacerda/",
} as const;

/** Profiles without a public API: link cards to their stats pages. */
export const gameProfiles: GameProfile[] = [
  {
    id: "playstation",
    title: "PlayStation",
    handle: "DaviLacerda-",
    logo: "playstation",
    url: "https://psnprofiles.com/DaviLacerda-",
    label: { en: "Trophies on PSNProfiles", "pt-br": "Troféus no PSNProfiles" },
  },
  {
    id: "valorant",
    title: "Valorant",
    handle: "davi#XVI",
    logo: "valorant",
    url: "https://tracker.gg/valorant/profile/riot/davi%23XVI/overview",
    label: { en: "Stats on Tracker.gg", "pt-br": "Estatísticas no Tracker.gg" },
  },
  {
    id: "r6",
    title: "Rainbow Six Siege",
    handle: "Hydroon.",
    logo: "ubisoft",
    url: "https://r6.tracker.network/r6siege/profile/ubi/Hydroon./overview",
    label: { en: "Stats on Tracker.gg", "pt-br": "Estatísticas no Tracker.gg" },
  },
];
