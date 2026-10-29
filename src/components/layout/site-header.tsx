import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NavTabs } from "@/components/layout/nav-tabs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import { routes } from "@/lib/routes";

/**
 * A plain bar on the wide frame: Davi's mark and name (the name from 640px
 * up), the Work, Projects and Personal tabs, the locale link and the theme
 * toggle. Its edges line up with the Work split pane. On a phone three tabs
 * and the controls don't share one row in Portuguese, so below 640px the
 * tabs take a second row of their own, the full width, as one segmented
 * control. It sticks to the top on a translucent, blurred page tone so
 * the tabs stay in reach while scrolling.
 */
export function SiteHeader({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-background">
      <Container
        wide
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3 pb-2 sm:h-20 sm:flex-nowrap sm:py-0"
      >
        <Link
          href={routes.work(lang)}
          aria-label={dict.a11y.home}
          className="-ml-1 flex items-center gap-2.5 rounded-lg p-1 text-body font-medium tracking-tight"
        >
          <BrandMark draw className="h-6 w-auto" />
          <span className="hidden sm:inline">{profile.name}</span>
        </Link>

        <NavTabs
          lang={lang}
          ariaLabel={dict.a11y.primaryNav}
          labels={{
            work: dict.nav.work,
            projects: dict.nav.projects,
            personal: dict.nav.personal,
          }}
        />

        <div className="-mr-2 flex items-center">
          <LocaleSwitcher lang={lang} label={dict.locale.switchTo} />
          <ThemeToggle
            label={dict.theme.toggle}
            names={{
              system: dict.theme.system,
              light: dict.theme.light,
              dark: dict.theme.dark,
            }}
          />
        </div>
      </Container>
    </header>
  );
}
