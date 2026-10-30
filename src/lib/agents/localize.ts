import { locales, type Locale } from "@/i18n/config";

/** JSON-compatible value (what `localize` returns). */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const LOCALE_KEYS = [...locales].sort().join("|");

/** True for `{ en, "pt-br" }` objects (an `L10n` value). */
function isL10n(value: object): value is Record<Locale, unknown> {
  return (
    !Array.isArray(value) && Object.keys(value).sort().join("|") === LOCALE_KEYS
  );
}

/**
 * Deeply resolves every `L10n` value in `value` for `lang` and drops
 * `undefined` fields, producing plain JSON. Lets the JSON API mirror
 * `profile.ts` exactly without a hand-written mapper that could drift.
 *
 * @example localize({ role: { en: "AI Engineer", "pt-br": "Engenheiro de IA" } }, "en") // { role: "AI Engineer" }
 */
export function localize(value: unknown, lang: Locale): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((item) => localize(item, lang));
  if (typeof value === "object") {
    if (isL10n(value)) return localize(value[lang], lang);
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined && typeof item !== "function") {
        out[key] = localize(item, lang);
      }
    }
    return out;
  }
  return null;
}
