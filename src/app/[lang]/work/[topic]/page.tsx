import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { topicBlocks } from "@/components/chat/answers";
import { Composer } from "@/components/chat/composer";
import { TurnPart, TurnProvider, TurnQuestion } from "@/components/chat/turn";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, isLocale } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  faqPageJsonLd,
  personJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import {
  composerStrings,
  composerTopics,
  topicCopy,
  topicIntro,
} from "@/lib/work/answers";
import { isTopicId, topicIds } from "@/lib/work/topics";

type PageProps = { params: Promise<{ lang: string; topic: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return topicIds.map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, topic } = await params;
  if (!isLocale(lang) || !isTopicId(topic)) return {};
  const copy = topicCopy(topic, lang);
  return buildMetadata({
    lang,
    path: `/work/${topic}`,
    title: copy.metaTitle,
    description: copy.description,
    type: "profile",
    keywords: getDictionary(lang).work.keywords,
  });
}

const TITLE_ID = "answer-title";

/**
 * One answer of the Work assistant, e.g. `/en/work/experience`: the
 * question, then the answer (title, a one-sentence intro and its predefined
 * blocks), then the composer to ask the next thing. Everything is in the
 * server HTML; `TurnProvider` only adds the chat-turn reveal when the page
 * was opened from the composer.
 */
export default async function TopicPage({ params }: PageProps) {
  const { lang, topic } = await params;
  if (!isLocale(lang) || !isTopicId(topic)) notFound();
  const dict = getDictionary(lang);
  const copy = topicCopy(topic, lang);
  const path = routes.topic(lang, topic);
  const [first, ...rest] = topicBlocks(topic, lang);

  return (
    <Container className="pt-8 sm:pt-12">
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          profilePageJsonLd(lang, {
            path,
            name: `${copy.metaTitle} | ${dict.meta.siteName}`,
            description: copy.description,
          }),
          ...(topic === "faq" ? [faqPageJsonLd(lang)] : []),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
            { name: copy.title, path },
          ]),
        ]}
      />

      <TurnProvider focusId={TITLE_ID}>
        <section aria-labelledby={TITLE_ID}>
          <TurnQuestion question={copy.question} label={dict.chat.turn.you} />
          <TurnPart index={1} className="mt-8 sm:mt-10">
            <h1 id={TITLE_ID} tabIndex={-1} className="text-title outline-none">
              {copy.title}
            </h1>
          </TurnPart>
          <TurnPart index={2} className="mt-3">
            <p className="max-w-[52ch] text-lead text-muted-foreground">
              {topicIntro(topic, lang)}
            </p>
          </TurnPart>
          {first ? (
            <TurnPart index={3} className="mt-12" build>
              {first}
            </TurnPart>
          ) : null}
          {rest.map((block, index) => (
            <Reveal key={index} enter={4 + index} className="mt-14">
              {block}
            </Reveal>
          ))}
        </section>
      </TurnProvider>

      <Reveal
        as="section"
        stagger
        enter={4 + rest.length}
        aria-labelledby="ask-next"
        className="mt-20 sm:mt-24"
      >
        <h2 id="ask-next" className="text-heading">
          {dict.chat.turn.askNext}
        </h2>
        <Composer
          className="mt-5"
          action={routes.ask(lang)}
          topics={composerTopics(lang)}
          strings={composerStrings(lang)}
          email={profile.email}
          current={topic}
        />
      </Reveal>
    </Container>
  );
}
