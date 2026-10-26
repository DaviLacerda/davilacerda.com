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

/** A quiet picture for each interest in the profile; anything new gets the sparkle. */
const icons: Record<string, Icon> = {
  nba: BasketballIcon,
  "star-wars": PlanetIcon,
  series: TelevisionSimpleIcon,
  pokemon: LightningIcon,
  disney: CastleTurretIcon,
};

/**
 * What Davi likes away from work, as a row of chips with a small icon each:
 * a glance, not a paragraph. Part of the Personal tab's first-paint entrance
 * (`data-enter`), one chip after another from `enter`.
 */
export function Interests({
  lang,
  enter,
  className,
}: {
  lang: Locale;
  /** Place of the first chip in the entrance (`--i`). */
  enter: number;
  className?: string;
}) {
  const dict = getDictionary(lang);
  if (!profile.interests.length) return null;

  return (
    <ul
      aria-label={dict.personal.intro.interests}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {profile.interests.map((interest, index) => {
        const InterestIcon = icons[interest.id] ?? SparkleIcon;
        return (
          <li
            key={interest.id}
            data-enter=""
            style={{ "--i": enter + index } as CSSProperties}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-surface pr-4 pl-3.5 text-small"
          >
            <InterestIcon
              aria-hidden="true"
              className="size-[1.125rem] text-muted-foreground"
            />
            {t(interest.label, lang)}
          </li>
        );
      })}
    </ul>
  );
}
