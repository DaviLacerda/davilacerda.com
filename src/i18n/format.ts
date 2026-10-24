import { localeMeta, type Locale } from "./config";
import { getDictionary, interpolate } from "./index";

/**
 * Date helpers. Content dates are strings, never `Date` objects:
 * - full dates (blog posts): "YYYY-MM-DD"
 * - partial dates (experience, education, certifications): "YYYY" or "YYYY-MM"
 * All formatting happens in UTC so a date never shifts by a day at build time.
 */

/** "YYYY", "YYYY-MM" or "YYYY-MM-DD". */
export type PartialDate = string;

function parse(date: PartialDate): {
  value: Date;
  precision: "year" | "month" | "day";
} {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(date);
  if (!match)
    throw new Error(`Invalid date "${date}". Use YYYY, YYYY-MM or YYYY-MM-DD.`);
  const [, y, m, d] = match;
  const value = new Date(
    Date.UTC(Number(y), m ? Number(m) - 1 : 0, d ? Number(d) : 1),
  );
  return { value, precision: d ? "day" : m ? "month" : "year" };
}

/**
 * Formats a full date for display.
 * @example formatDate("2026-10-24", "en") // "October 24, 2026"
 * @example formatDate("2026-10-24", "pt-br") // "24 de outubro de 2026"
 * @example formatDate("2026-10-24", "en", "short") // "Oct 24, 2026"
 */
export function formatDate(
  date: PartialDate,
  lang: Locale,
  style: "long" | "short" = "long",
): string {
  const { value } = parse(date);
  return new Intl.DateTimeFormat(localeMeta[lang].intl, {
    year: "numeric",
    month: style,
    day: "numeric",
    timeZone: "UTC",
  }).format(value);
}

/**
 * Formats a partial date with the precision it was written in.
 * @example formatPartialDate("2024-12", "en") // "Dec 2024"
 * @example formatPartialDate("2024", "pt-br") // "2024"
 */
export function formatPartialDate(date: PartialDate, lang: Locale): string {
  const { value, precision } = parse(date);
  const intl = localeMeta[lang].intl;
  if (precision === "year") return String(value.getUTCFullYear());
  if (precision === "month") {
    return new Intl.DateTimeFormat(intl, {
      year: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(value);
  }
  return formatDate(date, lang, "short");
}

/**
 * Formats a partial date with a long month name, for sentences.
 * @example formatLongPartialDate("2024-08", "en") // "August 2024"
 * @example formatLongPartialDate("2024-08", "pt-br") // "agosto de 2024"
 */
export function formatLongPartialDate(date: PartialDate, lang: Locale): string {
  const { value, precision } = parse(date);
  if (precision === "year") return String(value.getUTCFullYear());
  if (precision === "day") return formatDate(date, lang);
  return new Intl.DateTimeFormat(localeMeta[lang].intl, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(value);
}

/**
 * Formats a period in words, never with a dash. `end === null` means
 * ongoing ("Since Aug 2024"); `start` undefined means unknown (only the end is
 * shown, or nothing at all).
 * @example formatDateRange("2024-08", null, "en") // "Since Aug 2024"
 * @example formatDateRange("2023-12", "2024-08", "en") // "Dec 2023 to Aug 2024"
 */
export function formatDateRange(
  start: PartialDate | undefined,
  end: PartialDate | null | undefined,
  lang: Locale,
): string {
  const dict = getDictionary(lang);
  if (end === null) {
    return start
      ? interpolate(dict.dates.since, { start: formatPartialDate(start, lang) })
      : dict.dates.present;
  }
  const endLabel = end ? formatPartialDate(end, lang) : "";
  if (!start) return endLabel;
  const startLabel = formatPartialDate(start, lang);
  if (!endLabel || startLabel === endLabel) return startLabel;
  return interpolate(dict.dates.range, { start: startLabel, end: endLabel });
}

/**
 * Validates and returns the date for `<time dateTime>` and JSON-LD. ISO 8601
 * allows reduced precision, so "2024" and "2024-12" are returned as-is.
 */
export function toIsoDate(date: PartialDate): string {
  parse(date);
  return date;
}
