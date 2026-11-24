import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { StatSectionBlock } from "@/components/statistics/stat-list";
import { Container } from "@/components/ui/container";
import { statistics } from "@/content/statistics";
import { getDictionary, interpolate, isLocale, t } from "@/i18n";
import { formatDate } from "@/i18n/format";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  statisticsPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import {
  statisticsCountLine,
  statisticsMeta,
  statisticsUpdatedLine,
} from "@/lib/statistics";
import { absoluteUrl } from "@/lib/utils";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const meta = statisticsMeta(lang);
  return buildMetadata({
    lang,
    path: "/statistics",
    title: meta.title,
    description: meta.description,
    type: "article",
    keywords: meta.keywords,
    article: {
      publishedTime: statistics.published,
      modifiedTime: statistics.updated,
    },
  });
}

/**
 * The Statistics page: numbers on generative AI and AI agents that other
 * people need, each on its own line with whoever measured it, next to the
 * results of Davi's own work. It stands apart from the blog and the tabs, on
 * a URL without a year, so it can be updated and linked to for years.
 *
 * The title carries the year of the last update; under it, the date the
 * sources were last checked and an outline. Then one section per search it
 * answers (the `h2`), Davi's results on the one ink panel, and how the page
 * is built. Everything comes from `src/content/statistics.ts`.
 */
export default async function StatisticsPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const s = dict.statistics;
  const meta = statisticsMeta(lang);
  const url = absoluteUrl(routes.statistics(lang));
  const enter = (i: number) => ({
    "data-enter": "",
    style: { "--i": i } as CSSProperties,
  });

  return (
    <Container bento className="pt-8 sm:pt-14">
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          statisticsPageJsonLd(lang),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
            { name: dict.nav.statistics, path: routes.statistics(lang) },
          ]),
        ]}
      />

      <h1
        {...enter(0)}
        className="text-hero max-w-[20ch] text-display text-balance"
      >
        {meta.title}
      </h1>
      <p
        {...enter(1)}
        className="mt-5 max-w-[56ch] text-lead text-pretty text-muted-foreground"
      >
        {s.lead}
      </p>
      <p
        {...enter(2)}
        className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-small text-muted-foreground"
      >
        <time dateTime={statistics.updated}>{statisticsUpdatedLine(lang)}</time>
        <span>{statisticsCountLine(lang)}</span>
      </p>

      <nav {...enter(3)} aria-label={s.onThisPage} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {statistics.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex h-9 pressable items-center rounded-full bg-surface px-4 text-small font-medium transition-colors duration-200 ease-out hover:bg-surface-strong"
              >
                {t(section.label, lang)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-16 grid gap-y-20 sm:mt-20 sm:gap-y-24">
        {statistics.sections.map((section, index) => (
          <Reveal key={section.id} enter={4 + index}>
            <StatSectionBlock section={section} lang={lang} />
          </Reveal>
        ))}

        <Reveal
          as="section"
          aria-labelledby="method-title"
          className="grid gap-x-12 gap-y-12 sm:grid-cols-2"
        >
          <div>
            <h2 id="method-title" className="text-heading">
              {s.method.title}
            </h2>
            <ul className="mt-4 list-disc space-y-2.5 pl-5 text-pretty marker:text-muted-foreground">
              {s.method.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-heading">{s.cite.title}</h2>
            <p className="mt-4 rounded-surface bg-surface p-5 text-pretty select-all">
              {interpolate(s.cite.text, {
                title: meta.title,
                url,
                date: formatDate(statistics.updated, lang),
              })}
            </p>
          </div>
        </Reveal>
      </div>
    </Container>
  );
}
