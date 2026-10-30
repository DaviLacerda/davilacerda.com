import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Maps a BCP 47 tag (any case) to one of our locales, or null.
 * Every Portuguese variant (pt, pt-BR, pt-PT, ...) maps to "pt-br" because it
 * is the only Portuguese edition of the site; English variants map to "en".
 */
export function matchLocaleTag(tag: string): Locale | null {
  const normalized = tag.trim().toLowerCase();
  if (!normalized || normalized === "*") return null;
  if (isLocale(normalized)) return normalized;
  const [language] = normalized.split(/[-_]/);
  if (language === "pt") return "pt-br";
  if (language === "en") return "en";
  return null;
}

/**
 * Picks the best locale from an `Accept-Language` header value.
 * Implements q-value ordering (stable for equal weights) without extra deps.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of ranked) {
    const match = matchLocaleTag(tag);
    if (match) return match;
  }
  return defaultLocale;
}
