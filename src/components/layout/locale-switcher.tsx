"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAlternateLinks } from "@/components/providers/alternate-links";
import {
  LOCALE_COOKIE,
  localeMeta,
  otherLocales,
  type Locale,
} from "@/i18n/config";
import { switchLocalePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  lang: Locale;
  /** Accessible label, e.g. dict.locale.switchTo ("Ler em português"). */
  label: string;
  className?: string;
};

/**
 * Links to the current page in the other locale, keeping the path (and hash).
 * Pages whose slugs differ per locale register their URLs with
 * <LocaleAlternates>. Choosing a locale stores it in a cookie so the proxy
 * sends future visits of "/" there. No animation: it is a page change.
 */
export function LocaleSwitcher({
  lang,
  label,
  className,
}: LocaleSwitcherProps) {
  const pathname = usePathname() ?? `/${lang}`;
  const alternates = useAlternateLinks();
  // Two locales today; with more, render a menu over otherLocales(lang).
  const [target] = otherLocales(lang);
  if (!target) return null;

  const href =
    alternates?.[target] ??
    (alternates ? `/${target}` : switchLocalePath(pathname, target));
  const meta = localeMeta[target];

  return (
    <Link
      href={href}
      hrefLang={meta.hreflang}
      lang={meta.htmlLang}
      aria-label={label}
      title={label}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
      }}
      className={cn(
        "inline-flex h-10 min-w-10 pressable items-center justify-center rounded-full px-2 text-small font-medium text-muted-foreground hover:bg-surface hover:text-foreground",
        className,
      )}
    >
      {meta.short}
    </Link>
  );
}
