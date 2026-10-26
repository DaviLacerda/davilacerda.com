import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";

import { BrandLogo } from "@/components/ui/logo";
import { gameProfiles, steam } from "@/content/personal";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { localeMeta } from "@/i18n/config";
import { trackersConfigured } from "@/lib/trackers/trackers";
import { isTrackerId, type TrackerId } from "@/lib/trackers/types";

import { CardLink, CardText, Tile } from "./parts";
import { SteamCard } from "./steam";
import { TrackerCards, type TrackerGame } from "./trackers";

/**
 * Where Davi plays, the rows of the Games tile (two across from 640px,
 * stacked on a phone): Valorant and Rainbow Six Siege with their rank and
 * stats when their keys are set (`TrackerCards`), the Steam card (live with
 * `STEAM_API_KEY`), then PlayStation; each with its brand mark. Any game
 * without live data is a link to its stats page.
 */
export function Games({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const strings = dict.personal.games;
  const locale = localeMeta[lang].intl;
  const logo = (id: (typeof gameProfiles)[number]["logo"]) => (
    <BrandLogo id={id} className="size-8 text-foreground" />
  );

  const trackers: TrackerGame[] = gameProfiles
    .filter(
      (game): game is typeof game & { id: TrackerId } =>
        isTrackerId(game.id) && Boolean(game.stats),
    )
    .map((game) => ({
      id: game.id,
      title: game.title,
      handle: game.handle,
      url: game.url,
      label: t(game.label, lang),
      logo: logo(game.logo),
    }));
  const links = gameProfiles.filter(
    (game) => !trackers.some((tracker) => tracker.id === game.id),
  );

  return (
    <ul className="-mx-2 mt-3 grid gap-1 sm:-mx-3 sm:grid-cols-2 sm:gap-2">
      <TrackerCards
        games={trackers}
        configured={trackersConfigured()}
        strings={{
          profile: strings.profile,
          stats: strings.stats,
          ranks: strings.ranks,
          opensInNewTab: dict.a11y.opensInNewTab,
        }}
        locale={locale}
      />
      <li className="min-w-0">
        <SteamCard
          profileUrl={steam.url}
          handle={steam.vanity}
          locale={locale}
          strings={{ ...strings, opensInNewTab: dict.a11y.opensInNewTab }}
          logo={<BrandLogo id="steam" className="size-8 text-foreground" />}
        />
      </li>
      {links.map((game) => {
        const label = t(game.label, lang);
        return (
          <li key={game.id} className="min-w-0">
            <CardLink
              href={game.url}
              label={`${interpolate(strings.profile, {
                title: game.title,
                handle: game.handle,
                label,
              })} (${dict.a11y.opensInNewTab})`}
              className="h-full"
            >
              <Tile>{logo(game.logo)}</Tile>
              <CardText
                status={label}
                title={game.title}
                detail={game.handle}
              />
              <ArrowUpRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </CardLink>
          </li>
        );
      })}
    </ul>
  );
}
