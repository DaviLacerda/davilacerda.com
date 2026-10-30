import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Overview } from "@/components/chat/answers";
import { Piece } from "@/components/chat/piece";
import { JsonLd } from "@/components/seo/json-ld";
import { profile } from "@/content/profile";
import { getDictionary, isLocale, t } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

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
 * Work tab (home). The layout supplies Davi's name (this page's h1), one
 * line, the composer and the suggestions; the canvas shows the overview: the
 * award, the Microsoft certifications, the current role and how to reach
 * him, each a link to the answer that tells the whole story. Under them,
 * "About Davi": the long factual TL;DR, the same paragraph the JSON-LD, the
 * Markdown rendition, llms.txt and the MCP server carry, so the page answers
 * "who is Davi Lacerda?" in its own HTML too.
 */
export default async function WorkPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <>
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
      <Overview lang={lang} />
      <section aria-labelledby="about-title" className="mt-12 sm:mt-16">
        <Piece as="h2" i={4} id="about-title" className="font-semibold">
          {dict.chat.home.aboutTitle}
        </Piece>
        <Piece as="p" i={4} className="mt-3 max-w-[62ch] text-muted-foreground">
          {t(profile.tldr, lang)}
        </Piece>
      </section>
    </>
  );
}
