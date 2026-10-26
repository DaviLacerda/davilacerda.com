import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";

import { Reveal } from "@/components/motion/reveal";
import { BrandLogo } from "@/components/ui/logo";
import { gameProfiles, steam } from "@/content/personal";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { localeMeta } from "@/i18n/config";

import { CardLink, CardText, Tile } from "./parts";
import { SteamCard } from "./steam";

/**
 * Where Davi plays, under "Games": the Steam card (live with
 * `STEAM_API_KEY`, a profile link otherwise), then one link card per game
 * profile without a public API (PlayStation, Valorant, Rainbow Six Siege),
 * each with its brand mark, the game, Davi's name there and where the link
 * goes. Two across from 640px, stacked on a phone.
 */
export function Games({ lang, enter }: { lang: Locale; enter?: number }) {
  const dict = getDictionary(lang);
  const strings = dict.personal.games;

  return (
    <Reveal
      as="ul"
      stagger
      enter={enter}
      className="mt-4 grid gap-3 sm:grid-cols-2"
    >
      <li>
        <SteamCard
          profileUrl={steam.url}
          handle={steam.vanity}
          locale={localeMeta[lang].intl}
          strings={{ ...strings, opensInNewTab: dict.a11y.opensInNewTab }}
          logo={<BrandLogo id="steam" className="size-8 text-foreground" />}
        />
      </li>
      {gameProfiles.map((game) => {
        const label = t(game.label, lang);
        return (
          <li key={game.id}>
            <CardLink
              href={game.url}
              label={`${interpolate(strings.profile, {
                title: game.title,
                handle: game.handle,
                label,
              })} (${dict.a11y.opensInNewTab})`}
            >
              <Tile>
                <BrandLogo id={game.logo} className="size-8 text-foreground" />
              </Tile>
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
    </Reveal>
  );
}
