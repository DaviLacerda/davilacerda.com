import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { AskLink } from "@/components/chat/ask-link";
import { Composer } from "@/components/chat/composer";
import { CopyEmailButton } from "@/components/chat/copy-email-button";
import { Widget } from "@/components/chat/widget";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, interpolate, isLocale, t } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { composerStrings, composerTopics, topicCopy } from "@/lib/work/answers";
import { topicIds } from "@/lib/work/topics";

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
 * Work tab (home): the guided assistant. The first screen is the name, one
 * line on who Davi is and the composer with its suggestions. Below it, the
 * server-rendered substance for readers and crawlers: the TL;DR, the
 * highlights (with the award), a link to every answer and how to reach him.
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
    <Container className="pt-10 sm:pt-20">
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
          className="mt-5 max-w-[34ch] text-lead"
        >
          {lead}
        </p>
        <Composer
          className="mt-10 sm:mt-12"
          action={routes.ask(lang)}
          topics={composerTopics(lang)}
          strings={composerStrings(lang)}
          email={profile.email}
          enterFrom={2}
        />
      </section>

      <Reveal
        as="section"
        aria-labelledby="summary-title"
        className="mt-26 pt-2 sm:mt-34"
      >
        <h2 id="summary-title" className="text-heading">
          {home.summaryTitle}
        </h2>
        <p className="mt-4 max-w-[66ch]">{t(profile.tldr, lang)}</p>
      </Reveal>

      <Reveal className="mt-10">
        <Widget>
          <h2 className="text-lead font-medium">{home.glanceTitle}</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {profile.highlights.map((item) => (
              <li key={t(item.value, "en")}>
                <p className="text-heading">{t(item.value, lang)}</p>
                <p className="mt-1 text-muted-foreground">
                  {t(item.label, lang)}
                </p>
              </li>
            ))}
          </ul>
        </Widget>
      </Reveal>

      <section aria-labelledby="topics-title" className="mt-26 pt-2 sm:mt-34">
        <h2 id="topics-title" className="text-heading">
          {home.topicsTitle}
        </h2>
        <Reveal
          as="ul"
          stagger
          className="-mx-4 mt-6 grid gap-x-2 sm:-mx-5 lg:grid-cols-2"
        >
          {topicIds.map((id) => {
            const copy = topicCopy(id, lang);
            return (
              <li key={id}>
                <AskLink
                  href={routes.topic(lang, id)}
                  className="group flex h-full items-center justify-between gap-6 rounded-surface px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block text-lead font-medium">
                      {copy.question}
                    </span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {copy.summary}
                    </span>
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </AskLink>
              </li>
            );
          })}
        </Reveal>
      </section>

      <Reveal
        as="section"
        aria-labelledby="contact-title"
        className="mt-28 sm:mt-36"
      >
        <Widget className="sm:p-10">
          <h2 id="contact-title" className="text-heading">
            {dict.work.sections.contact.title}
          </h2>
          <p className="mt-3 max-w-[52ch] text-muted-foreground">
            {dict.work.sections.contact.description}
            {profile.availability.open
              ? ` ${t(profile.availability.modes, lang)}.`
              : null}
          </p>
          <p className="mt-8 text-heading break-all sm:break-normal">
            <a href={`mailto:${profile.email}`} className="link-underline">
              {profile.email}
            </a>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink
              href={`mailto:${profile.email}`}
              variant="accent"
              size="lg"
            >
              {dict.chat.answers.contact.emailCta}
            </ButtonLink>
            <CopyEmailButton
              email={profile.email}
              label={dict.chat.answers.contact.copyEmail}
              copiedLabel={dict.chat.answers.contact.copied}
              variant="raised"
            />
          </div>
        </Widget>
      </Reveal>
    </Container>
  );
}
