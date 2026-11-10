import { getProjectPage } from "@/content/profile";
import {
  allStatistics,
  citedSources,
  statistics,
  statisticsYear,
  type Statistic,
  type StatSource,
} from "@/content/statistics";
import { getDictionary, interpolate, t, type Locale } from "@/i18n";
import { formatDate, formatPartialDate } from "@/i18n/format";
import { routes } from "@/lib/routes";

/*
 * What the Statistics page, its Markdown, its OG card and its JSON-LD share:
 * the title with its year, the count line and how a source is written.
 * Dependency-free beyond content and i18n, so server and metadata code can
 * both use it.
 */

/** The page's title and description, with the year of the last update filled in. */
export function statisticsMeta(lang: Locale): {
  title: string;
  description: string;
  keywords: string[];
} {
  const dict = getDictionary(lang);
  const year = statisticsYear();
  return {
    title: interpolate(dict.meta.statistics.title, { year }),
    description: interpolate(dict.meta.statistics.description, { year }),
    keywords: [...dict.statistics.keywords],
  };
}

/** "Updated November 10, 2026". */
export function statisticsUpdatedLine(lang: Locale): string {
  return interpolate(getDictionary(lang).statistics.updated, {
    date: formatDate(statistics.updated, lang),
  });
}

/** "40 statistics from 16 sources". */
export function statisticsCountLine(lang: Locale): string {
  return interpolate(getDictionary(lang).statistics.count, {
    stats: allStatistics().length,
    sources: citedSources().length,
  });
}

/** A source as one line: who, what and when. "McKinsey & Company, The state of AI in 2026, Aug 25, 2026". */
export function sourceLine(source: StatSource, lang: Locale): string {
  return [
    source.publisher,
    t(source.title, lang),
    formatPartialDate(source.date, lang),
  ].join(", ");
}

/** Where one of Davi's own numbers leads: its project's page, or the Projects tab. */
export function statisticProjectPath(
  stat: Statistic,
  lang: Locale,
): string | null {
  if (!stat.project) return null;
  return getProjectPage(stat.project)
    ? routes.project(lang, stat.project)
    : routes.projects(lang);
}
