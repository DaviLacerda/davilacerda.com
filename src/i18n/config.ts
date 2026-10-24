/**
 * Locale configuration. This module is dependency-free so it can be imported
 * from the proxy, server components, client components and route handlers.
 */

export const locales = ["en", "pt-br"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie set by the locale switcher; the proxy prefers it over Accept-Language. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export type LocaleMeta = {
  /** Value for `<html lang>` and `inLanguage` in JSON-LD (BCP 47). */
  htmlLang: string;
  /** Key used in `alternates.languages` / hreflang. */
  hreflang: string;
  /** OpenGraph locale (`og:locale`). */
  ogLocale: string;
  /** Locale passed to `Intl.*` formatters. */
  intl: string;
  /** Native language name, shown in the locale switcher. */
  label: string;
  /** Short label (EN / PT). */
  short: string;
};

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: {
    htmlLang: "en",
    hreflang: "en",
    ogLocale: "en_US",
    intl: "en-US",
    label: "English",
    short: "EN",
  },
  "pt-br": {
    htmlLang: "pt-BR",
    hreflang: "pt-BR",
    ogLocale: "pt_BR",
    intl: "pt-BR",
    label: "Português",
    short: "PT",
  },
};

/** Type guard for route params: `if (!isLocale(lang)) notFound()`. */
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** The other locales, in config order (useful for alternates and switchers). */
export function otherLocales(lang: Locale): Locale[] {
  return locales.filter((l) => l !== lang);
}
