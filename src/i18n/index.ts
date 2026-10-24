import { type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { ptBr } from "./dictionaries/pt-br";

export * from "./config";
export type { Dictionary };

/**
 * A localized value: one entry per locale. Used across `src/content` for any
 * human-readable string (or list of strings) that differs between languages.
 *
 * @example const role: L10n = { en: "AI Engineer", "pt-br": "Engenheiro de IA" };
 */
export type L10n<T = string> = Record<Locale, T>;

/** A plain string (names, tech terms that do not translate) or a localized one. Resolve with `t()`. */
export type Localizable = string | L10n;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  "pt-br": ptBr,
};

/**
 * Returns the UI dictionary for a locale. Synchronous on purpose: both
 * dictionaries are small and only shipped to the server bundle unless a client
 * component imports this module (pass strings down as props instead).
 */
export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}

/**
 * Resolves a localized value for `lang`. Plain strings (brand names, URLs,
 * tech names) pass through unchanged, so content can mix both freely.
 *
 * @example t(profile.headline, lang) // "AI Engineer" | "Engenheiro de IA"
 */
export function t<T>(value: L10n<T>, lang: Locale): T;
export function t(value: string, lang: Locale): string;
export function t<T>(value: L10n<T> | string, lang: Locale): T | string;
export function t<T>(value: L10n<T> | string, lang: Locale): T | string {
  return typeof value === "string" ? value : value[lang];
}

/**
 * Fills `{placeholder}` tokens in a dictionary string. Unknown tokens are kept
 * verbatim so missing values are visible instead of silently disappearing.
 *
 * @example interpolate(dict.blog.readingTime, { minutes: 5 }) // "5 min read"
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
