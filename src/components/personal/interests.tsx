import { BasketballIcon } from "@phosphor-icons/react/dist/ssr/Basketball";
import { CastleTurretIcon } from "@phosphor-icons/react/dist/ssr/CastleTurret";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PlanetIcon } from "@phosphor-icons/react/dist/ssr/Planet";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { TelevisionSimpleIcon } from "@phosphor-icons/react/dist/ssr/TelevisionSimple";
import type { Icon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

import { tileClass, TileTitle } from "./parts";

/** A quiet picture for each interest in the profile; anything new gets the sparkle. */
const icons: Record<string, Icon> = {
  nba: BasketballIcon,
  "star-wars": PlanetIcon,
  series: TelevisionSimpleIcon,
  pokemon: LightningIcon,
  disney: CastleTurretIcon,
};

/**
 * What Davi likes away from work: a bento tile with its title and a row of
 * chips with a small icon each (a glance, not a paragraph). The chips sit
 * on the page tone, one step from the tile. Part of the first-paint
 * entrance (`data-enter`) at `enter`.
 */
export function Interests({
  lang,
  enter,
  className,
}: {
  lang: Locale;
  /** Place of the tile in the entrance (`--i`). */
  enter: number;
  className?: string;
}) {
  const dict = getDictionary(lang);
  if (!profile.interests.length) return null;

  return (
    <div
      data-enter=""
      style={{ "--i": enter } as CSSProperties}
      className={cn(tileClass, "flex flex-col gap-4", className)}
    >
      <TileTitle id="interests-title">
        {dict.personal.intro.interests}
      </TileTitle>
      <ul aria-labelledby="interests-title" className="flex flex-wrap gap-2">
        {profile.interests.map((interest) => {
          const InterestIcon = icons[interest.id] ?? SparkleIcon;
          return (
            <li
              key={interest.id}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-background pr-3.5 pl-3 text-small"
            >
              <InterestIcon
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              {t(interest.label, lang)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
