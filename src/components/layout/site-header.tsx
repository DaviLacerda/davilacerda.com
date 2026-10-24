import Link from "next/link";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Monogram } from "@/components/layout/monogram";
import { NavTabs } from "@/components/layout/nav-tabs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Container } from "@/components/ui/container";
import { getDictionary, type Locale } from "@/i18n";
import { routes } from "@/lib/routes";

/**
 * Sticky, translucent header: monogram + name (name hidden on small screens),
 * Work/Personal tabs, locale switcher and theme toggle. Fits a 320px screen
 * without a hamburger: the tabs are the whole navigation.
 */
export function SiteHeader({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Link
          href={routes.work(lang)}
          aria-label={dict.a11y.home}
          className="group -ml-1 flex items-center gap-3 rounded-full p-1"
        >
          <Monogram />
          <span className="hidden font-display text-[1.35rem] leading-none tracking-tight md:inline">
            Davi Lacerda<span className="text-accent">.</span>
          </span>
        </Link>

        <NavTabs
          lang={lang}
          ariaLabel={dict.a11y.primaryNav}
          labels={{ work: dict.nav.work, personal: dict.nav.personal }}
        />

        <div className="-mr-1 flex items-center gap-0.5">
          <LocaleSwitcher lang={lang} label={dict.locale.switchTo} />
          <ThemeToggle label={dict.theme.toggle} />
        </div>
      </Container>
    </header>
  );
}
