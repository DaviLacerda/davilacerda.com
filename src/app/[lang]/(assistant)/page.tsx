import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Overview } from "@/components/chat/answers";
import { JsonLd } from "@/components/seo/json-ld";
import { getDictionary, isLocale } from "@/i18n";
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
 * him, each a link to the answer that tells the whole story. The long
 * factual TL;DR lives in the JSON-LD, the Markdown rendition, llms.txt and
 * the MCP server, not on screen.
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
    </>
  );
}
