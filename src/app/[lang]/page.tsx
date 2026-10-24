import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { AskLink } from "@/components/chat/ask-link";
import { Composer } from "@/components/chat/composer";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { LogoTile } from "@/components/ui/logo";
import { getCertifications, profile } from "@/content/profile";
import { getDictionary, interpolate, isLocale, t, type Locale } from "@/i18n";
import { formatDateRange } from "@/i18n/format";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { composerStrings, composerTopics } from "@/lib/work/answers";
import type { TopicId } from "@/lib/work/topics";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return buildMetadata({
    lang,
    path: "/",
    description: dict.meta.work.description,
    type: "profile",
    keywords: dict.work.keywords,
  });
}

/**
 * Work tab (home): the guided assistant, readable in one glance (it fits
 * one 1440x900 screen). The name, one line on who Davi is and the composer
 * with its suggestions; under it, four highlights (each a link to the answer
 * that tells the whole story), the last one the email. The long factual TL;DR lives in the JSON-LD, the
 * Markdown rendition, llms.txt and the MCP server, not on screen.
 */
export default async function WorkPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const home = dict.chat.home;
  const current = profile.experience.find((job) => job.end === null);
  const lead = interpolate(home.lead, {
    role: t(profile.headline, lang),
    company: current ? t(current.company, lang) : profile.currentEmployer.name,
    place: t(profile.location.label, lang),
  });

  return (
    <Container className="pt-12 sm:pt-20">
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          profilePageJsonLd(lang, {
            description: dict.meta.work.description,
          }),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
          ]),
        ]}
      />

      <section aria-labelledby="work-title">
        <h1
          id="work-title"
          data-enter=""
          style={{ "--i": 0 } as CSSProperties}
          className="text-display"
        >
          {profile.name}
        </h1>
        <p
          data-enter=""
          style={{ "--i": 1 } as CSSProperties}
          className="mt-4 max-w-[40ch] text-lead text-muted-foreground"
        >
          {lead}
        </p>
        <Composer
          className="mt-10"
          action={routes.ask(lang)}
          topics={composerTopics(lang)}
          strings={composerStrings(lang)}
          email={profile.email}
          enterFrom={2}
        />
      </section>

      <Highlights lang={lang} />
    </Container>
  );
}

/**
 * Four facts with a picture each (the employer's logo, the award, the
 * Microsoft credential, the email), two by two from 640px, each a link that
 * opens the matching answer. They carry the TL;DR on screen and give
 * crawlers descriptive links to the answers.
 */
function Highlights({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const home = dict.chat.home;
  const current = profile.experience.find((job) => job.end === null);
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );
  const copilot = profile.projects.find((p) => p.id === "sales-copilot");
  const experts = getCertifications("certification").filter(
    (cert) => cert.level === "Expert",
  );

  // On a hovered row (surface fill) the tile steps back to the page colour.
  const tileHover =
    "transition-colors duration-150 ease-out group-hover:bg-background";
  const iconTile = cn(
    "grid size-10 shrink-0 place-items-center rounded-tile bg-surface",
    tileHover,
  );
  const rows: {
    topic: TopicId;
    picture: ReactNode;
    title: string;
    detail: string;
  }[] = [];
  if (current) {
    const company = t(current.company, lang);
    rows.push({
      topic: "experience",
      picture: (
        <LogoTile logo={current.logo} name={company} className={tileHover} />
      ),
      title: interpolate(home.role, { role: t(current.role, lang), company }),
      detail: formatDateRange(current.start, current.end, lang),
    });
  }
  if (award) {
    rows.push({
      topic: "sales-copilot",
      picture: (
        <span className={iconTile}>
          <TrophyIcon aria-hidden="true" className="size-5" />
        </span>
      ),
      title: t(award.title, lang),
      detail: interpolate(home.award, {
        issuer: award.issuer ?? "",
        project: copilot ? t(copilot.name, lang) : "",
      }),
    });
  }
  if (experts.length) {
    rows.push({
      topic: "certifications",
      picture: (
        <LogoTile
          logo={experts[0]?.logo}
          name={experts[0]?.issuer ?? ""}
          className={tileHover}
        />
      ),
      title: interpolate(home.experts, { count: experts.length }),
      detail: home.expertsDetail,
    });
  }
  rows.push({
    topic: "contact",
    picture: (
      <span className={iconTile}>
        <EnvelopeSimpleIcon aria-hidden="true" className="size-5" />
      </span>
    ),
    title: dict.work.hero.availability,
    detail: profile.email,
  });

  return (
    <section aria-labelledby="highlights-title" className="mt-14 sm:mt-16">
      <h2 id="highlights-title" className="sr-only">
        {home.highlightsTitle}
      </h2>
      <ul className="-mx-3 grid gap-1 sm:-mx-4 sm:grid-cols-2 sm:gap-x-4">
        {rows.map((row, index) => (
          <li
            key={row.topic}
            data-enter=""
            style={{ "--i": 11 + index } as CSSProperties}
          >
            <AskLink
              href={routes.topic(lang, row.topic)}
              className="group flex h-full items-center gap-4 rounded-surface px-3 py-3 transition-colors duration-150 ease-out hover:bg-surface sm:px-4"
            >
              {row.picture}
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-balance">
                  {row.title}
                </span>
                <span className="block text-small break-words text-muted-foreground">
                  {row.detail}
                </span>
              </span>
              <ArrowRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </AskLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
