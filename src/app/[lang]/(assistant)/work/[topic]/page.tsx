import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TopicAnswer } from "@/components/chat/answers";
import { JsonLd } from "@/components/seo/json-ld";
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
import { topicCopy } from "@/lib/work/answers";
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

/**
 * One answer of the Work assistant, e.g. `/en/work/experience`: the
 * question, the title (h1) and the answer's composition, all in the server
 * HTML. The (assistant) layout around it supplies the composer; on a chip
 * click only this page changes, and the canvas composes it in place.
 */
export default async function TopicPage({ params }: PageProps) {
  const { lang, topic } = await params;
  if (!isLocale(lang) || !isTopicId(topic)) notFound();
  const dict = getDictionary(lang);
  const copy = topicCopy(topic, lang);
  const path = routes.topic(lang, topic);

  return (
    <>
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
      <TopicAnswer topic={topic} lang={lang} />
    </>
  );
}
